import { platformBus, type PlatformEvent } from "@/lib/shared/platform-bus";

export type EventPriority = "critical" | "high" | "normal" | "low";
export type EventCategory =
  | "payment" | "wallet" | "chat" | "booking" | "order"
  | "delivery" | "tracking" | "notification" | "presence"
  | "permission" | "navigation" | "module" | "system";

export interface PipelineEvent {
  id: string;
  originalEvent: PlatformEvent;
  category: EventCategory;
  priority: EventPriority;
  normalizedPayload: Record<string, unknown>;
  enrichments: Record<string, unknown>;
  correlationId: string;
  attempt: number;
  maxRetries: number;
  dedupKey: string | null;
  processedAt: number | null;
  error: string | null;
  createdAt: number;
}

export interface DeadLetterEntry {
  event: PipelineEvent;
  reason: string;
  failedAt: number;
  attempts: number;
}

export interface AuditLogEntry {
  id: string;
  eventId: string;
  action: "intake" | "normalized" | "routed" | "enriched" | "processed" | "retried" | "dead_lettered" | "replayed";
  detail: string;
  timestamp: number;
}

export interface PipelineTelemetry {
  totalProcessed: number;
  totalFailed: number;
  totalRetried: number;
  totalDeadLettered: number;
  averageLatencyMs: number;
  eventsByCategory: Record<string, number>;
  eventsByPriority: Record<string, number>;
  throughputPerMinute: number;
  lastProcessedAt: number | null;
}

type PipelineHandler = (event: PipelineEvent) => void | Promise<void>;

const CATEGORY_MAP: Record<string, EventCategory> = {
  wallet: "wallet",
  payment: "payment",
  commerce: "payment",
  orbit: "chat",
  message: "chat",
  conversation: "chat",
  booking: "booking",
  marketplace: "booking",
  order: "order",
  storefront: "order",
  delivery: "delivery",
  dispatch: "delivery",
  tracking: "tracking",
  radar: "tracking",
  geo: "tracking",
  pm: "booking",
  property: "booking",
  deal: "order",
  dashboard: "navigation",
  ui: "navigation",
  call: "chat",
  qr: "payment",
  listing: "booking",
  rent: "payment",
  attachment: "chat",
  system: "system",
  automation: "system",
  camera: "system",
};

function refineCategory(eventType: string, defaultCategory: EventCategory): EventCategory {
  if (eventType.includes("notification")) return "notification";
  if (eventType.includes("module_status") || eventType.includes("module_")) return "module";
  if (eventType.includes("presence") || eventType.includes("user_online")) return "presence";
  if (eventType.includes("permission") || eventType.includes("geo.permission")) return "permission";
  return defaultCategory;
}

const PRIORITY_MAP: Record<EventCategory, EventPriority> = {
  payment: "critical",
  wallet: "critical",
  chat: "high",
  booking: "high",
  order: "high",
  delivery: "high",
  tracking: "normal",
  notification: "normal",
  presence: "low",
  permission: "normal",
  navigation: "low",
  module: "low",
  system: "normal",
};

let _idCounter = 0;
function generateId(): string {
  return `pe_${Date.now()}_${++_idCounter}`;
}

function categorizeEvent(type: string): EventCategory {
  const prefix = type.split(/[:.]/)[0].toLowerCase();
  const base = CATEGORY_MAP[prefix] ?? "system";
  return refineCategory(type, base);
}

function buildDedupKey(event: PlatformEvent): string | null {
  const p = event.payload as Record<string, unknown> | null;
  if (!p) return null;
  const entityId = p.orderId ?? p.bookingId ?? p.transactionId ?? p.threadId ?? p.id;
  if (!entityId) return null;
  return `${event.type}:${entityId}`;
}

class RuntimePipeline {
  private handlers = new Map<EventCategory, Set<PipelineHandler>>();
  private globalHandlers = new Set<PipelineHandler>();
  private deadLetterQueue: DeadLetterEntry[] = [];
  private auditLog: AuditLogEntry[] = [];
  private dedupCache = new Map<string, number>();
  private telemetry: PipelineTelemetry = {
    totalProcessed: 0,
    totalFailed: 0,
    totalRetried: 0,
    totalDeadLettered: 0,
    averageLatencyMs: 0,
    eventsByCategory: {},
    eventsByPriority: {},
    throughputPerMinute: 0,
    lastProcessedAt: null,
  };
  private latencySum = 0;
  private recentTimestamps: number[] = [];
  private unsub: (() => void) | null = null;
  private readonly MAX_AUDIT = 500;
  private readonly MAX_DLQ = 200;
  private readonly DEDUP_TTL_MS = 5000;
  private readonly MAX_RETRIES = 3;

  install(): () => void {
    if (this.unsub) return this.unsub;

    this.unsub = platformBus.onAll((event) => {
      if ((event.payload as Record<string, unknown>)?.__bridged) return;
      this.intake(event);
    });

    this.startDedupCleanup();
    console.info("[runtime-pipeline] Installed — listening to all platform events");
    return this.unsub;
  }

  private intake(event: PlatformEvent): void {
    const category = categorizeEvent(event.type);
    const priority = PRIORITY_MAP[category];
    const dedupKey = buildDedupKey(event);
    const id = generateId();

    if (dedupKey && this.isDuplicate(dedupKey)) {
      this.addAudit(id, "intake", `Deduplicated: ${dedupKey}`);
      return;
    }
    if (dedupKey) this.dedupCache.set(dedupKey, Date.now());

    const pipelineEvent: PipelineEvent = {
      id,
      originalEvent: event,
      category,
      priority,
      normalizedPayload: this.normalize(event),
      enrichments: {},
      correlationId: (event.payload as Record<string, unknown>)?.correlationId as string ?? id,
      attempt: 0,
      maxRetries: this.MAX_RETRIES,
      dedupKey,
      processedAt: null,
      error: null,
      createdAt: Date.now(),
    };

    this.addAudit(id, "intake", `${event.type} → ${category}/${priority}`);
    this.enrich(pipelineEvent);
    this.route(pipelineEvent);
  }

  private normalize(event: PlatformEvent): Record<string, unknown> {
    const p = (typeof event.payload === "object" && event.payload) ? { ...event.payload as Record<string, unknown> } : {};
    delete p.__bridged;
    return {
      eventType: event.type,
      source: event.source,
      userId: event.userId ?? p.userId ?? null,
      entityId: p.orderId ?? p.bookingId ?? p.transactionId ?? p.threadId ?? p.id ?? null,
      amount: p.amount ?? p.total ?? null,
      currency: p.currency ?? null,
      status: p.status ?? null,
      timestamp: event.timestamp,
      ...p,
    };
  }

  private enrich(event: PipelineEvent): void {
    event.enrichments = {
      processedBy: "runtime-pipeline",
      sessionTimestamp: Date.now(),
      categoryLabel: event.category,
      priorityLevel: event.priority === "critical" ? 4 : event.priority === "high" ? 3 : event.priority === "normal" ? 2 : 1,
    };
    this.addAudit(event.id, "enriched", `Priority=${event.priority}`);
  }

  private async route(event: PipelineEvent): Promise<void> {
    const start = performance.now();
    event.attempt++;

    try {
      const categoryHandlers = this.handlers.get(event.category);
      if (categoryHandlers) {
        for (const handler of categoryHandlers) {
          await handler(event);
        }
      }
      for (const handler of this.globalHandlers) {
        await handler(event);
      }

      event.processedAt = Date.now();
      const latency = performance.now() - start;
      this.recordTelemetry(event, latency);
      this.addAudit(event.id, "processed", `Latency=${latency.toFixed(1)}ms`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      event.error = msg;
      this.telemetry.totalFailed++;

      if (event.attempt < event.maxRetries) {
        this.telemetry.totalRetried++;
        this.addAudit(event.id, "retried", `Attempt ${event.attempt}/${event.maxRetries}: ${msg}`);
        setTimeout(() => this.route(event), Math.pow(2, event.attempt) * 100);
      } else {
        this.sendToDeadLetter(event, msg);
      }
    }
  }

  private isDuplicate(key: string): boolean {
    const ts = this.dedupCache.get(key);
    return !!ts && Date.now() - ts < this.DEDUP_TTL_MS;
  }

  private sendToDeadLetter(event: PipelineEvent, reason: string): void {
    this.deadLetterQueue.push({ event, reason, failedAt: Date.now(), attempts: event.attempt });
    if (this.deadLetterQueue.length > this.MAX_DLQ) {
      this.deadLetterQueue.splice(0, this.deadLetterQueue.length - this.MAX_DLQ);
    }
    this.telemetry.totalDeadLettered++;
    this.addAudit(event.id, "dead_lettered", reason);
    console.warn(`[runtime-pipeline] Dead-lettered: ${event.originalEvent.type} — ${reason}`);
  }

  private recordTelemetry(event: PipelineEvent, latencyMs: number): void {
    this.telemetry.totalProcessed++;
    this.latencySum += latencyMs;
    this.telemetry.averageLatencyMs = Math.round(this.latencySum / this.telemetry.totalProcessed * 100) / 100;
    this.telemetry.eventsByCategory[event.category] = (this.telemetry.eventsByCategory[event.category] ?? 0) + 1;
    this.telemetry.eventsByPriority[event.priority] = (this.telemetry.eventsByPriority[event.priority] ?? 0) + 1;
    this.telemetry.lastProcessedAt = Date.now();

    const now = Date.now();
    this.recentTimestamps.push(now);
    const oneMinuteAgo = now - 60000;
    this.recentTimestamps = this.recentTimestamps.filter((t) => t > oneMinuteAgo);
    this.telemetry.throughputPerMinute = this.recentTimestamps.length;
  }

  private addAudit(eventId: string, action: AuditLogEntry["action"], detail: string): void {
    this.auditLog.push({ id: generateId(), eventId, action, detail, timestamp: Date.now() });
    if (this.auditLog.length > this.MAX_AUDIT) {
      this.auditLog.splice(0, this.auditLog.length - this.MAX_AUDIT);
    }
  }

  private dedupIntervalId: ReturnType<typeof setInterval> | null = null;

  private startDedupCleanup(): void {
    if (this.dedupIntervalId) return;
    this.dedupIntervalId = setInterval(() => {
      const cutoff = Date.now() - this.DEDUP_TTL_MS * 2;
      for (const [key, ts] of this.dedupCache.entries()) {
        if (ts < cutoff) this.dedupCache.delete(key);
      }
    }, 10000);
  }

  onCategory(category: EventCategory, handler: PipelineHandler): () => void {
    if (!this.handlers.has(category)) this.handlers.set(category, new Set());
    this.handlers.get(category)!.add(handler);
    return () => this.handlers.get(category)?.delete(handler);
  }

  onAll(handler: PipelineHandler): () => void {
    this.globalHandlers.add(handler);
    return () => this.globalHandlers.delete(handler);
  }

  replay(eventId: string): boolean {
    const dlqEntry = this.deadLetterQueue.find((e) => e.event.id === eventId);
    if (!dlqEntry) return false;
    dlqEntry.event.attempt = 0;
    dlqEntry.event.error = null;
    this.deadLetterQueue = this.deadLetterQueue.filter((e) => e.event.id !== eventId);
    this.addAudit(eventId, "replayed", "Manual replay from DLQ");
    this.route(dlqEntry.event);
    return true;
  }

  replayAll(): number {
    const entries = [...this.deadLetterQueue];
    this.deadLetterQueue = [];
    for (const entry of entries) {
      entry.event.attempt = 0;
      entry.event.error = null;
      this.addAudit(entry.event.id, "replayed", "Bulk replay");
      this.route(entry.event);
    }
    return entries.length;
  }

  getTelemetry(): PipelineTelemetry {
    return { ...this.telemetry };
  }

  getDeadLetterQueue(): DeadLetterEntry[] {
    return [...this.deadLetterQueue];
  }

  getAuditLog(limit = 100): AuditLogEntry[] {
    return this.auditLog.slice(-limit);
  }

  getAuditForEvent(eventId: string): AuditLogEntry[] {
    return this.auditLog.filter((a) => a.eventId === eventId);
  }

  getSnapshot(): {
    telemetry: PipelineTelemetry;
    dlqSize: number;
    auditSize: number;
    handlersRegistered: number;
    categoriesActive: string[];
  } {
    return {
      telemetry: this.getTelemetry(),
      dlqSize: this.deadLetterQueue.length,
      auditSize: this.auditLog.length,
      handlersRegistered: this.globalHandlers.size + Array.from(this.handlers.values()).reduce((s, h) => s + h.size, 0),
      categoriesActive: Array.from(this.handlers.keys()),
    };
  }

  reset(): void {
    this.handlers.clear();
    this.globalHandlers.clear();
    this.deadLetterQueue = [];
    this.auditLog = [];
    this.dedupCache.clear();
    this.latencySum = 0;
    this.recentTimestamps = [];
    this.telemetry = {
      totalProcessed: 0,
      totalFailed: 0,
      totalRetried: 0,
      totalDeadLettered: 0,
      averageLatencyMs: 0,
      eventsByCategory: {},
      eventsByPriority: {},
      throughputPerMinute: 0,
      lastProcessedAt: null,
    };
  }

  destroy(): void {
    this.unsub?.();
    this.unsub = null;
    if (this.dedupIntervalId) {
      clearInterval(this.dedupIntervalId);
      this.dedupIntervalId = null;
    }
    this.reset();
  }
}

export const runtimePipeline = new RuntimePipeline();
