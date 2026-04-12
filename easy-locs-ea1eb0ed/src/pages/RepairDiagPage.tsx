import { getProofsByDomain, getProofStats } from "@/engines/core/proof-system";
import { getRepairBridgeReport, installRepairBridge, isRepairBridgeActive } from "@/engines/core/repair-bridge";
import { getPipelineReport } from "@/engines/core/repair-pipeline";
import { isPlatformFlagEnabled } from "@/lib/growth/feature-flag-registry";
import { registerAllActivationSheets } from "@/engines/core/domain-activation-sheets";
import { TaxonomyIntegrityEngine } from "@/lib/data-quality/engines/taxonomy-integrity-engine";
import { useEffect, useState } from "react";

let diagResult: any = null;
let diagRunning = false;

async function runDiagnostic() {
  if (diagRunning || diagResult) return;
  diagRunning = true;

  const bridgeWasActive = isRepairBridgeActive();

  try {
    registerAllActivationSheets();
    installRepairBridge();
    const bridge1 = getRepairBridgeReport();

    const engine = new TaxonomyIntegrityEngine();
    const findings = engine.scan("SAFE_AUTO");

    await new Promise(r => setTimeout(r, 1500));

    const proofs = getProofsByDomain("taxonomy");
    const stats = getProofStats();
    const bridge2 = getRepairBridgeReport();
    const pipeline = getPipelineReport();
    const flagOn = isPlatformFlagEnabled("enable_repair_pipeline");

    diagResult = {
      flagOn,
      bridgeWasAlreadyActive: bridgeWasActive,
      bridgeBefore: bridge1,
      bridgeAfter: bridge2,
      pipeline,
      stats,
      findingsCount: findings.length,
      issueCount: findings.reduce((n, f) => n + f.issues.length, 0),
      proofCount: proofs.length,
      proofs: proofs.map(p => ({
        id: p.id,
        outcome: p.outcome,
        durationMs: p.durationMs,
        rolledBack: p.rolledBack,
        domain: p.domain,
        engineId: p.engineId,
        repairLevel: p.repairLevel,
        stages: p.stages.map(s => ({ stage: s.stage, result: s.result })),
        quarantineTriggered: !!p.quarantineTriggered,
        safetyAbort: !!p.safetyAbort,
        mutationChanged: p.mutation ? p.mutation.beforeState !== p.mutation.afterState : null,
        mutationBeforeLen: p.mutation?.beforeState?.length ?? null,
        mutationAfterLen: p.mutation?.afterState?.length ?? null,
      })),
    };

    fetch("/__repair_diag_write", {
      method: "POST",
      body: JSON.stringify(diagResult),
    }).catch(() => {});
  } catch (e: any) {
    diagResult = { error: String(e?.message ?? e), stack: String(e?.stack ?? "") };
    fetch("/__repair_diag_write", {
      method: "POST",
      body: JSON.stringify(diagResult),
    }).catch(() => {});
  } finally {
    diagRunning = false;
  }
}

export default function RepairDiagPage() {
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
      <h2 style={{ fontSize: 18, fontWeight: "bold", marginBottom: 12 }}>REPAIR PIPELINE LIVE RESULT</h2>
      <div><b>FLAG:</b> enable_repair_pipeline = {d.flagOn ? "TRUE" : "FALSE"}</div>
      <div><b>BRIDGE BEFORE SCAN:</b> listening={String(d.bridgeBefore.listening)} flag={String(d.bridgeBefore.flagEnabled)}</div>
      <div><b>BRIDGE AFTER PIPELINE:</b> listening={String(d.bridgeAfter.listening)} pending={d.bridgeAfter.pendingBuffers} running={String(d.bridgeAfter.pipelineRunning)}</div>
      <div><b>TAXONOMY SCAN:</b> {d.findingsCount} findings, {d.issueCount} issues</div>
      <div><b>PIPELINE:</b> totalRuns={d.pipeline.totalRuns} totalBlocked={d.pipeline.totalBlocked}</div>
      <div><b>PROOF STATS:</b> total={d.stats.total} accepted={d.stats.accepted} rolledBack={d.stats.rolledBack} blocked={d.stats.blocked ?? 0}</div>
      <div><b>TAXONOMY PROOFS:</b> {d.proofCount} records</div>

      {d.proofs?.map((p: any, i: number) => (
        <div key={i} style={{ background: "#e8f5e9", padding: 10, marginTop: 8, borderRadius: 4 }}>
          <div><b>Proof #{i+1}:</b> id={p.id?.substring(0,16)}</div>
          <div>outcome={p.outcome} duration={p.durationMs}ms rolledBack={String(p.rolledBack)}</div>
          <div>domain={p.domain} engineId={p.engineId} level={p.repairLevel}</div>
          <div>stages: {p.stages?.map((s: any) => `${s.stage}:${s.result}`).join(" -> ")}</div>
          <div>mutationChanged={String(p.mutationChanged)} beforeLen={p.mutationBeforeLen} afterLen={p.mutationAfterLen}</div>
          <div>quarantine={String(p.quarantineTriggered)} safetyAbort={String(p.safetyAbort)}</div>
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
