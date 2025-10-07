import { UniversalMigrator, MigrationOptions } from '../../core/migration/migrator';
import { DatabaseFactory } from '../../core/database/factory';
import { DatabaseConfig, DatabaseProvider } from '../../types/database';
import { Logger } from '../../utils/logger';
import { SimpleYamlParser } from '../../utils/yaml-parser';
import * as fs from 'fs';
import * as path from 'path';

export interface MigrateCommandOptions {
    sourceProvider: DatabaseProvider;
    targetProvider: DatabaseProvider;
    sourceHost?: string;
    sourcePort?: number;
    sourceUsername?: string;
    sourcePassword?: string;
    sourceDatabase?: string;
    targetHost?: string;
    targetPort?: number;
    targetUsername?: string;
    targetPassword?: string;
    targetDatabase?: string;
    tables?: string[];
    collections?: string[];
    includeData?: boolean;
    batchSize?: number;
    generateScripts?: boolean;
    scriptOutputPath?: string;
    configFile?: string;
}

export async function executeMigrate(options: MigrateCommandOptions) {
    const logger = new Logger();
    const migrator = new UniversalMigrator();

    try {
        logger.info('Starting universal database migration...');

        // Load configuration
        let sourceConfig: DatabaseConfig;
        let targetConfig: DatabaseConfig;

        if (options.configFile) {
            const configs = await loadConfigFromFile(options.configFile);
            sourceConfig = configs.source;
            targetConfig = configs.target;
        } else {
            sourceConfig = buildConfigFromOptions(options, 'source');
            targetConfig = buildConfigFromOptions(options, 'target');
        }

        // Validate configurations
        const sourceErrors = DatabaseFactory.validateConfig(sourceConfig);
        const targetErrors = DatabaseFactory.validateConfig(targetConfig);

        if (sourceErrors.length > 0) {
            logger.error('Source configuration errors:');
            sourceErrors.forEach(error => logger.error(`  - ${error}`));
            return;
        }

        if (targetErrors.length > 0) {
            logger.error('Target configuration errors:');
            targetErrors.forEach(error => logger.error(`  - ${error}`));
            return;
        }

        // Prepare migration options
        const migrationOptions: MigrationOptions = {
            sourceConfig,
            targetConfig,
            tables: options.tables,
            collections: options.collections,
            includeData: options.includeData || false,
            batchSize: options.batchSize || 1000,
            generateScripts: options.generateScripts || false,
            scriptOutputPath: options.scriptOutputPath,
        };

        // Execute migration
        const result = await migrator.migrate(migrationOptions);

        // Display results
        logger.info('Migration completed!');
        logger.info(`Tables processed: ${result.tablesProcessed}`);
        logger.info(`Collections processed: ${result.collectionsProcessed}`);
        logger.info(`Records migrated: ${result.recordsMigrated}`);

        if (result.errors.length > 0) {
            logger.error('Migration completed with errors:');
            result.errors.forEach(error => logger.error(`  - ${error}`));
        }

        // Save scripts if generated
        if (options.generateScripts && result.scripts && result.scripts.length > 0) {
            const outputPath = options.scriptOutputPath || './migration-scripts';
            await saveScripts(result.scripts, outputPath);
            logger.info(`Scripts saved to: ${outputPath}`);
        }

        if (result.success) {
            logger.info('Migration completed successfully!');
        } else {
            logger.error('Migration completed with errors.');
        }

    } catch (error) {
        logger.error('Migration failed:', error);
    }
}

function buildConfigFromOptions(options: MigrateCommandOptions, type: 'source' | 'target'): DatabaseConfig {
    const provider = type === 'source' ? options.sourceProvider : options.targetProvider;
    const template = DatabaseFactory.createConfigTemplate(provider);

    return {
        provider,
        host: type === 'source' ? (options.sourceHost || template.host!) : (options.targetHost || template.host!),
        port: type === 'source' ? (options.sourcePort || template.port!) : (options.targetPort || template.port!),
        username: type === 'source' ? (options.sourceUsername || template.username!) : (options.targetUsername || template.username!),
        password: type === 'source' ? (options.sourcePassword || template.password!) : (options.targetPassword || template.password!),
        database: type === 'source' ? (options.sourceDatabase || template.database!) : (options.targetDatabase || template.database!),
        options: template.options,
    };
}

async function loadConfigFromFile(configPath: string): Promise<{ source: DatabaseConfig; target: DatabaseConfig }> {
    const configContent = fs.readFileSync(configPath, 'utf8');
    let config;

    if (path.extname(configPath) === '.json') {
        config = JSON.parse(configContent);
    } else {
        // Use our custom YAML parser
        config = SimpleYamlParser.parse(configContent);
    }

    return {
        source: config.source || config.migration?.source,
        target: config.target || config.migration?.target,
    };
}

async function saveScripts(scripts: string[], outputPath: string): Promise<void> {
    if (!fs.existsSync(outputPath)) {
        fs.mkdirSync(outputPath, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `migration-${timestamp}.sql`;
    const filePath = path.join(outputPath, fileName);

    const content = scripts.join('\n\n-- ========================================\n\n');
    fs.writeFileSync(filePath, content, 'utf8');
}

export function showSupportedProviders(): void {
    const logger = new Logger();
    const providers = DatabaseFactory.getSupportedProviders();
    
    logger.info('Supported database providers:');
    providers.forEach(provider => {
        const displayName = DatabaseFactory.getProviderDisplayName(provider);
        const defaultPort = DatabaseFactory.getDefaultPort(provider);
        const isNoSQL = DatabaseFactory.isNoSQLProvider(provider);
        
        logger.info(`  - ${provider}: ${displayName} (Port: ${defaultPort}, Type: ${isNoSQL ? 'NoSQL' : 'SQL'})`);
    });
}

export function generateConfigTemplate(provider: DatabaseProvider, outputPath?: string): void {
    const logger = new Logger();
    const template = DatabaseFactory.createConfigTemplate(provider);
    
    const config = {
        source: template,
        target: {
            ...template,
            database: 'target_database',
        },
    };

    // Use our custom YAML parser
    const configContent = SimpleYamlParser.stringify(config);
    
    if (outputPath) {
        fs.writeFileSync(outputPath, configContent, 'utf8');
        logger.info(`Configuration template saved to: ${outputPath}`);
    } else {
        console.log(configContent);
    }
}