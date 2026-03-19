/**
 * DINO V6 — Conversion Optimizer
 * Detects drop-off points and suggests optimizations.
 */

export interface FunnelStep {
  step: string;
  count: number;
  route?: string;
}

export interface DropPoint {
  fromStep: string;
  toStep: string;
  dropRate: number;  // 0-1
  absoluteDrop: number;
  severity: "critical" | "major" | "minor";
  suggestion: string;
}

export function analyzeFunnel(steps: FunnelStep[]): DropPoint[] {
  const drops: DropPoint[] = [];

  for (let i = 0; i < steps.length - 1; i++) {
    const current = steps[i];
    const next = steps[i + 1];
    if (current.count === 0) continue;

    const dropRate = 1 - (next.count / current.count);
    const absoluteDrop = current.count - next.count;

    if (dropRate > 0.1) {
      const severity = dropRate > 0.5 ? "critical" : dropRate > 0.3 ? "major" : "minor";
      drops.push({
        fromStep: current.step,
        toStep: next.step,
        dropRate,
        absoluteDrop,
        severity,
        suggestion: getSuggestion(current.step, next.step, dropRate),
      });
    }
  }

  return drops;
}

function getSuggestion(from: string, to: string, rate: number): string {
  const key = `${from}→${to}`.toLowerCase();
  if (key.includes("view") && key.includes("click")) return "Improve CTA visibility — make action buttons more prominent";
  if (key.includes("click") && key.includes("cart")) return "Simplify add-to-cart flow — reduce friction";
  if (key.includes("cart") && key.includes("checkout")) return "Show order summary earlier — reduce checkout hesitation";
  if (key.includes("checkout") && key.includes("payment")) return "Offer more payment methods — reduce payment friction";
  if (key.includes("search") && key.includes("result")) return "Improve search relevance — users not finding what they need";
  if (rate > 0.5) return "Critical drop — consider A/B testing this step with simplified layout";
  return "Consider simplifying this step or adding progress indicators";
}

// Pre-built funnel templates
export const FOOD_FUNNEL_STEPS: FunnelStep[] = [
  { step: "restaurant_view", count: 0 },
  { step: "menu_browse", count: 0 },
  { step: "add_to_cart", count: 0 },
  { step: "begin_checkout", count: 0 },
  { step: "payment_complete", count: 0 },
];

export const PROPERTY_FUNNEL_STEPS: FunnelStep[] = [
  { step: "listing_view", count: 0 },
  { step: "detail_open", count: 0 },
  { step: "contact_click", count: 0 },
  { step: "booking_start", count: 0 },
  { step: "booking_complete", count: 0 },
];

export const ONBOARDING_FUNNEL_STEPS: FunnelStep[] = [
  { step: "signup_start", count: 0 },
  { step: "profile_created", count: 0 },
  { step: "first_action", count: 0 },
  { step: "activation", count: 0 },
];
