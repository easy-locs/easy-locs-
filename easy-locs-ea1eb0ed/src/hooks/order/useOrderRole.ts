/**
 * useOrderRole — Resolves user's role for an order.
 * Single responsibility: buyer | seller | driver determination.
 */
import { useMemo } from "react";

export type UserRole = "buyer" | "seller" | "driver";

export function useOrderRole(
  userId: string | undefined,
  order: any,
  deliveryJob: any,
): UserRole {
  return useMemo(() => {
    if (!userId || !order) return "buyer";
    if (order.seller_id === userId) return "seller";
    if (deliveryJob?.rider_user_id === userId) return "driver";
    return "buyer";
  }, [userId, order, deliveryJob]);
}
