/**
 * Journey Registry — write-side of the journey lifecycle system.
 *
 * Records journey state to sessionStorage so the resume engine can read it
 * across page reloads and soft navigations. All functions are pure and have
 * no React / UI dependencies — safe to call from state machines or event
 * handlers.
 *
 * Storage key: "el_journey_registry"
 * Shape: Record<JourneyId, JourneyRecord>
 *
 * Phase 2: Wiring active — mountJourneyWiring() in event-init.ts drives all lifecycle calls.
 */

import type {
  JourneyId,
  JourneyPillar,
  UserIntentName,
} from "@/lib/events/event-payload-schemas";

// ── Registry record ──────────────────────────────────────────────────────────

export type JourneyStatus =
  | "active"
  | "interrupted"
  | "completed"
  | "failed";

export interface JourneyRecord {
  journeyId: JourneyId;
  intent: UserIntentName;
  pillar: JourneyPillar;
  status: JourneyStatus;
  /** The pathname observed at journey start (window.location.pathname when the wiring registered the event). */
  observedRoute: string;
  /** Last known route within this journey. */
  currentRoute: string;
  /** Last known step key within the flow (e.g. "payment_pending"). */
  currentStep: string;
  /** Serialisable context snapshot — must remain JSON-round-trippable. */
  contextSnapshot: Record<string, unknown>;
  retryable: boolean;
  startedAt: number;
  updatedAt: number;
  completedAt?: number;
}

// ── Storage helpers ──────────────────────────────────────────────────────────

const REGISTRY_KEY = "el_journey_registry";

function readRegistry(): Record<JourneyId, JourneyRecord> {
  try {
    const raw = sessionStorage.getItem(REGISTRY_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<JourneyId, JourneyRecord>;
  } catch {
    return {};
  }
}

function writeRegistry(registry: Record<JourneyId, JourneyRecord>): void {
  try {
    sessionStorage.setItem(REGISTRY_KEY, JSON.stringify(registry));
  } catch {
    // sessionStorage may be unavailable (private browsing quota exhausted).
    // Fail silently — registry is a best-effort optimisation, not a hard dep.
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Start a new journey. Returns the journeyId for caller correlation. */
export function startJourney(params: {
  journeyId: JourneyId;
  intent: UserIntentName;
  pillar: JourneyPillar;
  observedRoute: string;
  contextSnapshot?: Record<string, unknown>;
}): JourneyId {
  const registry = readRegistry();
  const now = Date.now();

  registry[params.journeyId] = {
    journeyId: params.journeyId,
    intent: params.intent,
    pillar: params.pillar,
    status: "active",
    observedRoute: params.observedRoute,
    currentRoute: params.observedRoute,
    currentStep: "start",
    contextSnapshot: params.contextSnapshot ?? {},
    retryable: false,
    startedAt: now,
    updatedAt: now,
  };

  writeRegistry(registry);
  return params.journeyId;
}

/** Update the in-progress context for an active journey (e.g. step changes). */
export function updateJourney(
  journeyId: JourneyId,
  update: {
    currentRoute?: string;
    currentStep?: string;
    contextSnapshot?: Record<string, unknown>;
    retryable?: boolean;
  },
): void {
  const registry = readRegistry();
  const record = registry[journeyId];
  if (!record || record.status !== "active") return;

  registry[journeyId] = {
    ...record,
    ...update,
    updatedAt: Date.now(),
  };

  writeRegistry(registry);
}

/** Mark a journey as interrupted (user navigated away without completing). */
export function interruptJourney(
  journeyId: JourneyId,
  params: {
    interruptedAtRoute: string;
    step: string;
    contextSnapshot: Record<string, unknown>;
    retryable: boolean;
  },
): void {
  const registry = readRegistry();
  const record = registry[journeyId];
  if (!record) return;

  registry[journeyId] = {
    ...record,
    status: "interrupted",
    currentRoute: params.interruptedAtRoute,
    currentStep: params.step,
    contextSnapshot: params.contextSnapshot,
    retryable: params.retryable,
    updatedAt: Date.now(),
  };

  writeRegistry(registry);
}

/** Mark a journey as resumed (user accepted the resume prompt). */
export function resumeJourney(journeyId: JourneyId): void {
  const registry = readRegistry();
  const record = registry[journeyId];
  if (!record || record.status !== "interrupted") return;

  registry[journeyId] = {
    ...record,
    status: "active",
    updatedAt: Date.now(),
  };

  writeRegistry(registry);
}

/** Mark a journey as completed and remove retryable flag. */
export function completeJourney(journeyId: JourneyId): void {
  const registry = readRegistry();
  const record = registry[journeyId];
  if (!record) return;

  const now = Date.now();
  registry[journeyId] = {
    ...record,
    status: "completed",
    retryable: false,
    updatedAt: now,
    completedAt: now,
  };

  writeRegistry(registry);
}

/** Mark a journey as failed. */
export function failJourney(
  journeyId: JourneyId,
  params: { errorCode: string; retryable: boolean },
): void {
  const registry = readRegistry();
  const record = registry[journeyId];
  if (!record) return;

  registry[journeyId] = {
    ...record,
    status: "failed",
    retryable: params.retryable,
    contextSnapshot: {
      ...record.contextSnapshot,
      errorCode: params.errorCode,
    },
    updatedAt: Date.now(),
  };

  writeRegistry(registry);
}

/** Read a single record (primarily for testing / resume engine). */
export function getJourney(journeyId: JourneyId): JourneyRecord | null {
  const registry = readRegistry();
  return registry[journeyId] ?? null;
}

/** Read all records (primarily for resume engine). */
export function getAllJourneys(): JourneyRecord[] {
  return Object.values(readRegistry());
}

/** Remove a single record from the registry. */
export function removeJourney(journeyId: JourneyId): void {
  const registry = readRegistry();
  delete registry[journeyId];
  writeRegistry(registry);
}

/** Prune all terminal (completed / non-retryable-failed) records older than maxAgeMs. */
export function pruneRegistry(maxAgeMs = 24 * 60 * 60 * 1000): void {
  const registry = readRegistry();
  const cutoff = Date.now() - maxAgeMs;
  let changed = false;

  for (const [id, record] of Object.entries(registry)) {
    const isTerminal =
      record.status === "completed" ||
      (record.status === "failed" && !record.retryable);

    if (isTerminal && record.updatedAt < cutoff) {
      delete registry[id];
      changed = true;
    }
  }

  if (changed) writeRegistry(registry);
}
