import { BaseEngine, type EngineTickResult } from "../core/base-engine";
import {
  getActionStats,
  getFlowClosureStats,
} from "../governance/flow-integrity-engine";
import {
  getGovernanceSummary,
  getUnresolvedDebt,
  attemptRemediation,
} from "../governance/governance-audit-engine";
import { getMediaViolations } from "../governance/media-relevance-engine";
import { getActionViolations } from "../governance/flow-integrity-engine";

export class ConsolidatedFlowIntegrityEngine extends BaseEngine {
  constructor() {
    super({
      id: "flow-integrity-engine",
      name: "Flow Integrity Engine",
      category: "flow-integrity",
      domain: "governance",
      intervalMs: 30_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const actions: string[] = [];
    let totalFindings = 0;

    const actionFlowFindings = this.tickActionFlowIntegrity(actions);
    totalFindings += actionFlowFindings;

    const governanceFindings = this.tickGovernanceAudit(actions);
    totalFindings += governanceFindings;

    await this.tickPublishGates(actions);
    await this.tickLifecycle(actions);
    await this.tickDataQuality(actions);
    await this.tickReferenceIntegrity(actions);
    await this.tickDuplicateShadow(actions);

    return {
      level: totalFindings > 10 ? "act" : totalFindings > 0 ? "detect" : "observe",
      findings: totalFindings,
      actions: actions.slice(0, 10),
      duration: 0,
    };
  }

  private tickActionFlowIntegrity(actions: string[]): number {
    const actionStats = getActionStats();
    const flowStats = getFlowClosureStats();

    if (actionStats.deadClicks > 0) actions.push(`DEAD_CLICKS: ${actionStats.deadClicks}`);
    for (const dead of actionStats.topDeadActions.slice(0, 2)) {
      actions.push(`TOP_DEAD: ${dead.actionId} (${dead.count}x)`);
    }
    if (flowStats.failedFlows > 0) actions.push(`FAILED_FLOWS: ${flowStats.failedFlows}`);
    if (flowStats.blockedFlows > 0) actions.push(`BLOCKED_FLOWS: ${flowStats.blockedFlows}`);

    return actionStats.deadClicks + flowStats.failedFlows + flowStats.blockedFlows;
  }

  private tickGovernanceAudit(actions: string[]): number {
    const summary = getGovernanceSummary();

    if (summary.unresolvedCount > 0) actions.push(`UNRESOLVED: ${summary.unresolvedCount} violations`);
    const debt = getUnresolvedDebt();
    if (debt.length > 0) {
      actions.push(`ARCH_DEBT: ${debt.length} items`);
      for (const d of debt.slice(0, 3)) {
        actions.push(`  [${d.severity}] ${d.law}: ${d.description}`);
      }
    }

    const unremediated = [
      ...getMediaViolations(),
      ...getActionViolations(),
    ].filter((v) => !v.autoRemediated && !v.resolvedAt);

    for (const v of unremediated) {
      const result = attemptRemediation(v);
      if (result) {
        actions.push(`REMEDIATED: ${result.action} for ${v.type}`);
      }
    }

    return summary.totalViolations;
  }

  private async tickPublishGates(actions: string[]): Promise<void> {
    try {
      const { runFoodPublishGate } = await import("@/lib/engines/publish-gate-food-engine");
      const foodResult = await runFoodPublishGate(50);
      if (foodResult.failed > 0) actions.push(`${foodResult.failed} food listings failed gate`);
    } catch (err) { if (import.meta.env.DEV) console.warn('[flow_integrity] sub-module error', err instanceof Error ? err.message : err); }

    try {
      const { runGroceryPublishGate } = await import("@/lib/engines/publish-gate-grocery-engine");
      const groceryResult = await runGroceryPublishGate(50);
      if (groceryResult.failed > 0) actions.push(`${groceryResult.failed} grocery listings failed gate`);
    } catch (err) { if (import.meta.env.DEV) console.warn('[flow_integrity] sub-module error', err instanceof Error ? err.message : err); }

    try {
      const { runServicePublishGate } = await import("@/lib/engines/publish-gate-service-engine");
      const serviceResult = await runServicePublishGate(50);
      if (serviceResult.failed > 0) actions.push(`${serviceResult.failed} service listings failed gate`);
    } catch (err) { if (import.meta.env.DEV) console.warn('[flow_integrity] sub-module error', err instanceof Error ? err.message : err); }
  }

  private async tickLifecycle(actions: string[]): Promise<void> {
    try {
      const { runAutoPublish } = await import("@/lib/engines/auto-publish-engine");
      const pubResult = await runAutoPublish(50);
      if (pubResult.published > 0) actions.push(`Published ${pubResult.published} listings`);
      if (pubResult.blocked > 0) actions.push(`Blocked ${pubResult.blocked} listings`);
    } catch (err) { if (import.meta.env.DEV) console.warn('[flow_integrity] sub-module error', err instanceof Error ? err.message : err); }

    try {
      const { runAutoUnpublish } = await import("@/lib/engines/auto-unpublish-engine");
      const unpubResult = await runAutoUnpublish(50);
      if (unpubResult.unpublished > 0) actions.push(`Unpublished ${unpubResult.unpublished} listings`);
    } catch (err) { if (import.meta.env.DEV) console.warn('[flow_integrity] sub-module error', err instanceof Error ? err.message : err); }
  }

  private async tickDataQuality(actions: string[]): Promise<void> {
    try {
      const { runDataTrustScan } = await import("@/lib/engines/data-trust-engine");
      const trustResult = await runDataTrustScan(100);
      const lowTrust = trustResult.results.filter((r: { trustScore: number }) => r.trustScore < 40).length;
      if (lowTrust > 0) actions.push(`${lowTrust} entities with trust < 40`);
    } catch (err) { if (import.meta.env.DEV) console.warn('[flow_integrity] sub-module error', err instanceof Error ? err.message : err); }

    try {
      const { runDataCompletenessEngine } = await import("@/lib/engines/data-completeness-engine");
      const compResult = await runDataCompletenessEngine(100);
      const incomplete = compResult.results.filter((r: { completeness: number }) => r.completeness < 60).length;
      if (incomplete > 0) actions.push(`${incomplete} entities below 60% completeness`);
    } catch (err) { if (import.meta.env.DEV) console.warn('[flow_integrity] sub-module error', err instanceof Error ? err.message : err); }
  }

  private async tickReferenceIntegrity(actions: string[]): Promise<void> {
    try {
      const { engineRegistry } = await import("@/lib/data-quality/engine-registry");
      const refEngine = engineRegistry.get("ReferenceIntegrityEngine");
      if (refEngine) {
        const log = refEngine.run("DRY_RUN", "scheduled");
        if (log.issuesFound > 0) {
          actions.push(`REF_INTEGRITY: ${log.issuesFound} broken references detected`);
        }
      }
    } catch (err) { if (import.meta.env.DEV) console.warn('[flow_integrity] sub-module error', err instanceof Error ? err.message : err); }
  }

  private async tickDuplicateShadow(actions: string[]): Promise<void> {
    try {
      const { engineRegistry } = await import("@/lib/data-quality/engine-registry");
      const dupEngine = engineRegistry.get("DuplicateShadowEngine");
      if (dupEngine) {
        const log = dupEngine.run("DRY_RUN", "scheduled");
        if (log.issuesFound > 0) {
          actions.push(`DUPLICATES: ${log.issuesFound} duplicate/shadow entities detected`);
        }
      }
    } catch (err) { if (import.meta.env.DEV) console.warn('[flow_integrity] sub-module error', err instanceof Error ? err.message : err); }
  }
}
