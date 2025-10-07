# Universal Database Migration Tool

A comprehensive, database provider-independent migration tool that facilitates seamless migration between different database systems including SQL and NoSQL databases. Generate migration scripts, migrate data, and create custom YAML outputs for complex database relationships.

## 🚀 Features

- **Multi-Database Support**: MySQL, PostgreSQL, SQLite, Microsoft SQL Server, Oracle, MongoDB
- **Cross-Platform Migration**: Migrate between any supported database providers (SQL ↔ SQL, NoSQL ↔ NoSQL, SQL ↔ NoSQL)
- **Schema Migration**: Automatically convert table structures and collection schemas
- **Data Migration**: Efficient batch data migration with configurable batch sizes
- **Script Generation**: Generate migration scripts without executing them
- **Relationship Handling**: Preserve and convert database relationships
- **YAML Configuration**: Flexible configuration management with YAML/JSON support
- **CLI Interface**: Comprehensive command-line interface with extensive options

## 📋 Supported Database Providers

| Provider | Type | Default Port | Status |
|----------|------|--------------|---------|
| MySQL | SQL | 3306 | ✅ |
| PostgreSQL | SQL | 5432 | ✅ |
| SQLite | SQL | N/A | ✅ |
| Microsoft SQL Server | SQL | 1433 | ✅ |
| Oracle Database | SQL | 1521 | ✅ |
| MongoDB | NoSQL | 27017 | ✅ |

## 🔧 Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd universal-db-migration-tool
```

2. Install dependencies:
```bash
npm install
```

3. Install database drivers (choose based on your needs):
```bash
# For MySQL
npm install mysql2

# For Microsoft SQL Server
npm install mssql

# For Oracle
npm install oracledb

# For MongoDB
npm install mongodb

# PostgreSQL and SQLite drivers are included by default
```

4. Build the project:
```bash
npm run build
```

## 🚀 Quick Start

### Show Supported Providers
```bash
npm start providers
```

### Generate Configuration Template
```bash
# Generate MySQL configuration template
npm start config-template mysql --output mysql-config.yaml

# Generate configuration for any provider
npm start config-template mongodb --output mongo-config.yaml
```

### Basic Migration
```bash
# Migrate from MySQL to PostgreSQL
npm start migrate \
  --source-provider mysql --source-host localhost --source-username root --source-password password --source-database myapp \
  --target-provider postgresql --target-host localhost --target-username postgres --target-password password --target-database myapp_pg \
  --include-data
```

### Configuration File Migration
```bash
# Create a configuration file (migration-config.yaml)
npm start config-template mysql --output migration-config.yaml

# Edit the configuration file with your settings
# Then run migration:
npm start migrate --config-file migration-config.yaml --include-data
```

## 📄 Configuration

### Configuration File Format

```yaml
version: '2.0'
migration:
  source:
    provider: mysql
    host: localhost
    port: 3306
    username: your_username
    password: your_password
    database: source_database
    options:
      ssl: false
  
  target:
    provider: postgresql
    host: localhost
    port: 5432
    username: your_username
    password: your_password
    database: target_database
    options:
      ssl: false
  
  options:
    includeData: true
    batchSize: 1000
    generateScripts: false
    tables:
      - users
      - orders
      - products
```

### Provider-Specific Options

#### Microsoft SQL Server
```yaml
provider: mssql
options:
  encrypt: true
  trustServerCertificate: false
  domain: MYDOMAIN  # Optional for Windows Authentication
```

#### Oracle Database
```yaml
provider: oracle
options:
  serviceName: XE
  # OR
  sid: XE
```

#### MongoDB
```yaml
provider: mongodb
options:
  authSource: admin
  replicaSet: myReplicaSet  # Optional
  ssl: false
```

#### SQLite
```yaml
provider: sqlite
options:
  filePath: ./database.sqlite
```

## 🎯 Usage Examples

### 1. SQL Server to MongoDB Migration
```bash
npm start migrate \
  --source-provider mssql --source-host localhost --source-database NorthwindSQL \
  --target-provider mongodb --target-host localhost --target-database NorthwindMongo \
  --tables Customers,Orders,Products --include-data
```

### 2. Oracle to PostgreSQL with Script Generation
```bash
npm start migrate \
  --source-provider oracle --target-provider postgresql \
  --config-file oracle-config.yaml \
  --generate-scripts --script-output-path ./migration-scripts
```

### 3. MongoDB to MySQL (NoSQL to SQL)
```bash
npm start migrate \
  --source-provider mongodb --target-provider mysql \
  --config-file config.yaml \
  --collections users,orders --include-data --batch-size 500
```

### 4. Generate Database Schema YAML
```bash
# Generate YAML for SQL database
npm start generate --provider postgresql --config-file pg-config.yaml --output schema.yaml

# Generate YAML for specific tables
npm start generate --provider mysql --config-file mysql-config.yaml --tables users,orders --output partial-schema.yaml
```

## 🔄 Migration Types

### SQL to SQL Migration
- **Schema Conversion**: Automatically maps data types between SQL dialects
- **Constraint Preservation**: Maintains primary keys, foreign keys, and indexes
- **Relationship Mapping**: Preserves table relationships

### NoSQL to NoSQL Migration
- **Collection Transfer**: Migrates collections with indexes and validation rules
- **Document Schema**: Preserves document structure and relationships
- **Index Migration**: Transfers indexes and compound indexes

### SQL to NoSQL Migration
- **Table to Collection**: Converts SQL tables to NoSQL collections
- **Row to Document**: Transforms table rows into documents
- **Relationship Embedding**: Converts foreign keys to embedded documents or references

### NoSQL to SQL Migration
- **Collection to Table**: Converts NoSQL collections to SQL tables
- **Document Flattening**: Flattens nested documents into relational structure
- **Schema Inference**: Automatically infers SQL schema from document structure

## 📜 CLI Commands

### migrate
Migrate data between database providers.

**Options:**
- `--source-provider <provider>`: Source database provider
- `--target-provider <provider>`: Target database provider
- `--source-host <host>`: Source database host
- `--source-port <port>`: Source database port
- `--source-username <username>`: Source database username
- `--source-password <password>`: Source database password
- `--source-database <database>`: Source database name
- `--target-host <host>`: Target database host
- `--target-port <port>`: Target database port
- `--target-username <username>`: Target database username
- `--target-password <password>`: Target database password
- `--target-database <database>`: Target database name
- `--tables <tables>`: Comma-separated list of tables to migrate
- `--collections <collections>`: Comma-separated list of collections to migrate
- `--include-data`: Include data migration
- `--batch-size <size>`: Batch size for data migration (default: 1000)
- `--generate-scripts`: Generate migration scripts instead of executing
- `--script-output-path <path>`: Output path for generated scripts
- `--config-file <path>`: Path to configuration file (JSON or YAML)

### providers
Show all supported database providers with details.

### config-template
Generate a configuration template for a specific provider.

**Usage:**
```bash
npm start config-template <provider> [--output <path>]
```

### generate
Generate YAML output for database schema and relationships.

**Options:**
- `--provider <provider>`: Database provider
- `--config-file <path>`: Path to configuration file
- `--output <path>`: Output file path
- `--tables <tables>`: Specific tables to include

## 🏗️ Project Structure

```
src/
├── app.ts                          # Application entry point
├── cli/
│   ├── index.ts                    # CLI interface
│   └── commands/
│       ├── generate.ts             # YAML generation commands
│       └── migrate.ts              # Migration commands
├── config/
│   └── database.ts                 # Database configurations
├── core/
│   ├── database/
│   │   ├── factory.ts              # Database factory
│   │   ├── schema.ts               # Schema management
│   │   └── connectors/
│   │       ├── mysql.ts            # MySQL connector
│   │       ├── postgresql.ts       # PostgreSQL connector
│   │       ├── sqlite.ts           # SQLite connector
│   │       ├── mssql.ts            # SQL Server connector
│   │       ├── oracle.ts           # Oracle connector
│   │       └── mongodb.ts          # MongoDB connector
│   ├── migration/
│   │   ├── migrator.ts             # Universal migrator
│   │   ├── relationships.ts        # Relationship handling
│   │   └── validator.ts            # Migration validation
│   └── yaml/
│       ├── generator.ts            # YAML generation
│       └── parser.ts               # YAML parsing
├── types/
│   ├── database.ts                 # Database type definitions
│   ├── index.ts                    # Type exports
│   └── migration.ts                # Migration types
└── utils/
    ├── helpers.ts                  # Utility functions
    └── logger.ts                   # Logging utility
```

## 🧪 Testing

Run the test suite:
```bash
npm test
```

Run integration tests:
```bash
npm run test:integration
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests for your changes
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔮 Roadmap

- [ ] **Additional Database Support**: CouchDB, Cassandra, Redis
- [ ] **Advanced Transformations**: Custom data transformation rules
- [ ] **Web Interface**: Browser-based migration management
- [ ] **Incremental Migration**: Support for ongoing data synchronization
- [ ] **Migration Rollback**: Ability to rollback migrations
- [ ] **Performance Optimization**: Parallel processing and streaming
- [ ] **Cloud Database Support**: AWS RDS, Azure SQL, MongoDB Atlas
- [ ] **Migration Monitoring**: Real-time progress tracking and logging

## 🆘 Support

If you encounter any issues or have questions:

1. Check the [documentation](README.md)
2. Search existing [issues](../../issues)
3. Create a new issue with detailed information about your problem

## 📊 Examples Repository

Check out the `templates/` directory for configuration examples:
- `migration-config.yaml`: Basic migration configuration
- `advanced-configs.yaml`: Complex migration scenarios