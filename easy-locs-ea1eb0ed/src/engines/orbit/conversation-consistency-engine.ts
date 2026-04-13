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

    const duplicateCheck = new Map<string, Element[]>();
    convItems.forEach(el => {
      const id = el.getAttribute("data-conversation-id") || "";
      const arr = duplicateCheck.get(id) ?? [];
      arr.push(el);
      duplicateCheck.set(id, arr);
    });

    const duplicateIds: string[] = [];
    for (const [id, elements] of duplicateCheck) {
      if (elements.length > 1) {
        findings.push(`Duplicate conversation rendered: ${id} (${elements.length}x)`);
        duplicateIds.push(id);

        for (let i = 1; i < elements.length; i++) {
          const el = elements[i];
          if (el instanceof HTMLElement) {
            el.style.display = "none";
            el.setAttribute("data-dedup-hidden", "true");
          }
        }
        actions.push(`Hid ${elements.length - 1} duplicate DOM node(s) for ${id}`);
      }
    }

    if (duplicateIds.length > 0) {
      this.consecutiveDupCycles++;
      platformBus.emit(
        "orbit:thread_updated" as any,
        { reason: "duplicate_detected", duplicateIds, timestamp: Date.now() },
        "orbit"
      );
      actions.push(`Emitted dedup signal for ${duplicateIds.length} duplicate conversation(s)`);

      if (this.consecutiveDupCycles >= 3) {
        platformBus.emit(
          "orbit:force_reload" as any,
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
