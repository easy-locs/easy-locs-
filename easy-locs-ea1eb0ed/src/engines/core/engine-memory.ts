import { supabase } from "@/integrations/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { engineObserver } from "./engine-observer";

function memoryTable() {
  return (supabase as SupabaseClient).from("engine_memory");
}

export type EngineMemoryType = "ui" | "data" | "orbit" | "flow" | "performance" | "security";

export interface EngineMemoryRecord {
  id: string;
  type: EngineMemoryType;
  issue_signature: string;
  root_cause: string | null;
  fix_applied: string | null;
  fix_function: string | null;
  confidence: number;
  auto_apply: boolean;
  created_at: string;
  updated_at: string;
  applied_count: number;
  last_applied_at: string | null;
  domain: string | null;
  category: string | null;
  engine_id: string | null;
  rule_id: string | null;
  success_count: number;
  failure_count: number;
  avg_fix_duration_ms: number;
  recurrence_after_fix: number;
  score: number;
  disabled: boolean;
}

const LOCAL_STORAGE_KEY = "el-engine-memory-cache";

class EngineMemoryService {
  private cache = new Map<string, EngineMemoryRecord>();
  private _loaded = false;
  private _loading = false;
  private _supabaseAvailable = true;

  get isLoaded(): boolean {
    return this._loaded;
  }

  get size(): number {
    return this.cache.size;
  }

  async loadFromSupabase(): Promise<void> {
    if (this._loading) return;
    this._loading = true;

    try {
      const { data, error } = await memoryTable()
        .select("*")
        .eq("disabled", false)
        .order("score", { ascending: false });

      if (error) {
        this._supabaseAvailable = false;
        engineObserver.log("engine-memory", "engine-memory", "warn",
          `Supabase unavailable, using local cache: ${error.message}`);
        this.loadFromLocalStorage();
        this._loaded = true;
        return;
      }

      this._supabaseAvailable = true;
      this.cache.clear();
      for (const row of (data ?? [])) {
        this.cache.set(row.issue_signature, row as EngineMemoryRecord);
      }

      this.persistToLocalStorage();
      this._loaded = true;

      engineObserver.log("engine-memory", "engine-memory", "info",
        `Loaded ${this.cache.size} fixes from Supabase`);
    } catch {
      this._supabaseAvailable = false;
      this.loadFromLocalStorage();
      this._loaded = true;
    } finally {
      this._loading = false;
    }
  }

  private loadFromLocalStorage(): void {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        const records: EngineMemoryRecord[] = JSON.parse(raw);
        this.cache.clear();
        for (const r of records) {
          if (!r.disabled) this.cache.set(r.issue_signature, r);
        }
        engineObserver.log("engine-memory", "engine-memory", "info",
          `Loaded ${this.cache.size} fixes from local cache (offline mode)`);
      }
    } catch {}
  }

  private persistToLocalStorage(): void {
    try {
      const records = Array.from(this.cache.values());
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(records));
    } catch {}
  }

  async recordFix(params: {
    type: EngineMemoryType;
    issueSignature: string;
    rootCause: string | null;
    fixApplied: string | null;
    fixFunction: string | null;
    confidence: number;
    domain: string | null;
    category: string | null;
    engineId: string | null;
    ruleId: string | null;
    durationMs: number;
  }): Promise<void> {
    const existing = this.cache.get(params.issueSignature);

    if (existing) {
      existing.applied_count++;
      existing.success_count++;
      existing.last_applied_at = new Date().toISOString();
      existing.updated_at = new Date().toISOString();
      existing.confidence = Math.min(1, existing.confidence + 0.02);
      existing.avg_fix_duration_ms = existing.applied_count > 1
        ? (existing.avg_fix_duration_ms * (existing.applied_count - 1) + params.durationMs) / existing.applied_count
        : params.durationMs;
      existing.score = this.computeScore(existing);

      if (existing.confidence > 0.7 && existing.success_count >= 2) {
        existing.auto_apply = true;
      }

      this.cache.set(params.issueSignature, existing);
      this.persistToLocalStorage();

      if (this._supabaseAvailable) {
        try {
          await memoryTable().update({
            applied_count: existing.applied_count,
            success_count: existing.success_count,
            last_applied_at: existing.last_applied_at,
            updated_at: existing.updated_at,
            confidence: existing.confidence,
            avg_fix_duration_ms: existing.avg_fix_duration_ms,
            score: existing.score,
            auto_apply: existing.auto_apply,
          }).eq("id", existing.id);
        } catch {}
      }
      return;
    }

    const newRecord: EngineMemoryRecord = {
      id: crypto.randomUUID(),
      type: params.type,
      issue_signature: params.issueSignature,
      root_cause: params.rootCause,
      fix_applied: params.fixApplied,
      fix_function: params.fixFunction,
      confidence: params.confidence,
      auto_apply: params.confidence > 0.8,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      applied_count: 1,
      last_applied_at: new Date().toISOString(),
      domain: params.domain,
      category: params.category,
      engine_id: params.engineId,
      rule_id: params.ruleId,
      success_count: 1,
      failure_count: 0,
      avg_fix_duration_ms: params.durationMs,
      recurrence_after_fix: 0,
      score: 0.5,
      disabled: false,
    };
    newRecord.score = this.computeScore(newRecord);

    this.cache.set(params.issueSignature, newRecord);
    this.persistToLocalStorage();

    if (this._supabaseAvailable) {
      try {
        await memoryTable().upsert({
          id: newRecord.id,
          type: newRecord.type,
          issue_signature: newRecord.issue_signature,
          root_cause: newRecord.root_cause,
          fix_applied: newRecord.fix_applied,
          fix_function: newRecord.fix_function,
          confidence: newRecord.confidence,
          auto_apply: newRecord.auto_apply,
          applied_count: newRecord.applied_count,
          last_applied_at: newRecord.last_applied_at,
          domain: newRecord.domain,
          category: newRecord.category,
          engine_id: newRecord.engine_id,
          rule_id: newRecord.rule_id,
          success_count: newRecord.success_count,
          failure_count: newRecord.failure_count,
          avg_fix_duration_ms: newRecord.avg_fix_duration_ms,
          recurrence_after_fix: newRecord.recurrence_after_fix,
          score: newRecord.score,
          disabled: newRecord.disabled,
        }, { onConflict: "issue_signature" });
      } catch {}
    }
  }

  async recordApply(issueSignature: string): Promise<void> {
    const existing = this.cache.get(issueSignature);
    if (!existing) return;

    existing.applied_count++;
    existing.last_applied_at = new Date().toISOString();
    existing.updated_at = new Date().toISOString();
    this.cache.set(issueSignature, existing);
    this.persistToLocalStorage();

    if (this._supabaseAvailable) {
      try {
        await memoryTable().update({
          applied_count: existing.applied_count,
          last_applied_at: existing.last_applied_at,
          updated_at: existing.updated_at,
        }).eq("id", existing.id);
      } catch {}
    }
  }

  async recordFailure(issueSignature: string): Promise<void> {
    const existing = this.cache.get(issueSignature);
    if (!existing) return;

    existing.failure_count++;
    existing.confidence = Math.max(0, existing.confidence - 0.05);
    existing.updated_at = new Date().toISOString();
    existing.score = this.computeScore(existing);

    if (existing.confidence < 0.3 || existing.failure_count > existing.success_count * 2) {
      existing.auto_apply = false;
      existing.disabled = true;
      engineObserver.log("engine-memory", "engine-memory", "warn",
        `Fix disabled due to high failure rate: ${issueSignature}`);
    }

    this.cache.set(issueSignature, existing);
    this.persistToLocalStorage();

    if (this._supabaseAvailable) {
      try {
        await memoryTable().update({
          failure_count: existing.failure_count,
          confidence: existing.confidence,
          updated_at: existing.updated_at,
          score: existing.score,
          auto_apply: existing.auto_apply,
          disabled: existing.disabled,
        }).eq("id", existing.id);
      } catch {}
    }
  }

  async recordRecurrence(issueSignature: string): Promise<void> {
    const existing = this.cache.get(issueSignature);
    if (!existing) return;

    existing.recurrence_after_fix++;
    existing.updated_at = new Date().toISOString();
    existing.score = this.computeScore(existing);
    this.cache.set(issueSignature, existing);
    this.persistToLocalStorage();

    if (this._supabaseAvailable) {
      try {
        await memoryTable().update({
          recurrence_after_fix: existing.recurrence_after_fix,
          updated_at: existing.updated_at,
          score: existing.score,
        }).eq("id", existing.id);
      } catch {}
    }
  }

  getKnownFix(issueSignature: string): EngineMemoryRecord | undefined {
    return this.cache.get(issueSignature);
  }

  getAutoApplyFixes(): EngineMemoryRecord[] {
    return Array.from(this.cache.values()).filter(r => r.auto_apply && !r.disabled);
  }

  getAllFixes(): EngineMemoryRecord[] {
    return Array.from(this.cache.values());
  }

  getTopFixes(limit = 10): EngineMemoryRecord[] {
    return Array.from(this.cache.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  async persistLearningUpdate(issueSignature: string): Promise<void> {
    const record = this.cache.get(issueSignature);
    if (!record) return;

    this.persistToLocalStorage();

    if (this._supabaseAvailable) {
      try {
        await memoryTable().update({
          confidence: record.confidence,
          auto_apply: record.auto_apply,
          score: record.score,
          updated_at: new Date().toISOString(),
        }).eq("id", record.id);
      } catch {}
    }
  }

  async toggleFix(issueSignature: string, enabled: boolean): Promise<void> {
    const record = this.cache.get(issueSignature);
    if (!record) return;

    record.auto_apply = enabled;
    record.disabled = !enabled;
    record.updated_at = new Date().toISOString();
    this.cache.set(issueSignature, record);
    this.persistToLocalStorage();

    if (this._supabaseAvailable) {
      try {
        await memoryTable().update({
          auto_apply: enabled,
          disabled: !enabled,
          updated_at: record.updated_at,
        }).eq("id", record.id);
      } catch {}
    }
  }

  computeScore(record: EngineMemoryRecord): number {
    const totalAttempts = record.success_count + record.failure_count;
    const successRate = totalAttempts > 0
      ? record.success_count / totalAttempts
      : 0.5;

    const speedScore = record.avg_fix_duration_ms > 0
      ? Math.max(0, 1 - (record.avg_fix_duration_ms / 10000))
      : 0.5;

    const recurrenceScore = record.applied_count > 0
      ? Math.max(0, 1 - (record.recurrence_after_fix / Math.max(1, record.applied_count)))
      : 0.5;

    const W_SUCCESS = 0.5;
    const W_SPEED = 0.2;
    const W_RECURRENCE = 0.3;

    const raw = (successRate * W_SUCCESS) + (speedScore * W_SPEED) + (recurrenceScore * W_RECURRENCE);
    return Math.round(raw * 1000) / 1000;
  }

  getStats() {
    const all = Array.from(this.cache.values());
    const autoApply = all.filter(r => r.auto_apply && !r.disabled);
    const disabled = all.filter(r => r.disabled);
    const totalApplied = all.reduce((s, r) => s + r.applied_count, 0);
    const totalRecurrences = all.reduce((s, r) => s + r.recurrence_after_fix, 0);
    const avgScore = all.length > 0
      ? all.reduce((s, r) => s + r.score, 0) / all.length
      : 0;

    const now = Date.now();
    const recentApplied = all.filter(r =>
      r.last_applied_at && (now - new Date(r.last_applied_at).getTime()) < 86400_000
    ).length;

    const byType: Record<string, number> = {};
    const byDomain: Record<string, number> = {};
    for (const r of all) {
      byType[r.type] = (byType[r.type] ?? 0) + 1;
      if (r.domain) byDomain[r.domain] = (byDomain[r.domain] ?? 0) + 1;
    }

    return {
      totalFixes: all.length,
      autoApplyCount: autoApply.length,
      disabledCount: disabled.length,
      totalApplied,
      totalRecurrences,
      recentApplied24h: recentApplied,
      avgScore: Math.round(avgScore * 1000) / 1000,
      byType,
      byDomain,
      supabaseAvailable: this._supabaseAvailable,
    };
  }
}

export const engineMemory = new EngineMemoryService();
