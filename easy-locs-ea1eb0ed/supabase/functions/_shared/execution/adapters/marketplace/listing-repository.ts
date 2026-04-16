/**
 * Thin DI seam for listing reads/writes used by MarketplaceAdapter and
 * MarketplaceListingVerifier. Keeping the seam narrow means tests can
 * substitute an in-memory repo with no Supabase / network coupling.
 *
 * The canonical table is `public.property_listings_v2` (see
 * supabase.adapter.ts). We expose only the columns the pilot operations
 * read or write.
 */

import type { ListingSnapshot } from "./types.ts";

export interface ListingRecord extends ListingSnapshot {}

export interface ListingRepository {
  findById(id: string): Promise<ListingRecord | null>;
  /**
   * Update by id with the optimistic-concurrency guard `WHERE status NOT IN
   * (terminal)`. Returns the post-update row.
   */
  setStatus(
    id: string,
    nextStatus: "active" | "paused",
    extra?: Record<string, unknown>,
  ): Promise<ListingRecord | null>;
}

interface MinimalSupabaseClient {
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
  };
}

const COLUMNS = "id, status, is_published, visibility_mode";

export function createSupabaseListingRepository(sb: MinimalSupabaseClient): ListingRepository {
  return {
    async findById(id: string) {
      const { data, error } = await sb
        .from("property_listings_v2")
        .select(COLUMNS)
        .eq("id", id)
        .maybeSingle();
      if (error) throw new Error(`listing read failed: ${error.message}`);
      return data ? mapRow(data) : null;
    },
    async setStatus(id, nextStatus, extra = {}) {
      const patch: Record<string, unknown> = {
        status: nextStatus,
        is_published: nextStatus === "active",
        ...extra,
      };
      const { data, error } = await sb
        .from("property_listings_v2")
        .update(patch)
        .eq("id", id)
        .select(COLUMNS)
        .maybeSingle();
      if (error) throw new Error(`listing update failed: ${error.message}`);
      return data ? mapRow(data) : null;
    },
  };
}

function mapRow(row: Record<string, unknown>): ListingRecord {
  return {
    id: String(row.id),
    status: (row.status as string | null) ?? null,
    is_published: (row.is_published as boolean | null) ?? null,
    visibility_mode: (row.visibility_mode as string | null) ?? null,
  };
}
