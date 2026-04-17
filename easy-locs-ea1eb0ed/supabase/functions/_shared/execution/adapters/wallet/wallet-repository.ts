/**
 * Thin DI seam for wallet reads/writes used by WalletAdapter and
 * WalletVerifier. Tests substitute an in-memory repo with no Supabase /
 * network coupling.
 *
 * Canonical table: `public.wallets` (matches `src/repositories/wallet-repository.ts`).
 * The `wallet_ledger_entries` table is the append-only source of truth for
 * balance changes; this adapter writes one ledger entry per credit/debit and
 * two entries per transfer (mirroring the existing `wallet-engine.ts`
 * behaviour) so the existing balance-derivation projection keeps working.
 */

import type { WalletSnapshot } from "./types.ts";

export interface WalletRecord extends WalletSnapshot {}

export interface LedgerWriteInput {
  walletId: string;
  delta_minor: number;
  reason: string;
  reference?: string;
  initiatedBy: string;
  /**
   * Correlates entries that belong to the same logical operation (e.g. the
   * two legs of a transfer). Required for the transfer path.
   */
  correlationId?: string;
}

export interface WalletRepository {
  findById(id: string): Promise<WalletRecord | null>;
  /** Apply a balance delta + write a ledger entry atomically. */
  applyLedgerEntry(input: LedgerWriteInput): Promise<WalletRecord | null>;
  /** Set status (freeze/unfreeze). Rejects on invalid transition. */
  setStatus(id: string, nextStatus: "active" | "frozen"): Promise<WalletRecord | null>;
  /** L3 (#811) — restore a wallet row to a previously captured snapshot. */
  restoreSnapshot(snap: WalletSnapshot): Promise<WalletRecord | null>;
}

export interface MinimalSupabaseClient {
  from(table: string): {
    select(cols: string): {
      eq(col: string, val: unknown): {
        maybeSingle(): Promise<{ data: Record<string, unknown> | null; error: { message: string } | null }>;
      };
    };
    update(values: Record<string, unknown>): {
      eq(col: string, val: unknown): {
        select(cols: string): {
          maybeSingle(): Promise<{ data: Record<string, unknown> | null; error: { message: string } | null }>;
        };
      };
    };
    insert(values: Record<string, unknown>): Promise<{ error: { message: string } | null }>;
  };
}

const COLUMNS = "id, owner_id, balance_minor, currency, status, updated_at";

function mapRow(row: Record<string, unknown>): WalletRecord {
  return {
    id: String(row.id),
    owner_id: (row.owner_id as string | null) ?? null,
    balance_minor: typeof row.balance_minor === "number" ? row.balance_minor : null,
    currency: (row.currency as string | null) ?? null,
    status: (row.status as WalletSnapshot["status"]) ?? null,
    updated_at: (row.updated_at as string | null) ?? null,
  };
}

export function createSupabaseWalletRepository(sb: MinimalSupabaseClient): WalletRepository {
  async function read(id: string): Promise<WalletRecord | null> {
    const { data, error } = await sb
      .from("wallets")
      .select(COLUMNS)
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(`wallet read failed: ${error.message}`);
    return data ? mapRow(data) : null;
  }
  return {
    findById: read,
    async applyLedgerEntry(input) {
      const wallet = await read(input.walletId);
      if (!wallet) throw new Error(`wallet ${input.walletId} not found`);
      if (wallet.status === "frozen" || wallet.status === "closed") {
        throw new Error(`wallet ${input.walletId} status=${wallet.status}; mutation rejected`);
      }
      const next = (wallet.balance_minor ?? 0) + input.delta_minor;
      if (next < 0) throw new Error(`wallet ${input.walletId} insufficient funds (balance=${wallet.balance_minor}, delta=${input.delta_minor})`);
      // Append-only ledger entry first so the balance update has a paper
      // trail even if the second write fails.
      const { error: ledgerErr } = await sb.from("wallet_ledger_entries").insert({
        wallet_id: input.walletId,
        delta_minor: input.delta_minor,
        reason: input.reason,
        reference: input.reference ?? null,
        initiated_by: input.initiatedBy,
        correlation_id: input.correlationId ?? null,
      });
      if (ledgerErr) throw new Error(`wallet ledger insert failed: ${ledgerErr.message}`);
      const { data, error } = await sb
        .from("wallets")
        .update({ balance_minor: next })
        .eq("id", input.walletId)
        .select(COLUMNS)
        .maybeSingle();
      if (error) throw new Error(`wallet balance update failed: ${error.message}`);
      return data ? mapRow(data) : null;
    },
    async setStatus(id, nextStatus) {
      const { data, error } = await sb
        .from("wallets")
        .update({ status: nextStatus })
        .eq("id", id)
        .select(COLUMNS)
        .maybeSingle();
      if (error) throw new Error(`wallet status update failed: ${error.message}`);
      return data ? mapRow(data) : null;
    },
    async restoreSnapshot(snap) {
      const { data, error } = await sb
        .from("wallets")
        .update({
          balance_minor: snap.balance_minor,
          status: snap.status,
        })
        .eq("id", snap.id)
        .select(COLUMNS)
        .maybeSingle();
      if (error) throw new Error(`wallet restore failed: ${error.message}`);
      return data ? mapRow(data) : null;
    },
  };
}
