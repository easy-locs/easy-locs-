/**
 * MultiVendorMarketplace — RRR. Multi-Vendor Marketplace.
 * Unified catalog, multi-vendor cart, split payments, intelligent routing.
 * PASS101-RRR
 */
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Store, ShoppingCart, CreditCard, Truck, Package,
  Star, Plus, Minus, MapPin, Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";

interface Product {
  id: string;
  name: string;
  price: number;
  seller: string;
  sellerId: string;
  zone: string;
  rating: number;
  stock: number;
  category: string;
  image: string;
}

interface CartItem extends Product { qty: number }

const PRODUCTS: Product[] = [
  { id: "p1", name: "Smartphone Samsung A54", price: 185000, seller: "TechShop DK", sellerId: "s1", zone: "Dakar Centre", rating: 4.7, stock: 15, category: "Tech", image: "📱" },
  { id: "p2", name: "Casque JBL Tune 520BT", price: 28000, seller: "AudioPro", sellerId: "s3", zone: "Médina", rating: 4.5, stock: 32, category: "Audio", image: "🎧" },
  { id: "p3", name: "Nike Air Max 90", price: 52000, seller: "Fashion Store", sellerId: "s2", zone: "Plateau", rating: 4.3, stock: 8, category: "Mode", image: "👟" },
  { id: "p4", name: "Sac Samsonite Pro", price: 45000, seller: "BagStore", sellerId: "s4", zone: "Parcelles", rating: 4.1, stock: 12, category: "Bags", image: "🎒" },
  { id: "p5", name: "Montre Xiaomi Band 8", price: 18000, seller: "TechShop DK", sellerId: "s1", zone: "Dakar Centre", rating: 4.6, stock: 25, category: "Tech", image: "⌚" },
  { id: "p6", name: "T-shirt Adidas Original", price: 15000, seller: "Fashion Store", sellerId: "s2", zone: "Plateau", rating: 4.2, stock: 40, category: "Mode", image: "👕" },
];

export default function MultiVendorMarketplace({ orgId, className }: { orgId: string; className?: string }) {
  const [view, setView] = useState<"catalog" | "cart" | "routing">("catalog");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const categories = ["all", ...new Set(PRODUCTS.map(p => p.category))];
  const filtered = categoryFilter === "all" ? PRODUCTS : PRODUCTS.filter(p => p.category === categoryFilter);

  const addToCart = (p: Product) => {
    haptic("light");
    setCart(prev => {
      const existing = prev.find(c => c.id === p.id);
      if (existing) return prev.map(c => c.id === p.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { ...p, qty: 1 }];
    });
    toast.success(`${p.name} ajouté au panier`);
  };

  const updateQty = (id: string, delta: number) => {
    haptic("selection");
    setCart(prev => prev.map(c => c.id === id ? { ...c, qty: Math.max(0, c.qty + delta) } : c).filter(c => c.qty > 0));
  };

  const cartTotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const sellerGroups = [...new Set(cart.map(c => c.seller))];
  const totalItems = cart.reduce((s, c) => s + c.qty, 0);

  const checkout = () => {
    haptic("medium");
    toast.loading("Split payment en cours...");
    setTimeout(() => {
      toast.dismiss();
      toast.success(`✅ ${sellerGroups.length} paiements envoyés — ${totalItems} articles`);
      setCart([]);
      setView("catalog");
    }, 2000);
  };

  return (
    <div className={`space-y-3 ${className || ""}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "hsl(var(--foreground))" }}>
          <Store className="h-4 w-4" style={{ color: "hsl(var(--primary))" }} />
          Marketplace multi-vendeurs
        </h3>
        <button onClick={() => { setView("cart"); haptic("selection"); }}
          className="relative p-1.5 rounded-lg" style={{ background: "hsl(var(--primary) / 0.1)" }}>
          <ShoppingCart className="h-4 w-4" style={{ color: "hsl(var(--primary))" }} />
          {totalItems > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[8px] font-bold flex items-center justify-center"
              style={{ background: "hsl(var(--destructive))", color: "#fff" }}>{totalItems}</span>
          )}
        </button>
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        {[
          { label: "Produits", value: PRODUCTS.length, color: "--primary" },
          { label: "Vendeurs", value: new Set(PRODUCTS.map(p => p.sellerId)).size, color: "--success" },
          { label: "Panier", value: totalItems, color: "--warning" },
          { label: "Total", value: `${(cartTotal / 1000).toFixed(0)}k`, color: "--info" },
        ].map(k => (
          <div key={k.label} className="rounded-xl px-2 py-2 text-center"
            style={{ background: "hsl(var(--muted) / 0.3)", border: "1px solid hsl(var(--border) / 0.1)" }}>
            <p className="text-sm font-bold" style={{ color: `hsl(var(${k.color}))` }}>{k.value}</p>
            <p className="text-[7px]" style={{ color: "hsl(var(--muted-foreground))" }}>{k.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "hsl(var(--muted) / 0.3)" }}>
        {(["catalog", "cart", "routing"] as const).map(v => (
          <button key={v} onClick={() => { setView(v); haptic("selection"); }}
            className="flex-1 py-1.5 rounded-lg text-[9px] font-semibold"
            style={{
              background: view === v ? "hsl(var(--primary) / 0.1)" : "transparent",
              color: view === v ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
            }}>
            {v === "catalog" ? "🛒 Catalogue" : v === "cart" ? `🧺 Panier (${totalItems})` : "🚚 Routing"}
          </button>
        ))}
      </div>

      {view === "catalog" && (
        <div className="space-y-2">
          <div className="flex gap-1 overflow-x-auto pb-1">
            {categories.map(c => (
              <button key={c} onClick={() => { setCategoryFilter(c); haptic("selection"); }}
                className="px-2 py-1 rounded-full text-[8px] font-semibold whitespace-nowrap shrink-0"
                style={{
                  background: categoryFilter === c ? "hsl(var(--primary) / 0.1)" : "hsl(var(--muted) / 0.3)",
                  color: categoryFilter === c ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
                }}>
                {c === "all" ? "Tous" : c}
              </button>
            ))}
          </div>
          {filtered.map(p => (
            <div key={p.id} className="rounded-xl p-3 flex items-center gap-3"
              style={{ background: "hsl(var(--muted) / 0.2)", border: "1px solid hsl(var(--border) / 0.08)" }}>
              <span className="text-2xl">{p.image}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold truncate" style={{ color: "hsl(var(--foreground))" }}>{p.name}</p>
                <p className="text-[8px]" style={{ color: "hsl(var(--muted-foreground))" }}>
                  {p.seller} • ⭐ {p.rating} • 📍 {p.zone}
                </p>
                <p className="text-[10px] font-bold mt-0.5" style={{ color: "hsl(var(--primary))" }}>{p.price.toLocaleString()} F</p>
              </div>
              <Button size="sm" className="text-[9px] h-7 px-2" onClick={() => addToCart(p)}
                style={{ background: "hsl(var(--primary) / 0.1)", color: "hsl(var(--primary))" }}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {view === "cart" && (
        <div className="space-y-2">
          {cart.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingCart className="h-8 w-8 mx-auto mb-2" style={{ color: "hsl(var(--muted-foreground) / 0.3)" }} />
              <p className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>Panier vide</p>
            </div>
          ) : (
            <>
              {sellerGroups.map(seller => (
                <div key={seller} className="space-y-1.5">
                  <p className="text-[9px] font-bold flex items-center gap-1" style={{ color: "hsl(var(--primary))" }}>
                    <Store className="h-3 w-3" /> {seller}
                  </p>
                  {cart.filter(c => c.seller === seller).map(c => (
                    <div key={c.id} className="rounded-lg p-2 flex items-center gap-2"
                      style={{ background: "hsl(var(--muted) / 0.15)" }}>
                      <span>{c.image}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-medium truncate" style={{ color: "hsl(var(--foreground))" }}>{c.name}</p>
                        <p className="text-[8px]" style={{ color: "hsl(var(--muted-foreground))" }}>{c.price.toLocaleString()} F</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => updateQty(c.id, -1)} className="w-5 h-5 rounded flex items-center justify-center"
                          style={{ background: "hsl(var(--muted) / 0.5)" }}>
                          <Minus className="h-3 w-3" style={{ color: "hsl(var(--foreground))" }} />
                        </button>
                        <span className="text-[10px] font-bold w-4 text-center" style={{ color: "hsl(var(--foreground))" }}>{c.qty}</span>
                        <button onClick={() => updateQty(c.id, 1)} className="w-5 h-5 rounded flex items-center justify-center"
                          style={{ background: "hsl(var(--primary) / 0.1)" }}>
                          <Plus className="h-3 w-3" style={{ color: "hsl(var(--primary))" }} />
                        </button>
                      </div>
                      <span className="text-[9px] font-bold w-14 text-right" style={{ color: "hsl(var(--foreground))" }}>
                        {(c.price * c.qty).toLocaleString()} F
                      </span>
                    </div>
                  ))}
                </div>
              ))}
              <div className="rounded-xl p-3 mt-2" style={{ background: "hsl(var(--primary) / 0.05)", border: "1px solid hsl(var(--primary) / 0.15)" }}>
                <div className="flex justify-between">
                  <span className="text-[11px] font-bold" style={{ color: "hsl(var(--foreground))" }}>Total</span>
                  <span className="text-[11px] font-bold" style={{ color: "hsl(var(--primary))" }}>{cartTotal.toLocaleString()} F</span>
                </div>
                <p className="text-[8px] mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>
                  Split payment : {sellerGroups.length} vendeur{sellerGroups.length > 1 ? "s" : ""} • {totalItems} article{totalItems > 1 ? "s" : ""}
                </p>
              </div>
              <Button className="w-full text-xs h-9" onClick={checkout}
                style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>
                <CreditCard className="h-3 w-3 mr-1" /> Payer ({sellerGroups.length} vendeurs)
              </Button>
            </>
          )}
        </div>
      )}

      {view === "routing" && (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>
            Routing intelligent par vendeur
          </p>
          {[...new Set(PRODUCTS.map(p => p.sellerId))].map(sid => {
            const sellerProducts = PRODUCTS.filter(p => p.sellerId === sid);
            const seller = sellerProducts[0];
            return (
              <div key={sid} className="rounded-xl p-3"
                style={{ background: "hsl(var(--muted) / 0.2)", border: "1px solid hsl(var(--border) / 0.08)" }}>
                <div className="flex items-center gap-2 mb-1.5">
                  <Truck className="h-3.5 w-3.5" style={{ color: "hsl(var(--primary))" }} />
                  <span className="text-[10px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{seller.seller}</span>
                  <span className="text-[8px] px-1.5 py-0.5 rounded-full" style={{ background: "hsl(var(--info) / 0.1)", color: "hsl(var(--info))" }}>
                    📍 {seller.zone}
                  </span>
                </div>
                <p className="text-[8px]" style={{ color: "hsl(var(--muted-foreground))" }}>
                  {sellerProducts.length} produit{sellerProducts.length > 1 ? "s" : ""} • Livraison groupée optimisée
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-[8px] font-semibold" style={{ color: "hsl(var(--success))" }}>🚚 ~25 min</span>
                  <span className="text-[8px]" style={{ color: "hsl(var(--muted-foreground))" }}>•</span>
                  <span className="text-[8px] font-semibold" style={{ color: "hsl(var(--warning))" }}>500 F livraison</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
