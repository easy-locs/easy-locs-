/**
 * Contacts repository (DI seam) — counts + upserts only.
 *
 * The contacts upsert path is bulk by definition; we never read the rows
 * back individually for verification. Instead the verifier asserts the
 * row-count delta the adapter reports matches what the table now holds
 * for the given source.
 */

export interface ContactsRepository {
  /** Bulk-upsert rows into a table. Returns the number of rows the DB
   *  reported as affected (best-effort: PostgREST returns the inserted
   *  rows; we use array length). */
  upsertMany(
    table: string,
    rows: Array<Record<string, unknown>>,
    onConflict?: string,
  ): Promise<number>;
  /** Count rows matching a column = value filter. Used by the verifier. */
  countWhere(table: string, col: string, val: unknown): Promise<number>;
}

interface MinimalSb {
  from(table: string): {
    upsert(values: Array<Record<string, unknown>>, opts?: { onConflict?: string }): {
      select(cols: string): Promise<{ data: Array<Record<string, unknown>> | null; error: { message: string } | null }>;
    };
    select(cols: string, opts?: { count?: "exact" | "planned" | "estimated"; head?: boolean }): {
      eq(col: string, val: unknown): Promise<{ count: number | null; error: { message: string } | null }>;
    };
  };
}

export function createSupabaseContactsRepository(sb: MinimalSb): ContactsRepository {
  return {
    async upsertMany(table, rows, onConflict) {
      const { data, error } = await sb.from(table).upsert(rows, { onConflict }).select("id");
      if (error) throw new Error(`contacts upsert failed (${table}): ${error.message}`);
      return data?.length ?? rows.length;
    },
    async countWhere(table, col, val) {
      const { count, error } = await sb
        .from(table)
        .select("id", { count: "exact", head: true })
        .eq(col, val);
      if (error) throw new Error(`contacts count failed (${table}): ${error.message}`);
      return count ?? 0;
    },
  };
}
