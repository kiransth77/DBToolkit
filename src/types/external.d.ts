// Type declarations for external database drivers without official types

declare module 'oracledb' {
  export interface Connection {
    execute(sql: string, binds?: any[], options?: any): Promise<any>;
    close(): Promise<void>;
  }
  
  export interface Pool {
    getConnection(): Promise<Connection>;
    close(): Promise<void>;
  }
  
  export function getConnection(config: any): Promise<Connection>;
  export function createPool(config: any): Promise<Pool>;
  
  export const BIND_OUT: any;
  export const NUMBER: any;
  export const STRING: any;
  export const DATE: any;
}

declare module 'sqlite3' {
  export class Database {
    constructor(filename: string, callback?: (err: Error | null) => void);
    run(sql: string, params?: any, callback?: (err: Error | null) => void): Database;
    get(sql: string, params?: any, callback?: (err: Error | null, row?: any) => void): Database;
    all(sql: string, params?: any, callback?: (err: Error | null, rows?: any[]) => void): Database;
    close(callback?: (err: Error | null) => void): void;
  }
}

declare module 'mysql' {
  export interface Connection {
    connect(callback?: (err: Error) => void): void;
    query(sql: string, values?: any, callback?: (err: Error, results?: any, fields?: any) => void): void;
    end(callback?: (err?: Error) => void): void;
  }
  
  export interface ConnectionConfig {
    host?: string;
    port?: number;
    user?: string;
    password?: string;
    database?: string;
  }
  
  export function createConnection(config: ConnectionConfig): Connection;
}