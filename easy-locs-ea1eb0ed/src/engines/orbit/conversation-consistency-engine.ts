import { BaseEngine, type EngineTickResult } from "../core/base-engine";

export class ConversationConsistencyEngine extends BaseEngine {
  private lastConversationCount = 0;

  constructor() {
    super({
      id: "orbit-conversation-consistency",
      name: "Conversation Consistency Engine",
      category: "orbit",
      intervalMs: 60_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: string[] = [];

    const convItems = document.querySelectorAll("[data-conversation-id]");
    const ids = new Set<string>();
    convItems.forEach(el => {
      const id = el.getAttribute("data-conversation-id");
      if (id) ids.add(id);
    });

    if (this.lastConversationCount > 0 && ids.size === 0 && !document.hidden) {
      findings.push("Conversation list dropped to 0 — possible render failure");
    }

    const duplicateCheck = new Map<string, number>();
    convItems.forEach(el => {
      const id = el.getAttribute("data-conversation-id") || "";
      duplicateCheck.set(id, (duplicateCheck.get(id) || 0) + 1);
    });
    for (const [id, count] of duplicateCheck) {
      if (count > 1) {
        findings.push(`Duplicate conversation rendered: ${id} (${count}x)`);
      }
    }

    this.lastConversationCount = ids.size;

    return { level: findings.length > 0 ? "detect" : "observe", findings: findings.length, actions: [], duration: 0 };
  }
}
