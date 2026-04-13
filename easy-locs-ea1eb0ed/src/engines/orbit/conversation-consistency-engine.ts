import { BaseEngine, type EngineTickResult } from "../core/base-engine";
import { platformBus } from "@/lib/shared/platform-bus";

export class ConversationConsistencyEngine extends BaseEngine {
  private lastConversationCount = 0;
  private consecutiveDupCycles = 0;

  constructor() {
    super({
      id: "orbit-conversation-consistency",
      name: "Conversation Consistency Engine",
      category: "orbit",
      intervalMs: 30_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: string[] = [];
    const actions: string[] = [];

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

    const duplicateIds: string[] = [];
    for (const [id, count] of duplicateCheck) {
      if (count > 1) {
        findings.push(`Duplicate conversation rendered: ${id} (${count}x)`);
        duplicateIds.push(id);
      }
    }

    if (duplicateIds.length > 0) {
      this.consecutiveDupCycles++;

      platformBus.emit(
        "orbit:thread_updated",
        { reason: "duplicate_detected", duplicateIds, timestamp: Date.now() },
        "orbit"
      );
      actions.push(`Emitted dedup signal for ${duplicateIds.length} duplicate conversation(s)`);

      if (this.consecutiveDupCycles >= 3) {
        platformBus.emit(
          "orbit:force_reload",
          { reason: "persistent_duplicates", duplicateIds, cycles: this.consecutiveDupCycles, timestamp: Date.now() },
          "orbit"
        );
        actions.push(`Forced full thread reload after ${this.consecutiveDupCycles} consecutive duplicate cycles`);
        this.consecutiveDupCycles = 0;
      }
    } else {
      this.consecutiveDupCycles = 0;
    }

    this.lastConversationCount = ids.size;

    return {
      level: actions.length > 0 ? "act" : findings.length > 0 ? "detect" : "observe",
      findings: findings.length,
      actions,
      duration: 0,
    };
  }
}
