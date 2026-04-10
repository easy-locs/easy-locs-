import { autoOnboardMerchant } from "@/lib/merchant/onboarding";

export interface BulkMerchantInput {
  name: string;
  category: "food" | "grocery" | "services";
  subcategory?: string;
  city?: string;
  area?: string;
  coverImage?: string | null;
  items: Array<{
    name: string;
    description?: string;
    price: number;
    image?: string | null;
    category?: string | null;
  }>;
}

export async function bulkAutoOnboardMerchants(rows: BulkMerchantInput[]) {
  const results: Array<{ name: string; ok: boolean; merchantId?: string; error?: string }> = [];

  for (const row of rows) {
    try {
      const merchant = await autoOnboardMerchant({
        name: row.name,
        category: row.category,
        subcategory: row.subcategory,
        city: row.city ?? "Dubai",
        area: row.area ?? "Business Bay",
        coverImage: row.coverImage ?? null,
        items: row.items,
      });
      results.push({ name: row.name, ok: true, merchantId: merchant.id });
    } catch (err: any) {
      results.push({ name: row.name, ok: false, error: err.message || "Import failed" });
    }
  }

  return results;
}
