/**
 * order.items — Order line item management.
 */

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  variantId?: string;
  variantLabel?: string;
  quantity: number;
  unitPrice: number;
  currency: string;
  modifiers?: OrderItemModifier[];
  notes?: string;
}

export interface OrderItemModifier {
  id: string;
  name: string;
  price: number;
}

export function calculateItemTotal(item: OrderItem): number {
  const modTotal = (item.modifiers ?? []).reduce((sum, m) => sum + m.price, 0);
  return (item.unitPrice + modTotal) * item.quantity;
}

export function calculateOrderSubtotal(items: OrderItem[]): number {
  return items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
}
