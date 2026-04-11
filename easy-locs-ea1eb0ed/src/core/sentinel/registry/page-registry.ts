import type { PageRegistryEntry } from "../types";

class SentinelPageRegistry {
  private pages = new Map<string, PageRegistryEntry>();

  register(entry: PageRegistryEntry): void {
    this.pages.set(entry.page_id, entry);
  }

  get(pageId: string): PageRegistryEntry | undefined {
    return this.pages.get(pageId);
  }

  getByRoute(route: string): PageRegistryEntry | undefined {
    return this.getAll().find((p) => p.route === route);
  }

  getAll(): PageRegistryEntry[] {
    return Array.from(this.pages.values());
  }

  getPublicPages(): PageRegistryEntry[] {
    return this.getAll().filter((p) => p.page_type === "public" && p.status !== "disabled");
  }

  getByDomain(domain: string): PageRegistryEntry[] {
    return this.getAll().filter((p) => p.owner_domain === domain);
  }

  getBroken(): PageRegistryEntry[] {
    return this.getAll().filter((p) => p.status === "broken");
  }

  getIndexable(): PageRegistryEntry[] {
    return this.getAll().filter((p) => p.indexed_expected && p.status !== "disabled");
  }

  updateStatus(pageId: string, status: PageRegistryEntry["status"]): void {
    const entry = this.pages.get(pageId);
    if (entry) entry.status = status;
  }

  detectOrphanRoutes(validRoutes: Set<string>): PageRegistryEntry[] {
    return this.getAll().filter((p) => !validRoutes.has(p.route));
  }

  detectDuplicateCanonicals(): Array<{ canonical: string; pages: string[] }> {
    const byCanonical = new Map<string, string[]>();
    for (const page of this.getAll()) {
      if (!page.canonical_id) continue;
      const group = byCanonical.get(page.canonical_id) || [];
      group.push(page.page_id);
      byCanonical.set(page.canonical_id, group);
    }
    return Array.from(byCanonical.entries())
      .filter(([, pages]) => pages.length > 1)
      .map(([canonical, pages]) => ({ canonical, pages }));
  }
}

export const sentinelPageRegistry = new SentinelPageRegistry();
