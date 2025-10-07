export function formatTableName(tableName: string): string {
    return tableName.toLowerCase().replace(/ /g, '_');
}

export function validateMigrationConfig(config: any): boolean {
    // Basic validation logic for migration configuration
    if (!config || typeof config !== 'object') {
        return false;
    }
    // Add more validation rules as needed
    return true;
}

export function generateYAMLHeader(title: string): string {
    return `# Migration Configuration for ${title}\n`;
}

export function parseSoftDefinedRelationship(relationship: string): { from: string; to: string } {
    const [from, to] = relationship.split('->').map(item => item.trim());
    return { from, to };
}