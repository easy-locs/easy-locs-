/**
 * Shop QR Auto-Generator — Creates all QR codes when a shop is created/activated.
 * 
 * QR Types generated per shop:
 * - order: Opens customer menu/ordering page
 * - pay: Open-amount payment QR
 * - front_desk: Reception/counter QR
 * - table: Per-table QR codes
 * - tracking: Order tracking page
 * - review: Review/loyalty page
 * - staff: Kitchen/staff access
 */
import { db } from "@/services/db";
import { buildAppLink } from "@/lib/link/build-link";

import { cFrom, cRpc } from "@/lib/execution/content-mutation";
export type QrPurpose = "order" | "pay" | "front_desk" | "table" | "tracking" | "review" | "staff" | "pickup" | "delivery";

interface GeneratedQr {
  targetCode: string;
  targetType: string;
  qrPurpose: QrPurpose;
  tableNumber?: string;
  label: string;
  url: string;
}

function makeCode(shopId: string, purpose: string, suffix?: string): string {
  const stamp = Date.now().toString(36);
  const prefix = shopId.slice(0, 8);
  return suffix
    ? `${prefix}-${purpose}-${suffix}-${stamp}`
    : `${prefix}-${purpose}-${stamp}`;
}

/**
 * Auto-generate all QR codes for a shop.
 * Called after shop creation or on-demand from QR center.
 */
export async function autoGenerateShopQrCodes(params: {
  shopId: string;
  merchantProfileId?: string;
  shopSlug: string;
  tableCount?: number;
  vertical?: string;
}): Promise<{ created: GeneratedQr[]; errors: string[] }> {
  const { shopId, merchantProfileId, shopSlug, tableCount = 0, vertical = "food" } = params;
  const created: GeneratedQr[] = [];
  const errors: string[] = [];

  // Determine which QR types to generate based on vertical
  const isFood = ["food", "restaurant", "cafe", "bakery", "coffee"].includes(vertical);
  const isRetail = ["retail", "grocery", "electronics", "shops"].includes(vertical);

  // Core QRs every shop gets
  const qrRows: Array<Record<string, any>> = [
    {
      target_code: makeCode(shopId, "order"),
      merchant_profile_id: merchantProfileId || null,
      storefront_page_id: shopId,
      target_type: "order",
      qr_purpose: "order",
      target_label: "Order Menu",
      active: true,
    },
    {
      target_code: makeCode(shopId, "pay"),
      merchant_profile_id: merchantProfileId || null,
      storefront_page_id: shopId,
      target_type: "payment",
      qr_purpose: "pay",
      target_label: "Pay",
      active: true,
    },
    {
      target_code: makeCode(shopId, "front"),
      merchant_profile_id: merchantProfileId || null,
      storefront_page_id: shopId,
      target_type: "front_desk",
      qr_purpose: "front_desk",
      target_label: "Front Desk",
      active: true,
    },
    {
      target_code: makeCode(shopId, "review"),
      merchant_profile_id: merchantProfileId || null,
      storefront_page_id: shopId,
      target_type: "review",
      qr_purpose: "review",
      target_label: "Leave a Review",
      active: true,
    },
    {
      target_code: makeCode(shopId, "track"),
      merchant_profile_id: merchantProfileId || null,
      storefront_page_id: shopId,
      target_type: "tracking",
      qr_purpose: "tracking",
      target_label: "Track Order",
      active: true,
    },
  ];

  // Staff/Kitchen QR for food verticals
  if (isFood) {
    qrRows.push({
      target_code: makeCode(shopId, "staff"),
      merchant_profile_id: merchantProfileId || null,
      storefront_page_id: shopId,
      target_type: "staff",
      qr_purpose: "staff",
      target_label: "Kitchen Access",
      active: true,
    });
  }

  // Pickup QR for food + retail
  if (isFood || isRetail) {
    qrRows.push({
      target_code: makeCode(shopId, "pickup"),
      merchant_profile_id: merchantProfileId || null,
      storefront_page_id: shopId,
      target_type: "pickup",
      qr_purpose: "pickup",
      target_label: "Pickup Point",
      active: true,
    });
  }

  // Table QRs for food
  if (isFood && tableCount > 0) {
    for (let i = 1; i <= tableCount; i++) {
      qrRows.push({
        target_code: makeCode(shopId, "T", String(i).padStart(2, "0")),
        merchant_profile_id: merchantProfileId || null,
        storefront_page_id: shopId,
        target_type: "table",
        qr_purpose: "table",
        table_number: String(i),
        target_label: `Table ${i}`,
        active: true,
      });
    }
  }

  // Insert all QRs
  const { data, error } = await cFrom("qr_order_targets")
    .insert(qrRows)
    .select("*");

  if (error) {
    errors.push(`QR insert failed: ${error.message}`);
    return { created, errors };
  }

  for (const row of data ?? []) {
    created.push({
      targetCode: row.target_code,
      targetType: row.target_type,
      qrPurpose: row.qr_purpose || row.target_type,
      tableNumber: row.table_number,
      label: row.target_label || row.target_type,
      url: buildAppLink(`/qr/entry/${encodeURIComponent(row.target_code)}`),
    });
  }

  return { created, errors };
}

/**
 * Get all QR codes for a shop.
 */
export async function getShopQrCodes(shopId: string): Promise<GeneratedQr[]> {
  const { data } = await cFrom("qr_order_targets")
    .select("*")
    .eq("storefront_page_id", shopId)
    .eq("active", true)
    .order("created_at", { ascending: true });

  return (data ?? []).map((row: any) => ({
    targetCode: row.target_code,
    targetType: row.target_type,
    qrPurpose: row.qr_purpose || row.target_type,
    tableNumber: row.table_number,
    label: row.target_label || row.target_type,
    url: buildAppLink(`/qr/entry/${encodeURIComponent(row.target_code)}`),
  }));
}

/**
 * Add tables to an existing shop.
 */
export async function addShopTables(params: {
  shopId: string;
  merchantProfileId?: string;
  labels: string[];
  zone?: string;
}): Promise<{ created: number; errors: string[] }> {
  const errors: string[] = [];
  let created = 0;

  for (const label of params.labels) {
    // Create QR target
    const code = makeCode(params.shopId, "T", label.replace(/\s+/g, ""));
    const { data: qr, error: qrErr } = await cFrom("qr_order_targets")
      .insert({
        target_code: code,
        merchant_profile_id: params.merchantProfileId || null,
        storefront_page_id: params.shopId,
        target_type: "table",
        qr_purpose: "table",
        table_number: label,
        target_label: `Table ${label}`,
        active: true,
      })
      .select("id")
      .single();

    if (qrErr) {
      errors.push(`QR for ${label}: ${qrErr.message}`);
      continue;
    }

    // Create shop_table entry
    const { error: tableErr } = await cFrom("shop_tables")
      .insert({
        shop_id: params.shopId,
        label,
        zone: params.zone || "main",
        qr_target_id: qr?.id,
        is_active: true,
      });

    if (tableErr) {
      errors.push(`Table ${label}: ${tableErr.message}`);
    } else {
      created++;
    }
  }

  return { created, errors };
}
