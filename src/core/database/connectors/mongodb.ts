import { MongoClient, Db, Collection } from 'mongodb';
import { DatabaseConfig, NoSQLCollection, NoSQLIndex } from '../../../types/database';

export class MongoDBConnector {
    private client: MongoClient | null = null;
    private db: Db | null = null;
    private connectionString: string;

    constructor(private dbConfig: DatabaseConfig) {
        this.connectionString = this.buildConnectionString();
    }

    private buildConnectionString(): string {
        const { host, port, username, password, database, options } = this.dbConfig;
        
        let connectionString = 'mongodb://';
        
        if (username && password) {
            connectionString += `${encodeURIComponent(username)}:${encodeURIComponent(password)}@`;
        }
        
        connectionString += `${host}:${port}`;
        
        if (database) {
            connectionString += `/${database}`;
        }
        
        const queryParams = [];
        if (options?.authSource) {
            queryParams.push(`authSource=${options.authSource}`);
        }
        if (options?.replicaSet) {
            queryParams.push(`replicaSet=${options.replicaSet}`);
        }
        if (options?.ssl) {
            queryParams.push('ssl=true');
        }
        
        if (queryParams.length > 0) {
            connectionString += `?${queryParams.join('&')}`;
        }
        
        return connectionString;
    }

    public async connect(): Promise<void> {
        try {
            this.client = new MongoClient(this.connectionString);
            await this.client.connect();
            this.db = this.client.db(this.dbConfig.database);
            console.log('Connected to MongoDB database');
        } catch (error) {
            console.error('MongoDB connection error:', error);
            throw error;
        }
    }

    public async disconnect(): Promise<void> {
        if (this.client) {
            await this.client.close();
            this.client = null;
            this.db = null;
            console.log('Disconnected from MongoDB database');
        }
    }

    public async getAllCollections(): Promise<string[]> {
        if (!this.db) {
            throw new Error('Database not connected');
        }

        try {
            const collections = await this.db.listCollections().toArray();
            return collections.map(col => col.name);
        } catch (error) {
            console.error('MongoDB get collections error:', error);
            throw error;
        }
    }

    public async getCollectionSchema(collectionName: string): Promise<NoSQLCollection> {
        if (!this.db) {
            throw new Error('Database not connected');
        }

        try {
            const collection = this.db.collection(collectionName);
            
            // Get sample documents to infer schema
            const samples = await collection.find({}).limit(100).toArray();
            const schema = this.inferSchemaFromSamples(samples);
            
            // Get indexes
            const indexes = await collection.listIndexes().toArray();
            const indexSchemas: NoSQLIndex[] = indexes.map(idx => ({
                name: idx.name,
                keys: idx.key,
                options: {
                    unique: idx.unique,
                    sparse: idx.sparse,
                    background: idx.background,
                    expireAfterSeconds: idx.expireAfterSeconds,
                },
            }));

            return {
                name: collectionName,
                schema,
                indexes: indexSchemas,
            };
        } catch (error) {
            console.error('MongoDB get collection schema error:', error);
            throw error;
        }
    }

    public async createCollection(collectionSchema: NoSQLCollection): Promise<void> {
        if (!this.db) {
            throw new Error('Database not connected');
        }

        try {
            // Create collection with validation schema if provided
            const options: any = {};
            if (collectionSchema.schema) {
                options.validator = {
                    $jsonSchema: collectionSchema.schema
                };
            }

            await this.db.createCollection(collectionSchema.name, options);

            // Create indexes
            if (collectionSchema.indexes && collectionSchema.indexes.length > 0) {
                const collection = this.db.collection(collectionSchema.name);
                for (const index of collectionSchema.indexes) {
                    await collection.createIndex(index.keys, index.options);
                }
            }

            console.log(`Collection ${collectionSchema.name} created successfully`);
        } catch (error) {
            console.error('MongoDB create collection error:', error);
            throw error;
        }
    }

    public async insertDocuments(collectionName: string, documents: any[]): Promise<void> {
        if (!this.db) {
            throw new Error('Database not connected');
        }

        try {
            const collection = this.db.collection(collectionName);
            if (documents.length === 1) {
                await collection.insertOne(documents[0]);
            } else {
                await collection.insertMany(documents);
            }
            console.log(`Inserted ${documents.length} documents into ${collectionName}`);
        } catch (error) {
            console.error('MongoDB insert documents error:', error);
            throw error;
        }
    }

    public async findDocuments(collectionName: string, query: any = {}, options: any = {}): Promise<any[]> {
        if (!this.db) {
            throw new Error('Database not connected');
        }

        try {
            const collection = this.db.collection(collectionName);
            return await collection.find(query, options).toArray();
        } catch (error) {
            console.error('MongoDB find documents error:', error);
            throw error;
        }
    }

    public async updateDocuments(collectionName: string, filter: any, update: any, options: any = {}): Promise<any> {
        if (!this.db) {
            throw new Error('Database not connected');
        }

        try {
            const collection = this.db.collection(collectionName);
            return await collection.updateMany(filter, update, options);
        } catch (error) {
            console.error('MongoDB update documents error:', error);
            throw error;
        }
    }

    public async deleteDocuments(collectionName: string, filter: any): Promise<any> {
        if (!this.db) {
            throw new Error('Database not connected');
        }

        try {
            const collection = this.db.collection(collectionName);
            return await collection.deleteMany(filter);
        } catch (error) {
            console.error('MongoDB delete documents error:', error);
            throw error;
        }
    }

    public generateCollectionScript(schema: NoSQLCollection): string {
        let script = `// Create collection: ${schema.name}\n`;
        
        if (schema.schema) {
            script += `db.createCollection("${schema.name}", {\n`;
            script += `  validator: {\n`;
            script += `    $jsonSchema: ${JSON.stringify(schema.schema, null, 6)}\n`;
            script += `  }\n`;
            script += `});\n\n`;
        } else {
            script += `db.createCollection("${schema.name}");\n\n`;
        }

        // Add index creation scripts
        if (schema.indexes && schema.indexes.length > 0) {
            script += `// Create indexes\n`;
            for (const index of schema.indexes) {
                const keys = JSON.stringify(index.keys);
                const options = index.options ? `, ${JSON.stringify(index.options)}` : '';
                script += `db.${schema.name}.createIndex(${keys}${options});\n`;
            }
        }

        return script;
    }

    private inferSchemaFromSamples(samples: any[]): any {
        if (samples.length === 0) {
            return {};
        }

        const properties: any = {};
        const requiredFields = new Set<string>();

        // Analyze all samples to build schema
        samples.forEach(sample => {
            Object.keys(sample).forEach(key => {
                if (key === '_id') return; // Skip MongoDB's _id field

                const value = sample[key];
                const type = this.getJsonSchemaType(value);
                
                if (!properties[key]) {
                    properties[key] = { type };
                    requiredFields.add(key);
                } else {
                    // If field appears in all samples, it's required
                    if (!requiredFields.has(key)) {
                        requiredFields.delete(key);
                    }
                    
                    // Handle type conflicts by using anyOf
                    if (properties[key].type !== type) {
                        if (!properties[key].anyOf) {
                            properties[key] = {
                                anyOf: [
                                    { type: properties[key].type },
                                    { type }
                                ]
                            };
                            delete properties[key].type;
                        } else {
                            const existingTypes = properties[key].anyOf.map((t: any) => t.type);
                            if (!existingTypes.includes(type)) {
                                properties[key].anyOf.push({ type });
                            }
                        }
                    }
                }
            });
        });

        // Only include fields that appear in all samples as required
        const finalRequired = Array.from(requiredFields).filter(field => 
            samples.every(sample => sample.hasOwnProperty(field))
        );

        return {
            bsonType: 'object',
            properties,
            required: finalRequired.length > 0 ? finalRequired : undefined,
        };
    }

    private getJsonSchemaType(value: any): string {
        if (value === null) return 'null';
        if (typeof value === 'string') return 'string';
        if (typeof value === 'number') return Number.isInteger(value) ? 'int' : 'double';
        if (typeof value === 'boolean') return 'bool';
        if (Array.isArray(value)) return 'array';
        if (typeof value === 'object') {
            if (value instanceof Date) return 'date';
            return 'object';
        }
        return 'string'; // fallback
    }
}