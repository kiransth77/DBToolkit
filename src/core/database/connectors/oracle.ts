import * as oracledb from 'oracledb';
import { DatabaseConfig, TableSchema, ColumnSchema } from '../../../types/database';

export class OracleConnector {
    private connection: oracledb.Connection | null = null;
    private config: any; // Oracle connection config

    constructor(private dbConfig: DatabaseConfig) {
        this.config = {
            user: dbConfig.username,
            password: dbConfig.password,
            connectString: this.buildConnectString(),
        };

        // Oracle configuration will be done at connection time
        console.log('Oracle connector initialized');
    }

    private buildConnectString(): string {
        const { host, port, database, options } = this.dbConfig;
        
        if (options?.serviceName) {
            return `${host}:${port}/${options.serviceName}`;
        } else if (options?.sid) {
            return `${host}:${port}:${options.sid}`;
        } else {
            return `${host}:${port}/${database}`;
        }
    }

    public async connect(): Promise<void> {
        try {
            this.connection = await oracledb.getConnection(this.config);
            console.log('Connected to Oracle database');
        } catch (error) {
            console.error('Oracle connection error:', error);
            throw error;
        }
    }

    public async disconnect(): Promise<void> {
        if (this.connection) {
            await this.connection.close();
            this.connection = null;
            console.log('Disconnected from Oracle database');
        }
    }

    public async query(sql: string, binds: any[] = []): Promise<any> {
        if (!this.connection) {
            throw new Error('Database not connected');
        }

        try {
            const result = await this.connection.execute(sql, binds);
            return result.rows;
        } catch (error) {
            console.error('Oracle query error:', error);
            throw error;
        }
    }

    public async getTableSchema(tableName: string): Promise<TableSchema> {
        const columnsQuery = `
            SELECT 
                c.COLUMN_NAME,
                c.DATA_TYPE,
                c.NULLABLE,
                c.DATA_DEFAULT,
                c.DATA_LENGTH,
                c.DATA_PRECISION,
                c.DATA_SCALE,
                CASE WHEN pk.COLUMN_NAME IS NOT NULL THEN 'Y' ELSE 'N' END as IS_PRIMARY_KEY
            FROM ALL_TAB_COLUMNS c
            LEFT JOIN (
                SELECT acc.COLUMN_NAME, acc.TABLE_NAME
                FROM ALL_CONSTRAINTS ac
                JOIN ALL_CONS_COLUMNS acc ON ac.CONSTRAINT_NAME = acc.CONSTRAINT_NAME
                WHERE ac.CONSTRAINT_TYPE = 'P'
                AND ac.TABLE_NAME = UPPER(:tableName)
            ) pk ON c.COLUMN_NAME = pk.COLUMN_NAME AND c.TABLE_NAME = pk.TABLE_NAME
            WHERE c.TABLE_NAME = UPPER(:tableName)
            ORDER BY c.COLUMN_ID
        `;

        const columns = await this.query(columnsQuery, [tableName]);
        
        const columnSchemas: ColumnSchema[] = columns.map((col: any) => ({
            name: col.COLUMN_NAME,
            type: this.mapOracleType(col.DATA_TYPE, col.DATA_LENGTH, col.DATA_PRECISION, col.DATA_SCALE),
            nullable: col.NULLABLE === 'Y',
            default: col.DATA_DEFAULT,
            primaryKey: col.IS_PRIMARY_KEY === 'Y',
            length: col.DATA_LENGTH,
            precision: col.DATA_PRECISION,
            scale: col.DATA_SCALE,
        }));

        return {
            name: tableName,
            columns: columnSchemas,
        };
    }

    public async getAllTables(): Promise<string[]> {
        const query = `
            SELECT TABLE_NAME 
            FROM ALL_TABLES 
            WHERE OWNER = USER
            ORDER BY TABLE_NAME
        `;
        
        const result = await this.query(query);
        return result.map((row: any) => row.TABLE_NAME);
    }

    public async getTableRelationships(tableName: string): Promise<any[]> {
        const query = `
            SELECT 
                ac.CONSTRAINT_NAME,
                acc1.COLUMN_NAME as LOCAL_COLUMN,
                ac.R_CONSTRAINT_NAME,
                acc2.TABLE_NAME as REFERENCED_TABLE,
                acc2.COLUMN_NAME as REFERENCED_COLUMN,
                ac.DELETE_RULE
            FROM ALL_CONSTRAINTS ac
            JOIN ALL_CONS_COLUMNS acc1 ON ac.CONSTRAINT_NAME = acc1.CONSTRAINT_NAME
            JOIN ALL_CONSTRAINTS ac2 ON ac.R_CONSTRAINT_NAME = ac2.CONSTRAINT_NAME
            JOIN ALL_CONS_COLUMNS acc2 ON ac2.CONSTRAINT_NAME = acc2.CONSTRAINT_NAME
            WHERE ac.CONSTRAINT_TYPE = 'R'
            AND ac.TABLE_NAME = UPPER(:tableName)
        `;

        return await this.query(query, [tableName]);
    }

    public generateCreateTableScript(schema: TableSchema): string {
        const columns = schema.columns.map(col => {
            let columnDef = `"${col.name}" ${this.mapToOracleType(col.type)}`;
            
            if (col.length && ['VARCHAR2', 'CHAR', 'NVARCHAR2', 'NCHAR'].includes(this.mapToOracleType(col.type))) {
                columnDef += `(${col.length})`;
            } else if (col.precision && col.scale !== undefined) {
                columnDef += `(${col.precision}, ${col.scale})`;
            } else if (col.precision) {
                columnDef += `(${col.precision})`;
            }
            
            if (!col.nullable) {
                columnDef += ' NOT NULL';
            }
            
            if (col.default !== undefined && col.default !== null) {
                columnDef += ` DEFAULT ${this.formatDefaultValue(col.default)}`;
            }
            
            return columnDef;
        }).join(',\n    ');

        const primaryKeys = schema.columns.filter(col => col.primaryKey).map(col => col.name);
        let primaryKeyConstraint = '';
        if (primaryKeys.length > 0) {
            primaryKeyConstraint = `,\n    PRIMARY KEY (${primaryKeys.map(pk => `"${pk}"`).join(', ')})`;
        }

        return `CREATE TABLE "${schema.name}" (
    ${columns}${primaryKeyConstraint}
);`;
    }

    private mapOracleType(dataType: string, length?: number, precision?: number, scale?: number): string {
        const typeMap: { [key: string]: string } = {
            'NUMBER': precision && scale !== undefined ? 'DECIMAL' : 'NUMBER',
            'VARCHAR2': 'VARCHAR',
            'NVARCHAR2': 'NVARCHAR',
            'CHAR': 'CHAR',
            'NCHAR': 'NCHAR',
            'DATE': 'DATE',
            'TIMESTAMP': 'TIMESTAMP',
            'CLOB': 'TEXT',
            'NCLOB': 'NTEXT',
            'BLOB': 'BLOB',
            'RAW': 'BINARY',
            'LONG RAW': 'LONGBINARY',
            'BFILE': 'BFILE',
            'ROWID': 'ROWID',
            'UROWID': 'UROWID',
            'XMLType': 'XML',
        };

        return typeMap[dataType] || dataType;
    }

    private mapToOracleType(type: string): string {
        const typeMap: { [key: string]: string } = {
            'INTEGER': 'NUMBER(10)',
            'BIGINT': 'NUMBER(19)',
            'SMALLINT': 'NUMBER(5)',
            'TINYINT': 'NUMBER(3)',
            'BOOLEAN': 'NUMBER(1)',
            'DECIMAL': 'NUMBER',
            'NUMERIC': 'NUMBER',
            'FLOAT': 'BINARY_FLOAT',
            'DOUBLE': 'BINARY_DOUBLE',
            'REAL': 'BINARY_FLOAT',
            'DATETIME': 'TIMESTAMP',
            'DATE': 'DATE',
            'TIME': 'TIMESTAMP',
            'TIMESTAMP': 'TIMESTAMP',
            'CHAR': 'CHAR',
            'VARCHAR': 'VARCHAR2',
            'TEXT': 'CLOB',
            'NCHAR': 'NCHAR',
            'NVARCHAR': 'NVARCHAR2',
            'NTEXT': 'NCLOB',
            'BINARY': 'RAW',
            'VARBINARY': 'RAW',
            'BLOB': 'BLOB',
            'XML': 'XMLType',
        };

        return typeMap[type.toUpperCase()] || type;
    }

    private formatDefaultValue(value: any): string {
        if (typeof value === 'string') {
            return `'${value.replace(/'/g, "''")}'`;
        }
        if (typeof value === 'boolean') {
            return value ? '1' : '0';
        }
        return String(value);
    }
}