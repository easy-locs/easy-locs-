/**
 * DINO Journey Audit — Analyzes customer/pro journey events for friction.
 */

import { classifyDinoIssue } from "./dinoIssueFactory";
import type { DinoIssue, JourneyEvent } from "./types";

export function auditJourney(events: JourneyEvent[]): DinoIssue[] {
  const issues: DinoIssue[] = [];

  const routeOpens = new Map<string, number>();
  const routeExits = new Map<string, number>();
  const rageClicks = new Map<string, number>();

  for (const e of events) {
    if (e.eventName === "PAGE_OPEN") {
      routeOpens.set(e.route, (routeOpens.get(e.route) || 0) + 1);
    }
    if (e.eventName === "PAGE_EXIT") {
      routeExits.set(e.route, (routeExits.get(e.route) || 0) + 1);
    }
    if (e.eventName === "RAGE_CLICK") {
      rageClicks.set(e.route, (rageClicks.get(e.route) || 0) + 1);
    }
  }

  // High drop-off detection
  for (const [route, exits] of routeExits.entries()) {
    const opens = routeOpens.get(route) || 1;
    const ratio = exits / opens;
    if (ratio > 0.6 && opens > 20) {
      issues.push(classifyDinoIssue({
        route,
        summary: `High exit rate: ${Math.round(ratio * 100)}% of users leave this page`,
        issueType: "ux",
        details: { opens, exits, ratio },
      }));
    }
  }

  // Rage click detection
  for (const [route, count] of rageClicks.entries()) {
    if (count > 5) {
      issues.push(classifyDinoIssue({
        route,
        summary: `Rage clicks detected (${count} events) — possible broken interaction`,
        issueType: "ux",
        details: { rageClickCount: count },
      }));
    }
  }

  return issues;
}

/**
 * Detect abandoned onboarding flows for professionals.
 */
export function auditProOnboarding(events: JourneyEvent[]): DinoIssue[] {
  const issues: DinoIssue[] = [];

  const starts = events.filter(e => e.eventName === "PRO_ONBOARDING_START");
  const completes = new Set(
    events.filter(e => e.eventName === "PRO_ONBOARDING_COMPLETE").map(e => e.actorId)
  );

  const abandoned = starts.filter(e => e.actorId && !completes.has(e.actorId));

  if (abandoned.length > 0) {
    issues.push(classifyDinoIssue({
      route: "/onboarding",
      summary: `${abandoned.length} professionals abandoned onboarding`,
      issueType: "onboarding",
      details: { abandonedCount: abandoned.length },
    }));
  }

  return issues;
}
