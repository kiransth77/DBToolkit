/**
 * Interactive Database Configuration Generator
 * Connects to databases and shows tables/collections for selection
 */

import * as readline from 'readline';
import { DatabaseFactory } from '../core/database/factory';
import { DatabaseConfig, DatabaseProvider } from '../types/database';
import { SimpleYamlParser } from './yaml-parser';
import * as fs from 'fs';

export class InteractiveConfigGenerator {
    private rl: readline.Interface;

    constructor() {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }

    /**
     * Generate configuration interactively with database connection
     */
    async generateInteractiveConfig(): Promise<void> {
        console.log('\n🔧 Interactive Database Configuration Generator');
        console.log('===============================================');
        console.log('');
        console.log('This wizard will help you create a migration configuration by:');
        console.log('✅ Testing database connections');
        console.log('✅ Showing available tables/collections');
        console.log('✅ Allowing you to select specific items');
        console.log('✅ Generating optimized configuration');
        console.log('');

        try {
            // Configure source database
            console.log('📊 SOURCE DATABASE CONFIGURATION');
            console.log('================================');
            const sourceConfig = await this.configureDatabase('Source');
            
            console.log('\n🎯 TARGET DATABASE CONFIGURATION');
            console.log('================================');
            const targetConfig = await this.configureDatabase('Target');

            // Migration options
            console.log('\n⚙️ MIGRATION SETTINGS');
            console.log('=====================');
            const migrationSettings = await this.configureMigrationSettings(sourceConfig);

            // Generate final configuration
            const finalConfig = {
                source: sourceConfig,
                target: targetConfig,
                migration: migrationSettings
            };

            // Save configuration
            const configFile = await this.prompt('Configuration file name (default: migration-config.yaml): ');
            const fileName = configFile.trim() || 'migration-config.yaml';

            const yamlContent = SimpleYamlParser.stringify(finalConfig);
            fs.writeFileSync(fileName, yamlContent, 'utf8');

            console.log(`\n✅ Configuration saved to: ${fileName}`);
            console.log('\n🚀 Next steps:');
            console.log(`   1. Review configuration: cat ${fileName}`);
            console.log(`   2. Test migration: npm start migrate --config-file ${fileName}`);
            console.log(`   3. Generate schema: npm start generate --config-file ${fileName}`);

        } catch (error) {
            console.log(`\n❌ Configuration failed: ${error}`);
        }
    }

    /**
     * Configure a database (source or target) interactively
     */
    private async configureDatabase(type: string): Promise<DatabaseConfig> {
        console.log(`\n📝 ${type} Database Setup:`);
        
        // Provider selection
        const provider = await this.selectProvider();
        console.log(`✅ Selected provider: ${provider}`);

        // Connection details
        const config = await this.getConnectionDetails(provider);

        // Test connection and show tables/collections
        try {
            console.log(`\n🔌 Testing ${type.toLowerCase()} database connection...`);
            const connector = DatabaseFactory.createConnector(config);
            await connector.connect();
            console.log('✅ Connection successful!');

            // Show available tables/collections
            if (DatabaseFactory.isNoSQLProvider(provider)) {
                const collections = await connector.getAllCollections!();
                console.log(`\n📊 Available collections (${collections.length} found):`);
                collections.forEach((collection, index) => {
                    console.log(`   ${index + 1}. ${collection}`);
                });

                // For source database, allow collection selection
                if (type === 'Source') {
                    const selectedCollections = await this.selectCollections(collections);
                    (config as any).selectedCollections = selectedCollections;
                }
            } else {
                const tableNames = await connector.getAllTables();
                console.log(`\n📊 Available tables (${tableNames.length} found):`);
                
                // Get schema information for each table to show column count
                const tableInfos = [];
                for (const tableName of tableNames.slice(0, 10)) { // Limit to first 10 for performance
                    try {
                        const schema = await connector.getTableSchema!(tableName);
                        tableInfos.push({ name: tableName, columnCount: schema.columns.length });
                    } catch (error) {
                        tableInfos.push({ name: tableName, columnCount: 0 });
                    }
                }
                
                tableInfos.forEach((table, index) => {
                    console.log(`   ${index + 1}. ${table.name} (${table.columnCount} columns)`);
                });
                
                // Show remaining tables without detail if there are more than 10
                if (tableNames.length > 10) {
                    console.log(`   ... and ${tableNames.length - 10} more tables`);
                }

                // For source database, allow table selection
                if (type === 'Source') {
                    const selectedTables = await this.selectTablesFromNames(tableNames);
                    (config as any).selectedTables = selectedTables;
                }
            }

            await connector.disconnect();
            console.log('✅ Database connection closed');

        } catch (error) {
            console.log(`❌ Connection failed: ${error}`);
            console.log('💡 Please check your connection details and try again.');
            
            const retry = await this.prompt('Retry connection? (y/n): ');
            if (retry.toLowerCase() === 'y') {
                return await this.configureDatabase(type);
            } else {
                throw new Error(`Failed to connect to ${type.toLowerCase()} database`);
            }
        }

        return config;
    }

    /**
     * Select database provider interactively
     */
    private async selectProvider(): Promise<DatabaseProvider> {
        console.log('\n🔌 Select Database Provider:');
        console.log('1. MySQL          - Popular open-source SQL database');
        console.log('2. PostgreSQL     - Advanced open-source SQL database');
        console.log('3. SQLite         - Lightweight file-based SQL database');
        console.log('4. Microsoft SQL  - Enterprise SQL Server database');
        console.log('5. Oracle         - Enterprise Oracle database');
        console.log('6. MongoDB        - Popular NoSQL document database');
        console.log('');

        const choice = await this.prompt('Select provider (1-6): ');
        const providers: DatabaseProvider[] = ['mysql', 'postgresql', 'sqlite', 'mssql', 'oracle', 'mongodb'];
        const selectedIndex = parseInt(choice.trim()) - 1;

        if (selectedIndex < 0 || selectedIndex >= providers.length) {
            console.log('❌ Invalid selection. Please try again.');
            return await this.selectProvider();
        }

        return providers[selectedIndex];
    }

    /**
     * Get connection details for a database provider
     */
    private async getConnectionDetails(provider: DatabaseProvider): Promise<DatabaseConfig> {
        const template = DatabaseFactory.createConfigTemplate(provider) as DatabaseConfig;

        console.log(`\n📋 ${provider.toUpperCase()} Connection Details:`);

        if (provider === 'sqlite') {
            const filePath = await this.prompt('Database file path (default: ./database.sqlite): ');
            template.options = { filePath: filePath.trim() || './database.sqlite' };
            template.database = 'sqlite_db';
        } else if (provider === 'mongodb') {
            template.host = await this.promptWithDefault('Host', template.host);
            template.port = parseInt(await this.promptWithDefault('Port', template.port?.toString() || '27017'));
            template.username = await this.promptWithDefault('Username', template.username || '');
            template.password = await this.promptWithDefault('Password', '', true);
            template.database = await this.promptWithDefault('Database name', template.database);
        } else {
            // SQL databases
            template.host = await this.promptWithDefault('Host', template.host);
            template.port = parseInt(await this.promptWithDefault('Port', template.port?.toString() || '3306'));
            template.username = await this.promptWithDefault('Username', template.username || '');
            template.password = await this.promptWithDefault('Password', '', true);
            template.database = await this.promptWithDefault('Database name', template.database);
        }

        return template;
    }

    /**
     * Select tables from available table names
     */
    private async selectTablesFromNames(tableNames: string[]): Promise<string[]> {
        console.log('\n📋 Table Selection:');
        console.log('1. Select all tables');
        console.log('2. Select specific tables');
        console.log('3. Skip table selection (migrate all)');

        const choice = await this.prompt('Select option (1-3): ');

        switch (choice.trim()) {
            case '1':
                console.log(`✅ All ${tableNames.length} tables selected`);
                return tableNames;

            case '2':
                console.log('\n📝 Enter table numbers to include (comma-separated):');
                console.log('   Example: 1,3,5 for tables 1, 3, and 5');
                const selection = await this.prompt('Table numbers: ');
                
                const indices = selection.split(',').map(s => parseInt(s.trim()) - 1);
                const selectedTables = indices
                    .filter(i => i >= 0 && i < tableNames.length)
                    .map(i => tableNames[i]);

                console.log(`✅ ${selectedTables.length} tables selected:`);
                selectedTables.forEach(table => console.log(`   - ${table}`));
                return selectedTables;

            case '3':
            default:
                console.log('✅ All tables will be migrated');
                return tableNames;
        }
    }

    /**
     * Select tables from available tables (legacy method for compatibility)
     */
    private async selectTables(tables: any[]): Promise<any[]> {
        console.log('\n📋 Table Selection:');
        console.log('1. Select all tables');
        console.log('2. Select specific tables');
        console.log('3. Skip table selection (migrate all)');

        const choice = await this.prompt('Select option (1-3): ');

        switch (choice.trim()) {
            case '1':
                console.log(`✅ All ${tables.length} tables selected`);
                return tables;

            case '2':
                console.log('\n📝 Enter table numbers to include (comma-separated):');
                console.log('   Example: 1,3,5 for tables 1, 3, and 5');
                const selection = await this.prompt('Table numbers: ');
                
                const indices = selection.split(',').map(s => parseInt(s.trim()) - 1);
                const selectedTables = indices
                    .filter(i => i >= 0 && i < tables.length)
                    .map(i => tables[i]);

                console.log(`✅ ${selectedTables.length} tables selected:`);
                selectedTables.forEach(table => console.log(`   - ${table.name}`));
                return selectedTables;

            case '3':
            default:
                console.log('✅ All tables will be migrated');
                return tables;
        }
    }

    /**
     * Select collections from available collections
     */
    private async selectCollections(collections: string[]): Promise<string[]> {
        console.log('\n📋 Collection Selection:');
        console.log('1. Select all collections');
        console.log('2. Select specific collections');
        console.log('3. Skip collection selection (migrate all)');

        const choice = await this.prompt('Select option (1-3): ');

        switch (choice.trim()) {
            case '1':
                console.log(`✅ All ${collections.length} collections selected`);
                return collections;

            case '2':
                console.log('\n📝 Enter collection numbers to include (comma-separated):');
                const selection = await this.prompt('Collection numbers: ');
                
                const indices = selection.split(',').map(s => parseInt(s.trim()) - 1);
                const selectedCollections = indices
                    .filter(i => i >= 0 && i < collections.length)
                    .map(i => collections[i]);

                console.log(`✅ ${selectedCollections.length} collections selected:`);
                selectedCollections.forEach(collection => console.log(`   - ${collection}`));
                return selectedCollections;

            case '3':
            default:
                console.log('✅ All collections will be migrated');
                return collections;
        }
    }

    /**
     * Configure migration settings
     */
    private async configureMigrationSettings(sourceConfig: DatabaseConfig): Promise<any> {
        console.log('\n⚙️ Migration Options:');

        const includeData = await this.promptYesNo('Include data migration? (y/n): ');
        const batchSize = includeData ? 
            parseInt(await this.promptWithDefault('Batch size for data transfer', '1000')) : 
            1000;

        const generateScripts = await this.promptYesNo('Generate migration scripts? (y/n): ');
        const scriptPath = generateScripts ? 
            await this.promptWithDefault('Script output directory', './migration-scripts') : 
            undefined;

        const settings: any = {
            includeData,
            batchSize,
            generateScripts
        };

        if (scriptPath) {
            settings.scriptOutputPath = scriptPath;
        }

        if ((sourceConfig as any).selectedTables) {
            settings.includeTables = (sourceConfig as any).selectedTables;
        }

        if ((sourceConfig as any).selectedCollections) {
            settings.includeCollections = (sourceConfig as any).selectedCollections;
        }

        return settings;
    }

    /**
     * Prompt with default value
     */
    private async promptWithDefault(message: string, defaultValue: string, hideInput?: boolean): Promise<string> {
        const displayDefault = defaultValue ? ` (default: ${hideInput ? '***' : defaultValue})` : '';
        const answer = await this.prompt(`${message}${displayDefault}: `);
        return answer.trim() || defaultValue;
    }

    /**
     * Yes/No prompt
     */
    private async promptYesNo(message: string): Promise<boolean> {
        const answer = await this.prompt(message);
        return answer.toLowerCase().startsWith('y');
    }

    /**
     * Basic prompt
     */
    private prompt(question: string): Promise<string> {
        return new Promise((resolve) => {
            this.rl.question(question, resolve);
        });
    }

    /**
     * Close the readline interface
     */
    close(): void {
        this.rl.close();
    }
}