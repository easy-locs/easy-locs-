/**
 * DiscoverPage — Module 13-14: Discovery + Search for shops, products, services.
 * Routes: /discover, /trending, /nearby, /top-rated, /search
 * FIXED: Real server-side search via ilike + geo-filtering via Haversine RPC.
 */
import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, TrendingUp, MapPin, Star, Sparkles, Store, Package, Briefcase, Loader2, X } from "lucide-react";
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
];

const fmtPrice = (n: number, c = "EUR") => {
  try { return new Intl.NumberFormat(undefined, { style: "currency", currency: c, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n); }
  catch { return `${n} ${c}`; }
};

export default function DiscoverPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get("q") || "";
  const [search, setSearch] = useState(query);
  const [vertical, setVertical] = useState("all");
  const geo = useGeolocation();

  // Use geo RPC when lat/lng available, otherwise fallback to ilike
  const hasGeo = geo.lat != null && geo.lng != null;

  const { data: shops = [], isLoading: shopsLoading } = useQuery({
    queryKey: ["discover-shops", vertical, query, hasGeo ? `${geo.lat},${geo.lng}` : "no-geo"],
    queryFn: async () => {
      // If we have geo coordinates, use the server-side Haversine RPC
      if (hasGeo) {
        const { data } = await supabase.rpc("search_nearby_shops" as any, {
          _lat: geo.lat!,
          _lng: geo.lng!,
          _radius_km: 100,
          _query: query.trim(),
          _vertical: vertical,
          _limit: 50,
        });
        return data || [];
      }

      // Fallback: text-based search
      let q = (supabase as any).from("storefront_pages").select("*")
        .eq("shop_visibility", "public")
        .order("created_at", { ascending: false })
        .limit(50);
      if (vertical !== "all") q = q.eq("vertical", vertical);
      if (query.trim()) q = q.or(`name.ilike.%${query}%,description.ilike.%${query}%,city.ilike.%${query}%`);
      const { data } = await q;
      return data || [];
    },
  });

  // Real server-side search for products via ilike
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
      // Filter to only show items from public shops
      return (data || []).filter((item: any) => item.storefront_pages?.shop_visibility === "public");
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams(search.trim() ? { q: search.trim() } : {});
  };

  return (
    <>
      <SEOHead title="Discover | ORBIT" description="Explore shops, products and services near you" />
      <div className="min-h-screen bg-background pb-20">
        {/* Header */}
        <div className="bg-gradient-to-b from-primary/5 to-background px-4 pt-8 pb-4">
          <h1 className="text-2xl font-bold text-foreground mb-1">Discover</h1>
          <p className="text-sm text-muted-foreground mb-4">Shops, products & services</p>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search shops, products, services..."
              className="pl-10 pr-10 h-11 rounded-xl bg-card border-border"
            />
            {search && (
              <button type="button" onClick={() => { setSearch(""); setSearchParams({}); }} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </form>
        </div>

        {/* Vertical filters */}
        <div className="flex gap-1.5 px-4 py-3 overflow-x-auto scrollbar-none">
          {VERTICALS.map(v => (
            <button
              key={v.id}
              onClick={() => setVertical(v.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap shrink-0 transition-all ${
                vertical === v.id ? "bg-primary/10 text-primary border border-primary/20" : "bg-muted/50 text-muted-foreground"
              }`}
            >
              <v.icon className="h-3 w-3" /> {v.label}
            </button>
          ))}
        </div>

        <div className="px-4 space-y-6">
          {/* Discovery rails */}
          {!query && (
            <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
              {RAILS.map(r => (
                <button key={r.id} onClick={() => navigate(`/discover?rail=${r.id}`)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-card border border-border text-xs font-medium whitespace-nowrap shrink-0 hover:border-primary/30 transition-colors">
                  <r.icon className="h-3.5 w-3.5 text-primary" /> {r.label}
                </button>
              ))}
            </div>
          )}

          {/* Shops section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground">
                {query ? `Shops matching "${query}"` : "Featured Shops"}
              </h2>
              <span className="text-[10px] text-muted-foreground">{shops.length} results</span>
            </div>

            {shopsLoading ? (
              <div className="py-8 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></div>
            ) : shops.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">No shops found</CardContent></Card>
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
                      {shop.vertical && <Badge variant="secondary" className="text-[8px]">{shop.vertical}</Badge>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Products section */}
          {products.length > 0 && (
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
