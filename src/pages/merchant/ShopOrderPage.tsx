/**
 * ShopOrderPage — Auto-generated customer order page per shop.
 * Route: /order/:shopSlug
 * Supports query params: ?table=X&qr=CODE&mode=desk
 *
 * Mobile-first, conversion-optimized, SEO-ready.
 * Header + status + structured menu + cart + checkout → creates real order in DB.
 */
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useMemo } from "react";
import { Loader2, MapPin, Clock, Star, ShoppingCart, Plus, Minus, Trash2, ChevronRight, ArrowLeft, UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/utils";
import SEOHead from "@/components/SEOHead";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const fmtPrice = (n: number, c = "AED") => {
  try { return new Intl.NumberFormat(undefined, { style: "currency", currency: c, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n); }
  catch { return `${n} ${c}`; }
};

export default function ShopOrderPage() {
  const { shopSlug } = useParams<{ shopSlug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const tableNumber = searchParams.get("table");
  const qrCode = searchParams.get("qr");
  const mode = searchParams.get("mode"); // "desk" for front desk

  const [activeCategory, setActiveCategory] = useState("All");
  const [cartOpen, setCartOpen] = useState(false);
  const [placing, setPlacing] = useState(false);

  // Fetch shop
  const { data: shop, isLoading: shopLoading } = useQuery({
    queryKey: ["order-shop", shopSlug],
    queryFn: async () => {
      // Try by slug first, then by ID
      let query = (supabase as any)
        .from("storefront_pages")
        .select("id, name, slug, description, logo_url, banner_url, city, address, rating, reviews_count, vertical, currency, country, contact_phone, active, user_id");

      const isUuid = shopSlug && /^[0-9a-f-]{36}$/i.test(shopSlug);
      if (isUuid) {
        query = query.eq("id", shopSlug);
      } else {
        query = query.eq("slug", shopSlug);
      }

      const { data } = await query.maybeSingle();
      return data;
    },
    enabled: !!shopSlug,
  });

  // Fetch products
  const { data: products } = useQuery({
    queryKey: ["order-products", shop?.id],
    queryFn: async () => {
      // Canonical source: menu_items (published catalog)
      const { data: menuItems } = await (supabase as any)
        .from("menu_items")
        .select("id, name, description, price, image_url, category, is_available")
        .eq("shop_id", shop.id)
        .eq("is_available", true)
        .order("sort_order", { ascending: true });

      return menuItems ?? [];
    },
    enabled: !!shop?.id,
  });

  const currency = shop?.currency || "AED";

  // Cart state
  const [cart, setCart] = useState<Record<string, number>>({});
  const cartItems = useMemo(() => {
    if (!products) return [];
    return Object.entries(cart)
      .map(([id, qty]) => ({ ...products.find((p: any) => p.id === id), qty }))
      .filter((i: any) => i.id && i.qty > 0);
  }, [cart, products]);
  const cartTotal = cartItems.reduce((s: number, i: any) => s + (i.price || 0) * i.qty, 0);
  const cartCount = cartItems.reduce((s: number, i: any) => s + i.qty, 0);

  const addToCart = (id: string) => setCart((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  const removeFromCart = (id: string) => setCart((prev) => {
    const next = { ...prev };
    if (next[id] > 1) next[id]--;
    else delete next[id];
    return next;
  });

  // Categories
  const categories = useMemo(() => {
    if (!products) return ["All"];
    const cats = new Set(products.map((p: any) => p.category || "Other"));
    return ["All", ...Array.from(cats)] as string[];
  }, [products]);

  const filtered = activeCategory === "All"
    ? products ?? []
    : (products ?? []).filter((p: any) => (p.category || "Other") === activeCategory);

  // Place order — writes to storefront_orders
  async function placeOrder() {
    if (cartCount === 0) return;
    setPlacing(true);

    try {
      const itemsJson = cartItems.map((i: any) => ({
        product_id: i.id,
        name: i.name,
        price: i.price,
        qty: i.qty,
        subtotal: (i.price || 0) * i.qty,
      }));

      const orderPayload: Record<string, any> = {
        shop_id: shop.id,
        seller_id: shop.user_id || shop.id,
        buyer_id: user?.id || null,
        status: "pending",
        total: cartTotal,
        subtotal: cartTotal,
        currency,
        fulfillment_type: mode === "desk" ? "counter" : tableNumber ? "dine_in" : "takeaway",
        notes: qrCode ? `QR: ${qrCode}` : null,
      };

      if (tableNumber) orderPayload.table_code = tableNumber;

      const { data: order, error } = await (supabase as any)
        .from("storefront_orders")
        .insert(orderPayload)
        .select("id, status")
        .single();

      if (error) throw error;

      toast.success("Order placed! 🎉", { description: `Order #${order.id.slice(0, 8)}` });
      setCart({});
      setCartOpen(false);

      // Navigate to tracking
      navigate(`/qr/track?shop=${shop.slug || shop.id}&order=${order.id}`);
    } catch (e: any) {
      toast.error(e?.message || "Failed to place order");
    } finally {
      setPlacing(false);
    }
  }

  if (shopLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <UtensilsCrossed className="w-12 h-12 text-muted-foreground/30 mb-4" />
        <p className="text-lg font-bold text-foreground">Shop not found</p>
        <p className="text-sm text-muted-foreground mt-1">This shop doesn't exist or has been removed.</p>
        <button onClick={() => navigate("/")} className="mt-4 px-5 py-2.5 rounded-xl text-sm font-bold bg-primary text-primary-foreground">
          Go Home
        </button>
      </div>
    );
  }

  const isOpen = !!shop.active;

  return (
    <>
      <SEOHead
        title={`${shop.name} — Order Online`}
        description={shop.description || `Order from ${shop.name} in ${shop.city}`}
      />

      <div className="min-h-screen bg-background pb-24">
        {/* Table / desk context banner */}
        {(tableNumber || mode === "desk") && (
          <div className="bg-primary/10 px-4 py-2 flex items-center gap-2 text-xs font-medium text-primary">
            {tableNumber && <span>🍽️ Table {tableNumber}</span>}
            {mode === "desk" && <span>🏪 Front Desk Order</span>}
            {qrCode && <span className="ml-auto text-[10px] text-muted-foreground">QR: {qrCode.slice(0, 12)}…</span>}
          </div>
        )}

        {/* Hero header */}
        <div className="relative">
          {shop.banner_url ? (
            <img src={shop.banner_url} alt={shop.name} className="w-full h-44 object-cover" />
          ) : (
            <div className="w-full h-44 bg-gradient-to-br from-primary/20 to-primary/5" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />

          <button onClick={() => navigate(-1)} className="absolute top-3 left-3 w-9 h-9 rounded-xl flex items-center justify-center bg-background/80 backdrop-blur active:scale-95">
            <ArrowLeft className="w-4 h-4 text-foreground" />
          </button>

          <div className="absolute bottom-0 left-0 right-0 px-4 pb-4">
            <div className="flex items-end gap-3">
              {shop.logo_url ? (
                <img src={shop.logo_url} alt="" className="w-16 h-16 rounded-2xl object-cover ring-2 ring-background shadow-lg" />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-card ring-2 ring-background shadow-lg flex items-center justify-center text-2xl font-bold text-primary">
                  {shop.name?.[0]}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-bold text-foreground truncate">{shop.name}</h1>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {shop.city && (
                    <span className="flex items-center gap-0.5">
                      <MapPin className="w-3 h-3" /> {shop.city}
                    </span>
                  )}
                  {shop.rating > 0 && (
                    <span className="flex items-center gap-0.5">
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" /> {shop.rating}
                      {shop.reviews_count > 0 && <span>({shop.reviews_count})</span>}
                    </span>
                  )}
                </div>
              </div>
              <span className={cn(
                "text-[10px] font-bold px-2.5 py-1 rounded-full",
                isOpen ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"
              )}>
                {isOpen ? "Open" : "Closed"}
              </span>
            </div>
          </div>
        </div>

        {/* Service modes */}
        <div className="px-4 py-3 flex gap-2">
          {["Delivery", "Pickup", "Dine-in"].map((m) => (
            <span key={m} className="text-[10px] font-medium text-muted-foreground bg-muted rounded-full px-2.5 py-1">
              {m}
            </span>
          ))}
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground ml-auto">
            <Clock className="w-3 h-3" /> 20-40 min
          </span>
        </div>

        {/* Category chips */}
        <div className="px-4 pb-2">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-medium transition-all shrink-0",
                  activeCategory === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Products grid */}
        <div className="px-4 space-y-2">
          {filtered.map((product: any) => {
            const qty = cart[product.id] || 0;
            return (
              <div key={product.id} className="flex gap-3 p-3 rounded-2xl bg-card border border-border/10">
                {product.image_url && (
                  <img src={product.image_url} alt={product.name} className="w-20 h-20 rounded-xl object-cover shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{product.name}</p>
                  {product.description && (
                    <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">{product.description}</p>
                  )}
                  <p className="text-sm font-bold text-primary mt-1">{fmtPrice(product.price || 0, currency)}</p>
                </div>
                <div className="flex flex-col items-center justify-center gap-1">
                  {qty > 0 ? (
                    <div className="flex items-center gap-1">
                      <button onClick={() => removeFromCart(product.id)} className="w-7 h-7 rounded-full bg-muted flex items-center justify-center active:scale-90">
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-sm font-bold text-foreground w-5 text-center">{qty}</span>
                      <button onClick={() => addToCart(product.id)} className="w-7 h-7 rounded-full bg-primary flex items-center justify-center active:scale-90">
                        <Plus className="w-3 h-3 text-primary-foreground" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => addToCart(product.id)}
                      className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center active:scale-90 transition-transform"
                    >
                      <Plus className="w-4 h-4 text-primary" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="text-center py-12">
              <UtensilsCrossed className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No products available</p>
            </div>
          )}
        </div>

        {/* Floating cart button */}
        {cartCount > 0 && (
          <Sheet open={cartOpen} onOpenChange={setCartOpen}>
            <SheetTrigger asChild>
              <button className="fixed bottom-20 left-4 right-4 max-w-md mx-auto flex items-center justify-between p-4 rounded-2xl bg-primary text-primary-foreground shadow-lg active:scale-[0.98] transition-transform z-50">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  <span className="text-sm font-bold">{cartCount} item{cartCount !== 1 ? "s" : ""}</span>
                </div>
                <span className="text-base font-bold">{fmtPrice(cartTotal, currency)}</span>
                <ChevronRight className="w-5 h-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-3xl max-h-[80vh]">
              <SheetHeader>
                <SheetTitle>Your Order{tableNumber ? ` — Table ${tableNumber}` : ""}</SheetTitle>
              </SheetHeader>
              <div className="space-y-3 mt-4 overflow-y-auto max-h-[50vh]">
                {cartItems.map((item: any) => (
                  <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{fmtPrice((item.price || 0) * item.qty, currency)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => removeFromCart(item.id)} className="w-7 h-7 rounded-full bg-background flex items-center justify-center">
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center text-sm font-bold">{item.qty}</span>
                      <button onClick={() => addToCart(item.id)} className="w-7 h-7 rounded-full bg-background flex items-center justify-center">
                        <Plus className="w-3 h-3" />
                      </button>
                      <button onClick={() => setCart((prev) => { const n = { ...prev }; delete n[item.id]; return n; })} className="w-7 h-7 rounded-full bg-destructive/10 flex items-center justify-center ml-1">
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-border mt-4 pt-4 space-y-3">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary">{fmtPrice(cartTotal, currency)}</span>
                </div>
                <Button
                  className="w-full h-14 text-base font-bold rounded-2xl"
                  disabled={placing}
                  onClick={placeOrder}
                >
                  {placing ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    `Place Order — ${fmtPrice(cartTotal, currency)}`
                  )}
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        )}
      </div>
    </>
  );
}
