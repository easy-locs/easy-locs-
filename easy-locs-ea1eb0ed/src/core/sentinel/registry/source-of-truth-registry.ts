import type { SourceOfTruthEntry } from "../types";

class SentinelSourceOfTruthRegistry {
  private entries = new Map<string, SourceOfTruthEntry>();

  private key(entityType: string, fieldName: string): string {
    return `${entityType}::${fieldName}`;
  }

  register(entry: SourceOfTruthEntry): void {
    const k = this.key(entry.entity_type, entry.field_name);
    if (this.entries.has(k)) {
      const existing = this.entries.get(k)!;
      if (existing.owner_table !== entry.owner_table || existing.owner_domain !== entry.owner_domain) {
        throw new Error(
          `SENTINEL: Source-of-truth conflict for ${entry.entity_type}.${entry.field_name} — ` +
          `already owned by ${existing.owner_domain}/${existing.owner_table}, ` +
          `cannot assign to ${entry.owner_domain}/${entry.owner_table}`
        );
      }
    }
    this.entries.set(k, { ...entry, updated_at: Date.now() });
  }

  get(entityType: string, fieldName: string): SourceOfTruthEntry | undefined {
    return this.entries.get(this.key(entityType, fieldName));
  }

  getAll(): SourceOfTruthEntry[] {
    return Array.from(this.entries.values());
  }

  getByDomain(domain: string): SourceOfTruthEntry[] {
    return this.getAll().filter((e) => e.owner_domain === domain);
  }

  getByEntity(entityType: string): SourceOfTruthEntry[] {
    return this.getAll().filter((e) => e.entity_type === entityType);
  }

  detectConflicts(): Array<{ entity_type: string; field_name: string; conflict: string }> {
    const seen = new Map<string, SourceOfTruthEntry>();
    const conflicts: Array<{ entity_type: string; field_name: string; conflict: string }> = [];
    for (const entry of this.entries.values()) {
      const domainKey = `${entry.entity_type}::${entry.field_name}::${entry.owner_domain}`;
      if (seen.has(domainKey)) {
        conflicts.push({
          entity_type: entry.entity_type,
          field_name: entry.field_name,
          conflict: `Multiple registrations from domain ${entry.owner_domain}`,
        });
      }
      seen.set(domainKey, entry);
    }
    return conflicts;
  }
}

export const sentinelSourceOfTruthRegistry = new SentinelSourceOfTruthRegistry();
