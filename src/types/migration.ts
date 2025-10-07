export interface MigrationConfig {
    sourceDatabase: string;
    targetDatabase: string;
    tables: TableMigrationConfig[];
}

export interface TableMigrationConfig {
    tableName: string;
    relationships?: RelationshipConfig[];
}

export interface RelationshipConfig {
    type: 'one-to-one' | 'one-to-many' | 'many-to-many';
    sourceTable: string;
    targetTable: string;
    sourceKey: string;
    targetKey: string;
}