export type DatabaseProvider = 'mysql' | 'postgresql' | 'sqlite' | 'mssql' | 'oracle' | 'mongodb';

export interface DatabaseConfig {
    provider: DatabaseProvider;
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
    // Additional options for specific providers
    options?: {
        // Oracle specific
        serviceName?: string;
        sid?: string;
        // MSSQL specific
        domain?: string;
        encrypt?: boolean;
        trustServerCertificate?: boolean;
        // MongoDB specific
        authSource?: string;
        replicaSet?: string;
        // SQLite specific
        filePath?: string;
        // SSL options for all providers
        ssl?: boolean | object;
    };
}

export interface TableSchema {
    name: string;
    columns: ColumnSchema[];
    relationships?: RelationshipSchema[];
    indexes?: IndexSchema[];
    constraints?: ConstraintSchema[];
}

export interface ColumnSchema {
    name: string;
    type: string;
    nullable?: boolean;
    default?: any;
    primaryKey?: boolean;
    autoIncrement?: boolean;
    unique?: boolean;
    length?: number;
    precision?: number;
    scale?: number;
}

export interface IndexSchema {
    name: string;
    columns: string[];
    unique?: boolean;
    type?: 'btree' | 'hash' | 'gin' | 'gist';
}

export interface ConstraintSchema {
    name: string;
    type: 'foreign_key' | 'check' | 'unique' | 'primary_key';
    columns: string[];
    referencedTable?: string;
    referencedColumns?: string[];
    onUpdate?: 'cascade' | 'restrict' | 'set_null' | 'set_default';
    onDelete?: 'cascade' | 'restrict' | 'set_null' | 'set_default';
    checkExpression?: string;
}

export interface RelationshipSchema {
    type: 'one-to-one' | 'one-to-many' | 'many-to-many';
    targetTable: string;
    foreignKey: string;
    localKey: string;
    onUpdate?: 'cascade' | 'restrict' | 'set_null' | 'set_default';
    onDelete?: 'cascade' | 'restrict' | 'set_null' | 'set_default';
}

// NoSQL specific interfaces
export interface NoSQLCollection {
    name: string;
    schema?: any; // JSON Schema for document validation
    indexes?: NoSQLIndex[];
    relationships?: NoSQLRelationship[];
}

export interface NoSQLIndex {
    name: string;
    keys: { [field: string]: 1 | -1 | 'text' | '2d' | '2dsphere' };
    options?: {
        unique?: boolean;
        sparse?: boolean;
        background?: boolean;
        expireAfterSeconds?: number;
    };
}

export interface NoSQLRelationship {
    type: 'embedded' | 'referenced';
    targetCollection?: string;
    field: string;
    localField?: string;
    foreignField?: string;
}