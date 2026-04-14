/**
 * MerchantKitchenPage — Full kitchen display using the unified MerchantKitchenQueue component.
 * Route: /merchant/kitchen
 */
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { posService } from "@/services/pos.service";
import MerchantKitchenQueue from "@/components/merchant/MerchantKitchenQueue";
import { Loader2 } from "lucide-react";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";

export default function MerchantKitchenPage() {
  useUiEngine("merchant-kitchen");
  const [params] = useSearchParams();
  const shopIdParam = params.get("id") || params.get("shop");
  const { user } = useAuth();

  const { data: resolvedShopId, isLoading } = useQuery({
    queryKey: ["merchant-shop-id", user?.id, shopIdParam],
    queryFn: async () => {
      if (shopIdParam) return shopIdParam;
      const shop = await posService.fetchSellerShop(user?.id);
      return shop?.id ?? null;
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <SubPageShell noContentPad className="flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </SubPageShell>
    );
  }

  if (!resolvedShopId) {
    return (
      <SubPageShell noContentPad className="flex flex-col items-center justify-center gap-3 px-4">
        <span className="text-4xl">🍳</span>
        <p className="text-sm font-medium text-muted-foreground text-center">
          No shop found. Create a storefront first to access the kitchen display.
        </p>
      </SubPageShell>
    );
  }

  return (
    <SubPageShell noContentPad>
      <MerchantKitchenQueue shopId={resolvedShopId} />
    </SubPageShell>
  );
}
