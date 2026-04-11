import type { PriorityItem, OmegaPriority, OmegaEngineStatus } from "../omega-types";
import { omegaPersistence } from "../omega-persistence";

const MAX_ITEMS = 2_000;
let priorityIdCounter = 0;

type ItemType = PriorityItem["item_type"];

class PriorityEngine {
  readonly name = "omega-priority";
  readonly domain = "omega";
  status: OmegaEngineStatus = "idle";
  lastRunAt = 0;

  private items = new Map<string, PriorityItem>();

  getStatus(): OmegaEngineStatus { return this.status; }
  getHeartbeat() { return { alive: this.status !== "stopped", lastBeat: this.lastRunAt }; }

  addItem(
    itemType: ItemType,
    targetId: string,
    severity: number,
    userImpact: number,
    businessImpact: number,
    recurrence: number,
    confidence: number,
    dependencyReach: number,
  ): PriorityItem {
    const clamp = (v: number) => Math.max(0, Math.min(isFinite(v) ? v : 0, 10));
    severity = clamp(severity);
    userImpact = clamp(userImpact);
    businessImpact = clamp(businessImpact);
    recurrence = clamp(recurrence);
    confidence = clamp(confidence);
    dependencyReach = clamp(dependencyReach);
    const raw = severity * userImpact * businessImpact * recurrence * confidence * dependencyReach;
    const priorityScore = raw > 0 ? raw : 0;
    const normalizedScore = Math.min(Math.pow(priorityScore, 1 / 6) * 10, 100);

    let priority_band: OmegaPriority;
    if (normalizedScore >= 80) priority_band = "now";
    else if (normalizedScore >= 60) priority_band = "next";
    else if (normalizedScore >= 40) priority_band = "later";
    else if (normalizedScore >= 20) priority_band = "observe";
    else priority_band = "ignore";

    const item: PriorityItem = {
      item_id: `pri_${++priorityIdCounter}`,
      item_type: itemType,
      target_id: targetId,
      severity,
      user_impact: userImpact,
      business_impact: businessImpact,
      recurrence,
      confidence,
      dependency_reach: dependencyReach,
      priority_score: normalizedScore,
      priority_band,
      created_at: Date.now(),
    };

    this.items.set(item.item_id, item);
    omegaPersistence.writePriority(item).catch(() => {});
    if (this.items.size > MAX_ITEMS) {
      const sorted = [...this.items.entries()].sort((a, b) => a[1].priority_score - b[1].priority_score);
      const toRemove = sorted.slice(0, this.items.size - MAX_ITEMS);
      for (const [id] of toRemove) this.items.delete(id);
    }

    this.lastRunAt = Date.now();
    return item;
  }

  async restore(): Promise<void> {
    const persisted = await omegaPersistence.loadPriorities();
    for (const p of persisted) {
      if (!this.items.has(p.item_id)) this.items.set(p.item_id, p);
    }
  }

  getByBand(band: OmegaPriority): PriorityItem[] {
    return [...this.items.values()]
      .filter((i) => i.priority_band === band)
      .sort((a, b) => b.priority_score - a.priority_score);
  }

  getTopN(n = 10): PriorityItem[] {
    return [...this.items.values()]
      .sort((a, b) => b.priority_score - a.priority_score)
      .slice(0, n);
  }

  getByType(type: ItemType): PriorityItem[] {
    return [...this.items.values()]
      .filter((i) => i.item_type === type)
      .sort((a, b) => b.priority_score - a.priority_score);
  }

  removeItem(itemId: string): boolean {
    return this.items.delete(itemId);
  }

  recalculate(itemId: string, updates: Partial<Pick<PriorityItem, "severity" | "user_impact" | "business_impact" | "recurrence" | "confidence" | "dependency_reach">>): PriorityItem | null {
    const item = this.items.get(itemId);
    if (!item) return null;
    Object.assign(item, updates);
    const score = item.severity * item.user_impact * item.business_impact * item.recurrence * item.confidence * item.dependency_reach;
    item.priority_score = Math.min(Math.pow(score, 1 / 6) * 10, 100);
    if (item.priority_score >= 80) item.priority_band = "now";
    else if (item.priority_score >= 60) item.priority_band = "next";
    else if (item.priority_score >= 40) item.priority_band = "later";
    else if (item.priority_score >= 20) item.priority_band = "observe";
    else item.priority_band = "ignore";
    return item;
  }

  getStats() {
    const bandCounts: Record<string, number> = { now: 0, next: 0, later: 0, observe: 0, ignore: 0 };
    const typeCounts: Record<string, number> = {};
    for (const [, item] of this.items) {
      bandCounts[item.priority_band]++;
      typeCounts[item.item_type] = (typeCounts[item.item_type] || 0) + 1;
    }
    return { total_items: this.items.size, by_band: bandCounts, by_type: typeCounts };
  }

  async boot(): Promise<void> {
    this.status = "active";
    this.lastRunAt = Date.now();
    await this.restore().catch(() => {});
    console.log(`[OMEGA] PriorityEngine booted | items: ${this.items.size}`);
  }

  shutdown(): void { this.status = "stopped"; }
}

export const priorityEngine = new PriorityEngine();
