import type { TaxonomyRegistryEntry, TaxonomyAliasEntry } from "../types";

class SentinelTaxonomyRegistry {
  private entries = new Map<string, TaxonomyRegistryEntry>();
  private aliases = new Map<string, TaxonomyAliasEntry>();
  private pathIndex = new Map<string, string>();

  register(entry: TaxonomyRegistryEntry): void {
    this.entries.set(entry.taxonomy_id, entry);
    this.pathIndex.set(entry.canonical_path, entry.taxonomy_id);
  }

  registerAlias(alias: TaxonomyAliasEntry): void {
    this.aliases.set(alias.alias_id, alias);
  }

  get(taxonomyId: string): TaxonomyRegistryEntry | undefined {
    return this.entries.get(taxonomyId);
  }

  getByPath(canonicalPath: string): TaxonomyRegistryEntry | undefined {
    const id = this.pathIndex.get(canonicalPath);
    return id ? this.entries.get(id) : undefined;
  }

  getAll(): TaxonomyRegistryEntry[] {
    return Array.from(this.entries.values());
  }

  getActive(): TaxonomyRegistryEntry[] {
    return this.getAll().filter((e) => e.active);
  }

  getByFamily(family: string): TaxonomyRegistryEntry[] {
    return this.getAll().filter((e) => e.family === family);
  }

  getChildren(parentPath: string): TaxonomyRegistryEntry[] {
    return this.getAll().filter((e) => e.parent_path === parentPath);
  }

  getAllAliases(): TaxonomyAliasEntry[] {
    return Array.from(this.aliases.values());
  }

  getAliasesForPath(canonicalPath: string): TaxonomyAliasEntry[] {
    return this.getAllAliases().filter((a) => a.canonical_path === canonicalPath);
  }

  resolveAlias(aliasText: string, locale?: string): TaxonomyAliasEntry | undefined {
    const normalized = aliasText.toLowerCase().trim();
    const matches = this.getAllAliases().filter((a) => a.alias_text.toLowerCase() === normalized);
    if (locale) {
      const localeMatch = matches.find((a) => a.locale === locale);
      if (localeMatch) return localeMatch;
    }
    return matches.sort((a, b) => b.confidence_score - a.confidence_score)[0];
  }

  isValidPath(path: string): boolean {
    return this.pathIndex.has(path);
  }

  detectConflictingAliases(): Array<{ alias_text: string; targets: string[] }> {
    const byText = new Map<string, Set<string>>();
    for (const alias of this.aliases.values()) {
      const norm = alias.alias_text.toLowerCase();
      const targets = byText.get(norm) || new Set();
      targets.add(alias.canonical_path);
      byText.set(norm, targets);
    }
    return Array.from(byText.entries())
      .filter(([, targets]) => targets.size > 1)
      .map(([alias_text, targets]) => ({ alias_text, targets: Array.from(targets) }));
  }

  detectOrphans(): TaxonomyRegistryEntry[] {
    return this.getAll().filter((e) => {
      if (!e.parent_path) return false;
      return !this.pathIndex.has(e.parent_path);
    });
  }

  validateIntegrity(): { valid: boolean; orphans: number; conflicting_aliases: number; inactive_with_children: number } {
    const orphans = this.detectOrphans();
    const conflicts = this.detectConflictingAliases();
    const inactiveWithChildren = this.getAll().filter((e) => {
      if (e.active) return false;
      return this.getChildren(e.canonical_path).some((c) => c.active);
    });
    return {
      valid: orphans.length === 0 && conflicts.length === 0 && inactiveWithChildren.length === 0,
      orphans: orphans.length,
      conflicting_aliases: conflicts.length,
      inactive_with_children: inactiveWithChildren.length,
    };
  }
}

export const sentinelTaxonomyRegistry = new SentinelTaxonomyRegistry();
