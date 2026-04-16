/**
 * Server-side KYC gate for the MarketplaceAdapter.
 *
 * Mirrors `src/lib/kyc/kyc-gate-service.ts` but runs in Deno against the
 * service-role client. Publish requires KYC level >= "basic"; unpublish has
 * no KYC requirement (it strictly reduces visibility).
 */

const LEVEL_ORDER = ["none", "basic", "standard", "enhanced", "full"] as const;
export type KycLevel = (typeof LEVEL_ORDER)[number];

function levelIdx(l: string | null | undefined): number {
  const idx = LEVEL_ORDER.indexOf((l ?? "none") as KycLevel);
  return idx === -1 ? 0 : idx;
}

export interface KycCheck {
  /** Returns null when allowed; a human-readable reason when blocked. */
  ensureCanPublish(ownerId: string): Promise<string | null>;
}

interface MinimalSupabaseClient {
  from(table: string): {
    select(cols: string): {
      eq(col: string, val: unknown): {
        maybeSingle(): Promise<{ data: { kyc_level: string | null } | null; error: { message: string } | null }>;
      };
    };
  };
}

export function createSupabaseKycCheck(sb: MinimalSupabaseClient): KycCheck {
  return {
    async ensureCanPublish(ownerId: string) {
      const { data, error } = await sb
        .from("providers")
        .select("kyc_level")
        .eq("user_id", ownerId)
        .maybeSingle();
      if (error) {
        // Treat KYC lookup error as a HARD block — never allow a publish to
        // proceed when we cannot prove the owner is verified.
        return `KYC lookup failed: ${error.message}`;
      }
      const current = (data?.kyc_level as KycLevel | null) ?? "none";
      if (levelIdx(current) >= levelIdx("basic")) return null;
      return `KYC level "basic" required for publish. Owner level: "${current}".`;
    },
  };
}

/** No-op implementation for unpublish (and tests). */
export const allowAllKyc: KycCheck = {
  async ensureCanPublish() {
    return null;
  },
};
