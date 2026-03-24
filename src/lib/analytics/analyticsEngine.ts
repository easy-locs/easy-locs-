import { supabase } from "@/integrations/supabase/client";

export type AnalyticsEventType =
  | "home_view"
  | "search_used"
  | "merchant_view"
  | "product_add_to_cart"
  | "checkout_started"
  | "order_created"
  | "order_completed"
  | "favorite_added"
  | "favorite_removed";

export async function trackAnalyticsEvent(params: {
  eventType: AnalyticsEventType;
  userId?: string | null;
  merchantId?: string | null;
  orderId?: string | null;
  productId?: string | null;
  queryText?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const entityId = params.orderId ?? params.merchantId ?? params.productId ?? params.userId ?? "anonymous";
  const entityType = params.orderId ? "order" : params.merchantId ? "merchant" : params.productId ? "product" : "user_session";

  const { error } = await (supabase as any).from("activity_logs").insert({
    id: crypto.randomUUID(),
    action: params.eventType,
    entity_id: entityId,
    entity_type: entityType,
    user_id: params.userId ?? null,
    metadata: {
      merchantId: params.merchantId ?? null,
      orderId: params.orderId ?? null,
      productId: params.productId ?? null,
      queryText: params.queryText ?? null,
      ...(params.metadata ?? {}),
    },
  });
  if (error) throw error;
  return true;
}

export async function getAnalyticsSnapshot() {
  const { data, error } = await (supabase as any)
    .from("activity_logs")
    .select("action, created_at, metadata")
    .in("action", [
      "home_view", "search_used", "merchant_view",
      "product_add_to_cart", "checkout_started",
      "order_created", "order_completed",
      "favorite_added", "favorite_removed",
    ])
    .order("created_at", { ascending: false })
    .limit(1000);

  if (error) throw error;

  const rows = data ?? [];
  const count = (key: string) => rows.filter((r: any) => r.action === key).length;

  return {
    homeViews: count("home_view"),
    searches: count("search_used"),
    merchantViews: count("merchant_view"),
    addToCart: count("product_add_to_cart"),
    checkoutStarts: count("checkout_started"),
    ordersCreated: count("order_created"),
    ordersCompleted: count("order_completed"),
    favoritesAdded: count("favorite_added"),
    favoritesRemoved: count("favorite_removed"),
    recent: rows.slice(0, 50),
  };
}
