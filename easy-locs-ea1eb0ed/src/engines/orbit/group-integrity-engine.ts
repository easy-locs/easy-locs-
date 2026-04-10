import { BaseEngine, type EngineTickResult } from "../core/base-engine";

export class GroupIntegrityEngine extends BaseEngine {
  constructor() {
    super({
      id: "orbit-group-integrity",
      name: "Group Integrity Engine",
      category: "orbit",
      intervalMs: 120_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: string[] = [];

    const groups = document.querySelectorAll("[data-group-id]");
    const groupIds = new Set<string>();
    groups.forEach(el => {
      const id = el.getAttribute("data-group-id");
      if (id) groupIds.add(id);
    });

    const memberCounts = document.querySelectorAll("[data-member-count]");
    memberCounts.forEach(el => {
      const count = parseInt(el.getAttribute("data-member-count") || "0", 10);
      if (count > 256) {
        findings.push(`Group exceeds limit: ${count} members`);
      }
      if (count === 0) {
        findings.push("Empty group detected (0 members)");
      }
    });

    return { level: findings.length > 0 ? "detect" : "observe", findings: findings.length, actions: [], duration: 0 };
  }
}
