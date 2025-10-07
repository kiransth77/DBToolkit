import { DatabaseConfig, TableSchema, ColumnSchema } from '../../../types/database';

export class SQLiteConnector {
    private db: any;

    constructor(private config: DatabaseConfig) {
        // Use the file path from config options
        const databasePath = config.options?.filePath || config.database;
        const sqlite3 = require('sqlite3').verbose();
        this.db = new sqlite3.Database(databasePath, (err: Error) => {
            if (err) {
                console.error('Error connecting to SQLite database:', err.message);
            } else {
                console.log('Connected to the SQLite database.');
            }
        });
    }

    public async connect(): Promise<void> {
        // SQLite connection is already established in constructor
        return Promise.resolve();
    }

    public async disconnect(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.db.close((err: Error) => {
                if (err) {
                    console.error('Error closing the SQLite database:', err.message);
                    reject(err);
                } else {
                    console.log('SQLite database connection closed.');
                    resolve();
                }
            });
        });
    }

    public async query(query: string, params: any[] = []): Promise<any> {
        return new Promise((resolve, reject) => {
            this.db.all(query, params, (err: Error, rows: any) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    public async getAllTables(): Promise<string[]> {
        const query = `
            SELECT name 
            FROM sqlite_master 
            WHERE type='table' AND name NOT LIKE 'sqlite_%'
            ORDER BY name
        `;
        const result = await this.query(query);
        return result.map((row: any) => row.name);
    }

    public async getTableSchema(tableName: string): Promise<TableSchema> {
        const query = `PRAGMA table_info(${tableName})`;
        const result = await this.query(query);
        
        const columns: ColumnSchema[] = result.map((col: any) => ({
            name: col.name,
            type: col.type,
            nullable: col.notnull === 0,
            default: col.dflt_value,
            primaryKey: col.pk === 1,
        }));

        return {
            name: tableName,
            columns,
        };
    }

    public generateCreateTableScript(schema: TableSchema): string {
        const columns = schema.columns.map(col => {
            let columnDef = `"${col.name}" ${col.type}`;
            
            if (col.primaryKey) {
                columnDef += ' PRIMARY KEY';
                if (col.autoIncrement) {
                    columnDef += ' AUTOINCREMENT';
                }
            }
            
            if (!col.nullable && !col.primaryKey) {
                columnDef += ' NOT NULL';
            }
            
            if (col.default !== undefined && col.default !== null && !col.autoIncrement) {
                columnDef += ` DEFAULT ${this.formatDefaultValue(col.default)}`;
            }
            
            return columnDef;
        }).join(',\n    ');

        return `CREATE TABLE "${schema.name}" (
    ${columns}
);`;
    }

    private formatDefaultValue(value: any): string {
        if (typeof value === 'string') {
            return `'${value.replace(/'/g, "''")}'`;
        }
        return String(value);
    }
}