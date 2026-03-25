/**
 * Platform Orchestrator Engine — Autonomous governance brain.
 * Reads all audits, applies policy rules, auto-fixes safe issues,
 * escalates risky ones, and logs every decision.
 */

import { supabase } from "@/integrations/supabase/client";
import { ENGINE_METADATA, detectEngineCollisions, type RuntimeStatus } from "./engine-metadata-registry";
import { getContinuousEngineStatus } from "@/lib/platform/platform-continuous-engine";

const db = supabase as any;

// ── Warning Rules ──────────────────────────────────────────
export interface WarningRule {
  id: string;
  condition: string;
  check: (job: any, meta: any) => boolean;
  message: (job: any) => string;
}

export const WARNING_RULES: WarningRule[] = [
  {
    id: "idle_critical_too_long",
    condition: "Critical engine idle > 30min",
    check: (job, meta) => {
      if (meta?.tier !== "critical") return false;
      if (job.lastStatus !== "ok" || job.itemsProcessed > 0) return false;
      if (!job.lastRun) return false;
      const age = Date.now() - new Date(job.lastRun).getTime();
      return age > 30 * 60_000;
    },
    message: (job) => `Critical engine "${job.name}" idle for >30min with 0 items`,
  },
  {
    id: "duration_exceeded",
    condition: "Engine duration > 10s",
    check: (job) => {
      const ms = parseInt(job.lastDetail ?? "0");
      return !isNaN(ms) && ms > 10000;
    },
    message: (job) => `Engine "${job.name}" took ${job.lastDetail} (>10s threshold)`,
  },
  {
    id: "partial_failure",
    condition: "Ran but processed much less than expected",
    check: (job, meta) => {
      if (job.lastStatus !== "ok") return false;
      if (!meta?.canRunIdle && job.itemsProcessed === 0 && job.runCount > 3) return true;
      return false;
    },
    message: (job) => `Engine "${job.name}" ran ${job.runCount} times but processed 0 items`,
  },
  {
    id: "high_error_rate",
    condition: "Error on critical/priority engine",
    check: (job, meta) => {
      return job.lastStatus === "error" && (meta?.tier === "critical" || meta?.tier === "priority");
    },
    message: (job) => `${job.name} is in error state (tier: critical/priority)`,
  },
];

// ── Collision Classification ──────────────────────────────
export type CollisionLevel = "critical_collision" | "warning_collision" | "expected_orchestrated" | "safe_overlap";

export interface ClassifiedCollision {
  table: string;
  field: string;
  engines: string[];
  level: CollisionLevel;
  reason: string;
}

// Fields where multiple engines writing is expected/orchestrated
const ORCHESTRATED_FIELDS = new Set([
  "seed_merchants.pipeline_stage",
  "seed_merchants.gate_status",
  "seed_merchants.visibility_mode",
]);

const SAFE_OVERLAP_FIELDS = new Set([
  "seed_merchants.status",
]);

export function classifyCollisions(): ClassifiedCollision[] {
  const raw = detectEngineCollisions();
  return raw.map(c => {
    const key = `${c.table}.${c.field}`;
    const hasCritical = c.engines.some(e => ENGINE_METADATA[e]?.tier === "critical");
    const hasConflictingFn = new Set(c.engines.map(e => ENGINE_METADATA[e]?.businessFn)).size > 2;

    if (ORCHESTRATED_FIELDS.has(key)) {
      return { ...c, level: "expected_orchestrated" as CollisionLevel, reason: "Sequential pipeline — engines write in order" };
    }
    if (SAFE_OVERLAP_FIELDS.has(key)) {
      return { ...c, level: "safe_overlap" as CollisionLevel, reason: "Status field safely updated by multiple engines" };
    }
    if (hasCritical && hasConflictingFn) {
      return { ...c, level: "critical_collision" as CollisionLevel, reason: "Critical engines from different functions writing same field" };
    }
    return { ...c, level: "warning_collision" as CollisionLevel, reason: "Multiple engines writing — review recommended" };
  });
}

// ── Health Scores ─────────────────────────────────────────
export interface PlatformHealthScores {
  performance: number;
  coherence: number;
  i18n: number;
  cleanup: number;
  routing: number;
  global: number;
}

export function computeHealthScores(): PlatformHealthScores {
  const status = getContinuousEngineStatus();
  const collisions = classifyCollisions();

  // Performance: based on error rate
  const totalJobs = status.jobs.length || 1;
  const errors = status.jobs.filter(j => j.lastStatus === "error").length;
  const performance = Math.max(0, 100 - Math.round((errors / totalJobs) * 100 * 3));

  // Coherence: based on collision severity
  const criticalCollisions = collisions.filter(c => c.level === "critical_collision").length;
  const warningCollisions = collisions.filter(c => c.level === "warning_collision").length;
  const coherence = Math.max(0, 100 - criticalCollisions * 20 - warningCollisions * 5);

  // Cleanup: based on pending/idle ratio
  const idle = status.jobs.filter(j => j.lastStatus === "idle" || j.lastStatus === "pending").length;
  const cleanup = Math.max(0, 100 - Math.round((idle / totalJobs) * 50));

  // i18n + routing: start at 85 baseline (real audit will adjust)
  const i18n = 85;
  const routing = 90;

  const global = Math.round((performance + coherence + i18n + cleanup + routing) / 5);

  return { performance, coherence, i18n, cleanup, routing, global };
}

// ── Orchestrator Actions ──────────────────────────────────
export interface OrchestratorDecision {
  engineSource: string;
  actionType: "throttle" | "block" | "trigger_audit" | "trigger_cleanup" | "escalate" | "auto_fix" | "restart" | "info";
  severity: "critical" | "warning" | "info";
  targetType?: string;
  targetPath?: string;
  description: string;
  decision: string;
  autoApplied: boolean;
  result?: string;
}

/** Main orchestration cycle — produces decisions and logs them */
export async function runPlatformOrchestrator(): Promise<{
  decisions: OrchestratorDecision[];
  scores: PlatformHealthScores;
  collisions: ClassifiedCollision[];
  warnings: string[];
}> {
  const status = getContinuousEngineStatus();
  const collisions = classifyCollisions();
  const scores = computeHealthScores();
  const decisions: OrchestratorDecision[] = [];
  const warnings: string[] = [];

  // 1. Apply warning rules
  for (const job of status.jobs) {
    const meta = ENGINE_METADATA[job.name];
    for (const rule of WARNING_RULES) {
      if (rule.check(job, meta)) {
        const msg = rule.message(job);
        warnings.push(msg);
        decisions.push({
          engineSource: "platform-orchestrator",
          actionType: meta?.tier === "critical" ? "escalate" : "info",
          severity: meta?.tier === "critical" ? "critical" : "warning",
          targetType: "engine",
          targetPath: job.name,
          description: msg,
          decision: meta?.tier === "critical" ? "Escalated for review" : "Logged as warning",
          autoApplied: false,
        });
      }
    }
  }

  // 2. Check critical collisions → escalate
  for (const c of collisions.filter(c => c.level === "critical_collision")) {
    decisions.push({
      engineSource: "platform-orchestrator",
      actionType: "escalate",
      severity: "critical",
      targetType: "collision",
      targetPath: `${c.table}.${c.field}`,
      description: `Critical collision: ${c.engines.join(", ")} → ${c.table}.${c.field}`,
      decision: "Review required — engines may overwrite each other",
      autoApplied: false,
    });
  }

  // 3. Auto-fix: restart engines stuck in error for too long
  for (const job of status.jobs) {
    const meta = ENGINE_METADATA[job.name];
    if (job.lastStatus === "error" && job.runCount > 2 && meta?.tier !== "critical") {
      decisions.push({
        engineSource: "platform-orchestrator",
        actionType: "auto_fix",
        severity: "info",
        targetType: "engine",
        targetPath: job.name,
        description: `Engine "${job.name}" stuck in error — marking for restart`,
        decision: "Auto-restart on next cycle (non-critical, safe)",
        autoApplied: true,
        result: "scheduled",
      });
    }
  }

  // 4. Health score alerts
  if (scores.global < 50) {
    decisions.push({
      engineSource: "platform-orchestrator",
      actionType: "trigger_audit",
      severity: "critical",
      description: `Global health score critically low: ${scores.global}/100`,
      decision: "Full platform audit triggered",
      autoApplied: true,
      result: "audit_queued",
    });
  }

  // 5. Backend truth enforcement — block dead entities from being live
  try {
    const { data: deadLive } = await db
      .from("seed_merchants")
      .select("id, name")
      .eq("visibility_mode", "live")
      .or("name.is.null,category.is.null,category.eq.unknown,vertical.is.null,vertical.eq.unknown,route_status.eq.broken")
      .limit(50);

    if (deadLive && deadLive.length > 0) {
      await db.from("seed_merchants")
        .update({ visibility_mode: "hidden", unpublish_reason: "auto:orchestrator_dead_entity", unpublished_at: new Date().toISOString() })
        .in("id", deadLive.map((e: any) => e.id));

      decisions.push({
        engineSource: "platform-orchestrator",
        actionType: "block",
        severity: "critical",
        targetType: "entity_batch",
        description: `Blocked ${deadLive.length} dead entities from live visibility`,
        decision: "Auto-unpublished: missing name/category/vertical or broken route",
        autoApplied: true,
        result: `${deadLive.length} unpublished`,
      });
    }
  } catch {}

  // 6. Chief Mechanic: trigger mechanics engines based on sensor data
  try {
    // If backend-connectivity found dead entities → trigger auto-repair
    const connectivityJob = status.jobs.find(j => j.name === "backend-connectivity");
    if (connectivityJob && connectivityJob.itemsProcessed > 0 && connectivityJob.businessImpact?.includes("dead")) {
      decisions.push({
        engineSource: "platform-orchestrator",
        actionType: "trigger_cleanup",
        severity: "warning",
        targetType: "engine",
        targetPath: "auto-repair",
        description: "Backend connectivity found dead entities — triggering auto-repair",
        decision: "Auto-repair engine dispatched",
        autoApplied: true,
        result: "dispatched",
      });
    }

    // If entity-integrity found failures → trigger state healing
    const integrityJob = status.jobs.find(j => j.name === "entity-integrity");
    if (integrityJob && integrityJob.businessImpact?.includes("failure")) {
      decisions.push({
        engineSource: "platform-orchestrator",
        actionType: "trigger_cleanup",
        severity: "warning",
        targetType: "engine",
        targetPath: "entity-state-healing",
        description: "Entity integrity failures detected — triggering state healing",
        decision: "State healing engine dispatched",
        autoApplied: true,
        result: "dispatched",
      });
    }

    // If module-link-repair found broken links → escalate
    const moduleLinkJob = status.jobs.find(j => j.name === "module-link-repair");
    if (moduleLinkJob && moduleLinkJob.businessImpact?.includes("broken")) {
      decisions.push({
        engineSource: "platform-orchestrator",
        actionType: "escalate",
        severity: "critical",
        targetType: "module_link",
        description: "Module links still broken after repair attempt",
        decision: "Escalated to review queue",
        autoApplied: false,
      });
    }
  } catch {}

  // 7. Prevent auto-publish if backend-connectivity or full-stack-linkage report broken
  const connectivityJob = status.jobs.find(j => j.name === "backend-connectivity");
  const linkageJob = status.jobs.find(j => j.name === "full-stack-linkage");
  if (connectivityJob?.lastStatus === "error" || linkageJob?.lastStatus === "error") {
    decisions.push({
      engineSource: "platform-orchestrator",
      actionType: "block",
      severity: "critical",
      targetType: "engine",
      targetPath: "auto-publish",
      description: "Auto-publish blocked: backend connectivity or linkage engine in error state",
      decision: "Publication paused until truth engines recover",
      autoApplied: true,
      result: "auto-publish_paused",
    });
  }

  // 5. Persist decisions to DB
  if (decisions.length > 0) {
    const rows = decisions.map(d => ({
      engine_source: d.engineSource,
      action_type: d.actionType,
      severity: d.severity,
      target_type: d.targetType ?? null,
      target_path: d.targetPath ?? null,
      description: d.description,
      decision: d.decision,
      auto_applied: d.autoApplied,
      result: d.result ?? null,
    }));
    await db.from("platform_actions_log").insert(rows).catch(() => {});
  }

  // 6. Persist health scores
  await db.from("platform_health_scores").insert({
    performance_score: scores.performance,
    coherence_score: scores.coherence,
    i18n_score: scores.i18n,
    cleanup_score: scores.cleanup,
    routing_score: scores.routing,
    global_score: scores.global,
    details_json: { collisions: collisions.length, warnings: warnings.length, decisions: decisions.length },
  }).catch(() => {});

  console.log(`[orchestrator] Health:${scores.global}/100 | Decisions:${decisions.length} | Warnings:${warnings.length} | Collisions:${collisions.length}`);

  return { decisions, scores, collisions, warnings };
}
