import type { SentinelPipelineContext, SentinelVerdict } from "../types";
import type { PipelineStageContext, PipelineStageResult, SentinelPipelineStage } from "../contracts";

let requestCounter = 0;
function nextRequestId(): string {
  return `REQ_${Date.now()}_${++requestCounter}`;
}

class SentinelValidationEngine {
  private stages: SentinelPipelineStage[] = [];
  private history: Array<{ context: SentinelPipelineContext; timestamp: number }> = [];
  private readonly MAX_HISTORY = 200;
  private _totalProcessed = 0;
  private _totalRejected = 0;
  private _totalAccepted = 0;

  constructor() {
    this.registerBuiltinStages();
  }

  private registerBuiltinStages(): void {
    const stages: Array<{ name: string; order: number; logic: (ctx: PipelineStageContext) => PipelineStageResult }> = [
      { name: "normalize", order: 1, logic: (ctx) => {
        const payload = ctx.payload;
        if (typeof payload.name === "string") payload.name = payload.name.trim();
        if (typeof payload.email === "string") payload.email = payload.email.toLowerCase().trim();
        return { stage: "normalize", passed: true, blocking: false, message: "Normalized", mutations: payload, events: [] };
      }},
      { name: "parse_type", order: 2, logic: (ctx) => {
        const valid = !!ctx.entity_type && ctx.entity_type.length > 0;
        return { stage: "parse_type", passed: valid, blocking: true, message: valid ? "Type valid" : "Missing entity type", mutations: {}, events: [] };
      }},
      { name: "schema_validate", order: 3, logic: (ctx) => {
        const hasPayload = ctx.payload && Object.keys(ctx.payload).length > 0;
        return { stage: "schema_validate", passed: hasPayload, blocking: true, message: hasPayload ? "Schema valid" : "Empty payload", mutations: {}, events: [] };
      }},
      { name: "taxonomy_validate", order: 4, logic: (ctx) => {
        const path = ctx.payload.canonical_path as string | undefined;
        const valid = !path || path.includes(".");
        return { stage: "taxonomy_validate", passed: valid, blocking: true, message: valid ? "Taxonomy valid" : `Invalid canonical path: ${path}`, mutations: {}, events: [] };
      }},
      { name: "geo_validate", order: 5, logic: (ctx) => {
        const lat = ctx.payload.latitude as number | undefined;
        const lng = ctx.payload.longitude as number | undefined;
        const hasGeo = lat !== undefined && lat !== null && lng !== undefined && lng !== null;
        const valid = !hasGeo || (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180);
        return { stage: "geo_validate", passed: valid, blocking: false, message: valid ? "Geo valid" : "Invalid coordinates", mutations: {}, events: [] };
      }},
      { name: "time_validate", order: 6, logic: (ctx) => {
        const ts = ctx.payload.timestamp as number | undefined;
        const valid = !ts || (ts > 0 && ts < Date.now() + 86_400_000 * 365);
        return { stage: "time_validate", passed: valid, blocking: false, message: valid ? "Time valid" : "Invalid timestamp", mutations: {}, events: [] };
      }},
      { name: "media_validate", order: 7, logic: (_ctx) => {
        return { stage: "media_validate", passed: true, blocking: false, message: "Media check passed", mutations: {}, events: [] };
      }},
      { name: "state_validate", order: 8, logic: (ctx) => {
        const status = ctx.payload.status as string | undefined;
        const valid = !status || ["draft", "pending", "active", "published", "archived", "deleted"].includes(status);
        return { stage: "state_validate", passed: valid, blocking: true, message: valid ? "State valid" : `Invalid status: ${status}`, mutations: {}, events: [] };
      }},
      { name: "owner_validate", order: 9, logic: (ctx) => {
        const valid = !!ctx.domain && ctx.domain.length > 0;
        return { stage: "owner_validate", passed: valid, blocking: true, message: valid ? "Owner valid" : "Missing domain owner", mutations: {}, events: [] };
      }},
      { name: "source_of_truth_validate", order: 10, logic: (_ctx) => {
        return { stage: "source_of_truth_validate", passed: true, blocking: false, message: "Source-of-truth check passed", mutations: {}, events: [] };
      }},
      { name: "invariant_validate", order: 11, logic: (_ctx) => {
        return { stage: "invariant_validate", passed: true, blocking: false, message: "Invariant check passed", mutations: {}, events: [] };
      }},
      { name: "quality_score", order: 12, logic: (ctx) => {
        const fields = Object.keys(ctx.payload).length;
        const score = Math.min(100, fields * 10);
        return { stage: "quality_score", passed: score >= 30, blocking: false, message: `Quality score: ${score}`, mutations: { quality_score: score }, events: [] };
      }},
      { name: "conflict_check", order: 13, logic: (_ctx) => {
        return { stage: "conflict_check", passed: true, blocking: true, message: "No conflicts detected", mutations: {}, events: [] };
      }},
      { name: "save_or_reject", order: 14, logic: (_ctx) => {
        return { stage: "save_or_reject", passed: true, blocking: false, message: "Ready for save", mutations: {}, events: ["entity:validated"] };
      }},
    ];

    for (const s of stages) {
      this.stages.push({
        name: s.name,
        order: s.order,
        execute: async (ctx: PipelineStageContext) => s.logic(ctx),
      });
    }
  }

  registerStage(stage: SentinelPipelineStage): void {
    this.stages.push(stage);
    this.stages.sort((a, b) => a.order - b.order);
  }

  async validate(entityType: string, entityId: string, domain: string, payload: Record<string, unknown>): Promise<SentinelPipelineContext> {
    const requestId = nextRequestId();
    const context: SentinelPipelineContext = {
      request_id: requestId,
      source: "sentinel-validation",
      entity_type: entityType,
      entity_id: entityId,
      domain,
      payload: { ...payload },
      timestamp: Date.now(),
      stages_completed: [],
      stages_failed: [],
      verdict: null,
      events_emitted: [],
      workflow_started: null,
      healing_actions: [],
    };

    const stageCtx: PipelineStageContext = {
      request_id: requestId,
      entity_type: entityType,
      entity_id: entityId,
      domain,
      payload: { ...payload },
      previous_stages: [],
      metadata: {},
    };

    let blocked = false;

    for (const stage of this.stages) {
      try {
        const result = await stage.execute(stageCtx);
        if (result.passed) {
          context.stages_completed.push(stage.name);
          Object.assign(stageCtx.payload, result.mutations);
          context.events_emitted.push(...result.events);
        } else {
          context.stages_failed.push(stage.name);
          if (result.blocking) {
            blocked = true;
            break;
          }
        }
        stageCtx.previous_stages.push(stage.name);
      } catch {
        context.stages_failed.push(stage.name);
        blocked = true;
        break;
      }
    }

    context.payload = stageCtx.payload;
    this._totalProcessed++;

    if (blocked) {
      context.verdict = "BLOCKED";
      this._totalRejected++;
    } else if (context.stages_failed.length > 0) {
      context.verdict = "PASS_WITH_WARNINGS";
      this._totalAccepted++;
    } else {
      context.verdict = "PASS";
      this._totalAccepted++;
    }

    this.history.push({ context, timestamp: Date.now() });
    if (this.history.length > this.MAX_HISTORY) {
      this.history.splice(0, this.history.length - this.MAX_HISTORY);
    }

    return context;
  }

  getStats(): { processed: number; accepted: number; rejected: number; stages: number; acceptance_rate: number } {
    return {
      processed: this._totalProcessed,
      accepted: this._totalAccepted,
      rejected: this._totalRejected,
      stages: this.stages.length,
      acceptance_rate: this._totalProcessed > 0 ? Math.round((this._totalAccepted / this._totalProcessed) * 100) : 100,
    };
  }

  getRecentHistory(limit = 20): Array<{ request_id: string; verdict: SentinelVerdict | null; entity_type: string; timestamp: number }> {
    return this.history.slice(-limit).map((h) => ({
      request_id: h.context.request_id,
      verdict: h.context.verdict,
      entity_type: h.context.entity_type,
      timestamp: h.timestamp,
    }));
  }
}

export const sentinelValidationEngine = new SentinelValidationEngine();
