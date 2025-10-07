import { SimpleCLI, CommandHandler, CLIUtils } from '../utils/cli-parser';
import { executeMigrate, showSupportedProviders, generateConfigTemplate, MigrateCommandOptions } from './commands/migrate';
import { executeGenerate, GenerateCommandOptions } from './commands/generate';
import { DatabaseProvider } from '../types/database';

class MigrateCommandHandler implements CommandHandler {
    async execute(args: string[], options: { [key: string]: string | boolean | string[] }): Promise<void> {
        const migrateOptions: MigrateCommandOptions = {
            sourceProvider: CLIUtils.getStringOption(options, 'source-provider') as DatabaseProvider,
            targetProvider: CLIUtils.getStringOption(options, 'target-provider') as DatabaseProvider,
            sourceHost: CLIUtils.getStringOption(options, 'source-host'),
            sourcePort: CLIUtils.getNumberOption(options, 'source-port'),
            sourceUsername: CLIUtils.getStringOption(options, 'source-username'),
            sourcePassword: CLIUtils.getStringOption(options, 'source-password'),
            sourceDatabase: CLIUtils.getStringOption(options, 'source-database'),
            targetHost: CLIUtils.getStringOption(options, 'target-host'),
            targetPort: CLIUtils.getNumberOption(options, 'target-port'),
            targetUsername: CLIUtils.getStringOption(options, 'target-username'),
            targetPassword: CLIUtils.getStringOption(options, 'target-password'),
            targetDatabase: CLIUtils.getStringOption(options, 'target-database'),
            tables: CLIUtils.getArrayOption(options, 'tables'),
            collections: CLIUtils.getArrayOption(options, 'collections'),
            includeData: CLIUtils.getBooleanOption(options, 'include-data'),
            batchSize: CLIUtils.getNumberOption(options, 'batch-size'),
            generateScripts: CLIUtils.getBooleanOption(options, 'generate-scripts'),
            scriptOutputPath: CLIUtils.getStringOption(options, 'script-output-path'),
            configFile: CLIUtils.getStringOption(options, 'config-file'),
        };

        await executeMigrate(migrateOptions);
    }
}

class ProvidersCommandHandler implements CommandHandler {
    async execute(args: string[], options: { [key: string]: string | boolean | string[] }): Promise<void> {
        showSupportedProviders();
    }
}

class ConfigTemplateCommandHandler implements CommandHandler {
    async execute(args: string[], options: { [key: string]: string | boolean | string[] }): Promise<void> {
        if (args.length === 0) {
            console.error('Provider is required. Usage: config-template <provider>');
            process.exit(1);
        }

        const provider = args[0] as DatabaseProvider;
        const output = CLIUtils.getStringOption(options, 'output');
        
        generateConfigTemplate(provider, output);
    }
}

class GenerateCommandHandler implements CommandHandler {
    async execute(args: string[], options: { [key: string]: string | boolean | string[] }): Promise<void> {
        const generateOptions: GenerateCommandOptions = {
            provider: CLIUtils.getStringOption(options, 'provider') as DatabaseProvider,
            configFile: CLIUtils.getStringOption(options, 'config-file'),
            output: CLIUtils.getStringOption(options, 'output'),
            tables: CLIUtils.getArrayOption(options, 'tables'),
        };

        await executeGenerate(generateOptions);
    }
}

export function runCLI(): void {
    const cli = new SimpleCLI();
    
    // Register commands
    cli.command('migrate', 'Migrate data between database providers', new MigrateCommandHandler());
    cli.command('providers', 'Show supported database providers', new ProvidersCommandHandler());
    cli.command('config-template', 'Generate configuration template', new ConfigTemplateCommandHandler());
    cli.command('generate', 'Generate YAML schema output', new GenerateCommandHandler());
    
    // Execute CLI
    cli.execute(process.argv);
}