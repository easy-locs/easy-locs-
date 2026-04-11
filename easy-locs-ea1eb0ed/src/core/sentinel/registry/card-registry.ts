import type { CardRegistryEntry } from "../types";

class SentinelCardRegistry {
  private cards = new Map<string, CardRegistryEntry>();

  register(entry: CardRegistryEntry): void {
    this.cards.set(entry.card_id, entry);
  }

  get(cardId: string): CardRegistryEntry | undefined {
    return this.cards.get(cardId);
  }

  getAll(): CardRegistryEntry[] {
    return Array.from(this.cards.values());
  }

  getByDomain(domain: string): CardRegistryEntry[] {
    return this.getAll().filter((c) => c.owner_domain === domain);
  }

  getNonCompliant(): CardRegistryEntry[] {
    return this.getAll().filter((c) => c.audit_status === "non_compliant");
  }

  getMissingStates(): CardRegistryEntry[] {
    return this.getAll().filter(
      (c) => !c.empty_state_defined || !c.loading_state_defined || !c.error_state_defined
    );
  }

  getOrphaned(validRoutes: Set<string>): CardRegistryEntry[] {
    return this.getAll().filter((c) => !validRoutes.has(c.route));
  }

  auditCard(cardId: string): { compliant: boolean; issues: string[] } {
    const card = this.cards.get(cardId);
    if (!card) return { compliant: false, issues: ["Card not found in registry"] };

    const issues: string[] = [];
    if (!card.data_source) issues.push("No data source defined");
    if (!card.state_contract) issues.push("No state contract defined");
    if (!card.empty_state_defined) issues.push("Missing empty state");
    if (!card.loading_state_defined) issues.push("Missing loading state");
    if (!card.error_state_defined) issues.push("Missing error state");
    if (!card.route) issues.push("No route defined");

    const compliant = issues.length === 0;
    if (card.audit_status !== (compliant ? "compliant" : "non_compliant")) {
      card.audit_status = compliant ? "compliant" : "non_compliant";
    }
    return { compliant, issues };
  }

  auditAll(): { total: number; compliant: number; non_compliant: number; issues: Array<{ card_id: string; issues: string[] }> } {
    const results = this.getAll().map((c) => ({ card_id: c.card_id, ...this.auditCard(c.card_id) }));
    return {
      total: results.length,
      compliant: results.filter((r) => r.compliant).length,
      non_compliant: results.filter((r) => !r.compliant).length,
      issues: results.filter((r) => !r.compliant).map((r) => ({ card_id: r.card_id, issues: r.issues })),
    };
  }
}

export const sentinelCardRegistry = new SentinelCardRegistry();
