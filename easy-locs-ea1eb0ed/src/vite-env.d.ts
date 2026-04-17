/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Comma / space / semicolon separated list of email addresses authorised
   * to access the admin area. Read by `src/hooks/useIsAdmin.ts`. Optional:
   * a hard-coded fallback in that file keeps the project owner reachable
   * even when the variable is unset.
   */
  readonly VITE_ADMIN_ALLOWLIST?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
