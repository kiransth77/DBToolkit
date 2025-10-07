/**
 * Simple YAML Parser - No external dependencies
 * Supports basic YAML parsing for configuration files
 */
export class SimpleYamlParser {
    /**
     * Parse YAML string to JavaScript object
     */
    public static parse(yamlString: string): any {
        const lines = yamlString.split('\n');
        const result: any = {};
        const stack: any[] = [{ obj: result, indent: -1, key: null }];
        let currentArrayKey: string | null = null;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Skip empty lines and comments
            if (!line.trim() || line.trim().startsWith('#')) {
                continue;
            }
            
            const indent = this.getIndentLevel(line);
            const trimmedLine = line.trim();
            
            // Handle array items
            if (trimmedLine.startsWith('- ')) {
                const value = trimmedLine.substring(2).trim();
                this.handleArrayItem(stack, indent, value, currentArrayKey);
                continue;
            }
            
            // Handle key-value pairs
            const colonIndex = trimmedLine.indexOf(':');
            if (colonIndex > 0) {
                const key = trimmedLine.substring(0, colonIndex).trim();
                const value = trimmedLine.substring(colonIndex + 1).trim();
                
                // Check if next lines are array items
                if (value === '' && i + 1 < lines.length) {
                    const nextLine = lines[i + 1];
                    if (nextLine.trim().startsWith('- ')) {
                        currentArrayKey = key;
                    }
                }
                
                this.handleKeyValue(stack, indent, key, value);
            }
        }
        
        return result;
    }
    
    /**
     * Convert JavaScript object to YAML string
     */
    public static stringify(obj: any, indent: number = 0): string {
        const spaces = '  '.repeat(indent);
        let result = '';
        
        if (Array.isArray(obj)) {
            for (const item of obj) {
                if (typeof item === 'object' && item !== null) {
                    result += `${spaces}- \n${this.stringify(item, indent + 1)}`;
                } else {
                    result += `${spaces}- ${this.formatValue(item)}\n`;
                }
            }
        } else if (typeof obj === 'object' && obj !== null) {
            for (const [key, value] of Object.entries(obj)) {
                if (Array.isArray(value)) {
                    result += `${spaces}${key}:\n`;
                    for (const item of value) {
                        if (typeof item === 'object' && item !== null) {
                            result += `${spaces}  - \n${this.stringify(item, indent + 2)}`;
                        } else {
                            result += `${spaces}  - ${this.formatValue(item)}\n`;
                        }
                    }
                } else if (typeof value === 'object' && value !== null) {
                    result += `${spaces}${key}:\n${this.stringify(value, indent + 1)}`;
                } else {
                    result += `${spaces}${key}: ${this.formatValue(value)}\n`;
                }
            }
        }
        
        return result;
    }
    
    private static getIndentLevel(line: string): number {
        let indent = 0;
        for (const char of line) {
            if (char === ' ') {
                indent++;
            } else if (char === '\t') {
                indent += 2; // Treat tab as 2 spaces
            } else {
                break;
            }
        }
        return indent;
    }
    
    private static handleArrayItem(stack: any[], indent: number, value: string, arrayKey?: string | null): void {
        // Find the correct parent for this indent level
        while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
            stack.pop();
        }
        
        const parent = stack[stack.length - 1].obj;
        
        // Find the array to add to
        let targetArray: any[];
        if (arrayKey && parent[arrayKey]) {
            if (!Array.isArray(parent[arrayKey])) {
                parent[arrayKey] = [];
            }
            targetArray = parent[arrayKey];
        } else {
            // Find the last property that should be an array
            const keys = Object.keys(parent);
            const lastKey = keys[keys.length - 1];
            if (lastKey && (parent[lastKey] === null || parent[lastKey] === undefined || 
                (typeof parent[lastKey] === 'object' && Object.keys(parent[lastKey]).length === 0))) {
                parent[lastKey] = [];
                targetArray = parent[lastKey];
            } else {
                // Create a new array property
                parent['items'] = parent['items'] || [];
                targetArray = parent['items'];
            }
        }
        
        const parsedValue = this.parseValue(value);
        targetArray.push(parsedValue);
    }
    
    private static handleKeyValue(stack: any[], indent: number, key: string, value: string): void {
        // Pop stack until we find the right parent
        while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
            stack.pop();
        }
        
        const parent = stack[stack.length - 1].obj;
        
        if (value === '' || value === null) {
            // This is a parent object
            parent[key] = {};
            stack.push({ obj: parent[key], indent, key });
        } else {
            // This is a value
            parent[key] = this.parseValue(value);
        }
    }
    
    private static findParentAtIndent(stack: any[], indent: number): any {
        // Find the parent object at the appropriate indent level
        while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
            stack.pop();
        }
        return stack[stack.length - 1];
    }
    
    private static parseValue(value: string): any {
        if (value === 'true') return true;
        if (value === 'false') return false;
        if (value === 'null' || value === '~') return null;
        if (value === '') return '';
        
        // Try to parse as number
        if (/^-?\d+$/.test(value)) {
            return parseInt(value, 10);
        }
        if (/^-?\d*\.\d+$/.test(value)) {
            return parseFloat(value);
        }
        
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
            return value.slice(1, -1);
        }
        
        return value;
    }
    
    private static formatValue(value: any): string {
        if (value === null || value === undefined) return 'null';
        if (typeof value === 'boolean') return value.toString();
        if (typeof value === 'number') return value.toString();
        if (typeof value === 'string') {
            // Quote strings that contain special characters or start with special characters
            if (value.includes(':') || value.includes('#') || value.includes('\n') || 
                value.startsWith('-') || value.startsWith('[') || value.startsWith('{')) {
                return `"${value.replace(/"/g, '\\"')}"`;
            }
            return value;
        }
        return JSON.stringify(value);
    }
}