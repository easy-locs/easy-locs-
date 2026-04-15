import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Search, SlidersHorizontal, X, MapPin, Bookmark, BookmarkCheck, ChevronDown, Grid3X3, List } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { c2cService } from "@/services/domain/c2c.service";
import { C2C_CATEGORY_TREE, C2C_CONDITIONS, C2C_DELIVERY_OPTIONS } from "@/lib/c2c/c2c-category-tree";
import C2CListingCard from "@/components/c2c/C2CListingCard";
import SubPageShell from "@/components/layout/SubPageShell";
import { haversineKm } from "@/lib/geo/distance";
import type { C2CListingRow } from "@/repositories/domain/c2c.repo";
import SEOHead from "@/components/SEOHead";
import { useLocationStore } from "@/stores/locationStore";
import { tc } from "@/lib/i18n-canonical";

const DATE_FILTERS = [
  { value: "all", label: "Tout" },
  { value: "today", label: "Aujourd'hui" },
  { value: "3days", label: "3 jours" },
  { value: "week", label: "7 jours" },
  { value: "month", label: "30 jours" },
];

const SORT_OPTIONS = [
  { value: "date_desc", label: "Plus récent" },
  { value: "date_asc", label: "Plus ancien" },
  { value: "price_asc", label: "Prix ↑" },
  { value: "price_desc", label: "Prix ↓" },
  { value: "distance", label: "Distance" },
];

const SAVED_SEARCHES_KEY = "c2c_saved_searches";

interface SavedSearch {
  id: string;
  label: string;
  params: Record<string, string>;
  createdAt: string;
}

function getSavedSearches(): SavedSearch[] {
  try { return JSON.parse(localStorage.getItem(SAVED_SEARCHES_KEY) || "[]"); }
  catch { return []; }
}

function saveSavedSearch(label: string, params: Record<string, string>) {
  const current = getSavedSearches();
  current.unshift({ id: Date.now().toString(36), label, params, createdAt: new Date().toISOString() });
  localStorage.setItem(SAVED_SEARCHES_KEY, JSON.stringify(current.slice(0, 10)));
}

function removeSavedSearch(id: string) {
  const current = getSavedSearches().filter(s => s.id !== id);
  localStorage.setItem(SAVED_SEARCHES_KEY, JSON.stringify(current));
}

export default function RechercheAnnonces() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [listings, setListings] = useState<C2CListingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>(getSavedSearches());
  const [showSaved, setShowSaved] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [category, setCategory] = useState(searchParams.get("cat") || "");
  const [subcategory, setSubcategory] = useState(searchParams.get("sub") || "");
  const [condition, setCondition] = useState(searchParams.get("condition") || "");
  const [priceMin, setPriceMin] = useState(searchParams.get("prix_min") || "");
  const [priceMax, setPriceMax] = useState(searchParams.get("prix_max") || "");
  const [dateFilter, setDateFilter] = useState(searchParams.get("date") || "all");
  const [delivery, setDelivery] = useState(searchParams.get("delivery") || "");
  const [sortBy, setSortBy] = useState(searchParams.get("sort") || "date_desc");
  const [radiusKm, setRadiusKm] = useState(searchParams.get("rayon") ? parseInt(searchParams.get("rayon")!) : 50);

  const locationLat = useLocationStore(s => s.getLat());
  const locationLng = useLocationStore(s => s.getLng());

  useEffect(() => {
    if (locationLat != null && locationLng != null) {
      setUserLoc({ lat: locationLat, lng: locationLng });
    }
  }, [locationLat, locationLng]);

  const doSearch = useCallback(async () => {
    setLoading(true);

    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (category) params.set("cat", category);
    if (subcategory) params.set("sub", subcategory);
    if (condition) params.set("condition", condition);
    if (priceMin) params.set("prix_min", priceMin);
    if (priceMax) params.set("prix_max", priceMax);
    if (dateFilter !== "all") params.set("date", dateFilter);
    if (delivery) params.set("delivery", delivery);
    if (sortBy !== "date_desc") params.set("sort", sortBy);
    setSearchParams(params, { replace: true });

    try {
      let results: C2CListingRow[];
      if (query.trim()) {
        results = await c2cService.searchListings(query.trim(), { category: category || undefined }) as C2CListingRow[];
      } else {
        results = await c2cService.listListings({
          category: category || undefined,
          subcategory: subcategory || undefined,
          condition: condition || undefined,
          priceMin: priceMin ? parseInt(priceMin) : undefined,
          priceMax: priceMax ? parseInt(priceMax) : undefined,
          limit: 60,
        });
      }

      if (priceMin) results = results.filter(l => l.price >= parseInt(priceMin));
      if (priceMax) results = results.filter(l => l.price <= parseInt(priceMax));
      if (delivery) results = results.filter(l => l.delivery_option === delivery || l.delivery_option === "both");

      if (dateFilter !== "all") {
        const now = Date.now();
        const cutoffs: Record<string, number> = { today: 86400000, "3days": 3 * 86400000, week: 7 * 86400000, month: 30 * 86400000 };
        const cutoff = cutoffs[dateFilter];
        if (cutoff) results = results.filter(l => now - new Date(l.created_at).getTime() <= cutoff);
      }

      if (sortBy === "price_asc") results.sort((a, b) => a.price - b.price);
      else if (sortBy === "price_desc") results.sort((a, b) => b.price - a.price);
      else if (sortBy === "date_asc") results.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      else if (sortBy === "distance" && userLoc) {
        results = results.filter(l => l.lat != null && l.lng != null);
        results.sort((a, b) => haversineKm(userLoc.lat, userLoc.lng, a.lat!, a.lng!) - haversineKm(userLoc.lat, userLoc.lng, b.lat!, b.lng!));
        if (radiusKm < 1000) results = results.filter(l => haversineKm(userLoc.lat, userLoc.lng, l.lat!, l.lng!) <= radiusKm);
      }

      setListings(results);
      setHasMore(results.length >= 60);
    } catch {
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, [query, category, subcategory, condition, priceMin, priceMax, dateFilter, delivery, sortBy, radiusKm, userLoc]);

  useEffect(() => { doSearch(); }, [doSearch]);

  const selectedCat = useMemo(() => C2C_CATEGORY_TREE.find(c => c.key === category), [category]);
  const getDistance = (l: C2CListingRow) => {
    if (!userLoc || l.lat == null || l.lng == null) return null;
    return Math.round(haversineKm(userLoc.lat, userLoc.lng, l.lat, l.lng) * 10) / 10;
  };

  const activeFilterCount = [category, subcategory, condition, priceMin, priceMax, dateFilter !== "all" ? dateFilter : "", delivery].filter(Boolean).length;

  const handleSaveSearch = () => {
    const params: Record<string, string> = {};
    if (query) params.q = query;
    if (category) params.cat = category;
    if (condition) params.condition = condition;
    if (priceMin) params.prix_min = priceMin;
    if (priceMax) params.prix_max = priceMax;
    const label = query || (selectedCat ? selectedCat.label : "Recherche");
    saveSavedSearch(label, params);
    setSavedSearches(getSavedSearches());
    toast.success("Recherche sauvegardée");
  };

  const handleLoadSavedSearch = (s: SavedSearch) => {
    setQuery(s.params.q || "");
    setCategory(s.params.cat || "");
    setCondition(s.params.condition || "");
    setPriceMin(s.params.prix_min || "");
    setPriceMax(s.params.prix_max || "");
    setShowSaved(false);
  };

  const handleRemoveSavedSearch = (id: string) => {
    removeSavedSearch(id);
    setSavedSearches(getSavedSearches());
  };

  const clearAllFilters = () => {
    setCategory(""); setSubcategory(""); setCondition(""); setPriceMin(""); setPriceMax(""); setDateFilter("all"); setDelivery(""); setSortBy("date_desc");
  };

  const seoTitle = query ? `"${query}" — Recherche Annonces` : (category ? `${selectedCat?.label || category} — Annonces` : "Recherche — Annonces Easy-Locs");

  return (
    <SubPageShell>
      <SEOHead
        title={seoTitle}
        description={`Recherchez parmi des milliers d'annonces${category ? ` dans ${selectedCat?.label || category}` : ""}. Filtres avancés, tri par prix et distance.`}
        noindex
      />
      <div className="max-w-4xl mx-auto pb-12">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-muted active:scale-95 transition-transform"><ArrowLeft className="h-4 w-4" /></button>
          <h1 className="text-lg font-extrabold flex-1">Recherche</h1>
          <button onClick={() => setShowSaved(!showSaved)} className="p-2 rounded-full hover:bg-muted relative active:scale-95 transition-transform">
            <Bookmark className="h-4 w-4" />
            {savedSearches.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-primary text-primary-foreground text-[8px] font-bold rounded-full flex items-center justify-center">{savedSearches.length}</span>
            )}
          </button>
        </div>

        <AnimatePresence>
          {showSaved && savedSearches.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-4"
            >
              <div className="bg-card border border-border/50 rounded-xl p-3 space-y-2">
                <p className="text-xs font-bold flex items-center gap-1"><BookmarkCheck className="h-3 w-3 text-primary" /> Recherches sauvegardées</p>
                {savedSearches.map(s => (
                  <div key={s.id} className="flex items-center gap-2">
                    <button onClick={() => handleLoadSavedSearch(s)} className="flex-1 text-left text-sm hover:text-primary transition-colors truncate">{s.label}</button>
                    <button onClick={() => handleRemoveSavedSearch(s.id)} className="p-1 rounded-full hover:bg-muted"><X className="h-3 w-3" /></button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") doSearch(); }}
              placeholder="Rechercher..."
              className="pl-9 h-11 rounded-xl bg-muted/50 border-border/50"
            />
            {query && (
              <button onClick={() => { setQuery(""); }} className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted">
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2.5 rounded-xl border h-11 w-11 flex items-center justify-center relative transition-all active:scale-95 ${showFilters ? "bg-primary text-primary-foreground border-primary" : "border-border/50 bg-muted/50"}`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-[9px] font-bold rounded-full flex items-center justify-center shadow-md">{activeFilterCount}</span>
            )}
          </button>
          <button onClick={handleSaveSearch} className="p-2.5 rounded-xl border border-border/50 bg-muted/50 h-11 w-11 flex items-center justify-center active:scale-95 transition-transform">
            <Bookmark className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-4"
            >
              <div className="bg-card rounded-2xl border border-border/50 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">Filtres</span>
                  <button onClick={clearAllFilters} className="text-[10px] text-primary font-semibold">Tout effacer</button>
                </div>

                <div>
                  <label className="text-xs font-bold">Catégorie</label>
                  <div className="flex gap-2 flex-wrap mt-1.5">
                    <button onClick={() => { setCategory(""); setSubcategory(""); }} className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all active:scale-95 ${!category ? "bg-primary text-primary-foreground shadow-md" : "bg-muted/60 text-muted-foreground"}`}>Toutes</button>
                    {C2C_CATEGORY_TREE.map(cat => (
                      <button key={cat.key} onClick={() => { setCategory(cat.key); setSubcategory(""); }} className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all active:scale-95 ${category === cat.key ? "bg-primary text-primary-foreground shadow-md" : "bg-muted/60 text-muted-foreground"}`}>
                        {cat.emoji} {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {selectedCat && (
                  <div>
                    <label className="text-xs font-bold">Sous-catégorie</label>
                    <div className="flex gap-2 flex-wrap mt-1.5">
                      <button onClick={() => setSubcategory("")} className={`px-3 py-1.5 rounded-xl text-xs font-medium ${!subcategory ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground"}`}>Toutes</button>
                      {selectedCat.subcategories.map(sub => (
                        <button key={sub.value} onClick={() => setSubcategory(sub.value)} className={`px-3 py-1.5 rounded-xl text-xs font-medium ${subcategory === sub.value ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground"}`}>
                          {sub.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold">Prix</label>
                  <div className="flex gap-2 mt-1.5 items-center">
                    <Input type="number" value={priceMin} onChange={e => setPriceMin(e.target.value)} placeholder="Min" className="w-28 text-sm h-10 rounded-xl" />
                    <span className="text-muted-foreground text-sm">—</span>
                    <Input type="number" value={priceMax} onChange={e => setPriceMax(e.target.value)} placeholder="Max" className="w-28 text-sm h-10 rounded-xl" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold">État</label>
                  <div className="flex gap-2 flex-wrap mt-1.5">
                    <button onClick={() => setCondition("")} className={`px-3 py-1.5 rounded-xl text-xs font-medium ${!condition ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground"}`}>Tous</button>
                    {C2C_CONDITIONS.map(c => (
                      <button key={c.value} onClick={() => setCondition(c.value)} className={`px-3 py-1.5 rounded-xl text-xs font-medium ${condition === c.value ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground"}`}>
                        {c.emoji} {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold">Date de publication</label>
                  <div className="flex gap-2 flex-wrap mt-1.5">
                    {DATE_FILTERS.map(d => (
                      <button key={d.value} onClick={() => setDateFilter(d.value)} className={`px-3 py-1.5 rounded-xl text-xs font-medium ${dateFilter === d.value ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground"}`}>
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold">Livraison</label>
                  <div className="flex gap-2 flex-wrap mt-1.5">
                    <button onClick={() => setDelivery("")} className={`px-3 py-1.5 rounded-xl text-xs font-medium ${!delivery ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground"}`}>Tous</button>
                    {C2C_DELIVERY_OPTIONS.map(d => (
                      <button key={d.value} onClick={() => setDelivery(d.value)} className={`px-3 py-1.5 rounded-xl text-xs font-medium ${delivery === d.value ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground"}`}>
                        {d.emoji} {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                {userLoc && (
                  <div>
                    <label className="text-xs font-bold">Rayon : {radiusKm >= 1000 ? "Tout le pays" : `${radiusKm} km`}</label>
                    <input type="range" min={1} max={1000} value={radiusKm} onChange={e => setRadiusKm(parseInt(e.target.value))} className="w-full mt-1.5 accent-primary" />
                    <div className="flex justify-between text-[9px] text-muted-foreground">
                      <span>1 km</span>
                      <span>Tout le pays</span>
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold">Trier par</label>
                  <div className="flex gap-2 flex-wrap mt-1.5">
                    {SORT_OPTIONS.map(s => (
                      <button key={s.value} onClick={() => setSortBy(s.value)} className={`px-3 py-1.5 rounded-xl text-xs font-medium ${sortBy === s.value ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground"}`}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-muted-foreground font-medium">
            {loading ? "Recherche en cours..." : `${listings.length} annonce${listings.length !== 1 ? "s" : ""} trouvée${listings.length !== 1 ? "s" : ""}`}
            {sortBy === "distance" && userLoc && radiusKm < 1000 && ` · ${radiusKm} km`}
          </p>
          <div className="flex gap-1 bg-muted/50 rounded-lg p-0.5">
            <button onClick={() => setViewMode("grid")} className={`p-1.5 rounded-md transition-colors ${viewMode === "grid" ? "bg-background shadow-sm" : ""}`}><Grid3X3 className="h-3.5 w-3.5" /></button>
            <button onClick={() => setViewMode("list")} className={`p-1.5 rounded-md transition-colors ${viewMode === "list" ? "bg-background shadow-sm" : ""}`}><List className="h-3.5 w-3.5" /></button>
          </div>
        </div>

        {loading ? (
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
            <p className="font-bold text-foreground">Aucun résultat</p>
            <p className="text-sm mt-1">Essayez de modifier vos critères de recherche.</p>
            {activeFilterCount > 0 && (
              <button onClick={clearAllFilters} className="mt-3 text-sm text-primary font-semibold">Effacer les filtres</button>
            )}
          </motion.div>
        ) : (
          <>
            <div className={viewMode === "grid" ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3" : "space-y-3"}>
              {listings.map((l, i) => (
                <motion.div
                  key={l.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.3) }}
                >
                  <C2CListingCard listing={l} userId={user?.id} distanceKm={getDistance(l)} />
                </motion.div>
              ))}
            </div>

            {!hasMore && listings.length > 0 && (
              <p className="text-center text-xs text-muted-foreground/60 py-6">Vous avez tout vu !</p>
            )}

            {loadingMore && (
              <div className="flex justify-center py-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  Chargement...
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </SubPageShell>
  );
}
