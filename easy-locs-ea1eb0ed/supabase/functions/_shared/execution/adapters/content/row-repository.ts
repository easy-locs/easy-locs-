/**
 * Generic per-row repository (DI seam) for the content row adapter.
 *
 * Reads/writes a single row identified by (table, id). Snapshot is a full
 * `SELECT *` so the rollback path can restore any column without the
 * adapter knowing the row schema in advance.
 */

import type { ContentRowSnapshot } from "./types.ts";

export interface ContentRowRepository {
  readById(table: string, id: string): Promise<Record<string, unknown> | null>;
  insert(table: string, values: Record<string, unknown>): Promise<Record<string, unknown> | null>;
  update(table: string, id: string, values: Record<string, unknown>): Promise<Record<string, unknown> | null>;
  upsert(table: string, values: Record<string, unknown>): Promise<Record<string, unknown> | null>;
  delete(table: string, id: string): Promise<boolean>;
  /** Restore a row to a previous snapshot (re-insert when row=null at snapshot, or update otherwise). */
  restore(snapshot: ContentRowSnapshot): Promise<boolean>;
}

interface MinimalSb {
  from(table: string): {
    select(cols: string): {
      eq(col: string, val: unknown): {
        maybeSingle(): Promise<{ data: Record<string, unknown> | null; error: { message: string } | null }>;
      };
    };
    insert(values: Record<string, unknown>): {
      select(cols: string): {
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
    upsert(values: Record<string, unknown>): {
      select(cols: string): {
        maybeSingle(): Promise<{ data: Record<string, unknown> | null; error: { message: string } | null }>;
      };
    };
    delete(): {
      eq(col: string, val: unknown): Promise<{ error: { message: string } | null }>;
    };
  };
}

export function createSupabaseContentRowRepository(sb: MinimalSb): ContentRowRepository {
  return {
    async readById(table, id) {
      const { data, error } = await sb.from(table).select("*").eq("id", id).maybeSingle();
      if (error) throw new Error(`content.row read failed (${table}/${id}): ${error.message}`);
      return data ?? null;
    },
    async insert(table, values) {
      const { data, error } = await sb.from(table).insert(values).select("*").maybeSingle();
      if (error) throw new Error(`content.row insert failed (${table}): ${error.message}`);
      return data ?? null;
    },
    async update(table, id, values) {
      const { data, error } = await sb.from(table).update(values).eq("id", id).select("*").maybeSingle();
      if (error) throw new Error(`content.row update failed (${table}/${id}): ${error.message}`);
      return data ?? null;
    },
    async upsert(table, values) {
      const { data, error } = await sb.from(table).upsert(values).select("*").maybeSingle();
      if (error) throw new Error(`content.row upsert failed (${table}): ${error.message}`);
      return data ?? null;
    },
    async delete(table, id) {
      const { error } = await sb.from(table).delete().eq("id", id);
      if (error) throw new Error(`content.row delete failed (${table}/${id}): ${error.message}`);
      return true;
    },
    async restore(snapshot) {
      // If the row didn't exist at snapshot time, undo by deleting whatever
      // the forward op produced. Otherwise re-apply the snapshot via upsert
      // so the rollback is idempotent regardless of the forward op kind.
      if (snapshot.row === null) {
        const { error } = await sb.from(snapshot.table).delete().eq("id", snapshot.id);
        if (error) throw new Error(`content.row restore (delete) failed: ${error.message}`);
        return true;
      }
      const { error } = await sb.from(snapshot.table).upsert(snapshot.row).select("*").maybeSingle();
      if (error) throw new Error(`content.row restore (upsert) failed: ${error.message}`);
      return true;
    },
  };
}
