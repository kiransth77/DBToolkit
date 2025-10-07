import { MySQLConnector } from '../../src/core/database/connectors/mysql';
import { PostgreSQLConnector } from '../../src/core/database/connectors/postgresql';
import { SQLiteConnector } from '../../src/core/database/connectors/sqlite';

describe('Database Integration Tests', () => {
    let mysqlConnector: MySQLConnector;
    let postgresqlConnector: PostgreSQLConnector;
    let sqliteConnector: SQLiteConnector;

    beforeAll(() => {
        mysqlConnector = new MySQLConnector();
        postgresqlConnector = new PostgreSQLConnector();
        sqliteConnector = new SQLiteConnector();
    });

    test('MySQL connection should be established', async () => {
        const connection = await mysqlConnector.connect();
        expect(connection).toBeTruthy();
        await mysqlConnector.disconnect();
    });

    test('PostgreSQL connection should be established', async () => {
        const connection = await postgresqlConnector.connect();
        expect(connection).toBeTruthy();
        await postgresqlConnector.disconnect();
    });

    test('SQLite connection should be established', async () => {
        const connection = await sqliteConnector.connect();
        expect(connection).toBeTruthy();
        await sqliteConnector.disconnect();
    });
});