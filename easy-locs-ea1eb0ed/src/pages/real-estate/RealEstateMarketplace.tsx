import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import { LISTING_TYPES, PROPERTY_TAXONOMY } from "@/domains/real-estate/taxonomy";
import { realEstatePropertyService } from "@/services/real-estate.service";
import type { Property, ListingType, PropertyCategory } from "@/domains/real-estate/canonical-types";
import { ArrowLeft, Search, SlidersHorizontal, MapPin, Heart, Eye, Map, List } from "lucide-react";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";
import { RealEstateMapView } from "@/components/property/RealEstateMapView";
import { bannerCover } from "@/lib/image/category-covers";

const navy = "hsl(226 24% 14%)";
const gold = "hsl(var(--accent))";

export default function RealEstateMarketplace() {
  useUiEngine("real-estate-realestatemarketplace");
  const { t } = useI18n();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ListingType>("rent");
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<PropertyCategory | "all">("all");
  const [viewMode, setViewMode] = useState<"list" | "map">("list");

  useEffect(() => {
    setLoading(true);
    realEstatePropertyService.fetchPublished({
      listingType: activeTab,
      propertyType: selectedCategory === "all" ? undefined : selectedCategory,
    })
      .then(setProperties)
      .catch(() => setProperties([]))
      .finally(() => setLoading(false));
  }, [activeTab, selectedCategory]);

  const filtered = properties.filter(p =>
    !searchQuery || p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.address.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
              style={{ fontSize: "16px" }}
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
              onClick={() => setActiveTab(lt.key)}
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
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedCategory("all")}
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
                onClick={() => setSelectedCategory(cat.key as PropertyCategory)}
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
        </div>
      )}

      <div className="px-4 py-3">
        <p className="text-xs mb-3" style={{ color: "#888" }}>
          {filtered.length} {t("common.results", "results")}
        </p>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-52 rounded-2xl animate-pulse" style={{ background: "#e8e8e8" }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <MapPin size={48} className="mx-auto mb-3" style={{ color: "#ccc" }} />
            <p className="text-sm font-medium" style={{ color: navy }}>{t("re.no_results", "No properties found")}</p>
            <p className="text-xs mt-1" style={{ color: "#999" }}>{t("re.try_different", "Try adjusting your filters")}</p>
          </div>
        ) : viewMode === "map" ? (
          <div className="mb-4">
            <RealEstateMapView
              properties={filtered}
              onSelectProperty={(id) => navigate(`/real-estate/${activeTab}/${id}`)}
            />
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(property => (
              <PropertyCard key={property.id} property={property} onClick={() => navigate(`/real-estate/${activeTab}/${property.id}`)} />
            ))}
          </div>
        )}
      </div>
    </SubPageShell>
  );
}

function PropertyCard({ property, onClick }: { property: Property; onClick: () => void }) {
  const { t } = useI18n();
  const urlMedia = property.mediaIds.find(id => id.startsWith("http") || id.startsWith("/"));
  const coverUrl = urlMedia || bannerCover(`buy_${property.propertyType}`);

  return (
    <button onClick={onClick} className="w-full text-left rounded-2xl overflow-hidden shadow-sm bg-card">
      <div className="relative h-44 overflow-hidden" style={{ background: "#e8e8e8" }}>
        {coverUrl && <img loading="lazy" src={coverUrl} alt="" className="w-full h-full object-cover" />}
        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold" style={{ background: gold, color: navy }}>
          {t(`re.listing.${property.listingType}`, property.listingType)}
        </div>
        <button
          className="absolute top-3 right-3 p-1.5 rounded-full bg-black/30"
          onClick={e => { e.stopPropagation(); }}
        >
          <Heart size={16} color="#fff" />
        </button>
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-black/50 text-white">
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

        <div className="flex items-center gap-3 text-[11px]" style={{ color: "#666" }}>
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
