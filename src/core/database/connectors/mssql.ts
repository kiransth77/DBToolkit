import * as sql from 'mssql';
import { DatabaseConfig, TableSchema, ColumnSchema } from '../../../types/database';

export class MSSQLConnector {
    private pool: sql.ConnectionPool | null = null;
    private config: sql.config;

    constructor(private dbConfig: DatabaseConfig) {
        this.config = {
            server: dbConfig.host,
            port: dbConfig.port,
            user: dbConfig.username,
            password: dbConfig.password,
            database: dbConfig.database,
            options: {
                encrypt: dbConfig.options?.encrypt || true,
                trustServerCertificate: dbConfig.options?.trustServerCertificate || false,
                enableArithAbort: true,
            },
            ...(dbConfig.options?.domain && { domain: dbConfig.options.domain }),
        };
    }

    public async connect(): Promise<void> {
        try {
            this.pool = new sql.ConnectionPool(this.config);
            await this.pool.connect();
            console.log('Connected to MSSQL database');
        } catch (error) {
            console.error('MSSQL connection error:', error);
            throw error;
        }
    }

    public async disconnect(): Promise<void> {
        if (this.pool) {
            await this.pool.close();
            this.pool = null;
            console.log('Disconnected from MSSQL database');
        }
    }

    public async query(sql: string, params: any[] = []): Promise<any> {
        if (!this.pool) {
            throw new Error('Database not connected');
        }

        try {
            const request = this.pool.request();
            
            // Add parameters to the request
            params.forEach((param, index) => {
                request.input(`param${index}`, param);
            });

            const result = await request.query(sql);
            return result.recordset;
        } catch (error) {
            console.error('MSSQL query error:', error);
            throw error;
        }
    }

    public async getTableSchema(tableName: string): Promise<TableSchema> {
        const columnsQuery = `
            SELECT 
                c.COLUMN_NAME,
                c.DATA_TYPE,
                c.IS_NULLABLE,
                c.COLUMN_DEFAULT,
                c.CHARACTER_MAXIMUM_LENGTH,
                c.NUMERIC_PRECISION,
                c.NUMERIC_SCALE,
                CASE WHEN pk.COLUMN_NAME IS NOT NULL THEN 1 ELSE 0 END as IS_PRIMARY_KEY,
                CASE WHEN c.COLUMNPROPERTY(OBJECT_ID(c.TABLE_SCHEMA + '.' + c.TABLE_NAME), c.COLUMN_NAME, 'IsIdentity') = 1 
                     THEN 1 ELSE 0 END as IS_IDENTITY
            FROM INFORMATION_SCHEMA.COLUMNS c
            LEFT JOIN (
                SELECT ku.TABLE_NAME, ku.COLUMN_NAME
                FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
                INNER JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE ku
                    ON tc.CONSTRAINT_TYPE = 'PRIMARY KEY' 
                    AND tc.CONSTRAINT_NAME = ku.CONSTRAINT_NAME
            ) pk ON c.TABLE_NAME = pk.TABLE_NAME AND c.COLUMN_NAME = pk.COLUMN_NAME
            WHERE c.TABLE_NAME = @param0
            ORDER BY c.ORDINAL_POSITION
        `;

        const columns = await this.query(columnsQuery, [tableName]);
        
        const columnSchemas: ColumnSchema[] = columns.map((col: any) => ({
            name: col.COLUMN_NAME,
            type: this.mapMSSQLType(col.DATA_TYPE, col.CHARACTER_MAXIMUM_LENGTH, col.NUMERIC_PRECISION, col.NUMERIC_SCALE),
            nullable: col.IS_NULLABLE === 'YES',
            default: col.COLUMN_DEFAULT,
            primaryKey: col.IS_PRIMARY_KEY === 1,
            autoIncrement: col.IS_IDENTITY === 1,
            length: col.CHARACTER_MAXIMUM_LENGTH,
            precision: col.NUMERIC_PRECISION,
            scale: col.NUMERIC_SCALE,
        }));

        return {
            name: tableName,
            columns: columnSchemas,
        };
    }

    public async getAllTables(): Promise<string[]> {
        const query = `
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_TYPE = 'BASE TABLE'
            ORDER BY TABLE_NAME
        `;
        
        const result = await this.query(query);
        return result.map((row: any) => row.TABLE_NAME);
    }

    public async getTableRelationships(tableName: string): Promise<any[]> {
        const query = `
            SELECT 
                fk.name AS constraint_name,
                tp.name AS parent_table,
                cp.name AS parent_column,
                tr.name AS referenced_table,
                cr.name AS referenced_column,
                fk.update_referential_action_desc,
                fk.delete_referential_action_desc
            FROM sys.foreign_keys fk
            INNER JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
            INNER JOIN sys.tables tp ON fkc.parent_object_id = tp.object_id
            INNER JOIN sys.columns cp ON fkc.parent_object_id = cp.object_id AND fkc.parent_column_id = cp.column_id
            INNER JOIN sys.tables tr ON fkc.referenced_object_id = tr.object_id
            INNER JOIN sys.columns cr ON fkc.referenced_object_id = cr.object_id AND fkc.referenced_column_id = cr.column_id
            WHERE tp.name = @param0
        `;

        return await this.query(query, [tableName]);
    }

    public generateCreateTableScript(schema: TableSchema): string {
        const columns = schema.columns.map(col => {
            let columnDef = `[${col.name}] ${this.mapToMSSQLType(col.type)}`;
            
            if (col.length) {
                columnDef += `(${col.length})`;
            } else if (col.precision && col.scale !== undefined) {
                columnDef += `(${col.precision}, ${col.scale})`;
            }
            
            if (col.autoIncrement) {
                columnDef += ' IDENTITY(1,1)';
            }
            
            if (!col.nullable) {
                columnDef += ' NOT NULL';
            }
            
            if (col.default !== undefined && col.default !== null && !col.autoIncrement) {
                columnDef += ` DEFAULT ${this.formatDefaultValue(col.default)}`;
            }
            
            return columnDef;
        }).join(',\n    ');

        const primaryKeys = schema.columns.filter(col => col.primaryKey).map(col => col.name);
        let primaryKeyConstraint = '';
        if (primaryKeys.length > 0) {
            primaryKeyConstraint = `,\n    PRIMARY KEY (${primaryKeys.map(pk => `[${pk}]`).join(', ')})`;
        }

        return `CREATE TABLE [${schema.name}] (
    ${columns}${primaryKeyConstraint}
);`;
    }

    private mapMSSQLType(dataType: string, length?: number, precision?: number, scale?: number): string {
        const typeMap: { [key: string]: string } = {
            'int': 'INTEGER',
            'bigint': 'BIGINT',
            'smallint': 'SMALLINT',
            'tinyint': 'TINYINT',
            'bit': 'BOOLEAN',
            'decimal': 'DECIMAL',
            'numeric': 'NUMERIC',
            'money': 'MONEY',
            'smallmoney': 'SMALLMONEY',
            'float': 'FLOAT',
            'real': 'REAL',
            'datetime': 'DATETIME',
            'datetime2': 'DATETIME2',
            'smalldatetime': 'SMALLDATETIME',
            'date': 'DATE',
            'time': 'TIME',
            'datetimeoffset': 'DATETIMEOFFSET',
            'timestamp': 'TIMESTAMP',
            'char': 'CHAR',
            'varchar': 'VARCHAR',
            'text': 'TEXT',
            'nchar': 'NCHAR',
            'nvarchar': 'NVARCHAR',
            'ntext': 'NTEXT',
            'binary': 'BINARY',
            'varbinary': 'VARBINARY',
            'image': 'IMAGE',
            'uniqueidentifier': 'UNIQUEIDENTIFIER',
            'xml': 'XML',
        };

        return typeMap[dataType.toLowerCase()] || dataType.toUpperCase();
    }

    private mapToMSSQLType(type: string): string {
        const typeMap: { [key: string]: string } = {
            'INTEGER': 'int',
            'BIGINT': 'bigint',
            'SMALLINT': 'smallint',
            'TINYINT': 'tinyint',
            'BOOLEAN': 'bit',
            'DECIMAL': 'decimal',
            'NUMERIC': 'numeric',
            'MONEY': 'money',
            'SMALLMONEY': 'smallmoney',
            'FLOAT': 'float',
            'REAL': 'real',
            'DATETIME': 'datetime2',
            'DATETIME2': 'datetime2',
            'SMALLDATETIME': 'smalldatetime',
            'DATE': 'date',
            'TIME': 'time',
            'DATETIMEOFFSET': 'datetimeoffset',
            'TIMESTAMP': 'timestamp',
            'CHAR': 'char',
            'VARCHAR': 'varchar',
            'TEXT': 'text',
            'NCHAR': 'nchar',
            'NVARCHAR': 'nvarchar',
            'NTEXT': 'ntext',
            'BINARY': 'binary',
            'VARBINARY': 'varbinary',
            'IMAGE': 'image',
            'UNIQUEIDENTIFIER': 'uniqueidentifier',
            'XML': 'xml',
        };

        return typeMap[type.toUpperCase()] || type.toLowerCase();
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