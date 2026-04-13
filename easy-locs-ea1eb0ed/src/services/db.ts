/**
 * db — Canonical, unified database access layer for the Easy-Locs super-app.
 *
 * This is the ONLY authorized file to import from @/integrations/supabase/client.
 * All other code must use `db`, `v2db`, or the sub-services exposed here.
 *
 * Includes:
 *  - db(table) / db.from(table)  — standard table access
 *  - db.rpc / db.storage / db.functions / db.auth  — Supabase sub-clients
 *  - db.channel / db.getChannels / db.removeChannel  — Realtime channels
 *  - v2db(table)  — legacy-protected table access (blocks forbidden tables in V2_ONLY mode)
 */
import { supabase } from "@/integrations/supabase/client";

// ── Legacy table guard (V2_ONLY mode) ──────────────────────────────────────

const FORBIDDEN_LEGACY_TABLES = new Set<string>([
  "messages",
  "conversation_threads",
  "chat_threads",
]);

function _killLegacyAccess(table: string): void {
  const mode = (import.meta.env.VITE_CORE_MODE as string | undefined) ?? "standard";
  if (mode !== "V2_ONLY") return;
  if (FORBIDDEN_LEGACY_TABLES.has(table)) {
    throw new Error(
      `[V2_KILL_SWITCH] Forbidden legacy table: "${table}". Use V2 equivalent.`,
    );
  }
}

// ── Core db object ──────────────────────────────────────────────────────────

type DbFn = {
  (table: string): ReturnType<typeof supabase.from>;
  from: (table: string) => ReturnType<typeof supabase.from>;
  rpc: typeof supabase.rpc;
  storage: typeof supabase.storage;
  functions: typeof supabase.functions;
  auth: typeof supabase.auth;
  channel: typeof supabase.channel;
  removeChannel: typeof supabase.removeChannel;
  getChannels: typeof supabase.getChannels;
  removeAllChannels: typeof supabase.removeAllChannels;
};

const _from = (table: string) =>
  (supabase as unknown as { from: (t: string) => ReturnType<typeof supabase.from> }).from(table);

export const db: DbFn = Object.assign(_from, {
  from: _from,
  rpc: (supabase as unknown as { rpc: typeof supabase.rpc }).rpc.bind(supabase),
  storage: supabase.storage,
  functions: supabase.functions,
  auth: supabase.auth,
  channel: supabase.channel.bind(supabase),
  removeChannel: supabase.removeChannel.bind(supabase),
  getChannels: supabase.getChannels.bind(supabase),
  removeAllChannels: supabase.removeAllChannels.bind(supabase),
});

// ── v2db — legacy-protected accessor ──────────────────────────────────────

/**
 * V2-enforced DB accessor. Use instead of `db(table)` in all V2+ code paths.
 * Throws if the table is forbidden and APP is running in V2_ONLY mode.
 */
export function v2db(table: string): ReturnType<typeof supabase.from> {
  _killLegacyAccess(table);
  return _from(table);
}
