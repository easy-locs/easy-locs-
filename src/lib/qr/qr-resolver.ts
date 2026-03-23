import { supabase } from "@/integrations/supabase/client";
import { debugLog } from "@/lib/debug/runtime-debug-bus";
import { safeErrorMessage, serializeForDebug } from "@/lib/debug/debug-helpers";

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
    // Fetch QR target with shop slug in one query
    const { data, error } = await (supabase as any)
      .from("qr_order_targets")
      .select("*, storefront_pages!qr_order_targets_storefront_page_id_fkey(slug, name)")
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

    // Increment scan count
    (supabase as any)
      .from("qr_order_targets")
      .update({ 
        scan_count: (data.scan_count || 0) + 1,
        last_scanned_at: new Date().toISOString(),
      })
      .eq("id", data.id)
      .then(() => {});

    debugLog.success("qr", "resolve_qr_success", "QR target loaded", serializeForDebug(data));

    const shop = data.storefront_pages;

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
      shopSlug: shop?.slug ?? null,
      shopName: shop?.name ?? null,
    };
  } catch (e) {
    debugLog.error("qr", "resolve_qr_exception", safeErrorMessage(e));
    throw e;
  }
}
