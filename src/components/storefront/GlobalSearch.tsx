/**
 * GlobalSearch — PASS109: Unified search across shops, products, services.
 * Floating search bar with real-time results, mobile-first.
 */
import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Store, Package, X, Loader2 } from "lucide-react";

interface SearchResult {
  id: string;
  type: "shop" | "product";
  title: string;
  subtitle?: string;
  image?: string;
  price?: number;
  currency?: string;
  slug?: string;
}

const fmtPrice = (n: number, c = "EUR") => {
  try { return new Intl.NumberFormat(undefined, { style: "currency", currency: c, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n); }
  catch { return `${n} ${c}`; }
};

export default function GlobalSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const [shopsRes, productsRes] = await Promise.all([
        (supabase as any).from("storefront_pages")
          .select("id, name, slug, logo_url, city, vertical")
          .eq("shop_visibility", "public")
          .or(`name.ilike.%${q}%,description.ilike.%${q}%,city.ilike.%${q}%`)
          .limit(5),
        (supabase as any).from("catalog_items")
          .select("id, title, photo_url, price, currency, shop_id, storefront_pages!catalog_items_shop_id_fkey(slug)")
          .eq("available", true)
          .or(`title.ilike.%${q}%,description.ilike.%${q}%`)
          .limit(5),
      ]);

      const shopResults: SearchResult[] = (shopsRes.data || []).map((s: any) => ({
        id: s.id, type: "shop" as const, title: s.name,
        subtitle: [s.vertical, s.city].filter(Boolean).join(" · "),
        image: s.logo_url, slug: s.slug,
      }));

      const productResults: SearchResult[] = (productsRes.data || []).map((p: any) => ({
        id: p.id, type: "product" as const, title: p.title,
        image: p.photo_url, price: p.price, currency: p.currency,
        slug: p.storefront_pages?.slug,
      }));

      setResults([...shopResults, ...productResults]);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, search]);

  // Close on outside click
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const handleSelect = (r: SearchResult) => {
    setOpen(false);
    setQuery("");
    if (r.type === "shop" && r.slug) navigate(`/s/${r.slug}`);
    else if (r.type === "product" && r.slug) navigate(`/s/${r.slug}`);
    else navigate(`/discover?q=${encodeURIComponent(r.title)}`);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => query.length >= 2 && setOpen(true)}
          placeholder="Search shops, products..."
          className="pl-10 pr-10 h-10 rounded-xl bg-card border-border"
        />
        {query && (
          <button onClick={() => { setQuery(""); setResults([]); setOpen(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Results dropdown */}
      {open && (query.length >= 2) && (
        <Card className="absolute top-12 left-0 right-0 z-50 shadow-lg max-h-80 overflow-y-auto">
          <CardContent className="p-1.5">
            {loading ? (
              <div className="py-6 text-center"><Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" /></div>
            ) : results.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">No results for "{query}"</p>
            ) : (
              <div className="space-y-0.5">
                {results.map(r => (
                  <button key={`${r.type}-${r.id}`} onClick={() => handleSelect(r)}
                    className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/50 transition-colors text-left">
                    {r.image ? (
                      <img src={r.image} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        {r.type === "shop" ? <Store className="h-4 w-4 text-primary" /> : <Package className="h-4 w-4 text-primary" />}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{r.title}</p>
                      {r.subtitle && <p className="text-[10px] text-muted-foreground truncate">{r.subtitle}</p>}
                    </div>
                    <div className="shrink-0 text-right">
                      {r.price != null && <p className="text-xs font-bold text-primary">{fmtPrice(r.price, r.currency)}</p>}
                      <Badge variant="outline" className="text-[8px]">{r.type}</Badge>
                    </div>
                  </button>
                ))}
                {/* Full search link */}
                <button onClick={() => { setOpen(false); navigate(`/discover?q=${encodeURIComponent(query)}`); }}
                  className="w-full p-2 text-center text-xs text-primary font-medium hover:bg-primary/5 rounded-lg transition-colors">
                  See all results for "{query}" →
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
