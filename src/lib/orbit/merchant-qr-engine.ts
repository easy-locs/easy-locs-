/**
 * Merchant QR Engine — Generate and manage QR targets for shops/pros.
 * Supports menu, payment, table, and branch QR types.
 */
import { supabase } from "@/integrations/supabase/client";

export type MerchantQrTargetType = "menu" | "table_menu" | "payment" | "order_and_pay" | "branch_menu" | "catalog_menu";

export interface CreateMerchantQrParams {
  merchantId: string;
  userId: string;
  targetType: MerchantQrTargetType;
  branchId?: string;
  tableNumber?: string;
  selectedCategories?: string[];
  countryCode?: string;
  currencyCode?: string;
  expiresAt?: string;
  maxUses?: number;
}

export interface MerchantQrTarget {
  id: string;
  targetCode: string;
  targetType: string;
  merchantId: string;
  branchId?: string;
  tableNumber?: string;
  active: boolean;
  expiresAt?: string;
  scanCount: number;
}

// ── Generate Target Code ─────────────────────────────────

function generateTargetCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const arr = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(arr, b => chars[b % chars.length]).join("");
}

// ── Create QR Target ─────────────────────────────────────

export async function createMerchantQrTarget(params: CreateMerchantQrParams): Promise<MerchantQrTarget> {
  if (!params.merchantId || !params.userId) throw new Error("Missing merchant or user ID");

  const targetCode = generateTargetCode();

  const { data, error } = await (supabase as any)
    .from("qr_order_targets")
    .insert({
      shop_id: params.merchantId,
      target_code: targetCode,
      target_type: params.targetType === "table_menu" ? "dine_in" : params.targetType === "menu" ? "global_menu" : params.targetType,
      table_number: params.tableNumber ?? null,
      label: params.targetType === "table_menu" ? `Table ${params.tableNumber}` : params.targetType,
      active: true,
    })
    .select("id, target_code, target_type, shop_id, table_number, active")
    .single();

  if (error) throw error;

  console.log("[merchant-qr] target_created", { targetCode, type: params.targetType, merchant: params.merchantId });

  return {
    id: data.id,
    targetCode: data.target_code,
    targetType: data.target_type,
    merchantId: data.shop_id,
    branchId: params.branchId,
    tableNumber: data.table_number,
    active: data.active,
    scanCount: 0,
  };
}

// ── List Merchant QR Targets ─────────────────────────────

export async function listMerchantQrTargets(merchantId: string): Promise<MerchantQrTarget[]> {
  const { data, error } = await (supabase as any)
    .from("qr_order_targets")
    .select("id, target_code, target_type, shop_id, table_number, active, created_at")
    .eq("shop_id", merchantId)
    .order("created_at", { ascending: false });

  if (error) return [];

  return (data ?? []).map((d: any) => ({
    id: d.id,
    targetCode: d.target_code,
    targetType: d.target_type,
    merchantId: d.shop_id,
    tableNumber: d.table_number,
    active: d.active,
    scanCount: 0,
  }));
}

// ── Deactivate QR Target ─────────────────────────────────

export async function deactivateMerchantQrTarget(targetId: string): Promise<void> {
  await (supabase as any)
    .from("qr_order_targets")
    .update({ active: false })
    .eq("id", targetId);

  console.log("[merchant-qr] target_deactivated", { targetId });
}

// ── Reactivate QR Target ─────────────────────────────────

export async function reactivateMerchantQrTarget(targetId: string): Promise<void> {
  await (supabase as any)
    .from("qr_order_targets")
    .update({ active: true })
    .eq("id", targetId);

  console.log("[merchant-qr] target_reactivated", { targetId });
}
