#!/usr/bin/env node

/**
 * Universal Database Migration Tool - Library-Free Edition
 * Entry point for the CLI application
 */

import { runCLI } from './cli';

// Run the CLI interface
try {
    runCLI();
} catch (error) {
    console.error('❌ Application failed:', error.message);
    process.exit(1);
}