/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Comma / space / semicolon separated list of email addresses authorised
   * to access the admin area. Read by `src/hooks/useIsAdmin.ts`. Optional:
   * a hard-coded fallback in that file keeps the project owner reachable
   * even when the variable is unset.
   */
  readonly VITE_ADMIN_ALLOWLIST?: string;
  /**
   * Optional dedicated collection endpoint for client-side Web Vitals.
   * When set, `src/lib/performance/web-vitals-reporter.ts` batches metrics
   * (≤10 entries / 5s window) and ships them via `navigator.sendBeacon`
   * (with a `keepalive` fetch fallback) on top of the existing PostHog
   * reporting path. Leave unset for a strict no-op (zero overhead).
   */
  readonly VITE_WEB_VITALS_ENDPOINT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
