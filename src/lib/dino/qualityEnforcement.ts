/**
 * DINO V7 — Auto Quality Enforcement
 * Enforces minimum quality standards — hides or downgrades below threshold.
 */

export interface QualityGate {
  entityId: string;
  entityType: string;
  qualityScore: number;
  mediaScore: number;
  profileCompleteness: number;
  hasActiveIssues: boolean;
}

export interface EnforcementAction {
  entityId: string;
  entityType: string;
  action: "visible" | "reduced_visibility" | "hidden" | "flagged_for_review";
  reason: string;
  qualityScore: number;
}

const THRESHOLDS = {
  hide: 20,
  reduce: 40,
  flag: 60,
};

export function enforceQuality(entities: QualityGate[]): EnforcementAction[] {
  return entities.map(entity => {
    const compositeScore = Math.round(
      entity.qualityScore * 0.4 +
      entity.mediaScore * 0.3 +
      entity.profileCompleteness * 100 * 0.3
    );

    if (compositeScore < THRESHOLDS.hide) {
      return {
        entityId: entity.entityId, entityType: entity.entityType,
        action: "hidden" as const, reason: `Composite score ${compositeScore}/100 below hide threshold`,
        qualityScore: compositeScore,
      };
    }

    if (compositeScore < THRESHOLDS.reduce || entity.hasActiveIssues) {
      return {
        entityId: entity.entityId, entityType: entity.entityType,
        action: "reduced_visibility" as const,
        reason: entity.hasActiveIssues
          ? `Active issues + score ${compositeScore}/100`
          : `Composite score ${compositeScore}/100 below visibility threshold`,
        qualityScore: compositeScore,
      };
    }

    if (compositeScore < THRESHOLDS.flag) {
      return {
        entityId: entity.entityId, entityType: entity.entityType,
        action: "flagged_for_review" as const, reason: `Score ${compositeScore}/100 — review recommended`,
        qualityScore: compositeScore,
      };
    }

    return {
      entityId: entity.entityId, entityType: entity.entityType,
      action: "visible" as const, reason: `Quality score ${compositeScore}/100 — meets standards`,
      qualityScore: compositeScore,
    };
  });
}

export function getEnforcementStats(actions: EnforcementAction[]) {
  const counts: Record<string, number> = { visible: 0, reduced_visibility: 0, hidden: 0, flagged_for_review: 0 };
  for (const a of actions) counts[a.action] = (counts[a.action] ?? 0) + 1;
  return { total: actions.length, ...counts };
}
