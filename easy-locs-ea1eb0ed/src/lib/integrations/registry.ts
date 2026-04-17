/**
 * Central registry of every external integration the app talks to and the
 * environment variables it requires.
 *
 * Each entry carries:
 *  - `id`           — stable identifier used by the diagnostics page
 *  - `label`        — human label shown in the admin UI
 *  - `requiredEnv`  — env vars that MUST be present for the integration to work
 *  - `optionalEnv`  — env vars that enable extra features but are not required
 *
 * The registry is the single source of truth consumed by:
 *  - `validateIntegrationsBoot()` — fails loudly in dev if a required var is
 *    missing (instead of silently no-oping at runtime)
 *  - `getAllIntegrationHealth()` — each integration's own `getHealth()` is
 *    aggregated for the admin diagnostics surface
 */

export type IntegrationId =
  | "supabase"
  | "mapbox"
  | "maplibre"
  | "aws"
  | "sentry"
  | "posthog"
  | "capacitor";

export interface IntegrationDefinition {
  id: IntegrationId;
  label: string;
  description: string;
  requiredEnv: string[];
  /**
   * Groups of env vars where at least one var per group must be present.
   * Used for legacy aliases (e.g. `VITE_MAPBOX_TOKEN` OR
   * `VITE_MAPBOX_ACCESS_TOKEN`) so a working runtime configuration is not
   * flagged as missing by the validator.
   */
  requiredEnvAnyOf?: string[][];
  optionalEnv: string[];
  /**
   * If true, missing required env vars cause `validateIntegrationsBoot()` to
   * throw in development. Disable for integrations that are intentionally
   * optional in some deployments (e.g. PostHog when analytics is off).
   */
  enforceInDev: boolean;
}

export const INTEGRATION_REGISTRY: Record<IntegrationId, IntegrationDefinition> = {
  supabase: {
    id: "supabase",
    label: "Supabase",
    description: "Database, auth, storage and edge functions",
    requiredEnv: ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"],
    optionalEnv: [],
    enforceInDev: true,
  },
  maplibre: {
    id: "maplibre",
    label: "MapLibre",
    description: "Default vector basemap renderer",
    requiredEnv: [],
    optionalEnv: ["VITE_MAPLIBRE_STYLE_URL", "VITE_MAP_STYLE_URL", "VITE_MAP_RASTER_TILE_URL"],
    enforceInDev: false,
  },
  mapbox: {
    id: "mapbox",
    label: "Mapbox",
    description: "Mapbox token for premium styles & geocoding",
    requiredEnv: [],
    // Either name works at runtime — accept either to avoid false negatives
    // for setups still using the legacy `VITE_MAPBOX_ACCESS_TOKEN` name.
    requiredEnvAnyOf: [["VITE_MAPBOX_TOKEN", "VITE_MAPBOX_ACCESS_TOKEN"]],
    optionalEnv: [],
    // Demoted to warn-only: maps degrade to MapLibre when missing, never blocks
    // the rest of the app from rendering. Use `pnpm validate:integrations` in
    // CI to enforce strict presence.
    enforceInDev: false,
  },
  aws: {
    id: "aws",
    label: "AWS",
    description: "S3, SES, SQS and Lambda (region required for client signing)",
    requiredEnv: ["VITE_AWS_REGION"],
    optionalEnv: ["VITE_CLOUDFRONT_URL"],
    // Demoted to warn-only: only signed uploads / direct S3 calls fail when
    // missing — should not blank the entire UI in dev.
    enforceInDev: false,
  },
  sentry: {
    id: "sentry",
    label: "Sentry",
    description: "Crash reporting & performance tracing",
    requiredEnv: ["VITE_SENTRY_DSN"],
    optionalEnv: [],
    // Demoted to warn-only: Sentry already no-ops gracefully when DSN is
    // absent — no need to crash boot for a missing observability key.
    enforceInDev: false,
  },
  posthog: {
    id: "posthog",
    label: "PostHog",
    description: "Product analytics & experiments",
    requiredEnv: ["VITE_POSTHOG_KEY", "VITE_POSTHOG_HOST"],
    optionalEnv: [],
    // Demoted to warn-only: analytics is optional in dev and the snippet in
    // index.html is feature-gated on window.__POSTHOG_KEY__.
    enforceInDev: false,
  },
  capacitor: {
    id: "capacitor",
    label: "Capacitor plugins",
    description: "Native bridges (camera, push, status bar, network, ...)",
    requiredEnv: [],
    optionalEnv: [],
    enforceInDev: false,
  },
};

function readEnv(key: string): string | undefined {
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  const v = env?.[key];
  if (typeof v === "string" && v.length > 0) return v;
  return undefined;
}

export interface MissingEnvReport {
  integration: IntegrationId;
  label: string;
  missing: string[];
}

/** Returns the list of integrations that are missing one or more required env vars. */
export function findMissingRequiredEnv(): MissingEnvReport[] {
  const reports: MissingEnvReport[] = [];
  for (const def of Object.values(INTEGRATION_REGISTRY)) {
    const missing = def.requiredEnv.filter((k) => !readEnv(k));
    for (const group of def.requiredEnvAnyOf ?? []) {
      const anyPresent = group.some((k) => !!readEnv(k));
      if (!anyPresent) missing.push(group.join(" | "));
    }
    if (missing.length > 0) {
      reports.push({ integration: def.id, label: def.label, missing });
    }
  }
  return reports;
}

let bootValidated = false;

/**
 * Loud, single-shot startup validator. In development it throws when any
 * integration with `enforceInDev: true` is missing required env vars so the
 * developer sees the failure immediately instead of debugging silent no-ops.
 *
 * In production (and tests) it logs a warning instead of throwing — production
 * deployments should rely on CI / deploy-time checks, never crash on boot.
 */
export function validateIntegrationsBoot(): void {
  if (bootValidated) return;
  bootValidated = true;

  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  const isDev = env?.DEV === true || env?.MODE === "development";
  const isTest = env?.MODE === "test" || env?.NODE_ENV === "test";

  // Tests (vitest, jsdom CI) almost never have all integration keys wired.
  // Skip the loud throw in test mode so unrelated suites can boot the app.
  if (isTest) return;

  const reports = findMissingRequiredEnv().filter((r) => {
    const def = INTEGRATION_REGISTRY[r.integration];
    return def.enforceInDev;
  });

  if (reports.length === 0) return;

  const lines = reports.map(
    (r) => `  - ${r.label} (${r.integration}): missing ${r.missing.join(", ")}`,
  );
  const message =
    "[integrations] Missing required environment variables:\n" +
    lines.join("\n") +
    "\nSet these before starting the app, or set VITE_SKIP_INTEGRATIONS_VALIDATION=true to bypass " +
    "(only intended for short local debugging — production deploys must set every key).";

  // Local debugging escape hatch: explicitly opt out of the throw. Still logs
  // so the omission stays visible in the console.
  if (env?.VITE_SKIP_INTEGRATIONS_VALIDATION === "true") {
    // eslint-disable-next-line no-console
    console.warn(message);
    return;
  }

  if (isDev) {
    throw new Error(message);
  }
  // eslint-disable-next-line no-console
  console.warn(message);
}

/** Test-only: reset the boot-validation latch. */
export function __resetBootValidationForTests(): void {
  bootValidated = false;
  bootWarnedMissing = false;
}

let bootWarnedMissing = false;

/**
 * Single-shot console warning listing every integration (enforced or warn-only)
 * that is missing required env vars. Runs once at boot regardless of which
 * route the user lands on, so engineers still see the signal in the console
 * even when the dev banner is hidden on public pages.
 */
export function warnMissingIntegrationsOnce(): void {
  if (bootWarnedMissing) return;
  bootWarnedMissing = true;
  // Match the previous (banner-bound) behavior: only emit in development so
  // production logs are not polluted by warn-only optional integrations.
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  const isDev = env?.DEV === true || env?.MODE === "development";
  if (!isDev) return;
  try {
    const reports = findMissingRequiredEnv();
    if (reports.length === 0) return;
    const lines = reports
      .map((r) => `  - ${r.label} (${r.integration}): missing ${r.missing.join(", ")}`)
      .join("\n");
    // eslint-disable-next-line no-console
    console.warn(
      "[integrations] Optional integration env vars missing (boot continues):\n" + lines,
    );
  } catch {
    // Defensive: never let a registry hiccup crash boot.
  }
}

/** Convenience: env presence snapshot used by the diagnostics page. */
export function snapshotEnv(keys: string[]): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const k of keys) out[k] = !!readEnv(k);
  return out;
}
