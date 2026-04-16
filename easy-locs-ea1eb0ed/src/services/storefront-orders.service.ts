import { db } from "./db";
import { assertValidBookingStatus } from "@/lib/security/enum-validators";

export interface StorefrontOrder {
  id: string;
  shop_id: string;
  seller_id: string;
  buyer_id?: string;
  buyer_name?: string;
  buyer_email?: string;
  status: string;
  total?: number;
  subtotal?: number;
  currency?: string;
  created_at: string;
  updated_at?: string;
  storefront_order_items?: StorefrontOrderItem[];
}

export interface StorefrontOrderItem {
  id: string;
  order_id: string;
  title: string;
  quantity: number;
  price: number;
}

export const storefrontOrdersService = {
  async fetchOrdersByShop(shopId: string, sellerId: string): Promise<StorefrontOrder[]> {
    const { data, error } = await db
      .from("storefront_orders")
      .select("*, storefront_order_items(*)")
      .eq("shop_id", shopId)
      .eq("seller_id", sellerId)
      .order("created_at", { ascending: false }) as { data: StorefrontOrder[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async updateOrderStatus(orderId: string, status: string) {
    assertValidBookingStatus(status);
    const { error } = await db("storefront_orders")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", orderId);
    if (error) throw error;
  },

  async getOrderById(orderId: string): Promise<StorefrontOrder | null> {
    const { data, error } = await db("storefront_orders")
      .select("*")
      .eq("id", orderId)
      .maybeSingle() as { data: StorefrontOrder | null; error: unknown };
    if (error) throw error;
    return data;
  },

  async recordCommissionSplit(params: {
    orderId: string;
    totalAmount: number;
    currency: string;
    platformAmount: number;
    platformRate: number;
    storeAmount: number;
    storeUserId: string | null;
  }) {
    const { error } = await db("commission_splits").insert({
      order_id: params.orderId,
      total_amount: params.totalAmount,
      currency: params.currency,
      platform_amount: params.platformAmount,
      platform_rate: params.platformRate,
      store_amount: params.storeAmount,
      store_rate: 1 - params.platformRate,
      driver_amount: 0,
      driver_rate: 0,
      store_user_id: params.storeUserId,
      status: "settled",
      settled_at: new Date().toISOString(),
    });
    if (error) console.error("[commission]", error);
  },

  async recordSettlement(params: {
    merchantId: string | null;
    orderId: string;
    grossAmount: number;
    platformFee: number;
    netAmount: number;
    currency: string;
  }) {
    const { error } = await db("settlement_ledger").insert({
      merchant_id: params.merchantId,
      order_id: params.orderId,
      gross_amount: params.grossAmount,
      platform_fee: params.platformFee,
      processing_fee: 0,
      net_amount: params.netAmount,
      currency: params.currency,
      status: "settled",
    });
    if (error) console.error("[settlement]", error);
  },

  async notifyBuyer(buyerId: string, orderId: string, title: string, body: string) {
    const { error } = await db("app_notifications").insert({
      user_id: buyerId,
      scope: "global",
      category: "order",
      title,
      body,
      severity: "info",
      entity_type: "order",
      entity_id: orderId,
      metadata: { order_id: orderId, status: "completed" },
    });
    if (error) console.error("[notif]", error);
  },

  async completeOrderWithSettlement(orderId: string) {
    const order = await this.getOrderById(orderId);
    if (!order) return;

    const total = Number(order.total ?? order.subtotal ?? 0);
    const currency = order.currency ?? "AED";
    const platformRate = 0.05;
    const platformAmount = Math.round(total * platformRate * 100) / 100;
    const netAmount = Math.round((total - platformAmount) * 100) / 100;

    await this.recordCommissionSplit({
      orderId,
      totalAmount: total,
      currency,
      platformAmount,
      platformRate,
      storeAmount: netAmount,
      storeUserId: order.seller_id ?? null,
    });

    await this.recordSettlement({
      merchantId: order.seller_id ?? null,
      orderId,
      grossAmount: total,
      platformFee: platformAmount,
      netAmount,
      currency,
    });

    if (order.buyer_id) {
      await this.notifyBuyer(order.buyer_id, orderId, "Order completed", "Your order has been completed.");
    }
  },
};
