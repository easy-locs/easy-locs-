import { platformBus } from "@/lib/shared/platform-bus";
import {
  receiveViolation,
  type ViolationReport,
  type EnforcementEngine,
} from "@/lib/control-plane/enforcement-hub";
import { runAllPipelines, pushDetectedViolation } from "./integrity-pipelines";
import { enforceIngestionGate, type IngestionScores } from "./ingestion-gate";
import {
  canAttemptRepair as cbCanAttemptRepair,
  recordRepairAttempt as cbRecordRepairAttempt,
  detectInfiniteLoop,
  isStormActive,
} from "./circuit-breakers";
import { startFlow, transitionFlow, checkFlowTimeouts, getActiveFlows, type CriticalFlowId } from "./flow-enforcement";
import { recordObservabilityProof } from "./observability";
import { quarantineEntity as systemQuarantine } from "@/services/quarantine/quarantine-system";
import {
  quarantineEntity as legacyQuarantine,
  isQuarantined as legacyIsQuarantined,
} from "@/lib/data-quality/quarantine";
let wired = false;
const unsubs: (() => void)[] = [];

const PIPELINE_INTERVAL_MS = 60_000;
let pipelineTimer: ReturnType<typeof setInterval> | null = null;
let flowTimeoutTimer: ReturnType<typeof setInterval> | null = null;

export function wireEnforcement(): () => void {
  if (wired) return () => {};
  wired = true;

  unsubs.push(
    platformBus.onPrefix("engine:", (event) => {
      if (event.type === "engine:started" || event.type === "engine:stopped") return;

      const payload = event.payload as Record<string, unknown>;
      const engineId = (payload?.engineId as string) ?? "unknown";
      const violation = payload?.violation as Record<string, unknown> | undefined;

      const mappedEngine = mapEngineId(engineId);

      if (violation) {
        const v: ViolationReport = {
          id: violation.id as string ?? `v-bus-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          engine: mappedEngine,
          domain: (violation.ownerDomain as string) ?? (payload?.domain as string) ?? "unknown",
          severity: mapSeverity(violation.severity as string),
          code: (violation.code as string) ?? (violation.type as string) ?? "ENGINE_VIOLATION",
          message: (violation.message as string) ?? `Violation from ${engineId}`,
          entityId: violation.entityId as string,
          source: `engine:${engineId}`,
          detectedAt: (violation.detectedAt as string) ?? new Date().toISOString(),
          metadata: violation.metadata as Record<string, unknown>,
        };
        pushDetectedViolation(mappedEngine, v);
      } else if (
        event.type.includes("error") ||
        event.type.includes("fail") ||
        event.type.includes("violation") ||
        event.type.includes("issue")
      ) {
        const v: ViolationReport = {
          id: `v-implicit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          engine: mappedEngine,
          domain: (payload?.domain as string) ?? "unknown",
          severity: mapSeverity(payload?.severity as string),
          code: (payload?.code as string) ?? event.type,
          message: (payload?.message as string) ?? `Engine event: ${event.type}`,
          entityId: payload?.entityId as string,
          source: `engine:${engineId}`,
          detectedAt: new Date().toISOString(),
          metadata: payload,
        };
        pushDetectedViolation(mappedEngine, v);
      }
    }),
  );

  unsubs.push(
    platformBus.on("ui-engine:report", (event) => {
      const payload = event.payload as Record<string, unknown>;
      const violation = payload?.violation as Record<string, unknown> | undefined;
      if (violation) {
        const v: ViolationReport = {
          id: violation.id as string ?? `v-ui-${Date.now()}`,
          engine: "ui",
          domain: (violation.ownerDomain as string) ?? "dashboard",
          severity: mapSeverity(violation.severity as string),
          code: (violation.code as string) ?? "UI_VIOLATION",
          message: (violation.message as string) ?? "UI engine violation",
          entityId: violation.entityId as string,
          source: "ui-engine",
          detectedAt: (violation.detectedAt as string) ?? new Date().toISOString(),
          metadata: violation.metadata as Record<string, unknown>,
        };
        pushDetectedViolation("ui", v);
      }
    }),
  );

  unsubs.push(
    platformBus.on("enforcement:violation_processed", (event) => {
      const payload = event.payload as Record<string, unknown>;
      if (payload?.decision === "quarantine" && payload?.entityId) {
        bridgeToQuarantine(
          payload.entityId as string,
          payload.engine as string,
          payload.domain as string,
          {
            entityType: payload.entityType as string | undefined,
            code: payload.code as string | undefined,
            message: payload.message as string | undefined,
          },
        );
      }
    }),
  );

  unsubs.push(
    platformBus.onPrefix("sla:", (event) => {
      const payload = event.payload as Record<string, unknown>;
      pushDetectedViolation("security", {
        id: `v-sla-${Date.now()}`,
        engine: "security",
        domain: (payload?.domain as string) ?? "system",
        severity: "warning",
        code: "SLA_WARNING",
        message: (payload?.title as string) ?? "SLA warning triggered",
        source: "incident-engine",
        detectedAt: new Date().toISOString(),
        metadata: payload,
      });
    }),
  );

  unsubs.push(
    platformBus.on("auth:login_started", () => {
      startFlow("login");
    }),
  );
  unsubs.push(
    platformBus.on("auth:credentials_submitted", () => {
      transitionActiveFlow("login", "credentials");
    }),
  );
  unsubs.push(
    platformBus.on("auth:validating", () => {
      transitionActiveFlow("login", "validating");
    }),
  );
  unsubs.push(
    platformBus.on("auth:mfa_required", () => {
      transitionActiveFlow("login", "mfa");
    }),
  );
  unsubs.push(
    platformBus.on("auth:login_success", () => {
      transitionActiveFlow("login", "authenticated");
    }),
  );
  unsubs.push(
    platformBus.on("auth:authenticated", () => {
      transitionActiveFlow("login", "authenticated");
    }),
  );
  unsubs.push(
    platformBus.on("auth:login_failed", () => {
      transitionActiveFlow("login", "failed");
    }),
  );

  unsubs.push(
    platformBus.on("auth:logout_started", () => {
      startFlow("logout");
    }),
  );
  unsubs.push(
    platformBus.on("auth:logout", () => {
      const id = startFlow("logout");
      if (id) transitionFlow(id, "cleanup");
      transitionActiveFlow("logout", "cleanup");
    }),
  );
  unsubs.push(
    platformBus.on("auth:logout_confirmed", () => {
      transitionActiveFlow("logout", "confirmed");
    }),
  );

  unsubs.push(
    platformBus.on("auth:session_restore_started", () => {
      startFlow("session_restore");
    }),
  );
  unsubs.push(
    platformBus.on("auth:session_checking", () => {
      transitionActiveFlow("session_restore", "checking_token");
    }),
  );
  unsubs.push(
    platformBus.on("auth:session_restoring", () => {
      transitionActiveFlow("session_restore", "restoring_state");
    }),
  );
  unsubs.push(
    platformBus.on("auth:session_restored", () => {
      transitionActiveFlow("session_restore", "restored");
    }),
  );
  unsubs.push(
    platformBus.on("auth:session_expired", () => {
      transitionActiveFlow("session_restore", "expired");
    }),
  );

  unsubs.push(
    platformBus.onPrefix("search:", (event) => {
      if (event.type === "search:started") {
        const id = startFlow("search");
        if (id) transitionFlow(id, "querying");
      } else if (event.type === "search:results") {
        transitionActiveFlow("search", "results");
      } else if (event.type === "search:no_results") {
        transitionActiveFlow("search", "no_results");
      } else if (event.type === "search:failed") {
        transitionActiveFlow("search", "failed");
      }
    }),
  );

  unsubs.push(
    platformBus.onPrefix("booking:", (event) => {
      if (event.type === "booking:created") {
        const id = startFlow("booking");
        if (id) transitionFlow(id, "selecting");
      } else if (event.type === "booking:details_entered") {
        transitionActiveFlow("booking", "details");
      } else if (event.type === "booking:payment") {
        transitionActiveFlow("booking", "payment");
      } else if (event.type === "booking:confirming") {
        transitionActiveFlow("booking", "confirming");
      } else if (event.type === "booking:confirmed") {
        transitionActiveFlow("booking", "confirmed");
      } else if (event.type === "booking:failed") {
        transitionActiveFlow("booking", "failed");
      }
    }),
  );

  unsubs.push(
    platformBus.onPrefix("wallet:payment", (event) => {
      if (event.type === "wallet:payment_started") {
        const id = startFlow("pay");
        if (id) transitionFlow(id, "selecting_method");
      } else if (event.type === "wallet:payment_processing") {
        transitionActiveFlow("pay", "processing");
      } else if (event.type === "wallet:payment_confirmed") {
        transitionActiveFlow("pay", "confirmed");
      } else if (event.type === "wallet:payment_failed") {
        transitionActiveFlow("pay", "failed");
      }
    }),
  );

  unsubs.push(
    platformBus.on("onboarding:started", () => {
      const id = startFlow("onboarding");
      if (id) transitionFlow(id, "profile");
    }),
  );
  unsubs.push(
    platformBus.on("onboarding:preferences_set", () => {
      transitionActiveFlow("onboarding", "preferences");
    }),
  );
  unsubs.push(
    platformBus.on("onboarding:verified", () => {
      transitionActiveFlow("onboarding", "verification");
    }),
  );
  unsubs.push(
    platformBus.on("onboarding:completed", () => {
      transitionActiveFlow("onboarding", "completed");
    }),
  );

  unsubs.push(
    platformBus.on("detail:opened", () => {
      const id = startFlow("open_detail");
      if (id) transitionFlow(id, "loading");
    }),
  );
  unsubs.push(
    platformBus.on("detail:loaded", () => {
      transitionActiveFlow("open_detail", "loaded");
    }),
  );
  unsubs.push(
    platformBus.on("detail:not_found", () => {
      transitionActiveFlow("open_detail", "not_found");
    }),
  );

  unsubs.push(
    platformBus.on("contact:initiated", () => {
      const id = startFlow("contact");
      if (id) transitionFlow(id, "resolving");
    }),
  );
  unsubs.push(
    platformBus.on("contact:channel_opened", () => {
      transitionActiveFlow("contact", "channel_open");
    }),
  );

  unsubs.push(
    platformBus.on("message:composing", () => {
      const id = startFlow("message");
      if (id) transitionFlow(id, "composing");
    }),
  );
  unsubs.push(
    platformBus.on("message:sending", () => {
      transitionActiveFlow("message", "sending");
    }),
  );
  unsubs.push(
    platformBus.on("message:sent", () => {
      transitionActiveFlow("message", "sent");
    }),
  );
  unsubs.push(
    platformBus.on("message:delivered", () => {
      transitionActiveFlow("message", "delivered");
    }),
  );

  unsubs.push(
    platformBus.on("call:initiated", () => {
      const id = startFlow("call");
      if (id) transitionFlow(id, "dialing");
    }),
  );
  unsubs.push(
    platformBus.on("call:ringing", () => {
      transitionActiveFlow("call", "ringing");
    }),
  );
  unsubs.push(
    platformBus.on("call:connecting", () => {
      transitionActiveFlow("call", "connecting");
    }),
  );
  unsubs.push(
    platformBus.on("call:active", () => {
      transitionActiveFlow("call", "active");
    }),
  );
  unsubs.push(
    platformBus.on("call:ended", () => {
      transitionActiveFlow("call", "ended");
    }),
  );

  unsubs.push(
    platformBus.on("checkout:started", () => {
      const id = startFlow("checkout");
      if (id) transitionFlow(id, "cart_review");
    }),
  );
  unsubs.push(
    platformBus.on("checkout:address_entered", () => {
      transitionActiveFlow("checkout", "address");
    }),
  );
  unsubs.push(
    platformBus.on("checkout:payment_entered", () => {
      transitionActiveFlow("checkout", "payment");
    }),
  );
  unsubs.push(
    platformBus.on("checkout:confirming", () => {
      transitionActiveFlow("checkout", "confirming");
    }),
  );
  unsubs.push(
    platformBus.on("checkout:confirmed", () => {
      transitionActiveFlow("checkout", "confirmed");
    }),
  );

  unsubs.push(
    platformBus.on("upload:started", () => {
      const id = startFlow("upload");
      if (id) transitionFlow(id, "selecting");
    }),
  );
  unsubs.push(
    platformBus.on("upload:uploading", () => {
      transitionActiveFlow("upload", "uploading");
    }),
  );
  unsubs.push(
    platformBus.on("upload:processing", () => {
      transitionActiveFlow("upload", "processing");
    }),
  );
  unsubs.push(
    platformBus.on("upload:completed", () => {
      transitionActiveFlow("upload", "completed");
    }),
  );

  unsubs.push(
    platformBus.on("notification:opened", () => {
      const id = startFlow("notification_open");
      if (id) transitionFlow(id, "resolving");
    }),
  );
  unsubs.push(
    platformBus.on("notification:navigating", () => {
      transitionActiveFlow("notification_open", "navigating");
    }),
  );
  unsubs.push(
    platformBus.on("notification:displayed", () => {
      transitionActiveFlow("notification_open", "displayed");
    }),
  );

  unsubs.push(
    platformBus.on("deeplink:received", () => {
      const id = startFlow("deep_link");
      if (id) transitionFlow(id, "parsing");
    }),
  );
  unsubs.push(
    platformBus.on("deeplink:resolving", () => {
      transitionActiveFlow("deep_link", "resolving");
    }),
  );
  unsubs.push(
    platformBus.on("deeplink:navigating", () => {
      transitionActiveFlow("deep_link", "navigating");
    }),
  );
  unsubs.push(
    platformBus.on("deeplink:displayed", () => {
      transitionActiveFlow("deep_link", "displayed");
    }),
  );

  unsubs.push(
    platformBus.on("entity:ingesting", (event) => {
      const payload = event.payload as Record<string, unknown>;
      const entityId = payload?.entityId as string;
      if (!entityId) return;

      const scores = payload?.scores as IngestionScores | null | undefined;
      const gate = enforceIngestionGate(entityId, scores ?? null);

      if (!gate.allowed) {
        bridgeToQuarantine(entityId, "data", "marketplace", {
          code: scores ? "INGESTION_FAILED" : "INGESTION_UNSCORED",
          message: gate.reason,
        });
        platformBus.emit("entity:ingestion_blocked", {
          entityId,
          decision: gate.decision,
          reason: gate.reason,
        }, "system");
      }
    }),
  );

  unsubs.push(
    platformBus.on("enforcement:ingestion_evaluated", (event) => {
      const payload = event.payload as Record<string, unknown>;
      if (
        (payload?.decision === "quarantine" || payload?.decision === "reject") &&
        payload?.entityId
      ) {
        bridgeToQuarantine(
          payload.entityId as string,
          "data",
          "marketplace",
          {
            code: `INGESTION_${(payload.decision as string).toUpperCase()}`,
            message: `Ingestion ${payload.decision}: score below threshold`,
          },
        );
      }
    }),
  );

  pipelineTimer = setInterval(() => {
    if (isStormActive()) return;
    try {
      runAllPipelines();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      receiveViolation({
        id: `v-pipeline-crash-${Date.now()}`,
        engine: "repair",
        domain: "system",
        severity: "error",
        code: "PIPELINE_EXECUTION_FAILURE",
        message: `Scheduled pipeline run failed: ${message}`,
        source: "enforcement-wiring",
        detectedAt: new Date().toISOString(),
        metadata: { error: message },
      });
      recordObservabilityProof({
        id: `proof-pipeline-crash-${Date.now()}`,
        source: "enforcement-wiring",
        category: "integrity",
        timestamp: new Date().toISOString(),
        what: "Scheduled pipeline execution failed",
        why: message,
        where: "enforcement-wiring:pipeline-interval",
        correction: "Pipeline will retry on next interval",
        fallbackUsed: false,
        rollbackUsed: false,
        recurrenceRisk: "high",
        metadata: { error: message },
      });
    }
  }, PIPELINE_INTERVAL_MS);

  flowTimeoutTimer = setInterval(() => {
    checkFlowTimeouts();
  }, 30_000);

  recordObservabilityProof({
    id: `proof-wiring-boot-${Date.now()}`,
    source: "enforcement-wiring",
    category: "integrity",
    timestamp: new Date().toISOString(),
    what: "Enforcement system wired to platform bus",
    why: "Boot-time wiring of all engines, flows, and circuit breakers",
    where: "enforcement-wiring",
    correction: "none",
    fallbackUsed: false,
    rollbackUsed: false,
    recurrenceRisk: "low",
  });

  platformBus.emit("enforcement:wired", {
    timestamp: Date.now(),
    pipelines: 8,
    flows: 15,
  }, "system");

  return teardown;
}

function teardown(): void {
  for (const unsub of unsubs) unsub();
  unsubs.length = 0;
  if (pipelineTimer) {
    clearInterval(pipelineTimer);
    pipelineTimer = null;
  }
  if (flowTimeoutTimer) {
    clearInterval(flowTimeoutTimer);
    flowTimeoutTimer = null;
  }
  wired = false;
}

function transitionActiveFlow(flowId: CriticalFlowId, step: string): void {
  const active = getActiveFlows().filter((f) => f.flowId === flowId);
  const instance = active[active.length - 1];
  if (instance) {
    transitionFlow(instance.instanceId, step);
  }
}

function mapEngineId(engineId: string): EnforcementEngine {
  if (engineId.includes("taxonomy") || engineId.includes("category")) return "taxonomy";
  if (engineId.includes("media") || engineId.includes("asset") || engineId.includes("banner")) return "asset";
  if (engineId.includes("data") || engineId.includes("quality") || engineId.includes("trust")) return "data";
  if (engineId.includes("ui") || engineId.includes("text") || engineId.includes("page")) return "ui";
  if (engineId.includes("flow") || engineId.includes("action") || engineId.includes("closure")) return "flow";
  if (engineId.includes("realtime") || engineId.includes("unread")) return "realtime";
  if (engineId.includes("security") || engineId.includes("auth")) return "security";
  if (engineId.includes("repair") || engineId.includes("remediation")) return "repair";
  return "data";
}

function mapSeverity(s?: string): "info" | "warning" | "error" | "critical" {
  if (s === "critical") return "critical";
  if (s === "error") return "error";
  if (s === "warning") return "warning";
  return "info";
}

type SystemEntityType = "asset" | "data_record" | "page" | "feature" | "provider" | "import" | "event" | "listing" | "media" | "taxonomy_node";
type SystemReasonCode = "MISSING_FIELDS" | "TAXONOMY_CONFLICT" | "MEDIA_MISMATCH" | "LOW_CONFIDENCE" | "DUPLICATE_CONFLICT" | "CANONICAL_CONFLICT" | "CROSS_VERTICAL_CONTAMINATION" | "GATE_FAILURE" | "SECURITY_VIOLATION" | "MALFORMED_EVENT" | "INCOMPLETE_IMPORT" | "PARTIAL_WIRING" | "UNSTABLE_PROVIDER" | "DATA_INTEGRITY_FAILURE" | "INGESTION_REJECTION";

function mapEntityType(engine: string, entityType?: string): SystemEntityType {
  if (entityType) {
    const valid: SystemEntityType[] = ["asset", "data_record", "page", "feature", "provider", "import", "event", "listing", "media", "taxonomy_node"];
    if (valid.includes(entityType as SystemEntityType)) return entityType as SystemEntityType;
  }
  switch (engine) {
    case "asset": return "media";
    case "taxonomy": return "taxonomy_node";
    case "ui": return "page";
    case "flow": return "feature";
    case "security": return "data_record";
    case "realtime": return "event";
    case "repair": return "data_record";
    default: return "data_record";
  }
}

function mapQuarantineReason(engine: string, code?: string): SystemReasonCode {
  if (code?.startsWith("GATE_FAIL_")) return "GATE_FAILURE";
  if (code?.startsWith("INGESTION_")) return "INGESTION_REJECTION";
  if (code === "SLA_WARNING") return "PARTIAL_WIRING";
  switch (engine) {
    case "security": return "SECURITY_VIOLATION";
    case "taxonomy": return "TAXONOMY_CONFLICT";
    case "asset": return "MEDIA_MISMATCH";
    case "data": return "DATA_INTEGRITY_FAILURE";
    case "repair": return "DATA_INTEGRITY_FAILURE";
    default: return "DATA_INTEGRITY_FAILURE";
  }
}

function bridgeToQuarantine(
  entityId: string,
  engine: string,
  domain: string,
  opts?: { entityType?: string; code?: string; message?: string },
): void {
  const resolvedEntityType = mapEntityType(engine, opts?.entityType);
  const resolvedReason = mapQuarantineReason(engine, opts?.code);

  systemQuarantine({
    entityId,
    entityType: resolvedEntityType,
    reason: resolvedReason,
    details: opts?.message ?? `Quarantined by enforcement hub via ${engine} engine`,
    source: `enforcement:${engine}`,
    metadata: { domain, originalCode: opts?.code },
  });

  if (!legacyIsQuarantined(entityId)) {
    legacyQuarantine({
      entityId,
      source: `enforcement:${engine}`,
      vertical: domain,
      title: opts?.message ?? `Quarantined by enforcement: ${engine}`,
      classification: "QUARANTINED",
      reasonCodes: [resolvedReason, opts?.code ?? "enforcement_quarantine"].filter(Boolean),
      quarantinedAt: new Date().toISOString(),
      reviewable: true,
      restorable: true,
    });
  }
}

export function enforcementRepairGate(entityId: string, cascadeDepth = 0): {
  allowed: boolean;
  reason: string;
} {
  if (isStormActive()) {
    return { allowed: false, reason: "Storm active — repairs suspended" };
  }

  if (detectInfiniteLoop(entityId)) {
    return { allowed: false, reason: `Infinite loop detected for entity ${entityId}` };
  }

  return cbCanAttemptRepair(entityId, cascadeDepth);
}

export function recordEnforcementRepair(entityId: string, success: boolean, cascadeDepth = 0): void {
  cbRecordRepairAttempt(entityId, success, cascadeDepth);
}

export function triggerFlowEnforcement(
  flowId: CriticalFlowId,
  steps: string[],
  opts?: { userId?: string },
): string {
  const instanceId = startFlow(flowId, { userId: opts?.userId });
  for (const step of steps) {
    if (!instanceId) break;
    const result = transitionFlow(instanceId, step);
    if (!result.success) break;
  }
  return instanceId;
}

export function isEnforcementWired(): boolean {
  return wired;
}
