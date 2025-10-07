/**
 * Simple CLI Argument Parser - No external dependencies
 * Supports command parsing and argument handling
 */

export interface ParsedArgs {
    command: string;
    args: string[];
    options: { [key: string]: string | boolean | string[] };
}

export class SimpleCLI {
    private commands: Map<string, CommandHandler> = new Map();
    
    /**
     * Register a command with its handler
     */
    public command(name: string, description: string, handler: CommandHandler): void {
        this.commands.set(name, handler);
    }
    
    /**
     * Parse command line arguments
     */
    public static parseArgs(argv: string[]): ParsedArgs {
        const args = argv.slice(2); // Remove 'node' and script name
        
        if (args.length === 0) {
            return { command: 'help', args: [], options: {} };
        }
        
        const command = args[0];
        const remaining = args.slice(1);
        const options: { [key: string]: string | boolean | string[] } = {};
        const positionalArgs: string[] = [];
        
        for (let i = 0; i < remaining.length; i++) {
            const arg = remaining[i];
            
            if (arg.startsWith('--')) {
                const optionName = arg.substring(2);
                
                // Check if next argument is a value (doesn't start with --)
                if (i + 1 < remaining.length && !remaining[i + 1].startsWith('-')) {
                    const value = remaining[i + 1];
                    
                    // Check if it's a comma-separated list
                    if (value.includes(',')) {
                        options[optionName] = value.split(',').map(v => v.trim());
                    } else {
                        options[optionName] = value;
                    }
                    i++; // Skip the value
                } else {
                    // Boolean flag
                    options[optionName] = true;
                }
            } else if (arg.startsWith('-')) {
                // Short option
                const optionName = arg.substring(1);
                options[optionName] = true;
            } else {
                // Positional argument
                positionalArgs.push(arg);
            }
        }
        
        return {
            command,
            args: positionalArgs,
            options
        };
    }
    
    /**
     * Execute the CLI with given arguments
     */
    public async execute(argv: string[]): Promise<void> {
        const parsed = SimpleCLI.parseArgs(argv);
        
        if (parsed.command === 'help' || parsed.options.help || parsed.options.h) {
            this.showHelp();
            return;
        }
        
        const handler = this.commands.get(parsed.command);
        if (!handler) {
            console.error(`Unknown command: ${parsed.command}`);
            console.error('Use --help to see available commands');
            process.exit(1);
        }
        
        try {
            await handler.execute(parsed.args, parsed.options);
        } catch (error) {
            console.error(`Error executing command '${parsed.command}':`, error);
            process.exit(1);
        }
    }
    
    /**
     * Show help information
     */
    private showHelp(): void {
        console.log('Universal Database Migration Tool');
        console.log('');
        console.log('Usage: npm start <command> [options]');
        console.log('');
        console.log('Commands:');
        console.log('  providers                          Show supported database providers');
        console.log('  config-template <provider>         Generate configuration template');
        console.log('  migrate                            Migrate data between databases');
        console.log('  generate                           Generate YAML schema output');
        console.log('  help                               Show this help message');
        console.log('');
        console.log('Migration Options:');
        console.log('  --source-provider <provider>      Source database provider');
        console.log('  --target-provider <provider>      Target database provider');
        console.log('  --source-host <host>              Source database host');
        console.log('  --source-port <port>              Source database port');
        console.log('  --source-username <username>      Source database username');
        console.log('  --source-password <password>      Source database password');
        console.log('  --source-database <database>      Source database name');
        console.log('  --target-host <host>              Target database host');
        console.log('  --target-port <port>              Target database port');
        console.log('  --target-username <username>      Target database username');
        console.log('  --target-password <password>      Target database password');
        console.log('  --target-database <database>      Target database name');
        console.log('  --tables <tables>                 Comma-separated list of tables');
        console.log('  --collections <collections>       Comma-separated list of collections');
        console.log('  --include-data                    Include data migration');
        console.log('  --batch-size <size>               Batch size for data migration');
        console.log('  --generate-scripts                Generate scripts instead of executing');
        console.log('  --script-output-path <path>       Output path for scripts');
        console.log('  --config-file <path>              Configuration file path');
        console.log('');
        console.log('Examples:');
        console.log('  npm start providers');
        console.log('  npm start config-template mysql --output config.yaml');
        console.log('  npm start migrate --source-provider mysql --target-provider postgresql --include-data');
        console.log('  npm start migrate --config-file config.yaml --include-data');
    }
}

export interface CommandHandler {
    execute(args: string[], options: { [key: string]: string | boolean | string[] }): Promise<void>;
}

/**
 * Utility functions for CLI
 */
export class CLIUtils {
    /**
     * Get string option value
     */
    public static getStringOption(options: { [key: string]: any }, key: string, defaultValue?: string): string | undefined {
        const value = options[key];
        if (typeof value === 'string') {
            return value;
        }
        return defaultValue;
    }
    
    /**
     * Get number option value
     */
    public static getNumberOption(options: { [key: string]: any }, key: string, defaultValue?: number): number | undefined {
        const value = options[key];
        if (typeof value === 'string') {
            const parsed = parseInt(value, 10);
            return isNaN(parsed) ? defaultValue : parsed;
        }
        if (typeof value === 'number') {
            return value;
        }
        return defaultValue;
    }
    
    /**
     * Get boolean option value
     */
    public static getBooleanOption(options: { [key: string]: any }, key: string): boolean {
        return Boolean(options[key]);
    }
    
    /**
     * Get array option value
     */
    public static getArrayOption(options: { [key: string]: any }, key: string): string[] | undefined {
        const value = options[key];
        if (Array.isArray(value)) {
            return value;
        }
        if (typeof value === 'string') {
            return value.split(',').map(v => v.trim());
        }
        return undefined;
    }
}