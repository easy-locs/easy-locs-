import { db } from "@/services/db";

export async function listMerchantInventory(merchantId: string) {
  const { data, error } = await db
    .from("seed_products")
    .select("*")
    .eq("merchant_id", merchantId)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function updateProductInventory(params: {
  productId: string;
  stockQuantity?: number;
  isAvailable?: boolean;
}) {
  const patch: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (params.stockQuantity !== undefined) {
    patch.stock_quantity = Math.max(0, Number(params.stockQuantity ?? 0));
    patch.is_available = Number(params.stockQuantity ?? 0) > 0;
  }

  if (params.isAvailable !== undefined) {
    patch.is_available = !!params.isAvailable;
  }

  const { data, error } = await db
    .from("seed_products")
    .update(patch)
    .eq("id", params.productId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function bulkRestockMerchant(params: {
  merchantId: string;
  quantity: number;
}) {
  const rows = await listMerchantInventory(params.merchantId);
  const results: Array<{ productId: string; ok: boolean; error?: string }> = [];

  for (const row of rows) {
    try {
      const nextQty = Number((row as any).stock_quantity ?? 0) + Number(params.quantity ?? 0);
      await updateProductInventory({
        productId: row.id,
        stockQuantity: nextQty,
      });
      results.push({ productId: row.id, ok: true });
    } catch (err: any) {
      results.push({
        productId: row.id,
        ok: false,
        error: err.message || "Restock failed",
      });
    }
  }

  return results;
}

export async function getInventorySnapshot(merchantId: string) {
  const rows = await listMerchantInventory(merchantId);

  const totalProducts = rows.length;
  const availableProducts = rows.filter((row: any) => !!row.is_available).length;
  const outOfStock = rows.filter((row: any) => Number(row.stock_quantity ?? 0) <= 0).length;
  const lowStock = rows.filter((row: any) => {
    const qty = Number(row.stock_quantity ?? 0);
    return qty > 0 && qty <= 5;
  }).length;

  return {
    totalProducts,
    availableProducts,
    outOfStock,
    lowStock,
    rows,
  };
}
