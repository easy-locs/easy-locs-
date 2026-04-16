import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import { LISTING_TYPES, PROPERTY_TAXONOMY } from "@/domains/real-estate/taxonomy";
import { realEstatePropertyService } from "@/services/real-estate.service";
import type { Property, ListingType, PropertyCategory } from "@/domains/real-estate/canonical-types";
import { ArrowLeft, Search, SlidersHorizontal, MapPin, Heart, Eye, Map, List, TrendingUp, ChevronRight, ChevronDown, Loader2 } from "lucide-react";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";
import { RealEstateMapView } from "@/components/property/RealEstateMapView";
import { bannerCover } from "@/lib/image/category-covers";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { insertSavedListing, deleteSavedListing, fetchSavedListings } from "@/repositories/public.repository";

const navy = "hsl(226 24% 14%)";
const gold = "hsl(var(--accent))";

type SortMode = "relevance" | "price_asc" | "price_desc" | "newest" | "size";

export default function RealEstateMarketplace() {
  useUiEngine("real-estate-realestatemarketplace");
  const { t } = useI18n();
  const { listingType: paramListingType } = useParams<{ listingType?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<ListingType>((paramListingType as ListingType) || "rent");
  const [properties, setProperties] = useState<Property[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<PropertyCategory | "all">("all");
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [sortBy, setSortBy] = useState<SortMode>("relevance");
  const [offset, setOffset] = useState(0);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const PAGE_SIZE = 20;

  useEffect(() => {
    if (!user?.id) return;
    fetchSavedListings(user.id).then(saved => {
      setSavedIds(new Set(saved.map(s => s.listing_id)));
    }).catch(() => {});
  }, [user?.id]);

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => setDebouncedSearch(searchQuery), 350);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [searchQuery]);

  const loadProperties = useCallback(async (newOffset: number, append: boolean = false) => {
    if (!append) setLoading(true);
    else setLoadingMore(true);
    try {
      const result = await realEstatePropertyService.fetchPublished({
        listingType: activeTab,
        propertyType: selectedCategory === "all" ? undefined : selectedCategory,
        search: debouncedSearch || undefined,
        sortBy,
        pageSize: PAGE_SIZE,
        offset: newOffset,
      });
      if (append) {
        setProperties(prev => [...prev, ...result.data]);
      } else {
        setProperties(result.data);
      }
      setTotalCount(result.total);
    } catch {
      if (!append) setProperties([]);
      setTotalCount(0);
    }
    setLoading(false);
    setLoadingMore(false);
  }, [activeTab, selectedCategory, debouncedSearch, sortBy]);

  useEffect(() => {
    setOffset(0);
    loadProperties(0, false);
  }, [loadProperties]);

  const handleLoadMore = useCallback(() => {
    const newOffset = offset + PAGE_SIZE;
    setOffset(newOffset);
    loadProperties(newOffset, true);
  }, [offset, loadProperties]);

  const toggleFavorite = useCallback(async (property: Property) => {
    if (!user?.id) return;
    const isSaved = savedIds.has(property.id);
    try {
      if (isSaved) {
        await deleteSavedListing(user.id, property.id);
        setSavedIds(prev => { const next = new Set(prev); next.delete(property.id); return next; });
      } else {
        await insertSavedListing({
          user_id: user.id,
          listing_type: "property",
          listing_id: property.id,
          listing_title: property.title,
          listing_image: (property.mediaIds || []).find(id => id.startsWith("http") || id.startsWith("/")) || "",
          listing_city: property.address.city,
          listing_country: property.address.country,
          listing_price: property.price,
          listing_currency: property.currency,
        });
        setSavedIds(prev => new Set(prev).add(property.id));
      }
    } catch (err) {
      console.warn("[RealEstateMarketplace] Save toggle failed", err);
    }
  }, [user?.id, savedIds]);

  const hasMore = properties.length < totalCount;

  return (
    <SubPageShell noContentPad>
      <div className="sticky top-0 z-30 px-4 pt-4 pb-3" style={{ background: navy }}>
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-full bg-white/10">
            <ArrowLeft size={20} color="#fff" />
          </button>
          <h1 className="text-lg font-bold text-white flex-1">{t("re.marketplace", "Real Estate")}</h1>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 flex items-center gap-2 rounded-xl px-3 py-2.5 bg-white/[0.12]">
            <Search size={16} color="rgba(255,255,255,0.5)" />
            <input
              type="text"
              placeholder={t("re.search_placeholder", "City, district, project...")}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-transparent text-white text-sm flex-1 outline-none placeholder:text-white/40"
              style={{ fontSize: "1rem" }}
            />
          </div>
          <button
            onClick={() => setViewMode(v => v === "list" ? "map" : "list")}
            className="p-2.5 rounded-xl"
            style={{ background: viewMode === "map" ? gold : "rgba(255,255,255,0.12)" }}
          >
            {viewMode === "list" ? <Map size={18} color="#fff" /> : <List size={18} color={navy} />}
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="p-2.5 rounded-xl"
            style={{ background: showFilters ? gold : "rgba(255,255,255,0.12)" }}
          >
            <SlidersHorizontal size={18} color={showFilters ? navy : "#fff"} />
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
          {LISTING_TYPES.map(lt => (
            <button
              key={lt.key}
              onClick={() => { setActiveTab(lt.key); setOffset(0); }}
              className="px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all"
              style={{
                background: activeTab === lt.key ? gold : "rgba(255,255,255,0.1)",
                color: activeTab === lt.key ? navy : "rgba(255,255,255,0.7)",
              }}
            >
              {lt.icon} {t(lt.labelKey, lt.key.replace(/_/g, " "))}
            </button>
          ))}
        </div>
      </div>

      {showFilters && (
        <div className="px-4 py-3 border-b bg-card">
          <p className="text-xs font-semibold mb-2" style={{ color: navy }}>{t("re.filter.property_type", "Property Type")}</p>
          <div className="flex gap-2 flex-wrap mb-3">
            <button
              onClick={() => { setSelectedCategory("all"); setOffset(0); }}
              className="px-3 py-1 rounded-full text-xs"
              style={{
                background: selectedCategory === "all" ? navy : "#f0f0f0",
                color: selectedCategory === "all" ? "#fff" : "#666",
              }}
            >
              {t("common.all", "All")}
            </button>
            {PROPERTY_TAXONOMY.map(cat => (
              <button
                key={cat.key}
                onClick={() => { setSelectedCategory(cat.key as PropertyCategory); setOffset(0); }}
                className="px-3 py-1 rounded-full text-xs"
                style={{
                  background: selectedCategory === cat.key ? navy : "#f0f0f0",
                  color: selectedCategory === cat.key ? "#fff" : "#666",
                }}
              >
                {cat.icon} {t(cat.labelKey, cat.key)}
              </button>
            ))}
          </div>
          <p className="text-xs font-semibold mb-2" style={{ color: navy }}>Sort by</p>
          <select
            value={sortBy}
            onChange={(e) => { setSortBy(e.target.value as SortMode); setOffset(0); }}
            className="w-full h-9 px-3 text-xs rounded-lg border bg-background text-foreground"
            style={{ borderColor: "#e5e7eb" }}
          >
            <option value="relevance">Relevance</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="size">Largest First</option>
            <option value="newest">Newest</option>
          </select>
        </div>
      )}

      <div className="px-4 pt-3">
        <Link
          to="/real-estate/dubai-analytics"
          className="flex items-center gap-3 p-3 rounded-xl mb-3 transition-all active:scale-[0.98]"
          style={{
            background: "linear-gradient(135deg, hsl(226 24% 14%), hsl(226 24% 20%))",
            border: "1px solid hsla(45,93%,58%,0.2)",
          }}
        >
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "hsla(45,93%,58%,0.15)" }}>
            <TrendingUp size={14} style={{ color: "hsl(45 93% 58%)" }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[0.75rem] font-bold text-white">{t("dld.market_intelligence", "Market Intelligence")}</p>
            <p className="text-[0.625rem] text-white/50">{t("dld.view_analytics", "View Dubai Analytics")}</p>
          </div>
          <ChevronRight size={14} className="text-white/30 shrink-0" />
        </Link>

        <p className="text-xs mb-3" style={{ color: "#888" }}>
          {totalCount} {t("common.results", "results")}
        </p>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-52 rounded-2xl animate-pulse" style={{ background: "#e8e8e8" }} />
            ))}
          </div>
        ) : properties.length === 0 ? (
          <div className="text-center py-16">
            <MapPin size={48} className="mx-auto mb-3" style={{ color: "#ccc" }} />
            <p className="text-sm font-medium" style={{ color: navy }}>{t("re.no_results", "No properties found")}</p>
            <p className="text-xs mt-1" style={{ color: "#999" }}>{t("re.try_different", "Try adjusting your filters")}</p>
          </div>
        ) : viewMode === "map" ? (
          <div className="mb-4">
            <RealEstateMapView
              properties={properties}
              onSelectProperty={(id) => navigate(`/real-estate-listing/${id}`)}
            />
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {properties.map(property => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  isSaved={savedIds.has(property.id)}
                  onToggleFavorite={() => toggleFavorite(property)}
                  showFavorite={!!user}
                  onClick={() => navigate(`/real-estate-listing/${property.slug || property.id}`)}
                />
              ))}
            </div>
            {hasMore && (
              <div className="flex justify-center py-6">
                <Button
                  variant="outline"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="gap-2 rounded-xl px-6"
                >
                  {loadingMore ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                  Load more ({properties.length} of {totalCount})
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </SubPageShell>
  );
}

function PropertyCard({ property, isSaved, onToggleFavorite, showFavorite, onClick }: {
  property: Property;
  isSaved: boolean;
  onToggleFavorite: () => void;
  showFavorite: boolean;
  onClick: () => void;
}) {
  const { t } = useI18n();
  const urlMedia = property.mediaIds.find(id => id.startsWith("http") || id.startsWith("/"));
  const coverUrl = urlMedia || bannerCover(`buy_${property.propertyType}`);

  return (
    <button onClick={onClick} className="w-full text-left rounded-2xl overflow-hidden shadow-sm bg-card">
      <div className="relative h-44 overflow-hidden" style={{ background: "#e8e8e8" }}>
        {coverUrl && <img loading="lazy" src={coverUrl} alt={property.title || "Property listing"} className="w-full h-full object-cover" />}
        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[0.625rem] font-bold" style={{ background: gold, color: navy }}>
          {t(`re.listing.${property.listingType}`, property.listingType)}
        </div>
        {showFavorite && (
          <button
            className="absolute top-3 right-3 p-1.5 rounded-full transition-all"
            style={{ background: isSaved ? "hsl(0 70% 50%)" : "rgba(0,0,0,0.3)" }}
            onClick={e => { e.stopPropagation(); onToggleFavorite(); }}
          >
            <Heart size={16} color="#fff" fill={isSaved ? "#fff" : "none"} />
          </button>
        )}
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
          <span className="px-2 py-0.5 rounded-full text-[0.625rem] font-medium bg-black/50 text-white">
            {t(`re.type.${property.propertyType}`, property.propertyType.replace(/_/g, " "))}
          </span>
        </div>
      </div>

      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="text-sm font-bold line-clamp-1" style={{ color: navy }}>{property.title}</h3>
          <span className="text-sm font-bold whitespace-nowrap" style={{ color: gold }}>
            {property.price.toLocaleString()} {property.currency}
          </span>
        </div>

        <div className="flex items-center gap-1 mb-2">
          <MapPin size={12} style={{ color: "#999" }} />
          <span className="text-xs" style={{ color: "#999" }}>
            {[property.address.district, property.address.city, property.address.country].filter(Boolean).join(", ")}
          </span>
        </div>

        <div className="flex items-center gap-3 text-[0.6875rem]" style={{ color: "#666" }}>
          {property.bedrooms !== undefined && <span>{property.bedrooms} {t("re.beds", "Beds")}</span>}
          {property.bathrooms !== undefined && <span>{property.bathrooms} {t("re.baths", "Baths")}</span>}
          {property.area !== undefined && <span>{property.area} {property.areaUnit}</span>}
          {property.furnishingStatus && (
            <span className="capitalize">{t(`re.furnishing.${property.furnishingStatus}`, property.furnishingStatus.replace(/_/g, " "))}</span>
          )}
        </div>
      </div>
    </button>
  );
}
