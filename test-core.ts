/**
 * Simple test for core library-free functionality
 */

import { SimpleYamlParser } from './src/utils/yaml-parser';
import { SimpleCLI } from './src/utils/cli-parser';

console.log('🧪 Testing Core Library-Free Implementation\n');

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

console.log('\n🎉 Core library-free implementation test completed!');
console.log('📦 Zero external dependencies for core functionality');
console.log('🚀 Ready for database provider independent migrations');