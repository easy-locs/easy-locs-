/**
 * order.identity — Order identity resolution and validation.
 */

export interface OrderIdentity {
  id: string;
  orderNumber: string;
  shopId: string;
  customerUserId: string;
  customerOrbitId?: string;
  type: "food" | "shop" | "grocery" | "service";
  status: string;
  createdAt: string;
}

export function buildOrderNumber(shopPrefix: string): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `${shopPrefix}-${ts}-${rand}`;
}

export function isValidOrderId(id: string): boolean {
  return typeof id === "string" && id.length >= 10;
}
