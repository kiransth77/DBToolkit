import { DatabaseConfig, DatabaseProvider } from '../types/database';

export const databaseConfigs: { [key: string]: DatabaseConfig } = {
    mysql: {
        provider: 'mysql',
        host: 'localhost',
        port: 3306,
        username: 'your_username',
        password: 'your_password',
        database: 'your_database',
        options: {
            ssl: false,
        },
    },
    
    postgresql: {
        provider: 'postgresql',
        host: 'localhost',
        port: 5432,
        username: 'your_username',
        password: 'your_password',
        database: 'your_database',
        options: {
            ssl: false,
        },
    },
    
    sqlite: {
        provider: 'sqlite',
        host: '',
        port: 0,
        username: '',
        password: '',
        database: 'database.sqlite',
        options: {
            filePath: './database.sqlite',
        },
    },
    
    mssql: {
        provider: 'mssql',
        host: 'localhost',
        port: 1433,
        username: 'your_username',
        password: 'your_password',
        database: 'your_database',
        options: {
            encrypt: true,
            trustServerCertificate: false,
            domain: '',
        },
    },
    
    oracle: {
        provider: 'oracle',
        host: 'localhost',
        port: 1521,
        username: 'your_username',
        password: 'your_password',
        database: 'your_database',
        options: {
            serviceName: 'your_service_name',
            // alternatively use SID:
            // sid: 'your_sid',
        },
    },
    
    mongodb: {
        provider: 'mongodb',
        host: 'localhost',
        port: 27017,
        username: 'your_username',
        password: 'your_password',
        database: 'your_database',
        options: {
            authSource: 'admin',
            ssl: false,
        },
    },
};

// Default configuration - can be overridden
export const defaultDatabaseConfig: DatabaseConfig = databaseConfigs.postgresql;

export function getDatabaseConfig(provider: DatabaseProvider): DatabaseConfig {
    return databaseConfigs[provider] || databaseConfigs.postgresql;
}

export function createDatabaseConfig(
    provider: DatabaseProvider,
    overrides: Partial<DatabaseConfig> = {}
): DatabaseConfig {
    const baseConfig = getDatabaseConfig(provider);
    return {
        ...baseConfig,
        ...overrides,
        options: {
            ...baseConfig.options,
            ...overrides.options,
        },
    };
}