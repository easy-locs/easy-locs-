/**
 * storefront.repository — All DB operations for storefront components.
 * Covers deal rooms, digital products, returns/refunds.
 */
import { supabase } from "@/integrations/supabase/client";

// ── Deal Room ──

export async function updateDealCounter(dealId: string, amount: number) {
  await (supabase as any).from("deal_rooms").update({
    counter_offer_amount: amount,
    status: "counter_offer",
    updated_at: new Date().toISOString(),
  }).eq("id", dealId);
}

export async function acceptDeal(dealId: string, amount: number) {
  await (supabase as any).from("deal_rooms").update({
    status: "accepted",
    accepted_amount: amount,
    updated_at: new Date().toISOString(),
  }).eq("id", dealId);
}

export async function rejectDeal(dealId: string) {
  await (supabase as any).from("deal_rooms").update({
    status: "cancelled",
    updated_at: new Date().toISOString(),
  }).eq("id", dealId);
}

export async function convertDealToOrder(deal: any, shopId: string) {
  const amount = deal.accepted_amount || deal.current_offer_amount || 0;
  const { data: order } = await (supabase as any).from("storefront_orders").insert({
    shop_id: shopId,
    seller_id: deal.seller_id,
    buyer_id: deal.buyer_id,
    total_amount: amount,
    currency: deal.currency || "AED",
    status: "pending",
    source: "deal_room",
  }).select().single();

  if (order) {
    await (supabase as any).from("deal_rooms").update({
      converted_order_id: order.id,
      status: "completed",
      updated_at: new Date().toISOString(),
    }).eq("id", deal.id);
  }
  return order;
}

// ── Digital Products ──

export async function createDigitalProduct(shopId: string, userId: string, form: any) {
  await (supabase as any).from("storefront_digital_products").insert({
    shop_id: shopId,
    user_id: userId,
    title: form.title,
    description: form.description || null,
    price: parseFloat(form.price),
    product_type: form.product_type,
    file_url: form.file_url || null,
    preview_url: form.preview_url || null,
    download_limit: parseInt(form.download_limit) || 5,
    currency: form.currency || "AED",
    status: "active",
  });
}

export async function purchaseDigitalProduct(productId: string, buyerId: string, shopId: string, downloadLimit: number) {
  await (supabase as any).from("storefront_digital_purchases").insert({
    product_id: productId,
    buyer_id: buyerId,
    shop_id: shopId,
    max_downloads: downloadLimit,
  });
}

export async function incrementProductSales(productId: string, currentSales: number) {
  await (supabase as any).from("storefront_digital_products").update({
    total_sales: currentSales + 1,
    updated_at: new Date().toISOString(),
  }).eq("id", productId);
}

export async function incrementDownloadCount(purchaseId: string, currentCount: number) {
  await (supabase as any).from("storefront_digital_purchases").update({
    download_count: currentCount + 1,
  }).eq("id", purchaseId);
}

// ── Returns & Refunds ──

export async function createReturn(shopId: string, orderId: string, reason: string, type: string) {
  await (supabase as any).from("storefront_returns").insert({
    shop_id: shopId,
    order_id: orderId,
    reason,
    return_type: type,
    status: "requested",
  });
}

export async function updateReturnStatus(returnId: string, status: string, notes?: string) {
  const updates: any = { status, updated_at: new Date().toISOString() };
  if (status === "refunded") updates.refunded_at = new Date().toISOString();
  if (notes) updates.admin_notes = notes;
  await (supabase as any).from("storefront_returns").update(updates).eq("id", returnId);
}

// ── Catalog ──
export async function fetchCatalogProducts(shopId: string) {
  const { data } = await (supabase as any).from("storefront_products").select("*").eq("shop_id", shopId).order("sort_order");
  return data ?? [];
}

export async function insertProduct(record: Record<string, any>) {
  const { data, error } = await (supabase as any).from("storefront_products").insert(record).select("*").single();
  if (error) throw error;
  return data;
}

export async function updateProduct(id: string, updates: Record<string, any>) {
  const { error } = await (supabase as any).from("storefront_products").update(updates).eq("id", id);
  if (error) throw error;
}

export async function deleteProduct(id: string) {
  const { error } = await (supabase as any).from("storefront_products").delete().eq("id", id);
  if (error) throw error;
}

// ── Shop creation ──
export async function insertShop(record: Record<string, any>) {
  const { data, error } = await (supabase as any).from("storefront_pages").insert(record).select("*").single();
  if (error) throw error;
  return data;
}

export async function updateShop(id: string, updates: Record<string, any>) {
  const { error } = await supabase.from("storefront_pages").update(updates as any).eq("id", id);
  if (error) throw error;
}

// ── Product media ──
export async function uploadProductMedia(path: string, file: File) {
  const { error } = await supabase.storage.from("storefront-media").upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from("storefront-media").getPublicUrl(path);
  return data.publicUrl;
}

// ── AI ──
export async function invokeAIAssistant(body: Record<string, any>) {
  const { data, error } = await supabase.functions.invoke("ai-assistant", { body });
  if (error) throw error;
  return data;
}

export async function insertCategorySuggestion(record: Record<string, any>) {
  await (supabase as any).from("ai_category_suggestions").insert(record);
}

// ── Delivery dispatch ──
export async function fetchShopOrders(shopId: string) {
  const { data } = await (supabase as any).from("storefront_orders").select("*").eq("shop_id", shopId).order("created_at", { ascending: false }).limit(100);
  return data ?? [];
}

export async function updateOrder(orderId: string, updates: Record<string, any>) {
  const { error } = await (supabase as any).from("storefront_orders").update(updates).eq("id", orderId);
  if (error) throw error;
}

// ── Smart builders ──
export async function fetchShopsByUser(userId: string) {
  const { data } = await (supabase as any).from("storefront_pages").select("*").eq("owner_user_id", userId);
  return data ?? [];
}

// ── Storage: catalog-photos ──
export async function uploadCatalogPhoto(path: string, file: File) {
  const { error } = await supabase.storage.from("catalog-photos").upload(path, file);
  if (error) throw error;
  const { data } = supabase.storage.from("catalog-photos").getPublicUrl(path);
  return data.publicUrl;
}

// ── Storage: products bucket ──
export async function uploadProductFile(path: string, file: File) {
  const { error } = await supabase.storage.from("products").upload(path, file, {
    cacheControl: "3600", upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("products").getPublicUrl(path);
  return data.publicUrl;
}

// ── AI proxy (smart builders) ──
export async function invokeAIProxy(body: Record<string, any>) {
  const { data, error } = await supabase.functions.invoke("ai-proxy", { body });
  if (error) throw error;
  return data;
}

// ── AI category suggest ──
export async function invokeAICategorySuggest(body: Record<string, any>) {
  const { data, error } = await supabase.functions.invoke("ai-category-suggest", { body });
  if (error) throw error;
  return data;
}

// ── AI shopping chat ──
export async function invokeAIShoppingChat(body: Record<string, any>) {
  const { data, error } = await supabase.functions.invoke("ai-shopping-chat", { body });
  if (error) throw error;
  return data;
}

// ── Dispatch ride (storefront delivery) ──
export async function invokeDispatchRide(body: Record<string, any>) {
  const { data, error } = await supabase.functions.invoke("dispatch-ride", { body });
  if (error) throw error;
  return data;
}

// ── Org member lookup ──
export async function fetchUserOrgId(userId: string) {
  const { data } = await (supabase as any)
    .from("org_members").select("org_id").eq("user_id", userId).limit(1).single();
  return data?.org_id as string | null;
}

// ── Catalog items ──
export async function fetchCatalogItems(shopId: string) {
  const { data } = await (supabase as any)
    .from("catalog_items").select("*, storefront_catalog_categories(name)")
    .eq("shop_id", shopId).order("sort_order");
  return data || [];
}

export async function fetchCatalogCategories(shopId: string) {
  const { data } = await (supabase as any)
    .from("storefront_catalog_categories").select("*")
    .eq("shop_id", shopId).order("sort_order");
  return data || [];
}

export async function insertCatalogItem(payload: Record<string, any>) {
  await (supabase as any).from("catalog_items").insert(payload);
}

export async function updateCatalogItem(id: string, payload: Record<string, any>) {
  await (supabase as any).from("catalog_items").update(payload).eq("id", id);
}

export async function deleteCatalogItem(id: string) {
  await (supabase as any).from("catalog_items").delete().eq("id", id);
}
