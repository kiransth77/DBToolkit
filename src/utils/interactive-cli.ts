/**
 * Interactive CLI Interface - Library-Free Implementation
 * Provides user-friendly prompts when no parameters are passed
 */

import * as readline from 'readline';
import { DatabaseProvider } from '../types/database';

export class InteractiveCLI {
    private rl: readline.Interface;

    constructor() {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }

    /**
     * Main interactive menu
     */
    async showMainMenu(): Promise<void> {
        console.log('\n🚀 Universal Database Migration Tool - Interactive Mode');
        console.log('===================================================');
        console.log('');
        console.log('🚫 Library-Free | 🔌 6 Database Providers | ⚡ High Performance');
        console.log('');
        console.log('Available Commands:');
        console.log('1. 🗄️  Show supported database providers');
        console.log('2. 📝 Generate configuration template (NEW: Database-aware!)');
        console.log('3. 📊 Generate schema from database');
        console.log('4. 🔄 Migrate data between databases');
        console.log('5. ❓ Show help');
        console.log('6. 🚪 Exit');
        console.log('');
        console.log('💡 NEW in v2.0: Option 2 now connects to your database and shows');
        console.log('   available tables/collections for interactive selection!');
        console.log('');

        const choice = await this.prompt('Select an option (1-6): ');
        
        switch (choice.trim()) {
            case '1':
                await this.showProviders();
                break;
            case '2':
                await this.generateConfigTemplate();
                break;
            case '3':
                await this.generateSchema();
                break;
            case '4':
                await this.migrateData();
                break;
            case '5':
                await this.showHelp();
                break;
            case '6':
                console.log('👋 Goodbye!');
                this.close();
                return;
            default:
                console.log('❌ Invalid option. Please select 1-6.');
                await this.showMainMenu();
        }
    }

    /**
     * Show supported database providers
     */
    async showProviders(): Promise<void> {
        console.log('\n🔌 Supported Database Providers:');
        console.log('================================');
        
        const { showSupportedProviders } = require('../cli/commands/migrate');
        showSupportedProviders();
        
        await this.pressEnterToContinue();
        await this.showMainMenu();
    }

    /**
     * Generate configuration template interactively
     */
    async generateConfigTemplate(): Promise<void> {
        console.log('\n📝 Configuration Template Generator');
        console.log('==================================');
        console.log('');
        console.log('Choose configuration mode:');
        console.log('1. 🔧 Interactive mode (connect to database and select tables)');
        console.log('2. 📄 Template mode (generate basic template only)');
        console.log('');

        const mode = await this.prompt('Select mode (1-2): ');

        if (mode.trim() === '1') {
            // Use interactive configuration generator
            const { InteractiveConfigGenerator } = require('./interactive-config');
            const configGen = new InteractiveConfigGenerator();
            try {
                await configGen.generateInteractiveConfig();
            } catch (error) {
                console.log(`❌ Interactive configuration failed: ${error}`);
            } finally {
                configGen.close();
            }
        } else {
            // Use basic template mode
            await this.generateBasicTemplate();
        }

        await this.pressEnterToContinue();
        await this.showMainMenu();
    }

    /**
     * Generate basic configuration template
     */
    private async generateBasicTemplate(): Promise<void> {
        console.log('\n📄 Basic Template Generator');
        console.log('===========================');
        console.log('');
        console.log('Available providers:');
        console.log('1. mysql     - MySQL Database');
        console.log('2. postgresql - PostgreSQL Database');
        console.log('3. sqlite    - SQLite Database');
        console.log('4. mssql     - Microsoft SQL Server');
        console.log('5. oracle    - Oracle Database');
        console.log('6. mongodb   - MongoDB (NoSQL)');
        console.log('');

        const providerChoice = await this.prompt('Select provider (1-6): ');
        const providers = ['mysql', 'postgresql', 'sqlite', 'mssql', 'oracle', 'mongodb'];
        const selectedProvider = providers[parseInt(providerChoice.trim()) - 1];

        if (!selectedProvider) {
            console.log('❌ Invalid provider selection.');
            await this.generateBasicTemplate();
            return;
        }

        const outputFile = await this.prompt(`Output file (default: ${selectedProvider}-config.yaml): `);
        const finalOutput = outputFile.trim() || `${selectedProvider}-config.yaml`;

        try {
            const { generateConfigTemplate } = require('../cli/commands/migrate');
            generateConfigTemplate(selectedProvider as any, finalOutput);
            console.log(`✅ Configuration template saved to: ${finalOutput}`);
        } catch (error) {
            console.log(`❌ Error generating template: ${error}`);
        }
    }

    /**
     * Generate schema interactively
     */
    async generateSchema(): Promise<void> {
        console.log('\n📊 Schema Generator');
        console.log('==================');
        console.log('');
        
        const configFile = await this.prompt('Configuration file path: ');
        if (!configFile.trim()) {
            console.log('❌ Configuration file is required.');
            await this.generateSchema();
            return;
        }

        const outputFile = await this.prompt('Output file (default: schema.yaml): ');
        const finalOutput = outputFile.trim() || 'schema.yaml';

        try {
            const { executeGenerate } = require('../cli/commands/generate');
            await executeGenerate({
                configFile: configFile.trim(),
                output: finalOutput
            });
            console.log(`✅ Schema saved to: ${finalOutput}`);
        } catch (error) {
            console.log(`❌ Error generating schema: ${error}`);
        }

        await this.pressEnterToContinue();
        await this.showMainMenu();
    }

    /**
     * Migrate data interactively
     */
    async migrateData(): Promise<void> {
        console.log('\n🔄 Database Migration');
        console.log('====================');
        console.log('');
        console.log('Migration Options:');
        console.log('1. Use configuration file');
        console.log('2. Enter connection details manually');
        console.log('');

        const choice = await this.prompt('Select option (1-2): ');

        if (choice.trim() === '1') {
            const configFile = await this.prompt('Configuration file path: ');
            if (!configFile.trim()) {
                console.log('❌ Configuration file is required.');
                await this.migrateData();
                return;
            }

            try {
                const { executeMigrate } = require('../cli/commands/migrate');
                await executeMigrate({ configFile: configFile.trim() });
                console.log('✅ Migration completed successfully!');
            } catch (error) {
                console.log(`❌ Migration failed: ${error}`);
            }
        } else if (choice.trim() === '2') {
            console.log('📝 Manual migration setup not yet implemented in interactive mode.');
            console.log('💡 Tip: Use configuration file option or CLI commands directly.');
        } else {
            console.log('❌ Invalid option.');
            await this.migrateData();
            return;
        }

        await this.pressEnterToContinue();
        await this.showMainMenu();
    }

    /**
     * Show help information
     */
    async showHelp(): Promise<void> {
        console.log('\n❓ Help - Universal Database Migration Tool');
        console.log('==========================================');
        console.log('');
        console.log('🚫 Library-Free Features:');
        console.log('• Zero external dependencies (except database drivers)');
        console.log('• Custom YAML parser and CLI interface');
        console.log('• High performance and security');
        console.log('');
        console.log('🔌 Supported Database Providers:');
        console.log('• MySQL, PostgreSQL, SQLite (SQL databases)');
        console.log('• Microsoft SQL Server, Oracle Database (Enterprise SQL)');
        console.log('• MongoDB (NoSQL document database)');
        console.log('');
        console.log('📖 Command Line Usage:');
        console.log('• npm start providers                    - List supported providers');
        console.log('• npm start config-template <provider>   - Generate config template');
        console.log('• npm start generate --config <file>     - Generate schema YAML');
        console.log('• npm start migrate --config <file>      - Run migration');
        console.log('');
        console.log('📁 Example Workflow:');
        console.log('1. Generate config: npm start config-template mysql');
        console.log('2. Edit configuration with your database details');
        console.log('3. Generate schema: npm start generate --config config.yaml');
        console.log('4. Run migration: npm start migrate --config config.yaml');
        console.log('');
        console.log('🔗 Repository: https://github.com/kiransth77/DBToolkit');

        await this.pressEnterToContinue();
        await this.showMainMenu();
    }

    /**
     * Prompt user for input
     */
    private prompt(question: string): Promise<string> {
        return new Promise((resolve) => {
            this.rl.question(question, resolve);
        });
    }

    /**
     * Wait for user to press Enter
     */
    private async pressEnterToContinue(): Promise<void> {
        console.log('');
        await this.prompt('Press Enter to continue...');
    }

    /**
     * Close the readline interface
     */
    close(): void {
        this.rl.close();
    }
}