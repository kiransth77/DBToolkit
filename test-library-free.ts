/**
 * Test script for library-free implementation
 * This tests our custom YAML parser and CLI without external dependencies
 */

import { SimpleYamlParser } from './src/utils/yaml-parser';
import { SimpleCLI } from './src/utils/cli-parser';
import { DatabaseFactory } from './src/core/database/factory';

console.log('🧪 Testing Library-Free Implementation\n');

// Test 1: YAML Parser
console.log('1. Testing YAML Parser...');
const yamlString = `
version: "2.0"
database:
  provider: mysql
  host: localhost
  port: 3306
  options:
    ssl: false
    timeout: 30
tables:
  - users
  - orders
  - products
`;

try {
    const parsed = SimpleYamlParser.parse(yamlString);
    console.log('✅ YAML Parsing successful:');
    console.log(JSON.stringify(parsed, null, 2));
    
    const stringified = SimpleYamlParser.stringify(parsed);
    console.log('✅ YAML Stringifying successful:');
    console.log(stringified);
} catch (error) {
    console.log('❌ YAML Parser failed:', error);
}

// Test 2: CLI Parser
console.log('\n2. Testing CLI Parser...');
const testArgs = [
    'node', 'script.js', 'migrate',
    '--source-provider', 'mysql',
    '--target-provider', 'postgresql',
    '--tables', 'users,orders',
    '--include-data',
    '--batch-size', '1000'
];

try {
    const parsed = SimpleCLI.parseArgs(testArgs);
    console.log('✅ CLI Parsing successful:');
    console.log(JSON.stringify(parsed, null, 2));
} catch (error) {
    console.log('❌ CLI Parser failed:', error);
}

// Test 3: Database Factory
console.log('\n3. Testing Database Factory...');
try {
    const providers = DatabaseFactory.getSupportedProviders();
    console.log('✅ Supported providers:', providers);
    
    providers.forEach(provider => {
        const displayName = DatabaseFactory.getProviderDisplayName(provider);
        const defaultPort = DatabaseFactory.getDefaultPort(provider);
        const isNoSQL = DatabaseFactory.isNoSQLProvider(provider);
        console.log(`  - ${provider}: ${displayName} (Port: ${defaultPort}, Type: ${isNoSQL ? 'NoSQL' : 'SQL'})`);
    });
} catch (error) {
    console.log('❌ Database Factory failed:', error);
}

console.log('\n🎉 Library-free implementation test completed!');
console.log('📦 Zero external dependencies for core functionality');
console.log('🚀 Ready for database provider independent migrations');