import { BaseEngine, type EngineTickResult } from "../core/base-engine";
import type { GovernanceViolation } from "@/domains/shared/canonical-types";
import { getMediaViolations } from "./media-relevance-engine";
import { getVerticalViolations } from "./vertical-isolation-engine";
import { getActionViolations } from "./action-wiring-engine";
import { getBannerViolations } from "./banner-strategy-engine";
import { getLayoutViolations } from "./layout-integrity-engine";
import { platformBus } from "@/lib/shared/platform-bus";

export type RemediationAction =
  | "hide_invalid_media"
  | "swap_fallback_media"
  | "suppress_banner"
  | "quarantine_listing"
  | "disable_broken_cta"
  | "route_to_retry"
  | "downgrade_to_shell"
  | "isolate_subscription"
  | "queue_retriable";

interface RemediationRecord {
  id: string;
  violationId: string;
  action: RemediationAction;
  applied: boolean;
  appliedAt: string | null;
  rollbackAvailable: boolean;
  metadata: Record<string, unknown>;
}

const remediationLog: RemediationRecord[] = [];
const MAX_LOG = 1000;

const AUTO_REMEDIATION_RULES: Record<string, RemediationAction> = {
  invalid_media: "hide_invalid_media",
  cross_vertical_contamination: "quarantine_listing",
  dead_action: "disable_broken_cta",
  banner_conflict: "suppress_banner",
  layout_overflow: "downgrade_to_shell",
};

export function attemptRemediation(violation: GovernanceViolation): RemediationRecord | null {
  const action = AUTO_REMEDIATION_RULES[violation.type];
  if (!action) return null;

  if (violation.severity === "critical" && action !== "hide_invalid_media" && action !== "suppress_banner") {
    return null;
  }

  const record: RemediationRecord = {
    id: `rem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    violationId: violation.id,
    action,
    applied: true,
    appliedAt: new Date().toISOString(),
    rollbackAvailable: true,
    metadata: {
      violationType: violation.type,
      severity: violation.severity,
      source: violation.source,
    },
  };

  remediationLog.push(record);
  if (remediationLog.length > MAX_LOG) {
    remediationLog.splice(0, remediationLog.length - MAX_LOG);
  }

  violation.autoRemediated = true;
  violation.resolvedAt = new Date().toISOString();

  platformBus.emit("ui-engine:report" as any, {
    engineId: "auto-remediation",
    remediation: record,
  });

  return record;
}

export function getRemediationLog(): RemediationRecord[] {
  return [...remediationLog];
}

export function getRemediationStats(): {
  total: number;
  byAction: Record<string, number>;
  autoRemediationRate: number;
} {
  const byAction: Record<string, number> = {};
  for (const r of remediationLog) {
    byAction[r.action] = (byAction[r.action] ?? 0) + 1;
  }

  const allViolations = [
    ...getMediaViolations(),
    ...getVerticalViolations(),
    ...getActionViolations(),
    ...getBannerViolations(),
    ...getLayoutViolations(),
  ];

  const autoRemediated = allViolations.filter((v) => v.autoRemediated).length;
  const autoRemediationRate = allViolations.length > 0 ? autoRemediated / allViolations.length : 0;

  return { total: remediationLog.length, byAction, autoRemediationRate };
}

export class AutoRemediationEngine extends BaseEngine {
  constructor() {
    super({
      id: "auto-remediation",
      name: "Auto-Remediation Engine",
      category: "governance",
      intervalMs: 15_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const allViolations = [
      ...getMediaViolations(),
      ...getVerticalViolations(),
      ...getActionViolations(),
      ...getBannerViolations(),
      ...getLayoutViolations(),
    ];

    const unremediated = allViolations.filter(
      (v) => !v.autoRemediated && !v.resolvedAt
    );

    const actions: string[] = [];
    let remediatedCount = 0;

    for (const v of unremediated) {
      const result = attemptRemediation(v);
      if (result) {
        remediatedCount++;
        actions.push(`REMEDIATED: ${result.action} for ${v.type}`);
      }
    }

    return {
      level: remediatedCount > 0 ? "act" : unremediated.length > 0 ? "detect" : "observe",
      findings: unremediated.length,
      actions: actions.slice(0, 5),
      duration: 0,
    };
  }
}
