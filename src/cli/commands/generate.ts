import { YamlGenerator } from '../../core/yaml/generator';
import { Relationships } from '../../core/migration/relationships';
import { DatabaseFactory } from '../../core/database/factory';
import { DatabaseConfig, DatabaseProvider } from '../../types/database';
import { Logger } from '../../utils/logger';
import { SimpleYamlParser } from '../../utils/yaml-parser';
import * as fs from 'fs';

export interface GenerateCommandOptions {
    provider?: DatabaseProvider;
    configFile?: string;
    output?: string;
    tables?: string[];
}

export async function executeGenerate(options: GenerateCommandOptions): Promise<void> {
    const logger = new Logger();
    const yamlGenerator = new YamlGenerator();

    try {
        logger.info('Generating YAML configuration...');

        let config: DatabaseConfig;

        if (options.configFile) {
            const configContent = fs.readFileSync(options.configFile, 'utf8');
            if (options.configFile.endsWith('.json')) {
                config = JSON.parse(configContent);
            } else {
                // Use our custom YAML parser
                const parsed = SimpleYamlParser.parse(configContent);
                config = parsed.source || parsed.migration?.source || parsed;
            }
        } else if (options.provider) {
            config = DatabaseFactory.createConfigTemplate(options.provider) as DatabaseConfig;
        } else {
            logger.error('Either --provider or --config-file must be specified');
            return;
        }

        // Create connector and get schema information
        const connector = DatabaseFactory.createConnector(config);
        await connector.connect();

        try {
            let yamlOutput: string;

            if (DatabaseFactory.isNoSQLProvider(config.provider)) {
                // Generate YAML for NoSQL collections
                const collections = await connector.getAllCollections!();
                const collectionsToProcess = options.tables || collections; // Use tables option for collection names
                
                yamlOutput = await yamlGenerator.generateForNoSQL(connector, collectionsToProcess);
            } else {
                // Generate YAML for SQL tables
                const tables = await connector.getAllTables!();
                const tablesToProcess = options.tables || tables;
                
                yamlOutput = await yamlGenerator.generateForSQL(connector, tablesToProcess);
            }

            if (options.output) {
                fs.writeFileSync(options.output, yamlOutput, 'utf8');
                logger.info(`YAML configuration saved to: ${options.output}`);
            } else {
                console.log(yamlOutput);
            }

        } finally {
            await connector.disconnect();
        }

    } catch (error) {
        logger.error('Failed to generate YAML configuration:', error);
    }
}

// Legacy function for backward compatibility
export function executeGenerateCompatible(tableName: string, relationships: Relationships): string {
    const yamlGenerator = new YamlGenerator();
    const yamlOutput = yamlGenerator.generate(tableName, relationships);
    return yamlOutput;
}