import { BaseEngine, type EngineTickResult } from "../core/base-engine";
import {
  isCanonicalVertical,
  CANONICAL_VERTICALS,
  toViolationVertical,
  type CanonicalVertical,
  type GovernanceViolation,
  type GovernanceSeverity,
} from "@/domains/shared/canonical-types";
import { platformBus } from "@/lib/shared/platform-bus";

const VERTICALS: readonly CanonicalVertical[] = CANONICAL_VERTICALS;

interface VerticalContext {
  vertical: string;
  category?: string;
  subcategory?: string;
}

interface RenderedElement {
  id: string;
  vertical: string;
  cardTemplate?: string;
  ctaFamily?: string;
  mediaVertical?: string;
}

const violations: GovernanceViolation[] = [];

function detectContamination(
  context: VerticalContext,
  element: RenderedElement
): GovernanceViolation | null {
  if (
    context.vertical &&
    element.vertical &&
    context.vertical !== element.vertical
  ) {
    const v: GovernanceViolation = {
      id: `vi-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: "cross_vertical_contamination",
      severity: "critical" as GovernanceSeverity,
      source: `context:${context.vertical}`,
      target: `element:${element.vertical}`,
      message: `Element from vertical "${element.vertical}" rendered in "${context.vertical}" context`,
      ownerDomain: context.vertical,
      vertical: toViolationVertical(context.vertical),
      detectedAt: new Date().toISOString(),
      resolvedAt: null,
      autoRemediated: false,
      metadata: { elementId: element.id, cardTemplate: element.cardTemplate },
    };
    violations.push(v);
    return v;
  }

  if (
    element.mediaVertical &&
    element.mediaVertical !== element.vertical
  ) {
    const v: GovernanceViolation = {
      id: `vi-media-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: "cross_vertical_contamination",
      severity: "error" as GovernanceSeverity,
      source: `media:${element.mediaVertical}`,
      target: `element:${element.vertical}`,
      message: `Media from vertical "${element.mediaVertical}" attached to "${element.vertical}" entity`,
      ownerDomain: element.vertical,
      vertical: toViolationVertical(element.vertical),
      detectedAt: new Date().toISOString(),
      resolvedAt: null,
      autoRemediated: false,
      metadata: { elementId: element.id },
    };
    violations.push(v);
    return v;
  }

  return null;
}

export function validateVerticalIsolation(
  context: VerticalContext,
  element: RenderedElement
): { valid: boolean; violation: GovernanceViolation | null } {
  const violation = detectContamination(context, element);
  if (violation) {
    platformBus.emit("ui-engine:report" as any, {
      engineId: "vertical-isolation",
      violation,
    });
    return { valid: false, violation };
  }
  return { valid: true, violation: null };
}

export function getVerticalViolations(): GovernanceViolation[] {
  return [...violations];
}

export function isValidVertical(v: string): v is CanonicalVertical {
  return isCanonicalVertical(v);
}

export class VerticalIsolationEngine extends BaseEngine {
  constructor() {
    super({
      id: "vertical-isolation",
      name: "Vertical Isolation Engine",
      category: "governance",
      intervalMs: 30_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const recentViolations = violations.filter(
      (v) => Date.now() - new Date(v.detectedAt).getTime() < this.intervalMs
    );

    const criticals = recentViolations.filter(
      (v) => v.severity === "critical"
    );

    if (criticals.length > 0) {
      this.log(
        "error",
        `${criticals.length} critical cross-vertical contaminations detected`
      );
    }

    return {
      level: recentViolations.length > 0 ? "detect" : "observe",
      findings: recentViolations.length,
      actions: criticals.map(
        (v) => `BLOCK: ${v.source} → ${v.target}: ${v.message}`
      ),
      duration: 0,
    };
  }
}
