import { db as supabase } from "@/services/db";

export async function listUserCompletedOrders(userId: string) {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("customer_user_id", userId)
    .in("status", ["completed", "delivered"])
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) throw error;
  return data ?? [];
}

export async function listOrderItems(orderId: string) {
  const { data, error } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getReorderSuggestions(userId: string) {
  const orders = await listUserCompletedOrders(userId);
  const suggestions: Array<{
    order: any;
    label: string;
    totalItems: number;
  }> = [];

  for (const order of orders.slice(0, 10)) {
    const items = await listOrderItems(order.id);
    suggestions.push({
      order,
      label: `${items.slice(0, 2).map((i: any) => i.item_name || i.name).join(", ")}${
        items.length > 2 ? "..." : ""
      }`,
      totalItems: items.reduce((sum: number, i: any) => sum + Number(i.quantity ?? 0), 0),
    });
  }

  return suggestions;
}
