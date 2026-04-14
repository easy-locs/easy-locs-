import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, SlidersHorizontal, MapPin, Tag, Heart, ArrowLeft, Clock, Plus } from "lucide-react";
import { db } from "@/services/db";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { insertNotification } from "@/lib/notification-service/notification-service";
import { useAuth } from "@/contexts/AuthContext";

const C2C_CATEGORIES = [
  { id: "all", label: "Toutes", emoji: "🏷️" },
  { id: "c2c_vehicles", label: "Véhicules", emoji: "🚗" },
  { id: "c2c_electronics", label: "Électronique", emoji: "📱" },
  { id: "c2c_fashion", label: "Mode", emoji: "👗" },
  { id: "c2c_home", label: "Maison", emoji: "🛋️" },
  { id: "c2c_sports", label: "Sports", emoji: "⚽" },
  { id: "c2c_misc", label: "Divers", emoji: "🎁" },
];

const PRICE_RANGES = [
  { id: "all", label: "Tous prix" },
  { id: "0-50", label: "< 50 €" },
  { id: "50-200", label: "50–200 €" },
  { id: "200-500", label: "200–500 €" },
  { id: "500+", label: "> 500 €" },
];

const CONDITIONS = [
  { id: "all", label: "Tous états" },
  { id: "new", label: "Neuf" },
  { id: "like_new", label: "Comme neuf" },
  { id: "good", label: "Bon état" },
  { id: "fair", label: "Correct" },
];

interface Listing {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  city: string;
  country: string;
  condition: string;
  photo_urls: string[];
  created_at: string;
  listing_expires_at: string | null;
  provider_id: string;
  user_id: string;
  status: string;
  listing_type: string;
  brand?: string;
  model?: string;
  marketplace_providers?: { is_verified: boolean } | null;
}

function formatPrice(price: number, currency: string): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency, maximumFractionDigits: 0 }).format(price);
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "Il y a quelques minutes";
  if (hours < 24) return `Il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Il y a ${days}j`;
  return new Date(dateStr).toLocaleDateString("fr-FR");
}

function ListingCard({ listing, userId, onSaved }: { listing: Listing; userId?: string; onSaved?: (id: string) => void }) {
  const [saved, setSaved] = useState(false);
  const navigate = useNavigate();

  const cover = listing.photo_urls?.[0];

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userId) return;
    try {
      const { toggleFollowListing } = await import("@/lib/c2c/listing-followers");
      const isNowFollowing = await toggleFollowListing(userId, listing.id);
      setSaved(isNowFollowing);
      onSaved?.(listing.id);
    } catch {
      setSaved(s => !s);
    }
  };

  return (
    <div
      className="bg-card rounded-xl border border-border/50 overflow-hidden cursor-pointer hover:shadow-md transition-shadow group"
      onClick={() => navigate(`/marketplace/c2c/${listing.id}`)}
    >
      <div className="relative aspect-[4/3] bg-muted">
        {cover ? (
          <img src={cover} alt={listing.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
            <Tag className="h-8 w-8" />
          </div>
        )}
        <button
          onClick={handleSave}
          className={`absolute top-2 right-2 p-1.5 rounded-full backdrop-blur-sm transition-colors ${saved ? "bg-red-500 text-white" : "bg-black/30 text-white hover:bg-black/50"}`}
        >
          <Heart className={`h-3.5 w-3.5 ${saved ? "fill-current" : ""}`} />
        </button>
        {listing.listing_expires_at && (
          <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
            <Clock className="h-2.5 w-2.5" />
            Expire dans {Math.max(0, Math.ceil((new Date(listing.listing_expires_at).getTime() - Date.now()) / 86400000))}j
          </div>
        )}
      </div>

      <div className="p-3 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground line-clamp-2 leading-tight">{listing.title}</h3>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-base font-bold text-accent">{formatPrice(listing.price, listing.currency)}</span>
          {listing.condition && listing.condition !== "good" && (
            <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-muted-foreground/30 text-muted-foreground">
              {listing.condition === "new" ? "Neuf" : listing.condition === "like_new" ? "Comme neuf" : listing.condition === "fair" ? "Correct" : listing.condition}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">{listing.city || listing.country}</span>
          <span className="text-border/80 mx-0.5">·</span>
          <span className="whitespace-nowrap">{timeAgo(listing.created_at)}</span>
          <span className="text-border/80 mx-0.5">·</span>
          <span className={`text-[10px] font-bold ${listing.marketplace_providers?.is_verified ? "text-blue-500" : "text-muted-foreground/70"}`}>
            {listing.marketplace_providers?.is_verified ? "Pro" : "Particulier"}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function C2CMarketplace() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedPrice, setSelectedPrice] = useState("all");
  const [selectedCondition, setSelectedCondition] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [savedSearchName, setSavedSearchName] = useState("");
  const [showSaveSearch, setShowSaveSearch] = useState(false);

  const loadListings = useCallback(async () => {
    setLoading(true);
    try {
      let q = db
        .from("marketplace_services")
        .select("id, title, description, price, currency, category, city, country, condition, photo_urls, created_at, listing_expires_at, provider_id, user_id, status, listing_type, brand, model, marketplace_providers(is_verified)")
        .eq("active", true)
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(60);

      if (selectedCategory !== "all") {
        q = q.eq("category", selectedCategory);
      } else {
        q = q.in("category", ["c2c_vehicles", "c2c_electronics", "c2c_fashion", "c2c_home", "c2c_sports", "c2c_misc", "automotive", "electronics", "fashion", "other"]);
      }

      if (selectedCondition !== "all") {
        q = q.eq("condition", selectedCondition);
      }

      const { data } = await q;
      let results = (data || []) as Listing[];

      if (selectedPrice !== "all") {
        const [min, maxStr] = selectedPrice.split("-");
        const minVal = parseInt(min);
        if (maxStr === "+") {
          results = results.filter(l => l.price >= minVal);
        } else {
          const maxVal = parseInt(maxStr);
          results = results.filter(l => l.price >= minVal && l.price <= maxVal);
        }
      }

      if (query.trim()) {
        const q2 = query.toLowerCase();
        results = results.filter(l =>
          l.title.toLowerCase().includes(q2) ||
          l.description?.toLowerCase().includes(q2) ||
          l.city?.toLowerCase().includes(q2) ||
          l.brand?.toLowerCase().includes(q2) ||
          l.model?.toLowerCase().includes(q2)
        );
      }

      setListings(results);
    } catch {
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, selectedPrice, selectedCondition, query]);

  useEffect(() => {
    loadListings();
  }, [loadListings]);

  const handleSaveSearch = async () => {
    if (!user || !savedSearchName.trim()) return;
    const { data: orbitProfile } = await db.from("orbit_profiles_v2").select("orbit_id").eq("id", user.id).maybeSingle();
    await db.from("saved_searches").insert({
      id: `ss_${Date.now()}`,
      user_id: user.id,
      orbit_id: orbitProfile?.orbit_id || "",
      name: savedSearchName.trim(),
      filters: { category: selectedCategory, priceRange: selectedPrice, condition: selectedCondition, query },
    });
    setShowSaveSearch(false);
    setSavedSearchName("");
    void insertNotification({
      user_id: user.id,
      actor: "client",
      domain: "system",
      type: "c2c.search_saved",
      title: "Recherche sauvegardée",
      body: `Vous recevrez des alertes pour "${savedSearchName.trim()}"`,
      priority: "low",
      data: { searchName: savedSearchName.trim() },
    });
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto pb-12">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full bg-muted/50 hover:bg-muted transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground">Annonces Particuliers</h1>
            <p className="text-xs text-muted-foreground">Vente entre particuliers • Contactez via Orbit</p>
          </div>
          <button
            onClick={() => navigate("/dashboard/create-listing")}
            className="flex items-center gap-1.5 bg-accent text-accent-foreground text-xs font-semibold px-3 py-2 rounded-lg hover:opacity-90 transition-opacity shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" /> Vendre
          </button>
        </div>

        {/* Search bar */}
        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Rechercher une annonce..."
              className="pl-9 bg-muted/50 border-border/50"
            />
          </div>
          <button
            onClick={() => setShowFilters(f => !f)}
            className={`p-2.5 rounded-xl border transition-colors ${showFilters ? "bg-accent text-accent-foreground border-accent" : "bg-muted/50 border-border/50 text-muted-foreground"}`}
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </div>

        {/* Category chips */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-3 hide-scrollbar">
          {C2C_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
                selectedCategory === cat.id
                  ? "bg-accent text-accent-foreground shadow-sm"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              <span>{cat.emoji}</span> {cat.label}
            </button>
          ))}
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div className="bg-card rounded-xl border border-border/50 p-4 mb-4 space-y-3">
            <div>
              <p className="text-xs font-semibold mb-2 text-foreground">Prix</p>
              <div className="flex gap-2 flex-wrap">
                {PRICE_RANGES.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPrice(p.id)}
                    className={`px-3 py-1 rounded-full text-xs transition-colors ${selectedPrice === p.id ? "bg-accent text-accent-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted"}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold mb-2 text-foreground">État</p>
              <div className="flex gap-2 flex-wrap">
                {CONDITIONS.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCondition(c.id)}
                    className={`px-3 py-1 rounded-full text-xs transition-colors ${selectedCondition === c.id ? "bg-accent text-accent-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted"}`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
            {user && (
              <div className="pt-2 border-t border-border/30">
                {showSaveSearch ? (
                  <div className="flex gap-2">
                    <Input
                      value={savedSearchName}
                      onChange={e => setSavedSearchName(e.target.value)}
                      placeholder="Nom de l'alerte (ex: iPhone 14)"
                      className="text-xs h-8"
                    />
                    <button onClick={handleSaveSearch} className="px-3 py-1 bg-accent text-accent-foreground text-xs rounded-lg font-medium whitespace-nowrap">
                      Sauvegarder
                    </button>
                    <button onClick={() => setShowSaveSearch(false)} className="px-3 py-1 text-xs text-muted-foreground">
                      Annuler
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowSaveSearch(true)}
                    className="flex items-center gap-1.5 text-xs text-accent hover:underline"
                  >
                    🔔 Sauvegarder cette recherche et recevoir des alertes
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Results count */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-muted-foreground">
            {loading ? "Chargement..." : `${listings.length} annonce${listings.length !== 1 ? "s" : ""} trouvée${listings.length !== 1 ? "s" : ""}`}
          </p>
        </div>

        {/* Listings grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-xl border border-border/50 overflow-hidden animate-pulse">
                <div className="aspect-[4/3] bg-muted" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Tag className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Aucune annonce trouvée</p>
            <p className="text-sm mt-1">Modifiez vos filtres ou soyez le premier à publier !</p>
            <button
              onClick={() => navigate("/dashboard/create-listing")}
              className="mt-4 bg-accent text-accent-foreground text-sm font-semibold px-5 py-2.5 rounded-lg hover:opacity-90 transition-opacity"
            >
              Publier une annonce
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {listings.map(listing => (
              <ListingCard key={listing.id} listing={listing} userId={user?.id} />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
