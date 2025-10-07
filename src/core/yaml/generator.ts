import { DatabaseConnector } from '../database/factory';
import { TableSchema, NoSQLCollection } from '../../types/database';
import { Relationships } from '../migration/relationships';
import { SimpleYamlParser } from '../../utils/yaml-parser';

export class YamlGenerator {
    constructor() {}

    // New enhanced methods
    public async generateForSQL(connector: DatabaseConnector, tables: string[]): Promise<string> {
        const schemas: TableSchema[] = [];
        
        for (const tableName of tables) {
            const schema = await connector.getTableSchema!(tableName);
            schemas.push(schema);
        }
        
        const yamlOutput = {
            version: '2.0',
            type: 'sql_schema',
            generated: new Date().toISOString(),
            tables: schemas.map(schema => ({
                name: schema.name,
                columns: schema.columns.map(col => ({
                    name: col.name,
                    type: col.type,
                    nullable: col.nullable,
                    primaryKey: col.primaryKey,
                    autoIncrement: col.autoIncrement,
                    default: col.default,
                    length: col.length,
                    precision: col.precision,
                    scale: col.scale,
                })),
                indexes: schema.indexes || [],
                constraints: schema.constraints || [],
                relationships: schema.relationships || [],
            })),
        };
        
        return this.convertToYaml(yamlOutput);
    }

    public async generateForNoSQL(connector: DatabaseConnector, collections: string[]): Promise<string> {
        const schemas: NoSQLCollection[] = [];
        
        for (const collectionName of collections) {
            const schema = await connector.getCollectionSchema!(collectionName);
            schemas.push(schema);
        }
        
        const yamlOutput = {
            version: '2.0',
            type: 'nosql_schema',
            generated: new Date().toISOString(),
            collections: schemas.map(schema => ({
                name: schema.name,
                schema: schema.schema,
                indexes: schema.indexes || [],
                relationships: schema.relationships || [],
            })),
        };
        
        return this.convertToYaml(yamlOutput);
    }

    // Legacy methods
    public generate(tableName: string, relationships: Relationships): string {
        return this.generateTableMigrationYaml(tableName, []);
    }

    public generateTableMigrationYaml(tableName: string, relationships: any[]): string {
        const yamlOutput = {
            table: tableName,
            relationships: relationships
        };
        return this.convertToYaml(yamlOutput);
    }

    public generateSoftDefinedRelationshipYaml(relationshipName: string, details: any): string {
        const yamlOutput = {
            relationship: relationshipName,
            details: details
        };
        return this.convertToYaml(yamlOutput);
    }

    public generateMigrationYaml(
        sourceSchema: TableSchema[] | NoSQLCollection[],
        targetSchema: TableSchema[] | NoSQLCollection[],
        migrationOptions: any
    ): string {
        const yamlOutput = {
            version: '2.0',
            type: 'migration_plan',
            generated: new Date().toISOString(),
            source: {
                schemas: sourceSchema,
            },
            target: {
                schemas: targetSchema,
            },
            migration: migrationOptions,
        };
        
        return this.convertToYaml(yamlOutput);
    }

    public generateConfigTemplate(provider: string): string {
        const template = {
            version: '2.0',
            migration: {
                source: {
                    provider: provider,
                    host: 'localhost',
                    port: this.getDefaultPort(provider),
                    username: 'your_username',
                    password: 'your_password',
                    database: 'your_database',
                    options: this.getProviderOptions(provider),
                },
                target: {
                    provider: provider,
                    host: 'localhost',
                    port: this.getDefaultPort(provider),
                    username: 'your_username',
                    password: 'your_password',
                    database: 'target_database',
                    options: this.getProviderOptions(provider),
                },
                options: {
                    includeData: false,
                    batchSize: 1000,
                    generateScripts: false,
                    tables: [],
                    collections: [],
                },
            },
        };
        
        return this.convertToYaml(template);
    }

    private getDefaultPort(provider: string): number {
        const ports: { [key: string]: number } = {
            mysql: 3306,
            postgresql: 5432,
            sqlite: 0,
            mssql: 1433,
            oracle: 1521,
            mongodb: 27017,
        };
        return ports[provider] || 0;
    }

    private getProviderOptions(provider: string): any {
        const options: { [key: string]: any } = {
            mysql: { ssl: false },
            postgresql: { ssl: false },
            sqlite: { filePath: './database.sqlite' },
            mssql: { encrypt: true, trustServerCertificate: false },
            oracle: { serviceName: 'your_service_name' },
            mongodb: { authSource: 'admin', ssl: false },
        };
        return options[provider] || {};
    }

    private convertToYaml(obj: any): string {
        // Use our custom YAML parser instead of external library
        return SimpleYamlParser.stringify(obj);
    }
}