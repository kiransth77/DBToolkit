import { DatabaseConfig, TableSchema, NoSQLCollection, DatabaseProvider } from '../../types/database';
import { DatabaseFactory, DatabaseConnector } from '../database/factory';
import { Logger } from '../../utils/logger';

export interface MigrationOptions {
    sourceConfig: DatabaseConfig;
    targetConfig: DatabaseConfig;
    tables?: string[];
    collections?: string[];
    includeData?: boolean;
    batchSize?: number;
    skipExisting?: boolean;
    generateScripts?: boolean;
    scriptOutputPath?: string;
}

export interface MigrationResult {
    success: boolean;
    tablesProcessed: number;
    collectionsProcessed: number;
    recordsMigrated: number;
    errors: string[];
    scripts?: string[];
}

export class UniversalMigrator {
    private logger: Logger;

    constructor() {
        this.logger = new Logger();
    }

    public async migrate(options: MigrationOptions): Promise<MigrationResult> {
        const result: MigrationResult = {
            success: false,
            tablesProcessed: 0,
            collectionsProcessed: 0,
            recordsMigrated: 0,
            errors: [],
            scripts: [],
        };

        try {
            this.logger.info('Starting universal database migration...');
            
            // Validate configurations
            const sourceErrors = DatabaseFactory.validateConfig(options.sourceConfig);
            const targetErrors = DatabaseFactory.validateConfig(options.targetConfig);
            
            if (sourceErrors.length > 0 || targetErrors.length > 0) {
                result.errors.push(...sourceErrors.map(e => `Source: ${e}`));
                result.errors.push(...targetErrors.map(e => `Target: ${e}`));
                return result;
            }

            // Create connectors
            const sourceConnector = DatabaseFactory.createConnector(options.sourceConfig);
            const targetConnector = DatabaseFactory.createConnector(options.targetConfig);

            try {
                // Connect to both databases
                await sourceConnector.connect();
                await targetConnector.connect();

                // Determine migration type
                const sourceIsNoSQL = DatabaseFactory.isNoSQLProvider(options.sourceConfig.provider);
                const targetIsNoSQL = DatabaseFactory.isNoSQLProvider(options.targetConfig.provider);

                if (sourceIsNoSQL && targetIsNoSQL) {
                    // NoSQL to NoSQL migration
                    const migrationResult = await this.migrateNoSQLToNoSQL(
                        sourceConnector,
                        targetConnector,
                        options
                    );
                    Object.assign(result, migrationResult);
                } else if (!sourceIsNoSQL && !targetIsNoSQL) {
                    // SQL to SQL migration
                    const migrationResult = await this.migrateSQLToSQL(
                        sourceConnector,
                        targetConnector,
                        options
                    );
                    Object.assign(result, migrationResult);
                } else if (!sourceIsNoSQL && targetIsNoSQL) {
                    // SQL to NoSQL migration
                    const migrationResult = await this.migrateSQLToNoSQL(
                        sourceConnector,
                        targetConnector,
                        options
                    );
                    Object.assign(result, migrationResult);
                } else {
                    // NoSQL to SQL migration
                    const migrationResult = await this.migrateNoSQLToSQL(
                        sourceConnector,
                        targetConnector,
                        options
                    );
                    Object.assign(result, migrationResult);
                }

                result.success = result.errors.length === 0;
                
            } finally {
                // Always disconnect
                await sourceConnector.disconnect();
                await targetConnector.disconnect();
            }

        } catch (error) {
            result.errors.push(`Migration failed: ${error}`);
            this.logger.error('Migration failed:', error);
        }

        return result;
    }

    private async migrateSQLToSQL(
        source: DatabaseConnector,
        target: DatabaseConnector,
        options: MigrationOptions
    ): Promise<Partial<MigrationResult>> {
        const result: Partial<MigrationResult> = {
            tablesProcessed: 0,
            recordsMigrated: 0,
            errors: [],
            scripts: [],
        };

        try {
            // Get tables to migrate
            const allTables = await source.getAllTables!();
            const tablesToMigrate = options.tables || allTables;

            this.logger.info(`Found ${tablesToMigrate.length} tables to migrate`);

            for (const tableName of tablesToMigrate) {
                try {
                    this.logger.info(`Processing table: ${tableName}`);

                    // Get table schema
                    const schema = await source.getTableSchema!(tableName);
                    
                    // Generate create table script
                    const createScript = target.generateCreateTableScript!(schema);
                    
                    if (options.generateScripts) {
                        result.scripts!.push(`-- Table: ${tableName}\n${createScript}\n`);
                    } else {
                        // Execute create table
                        await target.query!(createScript);
                    }

                    // Migrate data if requested
                    if (options.includeData) {
                        const recordsMigrated = await this.migrateTableData(
                            source,
                            target,
                            tableName,
                            options.batchSize || 1000
                        );
                        result.recordsMigrated! += recordsMigrated;
                    }

                    result.tablesProcessed!++;
                    this.logger.info(`Completed table: ${tableName}`);

                } catch (error) {
                    result.errors!.push(`Error migrating table ${tableName}: ${error}`);
                    this.logger.error(`Error migrating table ${tableName}:`, error);
                }
            }

        } catch (error) {
            result.errors!.push(`SQL to SQL migration error: ${error}`);
        }

        return result;
    }

    private async migrateNoSQLToNoSQL(
        source: DatabaseConnector,
        target: DatabaseConnector,
        options: MigrationOptions
    ): Promise<Partial<MigrationResult>> {
        const result: Partial<MigrationResult> = {
            collectionsProcessed: 0,
            recordsMigrated: 0,
            errors: [],
            scripts: [],
        };

        try {
            // Get collections to migrate
            const allCollections = await source.getAllCollections!();
            const collectionsToMigrate = options.collections || allCollections;

            this.logger.info(`Found ${collectionsToMigrate.length} collections to migrate`);

            for (const collectionName of collectionsToMigrate) {
                try {
                    this.logger.info(`Processing collection: ${collectionName}`);

                    // Get collection schema
                    const schema = await source.getCollectionSchema!(collectionName);
                    
                    if (options.generateScripts) {
                        const script = source.generateCollectionScript!(schema);
                        result.scripts!.push(`// Collection: ${collectionName}\n${script}\n`);
                    } else {
                        // Create collection
                        await target.createCollection!(schema);
                    }

                    // Migrate data if requested
                    if (options.includeData) {
                        const recordsMigrated = await this.migrateCollectionData(
                            source,
                            target,
                            collectionName,
                            options.batchSize || 1000
                        );
                        result.recordsMigrated! += recordsMigrated;
                    }

                    result.collectionsProcessed!++;
                    this.logger.info(`Completed collection: ${collectionName}`);

                } catch (error) {
                    result.errors!.push(`Error migrating collection ${collectionName}: ${error}`);
                    this.logger.error(`Error migrating collection ${collectionName}:`, error);
                }
            }

        } catch (error) {
            result.errors!.push(`NoSQL to NoSQL migration error: ${error}`);
        }

        return result;
    }

    private async migrateSQLToNoSQL(
        source: DatabaseConnector,
        target: DatabaseConnector,
        options: MigrationOptions
    ): Promise<Partial<MigrationResult>> {
        const result: Partial<MigrationResult> = {
            tablesProcessed: 0,
            collectionsProcessed: 0,
            recordsMigrated: 0,
            errors: [],
            scripts: [],
        };

        try {
            // Get tables to migrate
            const allTables = await source.getAllTables!();
            const tablesToMigrate = options.tables || allTables;

            this.logger.info(`Converting ${tablesToMigrate.length} SQL tables to NoSQL collections`);

            for (const tableName of tablesToMigrate) {
                try {
                    this.logger.info(`Converting table to collection: ${tableName}`);

                    // Get table schema and convert to NoSQL collection
                    const tableSchema = await source.getTableSchema!(tableName);
                    const collectionSchema = this.convertTableToCollection(tableSchema);
                    
                    if (options.generateScripts) {
                        const script = target.generateCollectionScript!(collectionSchema);
                        result.scripts!.push(`// Converted from table: ${tableName}\n${script}\n`);
                    } else {
                        // Create collection
                        await target.createCollection!(collectionSchema);
                    }

                    // Migrate data if requested
                    if (options.includeData) {
                        const recordsMigrated = await this.migrateTableToCollection(
                            source,
                            target,
                            tableName,
                            options.batchSize || 1000
                        );
                        result.recordsMigrated! += recordsMigrated;
                    }

                    result.tablesProcessed!++;
                    result.collectionsProcessed!++;
                    this.logger.info(`Completed table to collection: ${tableName}`);

                } catch (error) {
                    result.errors!.push(`Error converting table ${tableName}: ${error}`);
                    this.logger.error(`Error converting table ${tableName}:`, error);
                }
            }

        } catch (error) {
            result.errors!.push(`SQL to NoSQL migration error: ${error}`);
        }

        return result;
    }

    private async migrateNoSQLToSQL(
        source: DatabaseConnector,
        target: DatabaseConnector,
        options: MigrationOptions
    ): Promise<Partial<MigrationResult>> {
        const result: Partial<MigrationResult> = {
            tablesProcessed: 0,
            collectionsProcessed: 0,
            recordsMigrated: 0,
            errors: [],
            scripts: [],
        };

        try {
            // Get collections to migrate
            const allCollections = await source.getAllCollections!();
            const collectionsToMigrate = options.collections || allCollections;

            this.logger.info(`Converting ${collectionsToMigrate.length} NoSQL collections to SQL tables`);

            for (const collectionName of collectionsToMigrate) {
                try {
                    this.logger.info(`Converting collection to table: ${collectionName}`);

                    // Get collection schema and convert to table
                    const collectionSchema = await source.getCollectionSchema!(collectionName);
                    const tableSchema = this.convertCollectionToTable(collectionSchema);
                    
                    if (options.generateScripts) {
                        const script = target.generateCreateTableScript!(tableSchema);
                        result.scripts!.push(`-- Converted from collection: ${collectionName}\n${script}\n`);
                    } else {
                        // Create table
                        const createScript = target.generateCreateTableScript!(tableSchema);
                        await target.query!(createScript);
                    }

                    // Migrate data if requested
                    if (options.includeData) {
                        const recordsMigrated = await this.migrateCollectionToTable(
                            source,
                            target,
                            collectionName,
                            tableSchema,
                            options.batchSize || 1000
                        );
                        result.recordsMigrated! += recordsMigrated;
                    }

                    result.collectionsProcessed!++;
                    result.tablesProcessed!++;
                    this.logger.info(`Completed collection to table: ${collectionName}`);

                } catch (error) {
                    result.errors!.push(`Error converting collection ${collectionName}: ${error}`);
                    this.logger.error(`Error converting collection ${collectionName}:`, error);
                }
            }

        } catch (error) {
            result.errors!.push(`NoSQL to SQL migration error: ${error}`);
        }

        return result;
    }

    private async migrateTableData(
        source: DatabaseConnector,
        target: DatabaseConnector,
        tableName: string,
        batchSize: number
    ): Promise<number> {
        // Implementation for migrating table data in batches
        // This is a placeholder for actual data migration logic
        this.logger.info(`Migrating data for table: ${tableName}`);
        return 0;
    }

    private async migrateCollectionData(
        source: DatabaseConnector,
        target: DatabaseConnector,
        collectionName: string,
        batchSize: number
    ): Promise<number> {
        // Implementation for migrating collection data in batches
        this.logger.info(`Migrating data for collection: ${collectionName}`);
        return 0;
    }

    private async migrateTableToCollection(
        source: DatabaseConnector,
        target: DatabaseConnector,
        tableName: string,
        batchSize: number
    ): Promise<number> {
        // Implementation for converting table data to documents
        this.logger.info(`Converting table data to documents: ${tableName}`);
        return 0;
    }

    private async migrateCollectionToTable(
        source: DatabaseConnector,
        target: DatabaseConnector,
        collectionName: string,
        tableSchema: TableSchema,
        batchSize: number
    ): Promise<number> {
        // Implementation for converting documents to table rows
        this.logger.info(`Converting documents to table rows: ${collectionName}`);
        return 0;
    }

    private convertTableToCollection(tableSchema: TableSchema): NoSQLCollection {
        // Convert SQL table schema to NoSQL collection schema
        const properties: any = {};
        const required: string[] = [];

        tableSchema.columns.forEach(col => {
            properties[col.name] = {
                bsonType: this.mapSQLTypeToNoSQL(col.type),
                description: `Converted from SQL column: ${col.type}`,
            };

            if (!col.nullable) {
                required.push(col.name);
            }
        });

        return {
            name: tableSchema.name,
            schema: {
                bsonType: 'object',
                properties,
                required: required.length > 0 ? required : undefined,
            },
        };
    }

    private convertCollectionToTable(collectionSchema: NoSQLCollection): TableSchema {
        // Convert NoSQL collection schema to SQL table schema
        const columns: any[] = [];

        if (collectionSchema.schema?.properties) {
            Object.entries(collectionSchema.schema.properties).forEach(([fieldName, fieldSchema]: [string, any]) => {
                columns.push({
                    name: fieldName,
                    type: this.mapNoSQLTypeToSQL(fieldSchema.bsonType || fieldSchema.type),
                    nullable: !collectionSchema.schema?.required?.includes(fieldName),
                });
            });
        }

        // Add an ID column if not present
        if (!columns.find(col => col.name === 'id')) {
            columns.unshift({
                name: 'id',
                type: 'VARCHAR(50)',
                nullable: false,
                primaryKey: true,
            });
        }

        return {
            name: collectionSchema.name,
            columns,
        };
    }

    private mapSQLTypeToNoSQL(sqlType: string): string {
        const typeMap: { [key: string]: string } = {
            'INTEGER': 'int',
            'BIGINT': 'long',
            'SMALLINT': 'int',
            'TINYINT': 'int',
            'BOOLEAN': 'bool',
            'DECIMAL': 'decimal',
            'FLOAT': 'double',
            'DOUBLE': 'double',
            'REAL': 'double',
            'VARCHAR': 'string',
            'CHAR': 'string',
            'TEXT': 'string',
            'DATE': 'date',
            'DATETIME': 'date',
            'TIMESTAMP': 'date',
            'TIME': 'string',
            'BINARY': 'binData',
            'VARBINARY': 'binData',
            'BLOB': 'binData',
        };

        // Extract base type from complex types like VARCHAR(255)
        const baseType = sqlType.split('(')[0].toUpperCase();
        return typeMap[baseType] || 'string';
    }

    private mapNoSQLTypeToSQL(noSqlType: string): string {
        const typeMap: { [key: string]: string } = {
            'string': 'VARCHAR(255)',
            'int': 'INTEGER',
            'long': 'BIGINT',
            'double': 'DOUBLE',
            'decimal': 'DECIMAL(10,2)',
            'bool': 'BOOLEAN',
            'date': 'DATETIME',
            'timestamp': 'TIMESTAMP',
            'objectId': 'VARCHAR(24)',
            'binData': 'BLOB',
            'array': 'TEXT', // Store as JSON
            'object': 'TEXT', // Store as JSON
        };

        return typeMap[noSqlType] || 'TEXT';
    }
}

// Legacy class for backward compatibility
export class Migrator {
    private migrationScripts: string[];
    private migrationStatus: Map<string, boolean>;

    constructor() {
        this.migrationScripts = [];
        this.migrationStatus = new Map();
    }

    public addMigrationScript(script: string): void {
        this.migrationScripts.push(script);
    }

    public async executeMigrations(): Promise<void> {
        for (const script of this.migrationScripts) {
            await this.executeMigration(script);
        }
    }

    private async executeMigration(script: string): Promise<void> {
        // Logic to execute the migration script
        // Update migration status
        this.migrationStatus.set(script, true);
    }

    public getMigrationStatus(): Map<string, boolean> {
        return this.migrationStatus;
    }
}