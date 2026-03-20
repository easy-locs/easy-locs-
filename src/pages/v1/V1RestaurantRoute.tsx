import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useCart } from "@/hooks/useCart";
import { toast } from "sonner";
import { V1PrimaryAppBridge } from "@/components/v1/V1PrimaryAppBridge";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Plus, Minus } from "lucide-react";

/** Try marketplace_listings first, fall back to storefront_pages */
async function getMerchant(id: string) {
  const { data: ml } = await (supabase as any)
    .from("marketplace_listings")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (ml) return ml;

  const { data: sf } = await (supabase as any)
    .from("storefront_pages")
    .select("id, name, slug, cover_url, logo_url, vertical, subcategory, city")
    .eq("id", id)
    .maybeSingle();
  if (sf) return { ...sf, cover_image: sf.cover_url || sf.logo_url };

  return null;
}

/** Try seed_products, then catalog_items */
async function getMenu(merchantId: string) {
  const { data: seeds } = await (supabase as any)
    .from("seed_products")
    .select("*")
    .eq("merchant_id", merchantId)
    .eq("is_available", true)
    .order("sort_order", { ascending: true });
  if (seeds?.length) return seeds;

  const { data: catalog } = await (supabase as any)
    .from("catalog_items")
    .select("id, title, description, price, photo_url, available")
    .eq("shop_id", merchantId)
    .eq("available", true)
    .order("sort_order", { ascending: true });
  return (catalog || []).map((c: any) => ({
    id: c.id,
    name: c.title,
    description: c.description,
    price: c.price,
    image: c.photo_url,
  }));
}

function RestaurantBody() {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const navigate = useNavigate();
  const { addItem, cart, total, itemCount, updateQuantity } = useCart();

  const { data: shop } = useQuery({
    queryKey: ["restaurant-detail", restaurantId],
    queryFn: () => getMerchant(restaurantId!),
    enabled: !!restaurantId,
    staleTime: 30_000,
  });

  const { data: menu = [], isLoading } = useQuery({
    queryKey: ["restaurant-menu", restaurantId],
    queryFn: () => getMenu(restaurantId!),
    enabled: !!restaurantId,
    staleTime: 30_000,
  });

  const handleAdd = (item: any) => {
    if (!shop) return;
    addItem(
      { id: shop.id, name: shop.name, image: shop.cover_image },
      {
        menuItemId: item.id,
        name: item.name,
        description: item.description,
        imageUrl: item.image,
        unitPrice: Number(item.price ?? 0),
      }
    );
    toast.success(`${item.name} added`);
  };

  const getQty = (menuItemId: string) => {
    if (cart.restaurantId !== shop?.id) return 0;
    return cart.items.find((i) => i.menuItemId === menuItemId)?.quantity || 0;
  };

  return (
    <div className="max-w-md mx-auto px-4 py-5 pb-28 space-y-5">
      <button
        onClick={() => navigate(-1)}
        className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center active:scale-95 transition-transform"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      {shop?.cover_image && (
        <img src={shop.cover_image} alt={shop.name} className="w-full h-48 rounded-2xl object-cover" />
      )}

      <div>
        <h1 className="text-xl font-bold">{shop?.name || "Restaurant"}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {shop?.subcategory || "Food"} · {shop?.area || shop?.city || "Dubai"}
        </p>
      </div>

      {isLoading && [1, 2, 3].map((i) => (
        <div key={i} className="rounded-2xl bg-muted/40 h-24 animate-pulse" />
      ))}

      {!isLoading && menu.length === 0 && (
        <div className="rounded-2xl border border-border/20 bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">No items on the menu yet</p>
        </div>
      )}

      {!isLoading &&
        menu.map((item: any) => {
          const qty = getQty(item.id);
          return (
            <div key={item.id} className="rounded-2xl border border-border/10 bg-card p-4 flex items-start gap-4">
              {item.image ? (
                <img src={item.image} alt={item.name} className="w-20 h-20 rounded-xl object-cover flex-shrink-0" />
              ) : (
                <div className="w-20 h-20 rounded-xl bg-muted/40 flex-shrink-0 flex items-center justify-center text-2xl">🍽️</div>
              )}

              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold">{item.name}</p>
                {item.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                )}
                <p className="text-sm font-semibold mt-2">{Number(item.price ?? 0).toFixed(2)} AED</p>
              </div>

              {qty === 0 ? (
                <button
                  onClick={() => handleAdd(item)}
                  className="rounded-xl bg-primary text-primary-foreground px-4 py-2 text-xs font-bold active:scale-95 transition-transform"
                >
                  Add
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const ci = cart.items.find((i) => i.menuItemId === item.id);
                      if (ci) updateQuantity(ci.id, qty - 1);
                    }}
                    className="w-8 h-8 rounded-full bg-muted flex items-center justify-center active:scale-90 transition-transform"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-bold w-5 text-center">{qty}</span>
                  <button
                    onClick={() => handleAdd(item)}
                    className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center active:scale-90 transition-transform"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          );
        })}

      {itemCount > 0 && cart.restaurantId === shop?.id && (
        <button
          onClick={() => navigate("/checkout")}
          className="fixed bottom-20 left-4 right-4 max-w-md mx-auto rounded-2xl bg-primary text-primary-foreground px-5 py-4 flex items-center justify-between font-bold z-40 shadow-lg active:scale-[0.98] transition-transform"
        >
          <span className="text-sm">{itemCount} item{itemCount > 1 ? "s" : ""}</span>
          <span className="text-sm">Checkout · {total.toFixed(2)} AED</span>
        </button>
      )}
    </div>
  );
}

export default function V1RestaurantRoute() {
  return (
    <V1PrimaryAppBridge module="achille">
      {() => <RestaurantBody />}
    </V1PrimaryAppBridge>
  );
}
