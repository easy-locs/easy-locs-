import { DataQualityEngine } from "../engine-base";
import type { EntityFinding, ExecutionMode, RemediationEntry } from "../types";
import { quarantineEntity, isQuarantined, getQuarantineList } from "../quarantine";
import { engineRegistry } from "../engine-registry";

export class QuarantineEngine extends DataQualityEngine {
  constructor() {
    super("QuarantineEngine", "Isolate unsafe, suspicious, invalid, or structurally broken data with full traceability", { priority: 8 });
  }

  scan(_mode: ExecutionMode): EntityFinding[] {
    const allFindings = engineRegistry.getAllFindings();
    return allFindings.filter((f) => f.decisionTier === "QUARANTINE" && !isQuarantined(f.entityId, f.source));
  }

  classify(findings: EntityFinding[]): EntityFinding[] {
    for (const f of findings) {
      f.surfaceVisibility = "quarantined";
    }
    return findings;
  }

  remediate(findings: EntityFinding[], mode: ExecutionMode): RemediationEntry[] {
    if (mode === "DRY_RUN") return [];
    const remediations: RemediationEntry[] = [];
    const now = new Date().toISOString();

    for (const f of findings) {
      if (isQuarantined(f.entityId, f.source)) continue;

      quarantineEntity({
        entityId: f.entityId,
        source: f.source,
        vertical: f.vertical,
        title: f.title,
        classification: f.classification,
        reasonCodes: f.issues.map((i) => i.code),
        quarantinedAt: now,
        reviewable: true,
        quarantinedBy: this.name,
        visibilityEffect: "quarantined",
        restorable: true,
        restorePath: `Review issues: ${f.issues.map((i) => i.code).join(", ")}. If resolved, restore via admin.`,
      });

      remediations.push({
        entityId: f.entityId,
        source: f.source,
        action: "quarantined",
        beforeState: f.classification,
        afterState: "QUARANTINED",
        reason: `Quarantined by engine: ${f.issues.map((i) => i.code).join(", ")}`,
        confidence: "high",
        timestamp: now,
        engineName: this.name,
        decisionTier: "QUARANTINE",
      });
    }

    return remediations;
  }

  getQuarantineSummary() {
    const list = getQuarantineList();
    const byVertical: Record<string, number> = {};
    const byReason: Record<string, number> = {};
    const bySource: Record<string, number> = {};

    for (const entry of list) {
      byVertical[entry.vertical] = (byVertical[entry.vertical] ?? 0) + 1;
      bySource[entry.source] = (bySource[entry.source] ?? 0) + 1;
      for (const code of entry.reasonCodes) {
        byReason[code] = (byReason[code] ?? 0) + 1;
      }
    }

    return {
      total: list.length,
      byVertical,
      byReason,
      bySource,
      entries: list,
    };
  }
}
