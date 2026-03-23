import { auditShop } from "@/lib/audit/shop-audit";

export function useShopAudit(shop: any) {
  return auditShop(shop);
}
