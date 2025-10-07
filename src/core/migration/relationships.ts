export class Relationships {
    private relationships: Map<string, string[]>;

    constructor() {
        this.relationships = new Map();
    }

    addRelationship(parent: string, child: string): void {
        if (!this.relationships.has(parent)) {
            this.relationships.set(parent, []);
        }
        this.relationships.get(parent)?.push(child);
    }

    getChildren(parent: string): string[] {
        return this.relationships.get(parent) || [];
    }

    getAllRelationships(): Map<string, string[]> {
        return this.relationships;
    }

    removeRelationship(parent: string, child: string): void {
        if (this.relationships.has(parent)) {
            const children = this.relationships.get(parent);
            this.relationships.set(parent, children?.filter(c => c !== child) || []);
        }
    }
}