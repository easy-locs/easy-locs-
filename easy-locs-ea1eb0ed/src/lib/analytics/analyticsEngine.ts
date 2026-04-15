import { db } from "@/services/db";

export type AnalyticsEventType =
  | "home_view"
  | "search_used"
  | "merchant_view"
  | "product_add_to_cart"
  | "checkout_started"
  | "order_created"
  | "order_completed"
  | "favorite_added"
  | "favorite_removed"
  | "link_shared"
  | "link_clicked"
  | "share_converted";

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

  const { error } = await db("activity_logs").insert({
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

export type ShareChannel = "whatsapp" | "telegram" | "facebook" | "twitter" | "linkedin" | "email" | "sms" | "copy" | "native" | "image" | "audio";

export async function trackShareEvent(params: {
  contentType: string;
  contentSlug: string;
  channel: ShareChannel;
  userId?: string | null;
  referralCode?: string | null;
}): Promise<void> {
  try {
    await trackAnalyticsEvent({
      eventType: "link_shared",
      userId: params.userId,
      metadata: {
        content_type: params.contentType,
        content_slug: params.contentSlug,
        channel: params.channel,
        referral_code: params.referralCode ?? null,
      },
    });
  } catch {}
}

export async function getAnalyticsSnapshot() {
  const { data, error } = await db
    .from("activity_logs")
    .select("action, created_at, metadata")
    .in("action", [
      "home_view", "search_used", "merchant_view",
      "product_add_to_cart", "checkout_started",
      "order_created", "order_completed",
      "favorite_added", "favorite_removed",
      "link_clicked", "link_shared", "share_converted",
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
    referralClicks: count("link_clicked"),
    referralShares: count("link_shared"),
    referralConversions: count("share_converted"),
    recent: rows.slice(0, 50),
  };
}
