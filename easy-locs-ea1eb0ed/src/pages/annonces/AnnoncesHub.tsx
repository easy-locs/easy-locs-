import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, MapPin, SlidersHorizontal, Grid3X3, List, ChevronRight, TrendingUp, Sparkles, Clock, Bookmark, X, Flame } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { c2cService } from "@/services/domain/c2c.service";
import { C2C_CATEGORY_TREE } from "@/lib/c2c/c2c-category-tree";
import C2CListingCard from "@/components/c2c/C2CListingCard";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { haversineKm } from "@/lib/geo/distance";
import type { C2CListingRow } from "@/repositories/domain/c2c.repo";
import SEOHead from "@/components/SEOHead";
import { useLocationStore } from "@/stores/locationStore";
import { tc } from "@/lib/i18n-canonical";

const QUICK_FILTERS = [
  { id: "all", label: "Tout", icon: Sparkles },
  { id: "nearby", label: "Près de moi", icon: MapPin },
  { id: "new", label: "Neuf", icon: TrendingUp },
  { id: "free", label: "Gratuit", icon: Flame },
];

const RECENT_SEARCHES_KEY = "c2c_recent_searches";

function getRecentSearches(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || "[]").slice(0, 5);
  } catch { return []; }
}

function addRecentSearch(q: string) {
  if (!q.trim()) return;
  const current = getRecentSearches().filter(s => s !== q);
  current.unshift(q);
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(current.slice(0, 8)));
}

function clearRecentSearches() {
  localStorage.removeItem(RECENT_SEARCHES_KEY);
}

const CATEGORY_GRADIENTS: Record<string, string> = {
  vehicules: "from-blue-500/20 to-blue-600/5",
  immobilier: "from-emerald-500/20 to-emerald-600/5",
  electronique: "from-violet-500/20 to-violet-600/5",
  mode: "from-pink-500/20 to-pink-600/5",
  maison_jardin: "from-green-500/20 to-green-600/5",
  loisirs_sports: "from-orange-500/20 to-orange-600/5",
  multimedia: "from-cyan-500/20 to-cyan-600/5",
  famille: "from-rose-500/20 to-rose-600/5",
  animaux: "from-amber-500/20 to-amber-600/5",
  emploi_services: "from-indigo-500/20 to-indigo-600/5",
  materiel_pro: "from-slate-500/20 to-slate-600/5",
  autres: "from-gray-500/20 to-gray-600/5",
};

export default function AnnoncesHub() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [listings, setListings] = useState<C2CListingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [quickFilter, setQuickFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const cursorRef = useRef<{ createdAt: string; id: string } | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(getRecentSearches());
  const observerRef = useRef<HTMLDivElement | null>(null);
  const [trendingListings, setTrendingListings] = useState<C2CListingRow[]>([]);

  const locationLat = useLocationStore(s => s.getLat());
  const locationLng = useLocationStore(s => s.getLng());

  useEffect(() => {
    if (locationLat != null && locationLng != null) {
      setUserLocation({ lat: locationLat, lng: locationLng });
    }
  }, [locationLat, locationLng]);

  const loadListings = useCallback(async (reset = true) => {
    if (reset) setLoading(true); else setLoadingMore(true);
    try {
      const opts: Parameters<typeof c2cService.listListings>[0] = { limit: 30 };
      if (quickFilter === "new") opts.condition = "new";
      if (!reset && cursorRef.current) {
        opts.cursorCreatedAt = cursorRef.current.createdAt;
        opts.cursorId = cursorRef.current.id;
      }

      let results: C2CListingRow[];
      if (query.trim()) {
        if (!reset) { setLoadingMore(false); return; }
        results = await c2cService.searchListings(query.trim()) as C2CListingRow[];
        addRecentSearch(query.trim());
        setHasMore(false);
      } else {
        results = await c2cService.listListings(opts);
      }

      if (quickFilter === "free") results = results.filter(l => l.price === 0 || l.price_type === "free");
      if (quickFilter === "nearby" && userLocation) {
        results = results
          .filter(l => l.lat != null && l.lng != null)
          .sort((a, b) => {
            const da = haversineKm(userLocation.lat, userLocation.lng, a.lat!, a.lng!);
            const db2 = haversineKm(userLocation.lat, userLocation.lng, b.lat!, b.lng!);
            return da - db2;
          });
      }

      if (results.length > 0) {
        const last = results[results.length - 1];
        cursorRef.current = { createdAt: last.created_at, id: last.id };
      }
      setHasMore(results.length >= 30);

      if (reset) {
        setListings(results);
        if (!query.trim() && quickFilter === "all") {
          const sorted = [...results].sort((a, b) => (b.view_count + b.favorite_count * 3) - (a.view_count + a.favorite_count * 3));
          setTrendingListings(sorted.slice(0, 6));
        }
      } else {
        setListings(prev => [...prev, ...results]);
      }
    } catch {
      if (reset) setListings([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [query, quickFilter, userLocation]);

  useEffect(() => {
    cursorRef.current = null;
    loadListings(true);
  }, [loadListings]);

  useEffect(() => {
    const el = observerRef.current;
    if (!el || !hasMore) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting && !loading && !loadingMore && hasMore) {
          loadListings(false);
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, loadListings]);

  const getDistance = (listing: C2CListingRow) => {
    if (!userLocation || listing.lat == null || listing.lng == null) return null;
    return Math.round(haversineKm(userLocation.lat, userLocation.lng, listing.lat, listing.lng) * 10) / 10;
  };

  const visibleCategories = showAllCategories ? C2C_CATEGORY_TREE : C2C_CATEGORY_TREE.slice(0, 8);

  const handleSearchSubmit = () => {
    setSearchFocused(false);
    if (query.trim()) {
      setRecentSearches(getRecentSearches());
    }
    loadListings(true);
  };

  const handleRecentSearchClick = (q: string) => {
    setQuery(q);
    setSearchFocused(false);
    setTimeout(() => loadListings(true), 0);
  };

  return (
    <DashboardLayout>
      <SEOHead
        title="Annonces — Easy-Locs Classifieds"
        description="Achetez et vendez entre particuliers. Véhicules, électronique, mode, immobilier et plus. Annonces gratuites, paiement QR sécurisé."
        canonical={`${window.location.origin}/annonces`}
        keywords="annonces, classifieds, c2c, petites annonces, vendre, acheter, occasion, leboncoin"
        ogType="website"
      />
      <div className="max-w-4xl mx-auto pb-20">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-5"
        >
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Annonces</h1>
            {userLocation && (
              <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                <MapPin className="h-3 w-3 text-primary" /> Position détectée
              </p>
            )}
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/annonces/publier")}
            className="flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-primary/20"
          >
            <Plus className="h-4 w-4" /> Vendre
          </motion.button>
        </motion.div>

        <div className="relative mb-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={e => setQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onKeyDown={e => { if (e.key === "Enter") handleSearchSubmit(); }}
                placeholder="Rechercher une annonce..."
                className="pl-9 bg-muted/50 border-border/50 h-11 rounded-xl"
              />
              {query && (
                <button onClick={() => { setQuery(""); loadListings(true); }} className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted">
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              )}
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/annonces/recherche")}
              className="p-2.5 rounded-xl border border-border/50 bg-muted/50 text-muted-foreground h-11 w-11 flex items-center justify-center"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </motion.button>
          </div>

          <AnimatePresence>
            {searchFocused && recentSearches.length > 0 && !query && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-xl z-20 overflow-hidden"
              >
                <div className="flex items-center justify-between px-4 pt-3 pb-1">
                  <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Recherches récentes</span>
                  <button onClick={() => { clearRecentSearches(); setRecentSearches([]); }} className="text-[10px] text-primary">Effacer</button>
                </div>
                {recentSearches.map(s => (
                  <button key={s} onClick={() => handleRecentSearchClick(s)} className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors flex items-center gap-2">
                    <Search className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="truncate">{s}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {searchFocused && <div className="fixed inset-0 z-10" onClick={() => setSearchFocused(false)} />}

        <div className="flex gap-2 overflow-x-auto pb-2 mb-5 hide-scrollbar">
          {QUICK_FILTERS.map(f => {
            const Icon = f.icon;
            return (
              <motion.button
                key={f.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => setQuickFilter(f.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shrink-0 flex items-center gap-1.5 ${
                  quickFilter === f.id
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted border border-border/30"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {f.label}
              </motion.button>
            );
          })}
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold">Catégories</h2>
            <button onClick={() => setShowAllCategories(!showAllCategories)} className="text-xs text-primary font-medium flex items-center gap-0.5">
              {showAllCategories ? "Réduire" : "Voir tout"} <ChevronRight className={`h-3 w-3 transition-transform ${showAllCategories ? "rotate-90" : ""}`} />
            </button>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {visibleCategories.map((cat, i) => (
              <motion.button
                key={cat.key}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.03 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate(`/annonces/recherche?cat=${cat.key}`)}
                className={`flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl bg-gradient-to-br ${CATEGORY_GRADIENTS[cat.key] || "from-gray-500/10 to-gray-600/5"} hover:shadow-md transition-all border border-border/20`}
              >
                <span className="text-2xl">{cat.emoji}</span>
                <span className="text-[10px] font-semibold text-foreground/80 leading-tight text-center">{cat.label}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {trendingListings.length > 0 && quickFilter === "all" && !query && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-amber-500/10">
                <TrendingUp className="h-4 w-4 text-amber-600" />
              </div>
              <h2 className="text-sm font-bold">Tendances</h2>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
              {trendingListings.map((l, i) => (
                <motion.div
                  key={l.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="shrink-0 w-44"
                >
                  <C2CListingCard listing={l} userId={user?.id} distanceKm={getDistance(l)} compact />
                </motion.div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-muted-foreground font-medium">
            {loading ? "Chargement..." : `${listings.length} annonce${listings.length !== 1 ? "s" : ""}`}
          </p>
          <div className="flex gap-1 bg-muted/50 rounded-lg p-0.5">
            <button onClick={() => setViewMode("grid")} className={`p-1.5 rounded-md transition-colors ${viewMode === "grid" ? "bg-background shadow-sm" : ""}`}><Grid3X3 className="h-3.5 w-3.5" /></button>
            <button onClick={() => setViewMode("list")} className={`p-1.5 rounded-md transition-colors ${viewMode === "list" ? "bg-background shadow-sm" : ""}`}><List className="h-3.5 w-3.5" /></button>
          </div>
        </div>

        {loading && listings.length === 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-xl border border-border/50 overflow-hidden">
                <div className="aspect-[4/3] bg-muted/40 animate-pulse" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-muted/60 animate-pulse rounded-full w-3/4" />
                  <div className="h-4 bg-muted/60 animate-pulse rounded-full w-1/2" />
                  <div className="h-2.5 bg-muted/40 animate-pulse rounded-full w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : listings.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20 text-muted-foreground"
          >
            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <Search className="h-7 w-7 opacity-40" />
            </div>
            <p className="font-semibold text-foreground">Aucune annonce trouvée</p>
            <p className="text-sm mt-1">Modifiez vos filtres ou publiez la première !</p>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate("/annonces/publier")}
              className="mt-5 bg-primary text-primary-foreground text-sm font-bold px-6 py-3 rounded-xl shadow-lg shadow-primary/20"
            >
              Publier une annonce
            </motion.button>
          </motion.div>
        ) : (
          <>
            <div className={viewMode === "grid" ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3" : "space-y-3"}>
              {listings.map((listing, i) => (
                <motion.div
                  key={listing.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.3) }}
                >
                  <C2CListingCard
                    listing={listing}
                    userId={user?.id}
                    distanceKm={getDistance(listing)}
                  />
                </motion.div>
              ))}
            </div>

            <div ref={observerRef} className="h-8" />

            {loadingMore && (
              <div className="flex justify-center py-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  Chargement...
                </div>
              </div>
            )}

            {!hasMore && listings.length > 0 && (
              <p className="text-center text-xs text-muted-foreground/60 py-6">Vous avez tout vu !</p>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
