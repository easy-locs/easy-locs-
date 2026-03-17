/**
 * DiscoverPage — PASS108 V2: Discovery with real backend rails.
 * Trending (most orders), Nearby (geo), Top Rated (reviews), Smart Picks (personalized).
 */
import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import SEOHead from "@/components/SEOHead";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, MapPin, Star, Sparkles, Store, Package, Briefcase, Loader2 } from "lucide-react";
import { useGeolocation } from "@/hooks/useGeolocation";
import GlobalSearch from "@/components/storefront/GlobalSearch";

const VERTICALS = [
  { id: "all", label: "All", icon: Sparkles },
  { id: "food", label: "Food", icon: Store },
  { id: "shops", label: "Shops", icon: Package },
  { id: "services", label: "Services", icon: Briefcase },
];

const RAILS = [
  { id: "trending", label: "Trending", icon: TrendingUp },
  { id: "nearby", label: "Nearby", icon: MapPin },
  { id: "top_rated", label: "Top Rated", icon: Star },
  { id: "smart_picks", label: "For You", icon: Sparkles },
] as const;

type RailId = typeof RAILS[number]["id"];

const fmtPrice = (n: number, c = "EUR") => {
  try { return new Intl.NumberFormat(undefined, { style: "currency", currency: c, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n); }
  catch { return `${n} ${c}`; }
};

export default function DiscoverPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const query = searchParams.get("q") || "";
  const activeRail = (searchParams.get("rail") as RailId) || null;
  const [vertical, setVertical] = useState("all");
  const geo = useGeolocation();
  const hasGeo = geo.lat != null && geo.lng != null;

  // ── Main shops query: changes based on active rail ──
  const { data: shops = [], isLoading: shopsLoading } = useQuery({
    queryKey: ["discover-shops", vertical, query, activeRail, hasGeo ? `${geo.lat},${geo.lng}` : "no-geo", user?.id],
    queryFn: async () => {
      // Text search mode
      if (query.trim()) {
        if (hasGeo) {
          const { data } = await supabase.rpc("search_nearby_shops" as any, {
            _lat: geo.lat!, _lng: geo.lng!, _radius_km: 100,
            _query: query.trim(), _vertical: vertical, _limit: 50,
          });
          return data || [];
        }
        let q = (supabase as any).from("storefront_pages").select("*")
          .eq("shop_visibility", "public")
          .or(`name.ilike.%${query}%,description.ilike.%${query}%,city.ilike.%${query}%`)
          .limit(50);
        if (vertical !== "all") q = q.eq("vertical", vertical);
        const { data } = await q;
        return data || [];
      }

      // Rail-based queries
      if (activeRail === "trending") {
        const { data } = await supabase.rpc("get_trending_shops" as any, { _limit: 30 });
        let results = data || [];
        if (vertical !== "all") results = results.filter((s: any) => s.vertical === vertical);
        return results;
      }

      if (activeRail === "top_rated") {
        const { data } = await supabase.rpc("get_top_rated_shops" as any, { _limit: 30 });
        let results = data || [];
        if (vertical !== "all") results = results.filter((s: any) => s.vertical === vertical);
        return results;
      }

      if (activeRail === "smart_picks" && user) {
        const { data } = await supabase.rpc("get_smart_picks" as any, { _user_id: user.id, _limit: 30 });
        let results = data || [];
        if (vertical !== "all") results = results.filter((s: any) => s.vertical === vertical);
        return results;
      }

      if (activeRail === "nearby" && hasGeo) {
        const { data } = await supabase.rpc("search_nearby_shops" as any, {
          _lat: geo.lat!, _lng: geo.lng!, _radius_km: 50,
          _query: "", _vertical: vertical, _limit: 30,
        });
        return data || [];
      }

      // Default: recent public shops
      let q = (supabase as any).from("storefront_pages").select("*")
        .eq("shop_visibility", "public")
        .order("created_at", { ascending: false })
        .limit(50);
      if (vertical !== "all") q = q.eq("vertical", vertical);
      const { data } = await q;
      return data || [];
    },
  });

  // ── Products (only for search or default view) ──
  const { data: products = [] } = useQuery({
    queryKey: ["discover-products", vertical, query],
    queryFn: async () => {
      let q = (supabase as any).from("catalog_items")
        .select("*, storefront_pages!catalog_items_shop_id_fkey(name, slug, shop_visibility)")
        .eq("available", true)
        .order("created_at", { ascending: false })
        .limit(24);
      if (query.trim()) q = q.or(`title.ilike.%${query}%,description.ilike.%${query}%`);
      const { data } = await q;
      return (data || []).filter((item: any) => item.storefront_pages?.shop_visibility === "public");
    },
    enabled: !activeRail, // Only fetch products when not on a specific rail
  });

  const railLabel = activeRail
    ? RAILS.find(r => r.id === activeRail)?.label || "Discover"
    : query ? `Results for "${query}"` : "Featured Shops";

  return (
    <>
      <SEOHead title="Discover | ORBIT" description="Explore shops, products and services near you" />
      <div className="min-h-screen bg-background pb-20">
        {/* Header */}
        <div className="bg-gradient-to-b from-primary/5 to-background px-4 pt-8 pb-4">
          <h1 className="text-2xl font-bold text-foreground mb-1">Discover</h1>
          <p className="text-sm text-muted-foreground mb-4">Shops, products & services</p>
          <GlobalSearch />
        </div>

        {/* Vertical filters */}
        <div className="flex gap-1.5 px-4 py-3 overflow-x-auto scrollbar-none">
          {VERTICALS.map(v => (
            <button key={v.id} onClick={() => setVertical(v.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap shrink-0 transition-all ${
                vertical === v.id ? "bg-primary/10 text-primary border border-primary/20" : "bg-muted/50 text-muted-foreground"
              }`}>
              <v.icon className="h-3 w-3" /> {v.label}
            </button>
          ))}
        </div>

        <div className="px-4 space-y-6">
          {/* Discovery rails */}
          <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
            {RAILS.map(r => {
              const isActive = activeRail === r.id;
              const disabled = r.id === "nearby" && !hasGeo;
              const disabledPicks = r.id === "smart_picks" && !user;
              return (
                <button key={r.id}
                  onClick={() => {
                    if (disabled || disabledPicks) return;
                    navigate(isActive ? "/discover" : `/discover?rail=${r.id}`);
                  }}
                  disabled={disabled || disabledPicks}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl border text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground border-primary"
                      : disabled || disabledPicks
                        ? "bg-muted/30 text-muted-foreground/50 border-border cursor-not-allowed"
                        : "bg-card border-border hover:border-primary/30"
                  }`}>
                  <r.icon className="h-3.5 w-3.5" /> {r.label}
                </button>
              );
            })}
          </div>

          {/* Shops section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground">{railLabel}</h2>
              <span className="text-[10px] text-muted-foreground">{shops.length} results</span>
            </div>

            {shopsLoading ? (
              <div className="py-8 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></div>
            ) : shops.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">
                {activeRail === "nearby" && !hasGeo ? "Enable location to see nearby shops" :
                 activeRail === "smart_picks" && !user ? "Sign in to see personalized picks" :
                 "No shops found"}
              </CardContent></Card>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {shops.slice(0, 12).map((shop: any) => (
                  <Card key={shop.id} className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/s/${shop.slug}`)}>
                    {shop.banner_url && (
                      <div className="h-20 bg-muted"><img src={shop.banner_url} alt="" className="w-full h-full object-cover" loading="lazy" /></div>
                    )}
                    <CardContent className="p-2.5 space-y-1">
                      <div className="flex items-center gap-2">
                        {shop.logo_url ? (
                          <img src={shop.logo_url} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Store className="h-4 w-4 text-primary" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-semibold truncate">{shop.name}</p>
                          {shop.city && <p className="text-[10px] text-muted-foreground truncate">{shop.city}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {shop.vertical && <Badge variant="secondary" className="text-[8px]">{shop.vertical}</Badge>}
                        {shop.avg_rating > 0 && (
                          <Badge variant="outline" className="text-[8px] gap-0.5">
                            <Star className="h-2 w-2 fill-amber-400 text-amber-400" /> {shop.avg_rating}
                          </Badge>
                        )}
                        {shop.order_count > 0 && activeRail === "trending" && (
                          <Badge variant="outline" className="text-[8px] gap-0.5">
                            <TrendingUp className="h-2 w-2" /> {shop.order_count}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Products section */}
          {!activeRail && products.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-3">
                {query ? `Products matching "${query}"` : "Latest Products"}
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {products.slice(0, 8).map((item: any) => {
                  const photo = item.photo_url || (Array.isArray(item.photo_urls) && item.photo_urls[0]);
                  const shopData = item.storefront_pages;
                  return (
                    <Card key={item.id} className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => shopData?.slug && navigate(`/s/${shopData.slug}`)}>
                      {photo && <div className="aspect-square bg-muted"><img src={photo} alt={item.title} className="w-full h-full object-cover" loading="lazy" /></div>}
                      <CardContent className="p-2.5 space-y-1">
                        <p className="text-xs font-semibold line-clamp-2">{item.title}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-primary">{fmtPrice(item.price, item.currency)}</span>
                          {shopData?.name && <span className="text-[9px] text-muted-foreground truncate max-w-[60%]">{shopData.name}</span>}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
