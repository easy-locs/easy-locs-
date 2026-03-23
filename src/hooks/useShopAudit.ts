import { useMemo } from "react";
import { auditShop, type ShopAuditResult } from "@/lib/audit/shop-audit";

export function useShopAudit(shop: any): ShopAuditResult {
  return useMemo(() => auditShop(shop), [shop]);
}
