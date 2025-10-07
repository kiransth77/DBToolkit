import { DatabaseConfig, DatabaseProvider } from '../../types/database';
import { MySQLConnector } from './connectors/mysql';
import { PostgreSQLConnector } from './connectors/postgresql';
import { SQLiteConnector } from './connectors/sqlite';
import { MSSQLConnector } from './connectors/mssql';
import { OracleConnector } from './connectors/oracle';
import { MongoDBConnector } from './connectors/mongodb';

export interface DatabaseConnector {
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    query?(sql: string, params?: any[]): Promise<any>;
    getAllTables?(): Promise<string[]>;
    getTableSchema?(tableName: string): Promise<any>;
    generateCreateTableScript?(schema: any): string;
    // NoSQL specific methods
    getAllCollections?(): Promise<string[]>;
    getCollectionSchema?(collectionName: string): Promise<any>;
    createCollection?(schema: any): Promise<void>;
    insertDocuments?(collectionName: string, documents: any[]): Promise<void>;
    findDocuments?(collectionName: string, query?: any, options?: any): Promise<any[]>;
    generateCollectionScript?(schema: any): string;
}

export class DatabaseFactory {
    public static createConnector(config: DatabaseConfig): DatabaseConnector {
        switch (config.provider) {
            case 'mysql':
                return new MySQLConnector(config);
            
            case 'postgresql':
                return new PostgreSQLConnector(config);
            
            case 'sqlite':
                return new SQLiteConnector(config);
            
            case 'mssql':
                return new MSSQLConnector(config);
            
            case 'oracle':
                return new OracleConnector(config);
            
            case 'mongodb':
                return new MongoDBConnector(config);
            
            default:
                throw new Error(`Unsupported database provider: ${config.provider}`);
        }
    }

    public static getSupportedProviders(): DatabaseProvider[] {
        return ['mysql', 'postgresql', 'sqlite', 'mssql', 'oracle', 'mongodb'];
    }

    public static isNoSQLProvider(provider: DatabaseProvider): boolean {
        return ['mongodb'].includes(provider);
    }

    public static isSQLProvider(provider: DatabaseProvider): boolean {
        return ['mysql', 'postgresql', 'sqlite', 'mssql', 'oracle'].includes(provider);
    }

    public static getDefaultPort(provider: DatabaseProvider): number {
        const defaultPorts: { [key: string]: number } = {
            mysql: 3306,
            postgresql: 5432,
            sqlite: 0, // No port for SQLite
            mssql: 1433,
            oracle: 1521,
            mongodb: 27017,
        };

        return defaultPorts[provider] || 0;
    }

    public static getProviderDisplayName(provider: DatabaseProvider): string {
        const displayNames: { [key: string]: string } = {
            mysql: 'MySQL',
            postgresql: 'PostgreSQL',
            sqlite: 'SQLite',
            mssql: 'Microsoft SQL Server',
            oracle: 'Oracle Database',
            mongodb: 'MongoDB',
        };

        return displayNames[provider] || provider;
    }

    public static validateConfig(config: DatabaseConfig): string[] {
        const errors: string[] = [];

        if (!config.provider) {
            errors.push('Database provider is required');
        } else if (!this.getSupportedProviders().includes(config.provider)) {
            errors.push(`Unsupported database provider: ${config.provider}`);
        }

        // SQLite doesn't need host/port validation
        if (config.provider !== 'sqlite') {
            if (!config.host) {
                errors.push('Host is required');
            }

            if (!config.port || config.port <= 0) {
                errors.push('Valid port number is required');
            }

            if (!config.username) {
                errors.push('Username is required');
            }

            if (!config.password) {
                errors.push('Password is required');
            }
        }

        if (!config.database) {
            if (config.provider === 'sqlite') {
                if (!config.options?.filePath) {
                    errors.push('File path is required for SQLite');
                }
            } else {
                errors.push('Database name is required');
            }
        }

        // Provider-specific validations
        if (config.provider === 'oracle') {
            if (!config.options?.serviceName && !config.options?.sid) {
                errors.push('Either serviceName or SID is required for Oracle');
            }
        }

        return errors;
    }

    public static createConfigTemplate(provider: DatabaseProvider): Partial<DatabaseConfig> {
        const template: Partial<DatabaseConfig> = {
            provider,
            host: provider !== 'sqlite' ? 'localhost' : undefined,
            port: this.getDefaultPort(provider),
            username: provider !== 'sqlite' ? 'your_username' : undefined,
            password: provider !== 'sqlite' ? 'your_password' : undefined,
            database: 'your_database',
            options: {},
        };

        // Provider-specific templates
        switch (provider) {
            case 'sqlite':
                template.options = {
                    filePath: './database.sqlite',
                };
                break;

            case 'mssql':
                template.options = {
                    encrypt: true,
                    trustServerCertificate: false,
                };
                break;

            case 'oracle':
                template.options = {
                    serviceName: 'your_service_name',
                };
                break;

            case 'mongodb':
                template.options = {
                    authSource: 'admin',
                };
                break;
        }

        return template;
    }
}