import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useCart } from "@/hooks/useCart";
import { toast } from "sonner";
import { V1PrimaryAppBridge } from "@/components/v1/V1PrimaryAppBridge";
import { getV1MerchantById, getV1MerchantMenu } from "@/lib/v1/v1AchilleCore";

function RestaurantBody() {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const navigate = useNavigate();
  const { addItem, cart, total, itemCount, updateQuantity } = useCart();

  const { data: shop } = useQuery({
    queryKey: ["v1-merchant", restaurantId],
    queryFn: () => getV1MerchantById(restaurantId!),
    enabled: !!restaurantId,
    staleTime: 10_000,
  });

  const { data: menu = [], isLoading } = useQuery({
    queryKey: ["v1-merchant-menu", restaurantId],
    queryFn: () => getV1MerchantMenu(restaurantId!),
    enabled: !!restaurantId,
    staleTime: 10_000,
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
    <div className="max-w-md mx-auto px-4 py-4 pb-28 space-y-4">
      <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center">
        ←
      </button>

      {shop?.cover_image ? <img src={shop.cover_image} alt={shop.name} className="w-full h-44 rounded-[24px] object-cover" /> : null}

      <div>
        <h1 className="text-lg font-bold">{shop?.name || "Merchant"}</h1>
        <div className="text-xs text-muted-foreground mt-1">
          {shop?.subcategory || "Food"} · {shop?.area || "Dubai"}
        </div>
      </div>

      {isLoading && [1, 2, 3].map((i) => <div key={i} className="rounded-[28px] bg-muted/40 h-24 animate-pulse" />)}

      {!isLoading &&
        menu.map((item: any) => {
          const qty = getQty(item.id);
          return (
            <div key={item.id} className="rounded-[28px] border border-border/20 bg-card p-4 flex items-start gap-3">
              {item.image ? (
                <img src={item.image} alt={item.name} className="w-20 h-20 rounded-2xl object-cover flex-shrink-0" />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-muted/40 flex-shrink-0" />
              )}

              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold">{item.name}</div>
                {item.description ? <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</div> : null}
                <div className="text-sm font-semibold mt-2">{Number(item.price ?? 0).toFixed(2)} AED</div>
              </div>

              {qty === 0 ? (
                <button onClick={() => handleAdd(item)} className="rounded-2xl bg-primary text-primary-foreground px-4 py-2 text-xs font-bold">Add</button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const ci = cart.items.find((i) => i.menuItemId === item.id);
                      if (ci) updateQuantity(ci.id, qty - 1);
                    }}
                    className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold"
                  >
                    -
                  </button>
                  <span className="text-sm font-bold">{qty}</span>
                  <button onClick={() => handleAdd(item)} className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                    +
                  </button>
                </div>
              )}
            </div>
          );
        })}

      {itemCount > 0 && cart.restaurantId === shop?.id && (
        <button
          onClick={() => navigate("/checkout")}
          className="fixed bottom-20 left-4 right-4 max-w-md mx-auto rounded-[24px] bg-primary text-primary-foreground px-5 py-4 flex items-center justify-between font-bold z-40"
        >
          <span>{itemCount} item{itemCount > 1 ? "s" : ""}</span>
          <span>Checkout · {total.toFixed(2)} AED</span>
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
