import { db } from "@/services/db";
import { debugLog } from "@/lib/debug/runtime-debug-bus";
import { safeErrorMessage, serializeForDebug } from "@/lib/debug/debug-helpers";

import { cFrom, cRpc } from "@/lib/execution/content-mutation";
export interface ResolvedQrTarget {
  targetCode: string;
  merchantProfileId: string;
  storefrontPageId: string | null;
  targetType: string;
  qrPurpose: string;
  targetLabel: string;
  tableNumber: string | null;
  terminalId: string | null;
  active: boolean;
  /** Resolved shop slug for routing */
  shopSlug: string | null;
  shopName: string | null;
}

export async function resolveQrTarget(targetCode: string): Promise<ResolvedQrTarget> {
  if (!targetCode?.trim()) throw new Error("QR target code missing");

  debugLog.info("qr", "resolve_qr_start", `targetCode=${targetCode}`);

  try {
    // Step 1: Fetch QR target WITHOUT join to avoid RLS recursion on storefront_pages
    const { data, error } = await cFrom("qr_order_targets")
      .select("*")
      .eq("target_code", targetCode)
      .eq("active", true)
      .maybeSingle();

    if (error) {
      debugLog.error("qr", "resolve_qr_db_error", error.message);
      throw error;
    }
    if (!data) {
      debugLog.error("qr", "resolve_qr_not_found", "QR target not found");
      throw new Error("QR target not found");
    }

    // Step 2: Resolve shop slug separately if we have a storefront_page_id
    let shopSlug: string | null = null;
    let shopName: string | null = null;

    if (data.storefront_page_id) {
      try {
        const { data: shop } = await cFrom("storefront_pages")
          .select("slug, name")
          .eq("id", data.storefront_page_id)
          .maybeSingle();
        if (shop) {
          shopSlug = shop.slug ?? null;
          shopName = shop.name ?? null;
        }
      } catch {
        // If storefront lookup fails due to RLS, use fallback
        debugLog.warn("qr", "resolve_qr_shop_fallback", "Could not resolve shop slug, using target_code");
      }
    }

    // Increment scan count (fire-and-forget)
    cFrom("qr_order_targets")
      .update({ 
        scan_count: (data.scan_count || 0) + 1,
        last_scanned_at: new Date().toISOString(),
      })
      .eq("id", data.id)
      .then(() => {});

    debugLog.success("qr", "resolve_qr_success", "QR target loaded", serializeForDebug(data));

    return {
      targetCode: data.target_code,
      merchantProfileId: data.merchant_profile_id,
      storefrontPageId: data.storefront_page_id ?? null,
      targetType: data.target_type,
      qrPurpose: data.qr_purpose || data.target_type,
      targetLabel: data.target_label || data.target_type,
      tableNumber: data.table_number ?? null,
      terminalId: data.terminal_id ?? null,
      active: !!data.active,
      shopSlug,
      shopName,
    };
  } catch (e) {
    debugLog.error("qr", "resolve_qr_exception", safeErrorMessage(e));
    throw e;
  }
}
