import { supabase } from "@/integrations/supabase/client";
import { debugLog } from "@/lib/debug/runtime-debug-bus";
import { safeErrorMessage, serializeForDebug } from "@/lib/debug/debug-helpers";

export interface ResolvedQrTarget {
  targetCode: string;
  merchantProfileId: string;
  storefrontPageId: string | null;
  targetType: string;
  tableNumber: string | null;
  active: boolean;
}

export async function resolveQrTarget(targetCode: string): Promise<ResolvedQrTarget> {
  if (!targetCode?.trim()) throw new Error("QR target code missing");

  debugLog.info("qr", "resolve_qr_start", `targetCode=${targetCode}`);

  try {
    const { data, error } = await (supabase as any)
      .from("qr_order_targets")
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

    debugLog.success("qr", "resolve_qr_success", "QR target loaded", serializeForDebug(data));

    return {
      targetCode: data.target_code,
      merchantProfileId: data.merchant_profile_id,
      storefrontPageId: data.storefront_page_id ?? null,
      targetType: data.target_type,
      tableNumber: data.table_number ?? null,
      active: !!data.active,
    };
  } catch (e) {
    debugLog.error("qr", "resolve_qr_exception", safeErrorMessage(e));
    throw e;
  }
}
