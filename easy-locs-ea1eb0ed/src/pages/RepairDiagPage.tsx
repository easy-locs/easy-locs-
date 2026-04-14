import { getProofsByDomain, getProofStats, getRecentProofs, getRejectedProofs } from "@/engines/core/proof-system";
import { getRepairBridgeReport, installRepairBridge, isRepairBridgeActive } from "@/engines/core/repair-bridge";
import { getUiRepairBridgeReport, installUiRepairBridge, isUiRepairBridgeActive } from "@/engines/core/ui-repair-bridge";
import { getPipelineReport } from "@/engines/core/repair-pipeline";
import { getHardeningReport } from "@/engines/core/repair-hardening";
import { isPlatformFlagEnabled } from "@/lib/growth/feature-flag-registry";
import { registerAllActivationSheets, getRegisteredDomains } from "@/engines/core/domain-activation-sheets";
import { TaxonomyIntegrityEngine } from "@/lib/data-quality/engines/taxonomy-integrity-engine";
import { useEffect, useState } from "react";
import { useUiEngine } from "@/hooks/useUiEngine";

interface DiagResult {
  error?: string;
  stack?: string;
  flagOn?: boolean;
  registeredDomains?: string[];
  bridgeWasAlreadyActive?: boolean;
  uiBridgeWasAlreadyActive?: boolean;
  bridgeBefore?: ReturnType<typeof getRepairBridgeReport>;
  bridgeAfter?: ReturnType<typeof getRepairBridgeReport>;
  uiBridgeBefore?: ReturnType<typeof getUiRepairBridgeReport>;
  uiBridgeAfter?: ReturnType<typeof getUiRepairBridgeReport>;
  pipeline?: ReturnType<typeof getPipelineReport>;
  hardening?: ReturnType<typeof getHardeningReport>;
  stats?: ReturnType<typeof getProofStats>;
  findingsCount?: number;
  issueCount?: number;
  proofCount?: number;
  rejectedCount?: number;
  proofsByDomain?: Record<string, number>;
  proofs?: Array<{
    id: string;
    outcome: string;
    durationMs: number;
    rolledBack: boolean;
    domain: string;
    engineId: string;
    repairLevel: string;
    ruleId: string | null;
    priority: string | null;
    confidence: number | null;
    confidenceThreshold: number | null;
    budgetCost: number | null;
    budgetRemaining: number | null;
    stormState: string | null;
    rejectionReason: string | null;
    cooldownState: string | null;
    stages: Array<{ stage: string; result: string }>;
    mutationChanged: boolean | null;
    mutationBeforeLen: number | null;
    mutationAfterLen: number | null;
  }>;
}

let diagResult: DiagResult | null = null;
let diagRunning = false;

async function runDiagnostic() {
  if (diagRunning || diagResult) return;
  diagRunning = true;

  const bridgeWasActive = isRepairBridgeActive();
  const uiBridgeWasActive = isUiRepairBridgeActive();

  try {
    registerAllActivationSheets();
    installRepairBridge();
    installUiRepairBridge();
    const bridge1 = getRepairBridgeReport();
    const uiBridge1 = getUiRepairBridgeReport();

    const engine = new TaxonomyIntegrityEngine();
    const findings = engine.scan("SAFE_AUTO");

    await new Promise(r => setTimeout(r, 1500));

    const taxonomyProofs = getProofsByDomain("taxonomy");
    const allRecentProofs = getRecentProofs(50);
    const rejectedProofs = getRejectedProofs();
    const stats = getProofStats();
    const bridge2 = getRepairBridgeReport();
    const uiBridge2 = getUiRepairBridgeReport();
    const pipeline = getPipelineReport();
    const hardening = getHardeningReport();
    const flagOn = isPlatformFlagEnabled("enable_repair_pipeline");
    const registeredDomains = getRegisteredDomains();

    const proofsByDomain: Record<string, number> = {};
    for (const p of allRecentProofs) {
      proofsByDomain[p.domain] = (proofsByDomain[p.domain] ?? 0) + 1;
    }

    diagResult = {
      flagOn,
      registeredDomains,
      bridgeWasAlreadyActive: bridgeWasActive,
      uiBridgeWasAlreadyActive: uiBridgeWasActive,
      bridgeBefore: bridge1,
      bridgeAfter: bridge2,
      uiBridgeBefore: uiBridge1,
      uiBridgeAfter: uiBridge2,
      pipeline,
      hardening,
      stats,
      findingsCount: findings.length,
      issueCount: findings.reduce((n: number, f: { issues: unknown[] }) => n + f.issues.length, 0),
      proofCount: allRecentProofs.length,
      rejectedCount: rejectedProofs.length,
      proofsByDomain,
      proofs: allRecentProofs.map(p => ({
        id: p.id,
        outcome: p.outcome,
        durationMs: p.durationMs,
        rolledBack: p.rolledBack,
        domain: p.domain,
        engineId: p.engineId,
        repairLevel: p.repairLevel,
        ruleId: p.ruleId,
        priority: p.priority,
        confidence: p.confidence,
        confidenceThreshold: p.confidenceThreshold,
        budgetCost: p.budgetCost,
        budgetRemaining: p.budgetRemaining,
        stormState: p.stormState,
        rejectionReason: p.rejectionReason,
        cooldownState: p.cooldownState,
        stages: p.stages.map(s => ({ stage: s.stage, result: s.result })),
        mutationChanged: p.mutation ? p.mutation.beforeState !== p.mutation.afterState : null,
        mutationBeforeLen: p.mutation?.beforeState?.length ?? null,
        mutationAfterLen: p.mutation?.afterState?.length ?? null,
      })),
    };

    void fetch("/__repair_diag_write", {
      method: "POST",
      body: JSON.stringify(diagResult),
    }).catch(() => {});
  } catch (e: unknown) {
    const err = e instanceof Error ? e : new Error(String(e));
    diagResult = { error: err.message, stack: err.stack ?? "" };
    void fetch("/__repair_diag_write", {
      method: "POST",
      body: JSON.stringify(diagResult),
    }).catch(() => {});
  } finally {
    diagRunning = false;
  }
}

function outcomeColor(outcome: string): string {
  switch (outcome) {
    case "accepted": return "#e8f5e9";
    case "rejected": return "#fff3e0";
    case "blocked": return "#fce4ec";
    case "rolled_back": return "#fce4ec";
    default: return "#f5f5f5";
  }
}

export default function RepairDiagPage() {
  useUiEngine("repairdiagpage");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    runDiagnostic();
    const t = setInterval(() => setTick(n => n + 1), 500);
    return () => clearInterval(t);
  }, []);

  if (!diagResult) {
    return (
      <div style={{ background: "#fff", color: "#000", padding: 20, font: "16px monospace" }}>
        Running diagnostic... (tick {tick}) waiting for debounce + pipeline...
      </div>
    );
  }

  if (diagResult.error) {
    return (
      <div style={{ background: "#fee", color: "#900", padding: 20, font: "14px monospace" }}>
        <h2>DIAGNOSTIC ERROR</h2>
        <pre>{diagResult.error}</pre>
        <pre>{diagResult.stack}</pre>
      </div>
    );
  }

  const d = diagResult;
  return (
    <div style={{ background: "#fff", color: "#000", padding: 20, font: "13px monospace", lineHeight: 1.8 }}>
      <h2 style={{ fontSize: 18, fontWeight: "bold", marginBottom: 12 }}>REPAIR PIPELINE LIVE RESULT (Phase B)</h2>

      <div style={{ background: "#e3f2fd", padding: 10, borderRadius: 4, marginBottom: 12 }}>
        <div><b>FLAG:</b> enable_repair_pipeline = {d.flagOn ? "TRUE" : "FALSE"}</div>
        <div><b>REGISTERED DOMAINS:</b> {d.registeredDomains?.join(", ")}</div>
      </div>

      <div style={{ background: "#f3e5f5", padding: 10, borderRadius: 4, marginBottom: 12 }}>
        <h3 style={{ fontSize: 14, fontWeight: "bold", margin: "0 0 4px" }}>STORM / HARDENING STATE</h3>
        <div><b>Storm Level:</b> {d.hardening?.storm?.level ?? "unknown"}</div>
        <div><b>Storm Events:</b> {d.hardening?.storm?.eventCount ?? 0}</div>
        <div><b>Storm Recovery At:</b> {d.hardening?.storm?.recoveryAt ? new Date(d.hardening.storm.recoveryAt).toISOString() : "n/a"}</div>
        <div><b>Budget:</b> total={d.hardening?.budget?.totalBudget} consumed={d.hardening?.budget?.consumed} remaining={d.hardening?.budget?.remaining} skipped={d.hardening?.budget?.candidatesSkipped}</div>
        <div><b>Cooldown Entries:</b> {d.hardening?.cooldownEntries}</div>
        <div><b>Oscillation Quarantines:</b> {d.hardening?.oscillationQuarantines}</div>
      </div>

      <div style={{ background: "#e8eaf6", padding: 10, borderRadius: 4, marginBottom: 12 }}>
        <h3 style={{ fontSize: 14, fontWeight: "bold", margin: "0 0 4px" }}>BRIDGES</h3>
        <div><b>TAXONOMY BRIDGE:</b> listening={String(d.bridgeAfter?.listening)} pending={d.bridgeAfter?.pendingBuffers} running={String(d.bridgeAfter?.pipelineRunning)}</div>
        <div><b>UI REPAIR BRIDGE:</b> listening={String(d.uiBridgeAfter?.listening)} runs={d.uiBridgeAfter?.totalRuns} blocked={d.uiBridgeAfter?.totalBlocked} rejected={d.uiBridgeAfter?.totalRejected} pending={d.uiBridgeAfter?.pendingBatches} storm={d.uiBridgeAfter?.stormLevel}</div>
      </div>

      <div><b>TAXONOMY SCAN:</b> {d.findingsCount} findings, {d.issueCount} issues</div>
      <div><b>PIPELINE:</b> totalRuns={d.pipeline?.totalRuns} totalBlocked={d.pipeline?.totalBlocked} totalRejected={d.pipeline?.totalRejected}</div>

      <div style={{ background: "#e0f2f1", padding: 10, borderRadius: 4, marginTop: 8, marginBottom: 8 }}>
        <h3 style={{ fontSize: 14, fontWeight: "bold", margin: "0 0 4px" }}>PROOF STATISTICS</h3>
        <div><b>Total:</b> {d.stats?.total} | <b>Accepted:</b> {d.stats?.outcomes?.accepted} | <b>Rejected:</b> {d.stats?.outcomes?.rejected} | <b>Blocked:</b> {d.stats?.outcomes?.blocked} | <b>Rolled Back:</b> {d.stats?.outcomes?.rolled_back}</div>
        <div><b>Budget Consumed:</b> {d.stats?.totalBudgetConsumed}</div>
        <div><b>Rejection Breakdown:</b> confidence={d.stats?.rejectedByConfidence} cooldown={d.stats?.rejectedByCooldown} budget={d.stats?.rejectedByBudget} storm={d.stats?.rejectedByStorm}</div>
        <div><b>Validation:</b> passed={d.stats?.successfulValidationCount} failed={d.stats?.failedValidationCount}</div>
        {d.stats?.rejectionReasons && Object.keys(d.stats.rejectionReasons).length > 0 && (
          <div><b>All Rejection Reasons:</b> {JSON.stringify(d.stats.rejectionReasons)}</div>
        )}
      </div>

      <div><b>PROOFS BY DOMAIN:</b> {JSON.stringify(d.proofsByDomain)}</div>
      <div><b>ALL PROOFS:</b> {d.proofCount} records ({d.rejectedCount} rejected)</div>

      {d.proofs?.map((p, i: number) => (
        <div key={i} style={{ background: outcomeColor(p.outcome), padding: 10, marginTop: 8, borderRadius: 4 }}>
          <div><b>Proof #{i+1}:</b> id={p.id?.substring(0,16)}</div>
          <div>outcome={p.outcome} duration={p.durationMs}ms rolledBack={String(p.rolledBack)}</div>
          <div>domain={p.domain} engineId={p.engineId} level={p.repairLevel}</div>
          <div>rule={p.ruleId ?? "none"} priority={p.priority ?? "none"}</div>
          <div>confidence={p.confidence?.toFixed(3) ?? "n/a"} / threshold={p.confidenceThreshold?.toFixed(3) ?? "n/a"}</div>
          <div>budgetCost={p.budgetCost ?? "n/a"} budgetRemaining={p.budgetRemaining ?? "n/a"}</div>
          <div>storm={p.stormState ?? "n/a"} cooldown={p.cooldownState ?? "n/a"}</div>
          {p.rejectionReason && <div style={{ color: "#d84315" }}><b>REJECTED:</b> {p.rejectionReason}</div>}
          <div>stages: {p.stages?.map((s) => `${s.stage}:${s.result}`).join(" -> ")}</div>
          <div>mutationChanged={String(p.mutationChanged)} beforeLen={p.mutationBeforeLen} afterLen={p.mutationAfterLen}</div>
        </div>
      ))}

      {d.proofCount === 0 && (
        <div style={{ background: "#fff3cd", padding: 10, marginTop: 8, borderRadius: 4 }}>
          No proofs recorded. Bridge received events but pipeline may not have produced proofs.
        </div>
      )}
    </div>
  );
}
