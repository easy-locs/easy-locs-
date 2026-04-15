import { db } from "@/services/db";
import type { RestaurantOrderRepository, FoodOrder, FoodOrderStatus, DailyStats } from "../ports";

async function getShopCoords(shopId: string): Promise<{ lat?: number; lng?: number }> {
  const { data } = await db
    .from("storefront_pages")
    .select("latitude, longitude")
    .eq("id", shopId)
    .maybeSingle();
  return { lat: data?.latitude ?? undefined, lng: data?.longitude ?? undefined };
}

interface DbOrderRow {
  id: string;
  shop_id: string;
  buyer_id: string;
  seller_id: string;
  status: string;
  subtotal: number;
  delivery_fee?: number;
  total: number;
  currency?: string;
  delivery_address?: string;
  delivery_lat?: number;
  delivery_lng?: number;
  delivery_job_id?: string;
  delivery_status?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  storefront_order_items?: DbOrderItemRow[];
}

interface DbOrderItemRow {
  id: string;
  title: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  metadata?: {
    modifiers?: { groupName: string; optionName: string; priceAdjustment: number }[];
    notes?: string;
    allergens?: string[];
    prep_time_minutes?: number;
  };
}

function mapOrder(row: DbOrderRow): FoodOrder {
  return {
    id: row.id,
    shopId: row.shop_id,
    buyerId: row.buyer_id,
    sellerId: row.seller_id,
    status: row.status as FoodOrderStatus,
    items: (row.storefront_order_items ?? []).map((item) => ({
      id: item.id,
      title: item.title,
      quantity: item.quantity,
      unitPrice: Number(item.unit_price),
      totalPrice: Number(item.total_price),
      modifiers: item.metadata?.modifiers ?? [],
      notes: item.metadata?.notes ?? "",
      allergens: item.metadata?.allergens ?? [],
      prepTimeMinutes: item.metadata?.prep_time_minutes,
    })),
    subtotal: Number(row.subtotal),
    deliveryFee: Number(row.delivery_fee ?? 0),
    total: Number(row.total),
    currency: row.currency ?? "AED",
    deliveryAddress: row.delivery_address,
    deliveryLat: row.delivery_lat,
    deliveryLng: row.delivery_lng,
    estimatedPrepMinutes: row.metadata?.estimated_prep_minutes,
    deliveryJobId: row.delivery_job_id ?? (row.metadata?.delivery_job_id as string | undefined),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const restaurantOrderAdapter: RestaurantOrderRepository = {
  async findById(id: string): Promise<FoodOrder | null> {
    const { data, error } = await db
      .from("storefront_orders")
      .select("*, storefront_order_items(*)")
      .eq("id", id)
      .maybeSingle();
    if (error || !data) return null;
    const order = mapOrder(data as DbOrderRow);
    const coords = await getShopCoords(order.shopId);
    order.shopLat = coords.lat;
    order.shopLng = coords.lng;
    return order;
  },

  async findActiveByShop(shopId: string): Promise<FoodOrder[]> {
    const { data, error } = await db
      .from("storefront_orders")
      .select("*, storefront_order_items(*)")
      .eq("shop_id", shopId)
      .not("status", "in", '("delivered","cancelled")')
      .order("created_at", { ascending: false })
      .limit(50);
    if (error || !data) return [];
    return data.map(mapOrder);
  },

  async updateStatus(
    id: string,
    status: FoodOrderStatus,
    extra?: Record<string, unknown>,
    expectedCurrentStatus?: FoodOrderStatus,
  ): Promise<FoodOrder | null> {
    const patch: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (extra) {
      const topLevelColumns = new Set(["delivery_job_id", "delivery_status"]);
      const metadataExtra: Record<string, unknown> = {};

      for (const [key, value] of Object.entries(extra)) {
        if (topLevelColumns.has(key)) {
          patch[key] = value;
        } else {
          metadataExtra[key] = value;
        }
      }

      if (Object.keys(metadataExtra).length > 0) {
        const { data: current } = await db
          .from("storefront_orders")
          .select("metadata")
          .eq("id", id)
          .maybeSingle();
        patch.metadata = { ...(current?.metadata ?? {}), ...metadataExtra };
      }
    }

    let query = db
      .from("storefront_orders")
      .update(patch)
      .eq("id", id);

    if (expectedCurrentStatus) {
      query = query.eq("status", expectedCurrentStatus);
    }

    const { data, error } = await query.select("id").maybeSingle();
    if (error) throw error;
    if (!data) return null;

    return this.findById(id);
  },

  async getDailyStats(shopId: string): Promise<DailyStats> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    interface DailyStatsRow {
      total: number;
      status: string;
      created_at: string;
      metadata?: { accepted_at?: string; ready_at?: string };
      storefront_order_items?: { title: string }[];
    }

    const { data: orders } = await db
      .from("storefront_orders")
      .select("total, status, created_at, metadata, storefront_order_items(title)")
      .eq("shop_id", shopId)
      .gte("created_at", todayStart.toISOString());

    const rows = (orders ?? []) as DailyStatsRow[];
    const completed = rows.filter((o) => o.status === "delivered");
    const revenueToday = completed.reduce((s, o) => s + Number(o.total), 0);

    const prepTimes: number[] = [];
    for (const o of rows) {
      const accepted = o.metadata?.accepted_at;
      const ready = o.metadata?.ready_at;
      if (accepted && ready) {
        const diff = (new Date(ready).getTime() - new Date(accepted).getTime()) / 60_000;
        if (diff > 0 && diff < 300) prepTimes.push(diff);
      }
    }
    const avgPrepTime = prepTimes.length > 0
      ? Math.round(prepTimes.reduce((s, t) => s + t, 0) / prepTimes.length)
      : 0;

    const itemCounts: Record<string, number> = {};
    for (const order of rows) {
      for (const item of order.storefront_order_items ?? []) {
        itemCounts[item.title] = (itemCounts[item.title] ?? 0) + 1;
      }
    }
    const topItems = Object.entries(itemCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    return {
      ordersToday: rows.length,
      revenueToday,
      avgPrepTime,
      topItems,
    };
  },
};
