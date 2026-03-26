/**
 * MerchantKitchenPage — Full kitchen display using the unified MerchantKitchenQueue component.
 * Route: /merchant/kitchen
 */
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import MerchantKitchenQueue from "@/components/merchant/MerchantKitchenQueue";
import { Loader2 } from "lucide-react";

export default function MerchantKitchenPage() {
  const [params] = useSearchParams();
  const shopIdParam = params.get("id") || params.get("shop");
  const { user } = useAuth();

  // If no shop ID provided, find the user's shop
  const { data: resolvedShopId, isLoading } = useQuery({
    queryKey: ["merchant-shop-id", user?.id, shopIdParam],
    queryFn: async () => {
      if (shopIdParam) return shopIdParam;

      // Look up user's storefront
      const { data } = await (supabase as any)
        .from("storefront_pages")
        .select("id")
        .eq("user_id", user!.id)
        .limit(1)
        .maybeSingle();

      return data?.id ?? null;
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <div className="app-mobile-page bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!resolvedShopId) {
    return (
      <div className="app-mobile-page bg-background flex flex-col items-center justify-center gap-3 px-4">
        <span className="text-4xl">🍳</span>
        <p className="text-sm font-medium text-muted-foreground text-center">
          No shop found. Create a storefront first to access the kitchen display.
        </p>
      </div>
    );
  }

  return (
    <div className="app-mobile-page bg-background p-4 lg:p-6">
      <MerchantKitchenQueue shopId={resolvedShopId} />
    </div>
  );
}
