/**
 * useExploreState — Extracted state + filtering logic from Explore.tsx.
 * Keeps Explore.tsx focused on rendering while this hook owns data, filters, and search.
 */
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useGeoDetect } from "@/hooks/useGeoDetect";
import { CATEGORY_HIERARCHY } from "@/lib/category-hierarchy";
import { haversineKm } from "@/lib/geo-distance";
import { batchGeocideCities, cityKey, type CityCoords } from "@/lib/city-geocoder";
import type { AdvancedFilters } from "@/components/explore/ExploreAdvancedFilters";
import { defaultAdvancedFilters } from "@/components/explore/ExploreAdvancedFilters";

interface RealEstateListing {
  id: string; title: string; listing_type: string; price: number; currency: string;
  property_type: string; country: string; city: string; photo_urls: string[] | null;
  slug: string; surface_sqm: number; rooms: number; bedrooms: number; bathrooms: number;
  views_count: number; created_at: string;
}

interface SeasonalListing {
  id: string; title: string; slug: string; price_per_night: number;
  max_guests: number; min_nights: number; active: boolean; description: string;
  property_id: string; org_id: string;
  city?: string; country?: string; cover_url?: string | null;
}

interface ServiceListing {
  id: string; title: string; description: string; category: string; city: string;
  country: string; price: number; currency: string; photo_urls: any;
  booking_slug: string; active: boolean; badges?: string[];
  listing_type?: string; surface_sqm?: number; rooms?: number;
  bedrooms?: number; bathrooms?: number; contact_whatsapp?: string;
  source_contact_email?: string; brand?: string; model?: string;
  condition?: string; features?: any; deposit_amount?: number;
  quantity?: number; contact_email?: string;
}

const ITEMS_PER_PAGE = 24;

export function useExploreState() {
  const [searchParams, setSearchParams] = useSearchParams();
  const geo = useGeoDetect();

  // UI state
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [locationQuery, setLocationQuery] = useState(searchParams.get("location") || "");
  const [activeGroup, setActiveGroup] = useState<string>(searchParams.get("group") || "all");
  const [activeSubcategory, setActiveSubcategory] = useState<string>(searchParams.get("sub") || "all");
  const [radiusKm, setRadiusKm] = useState(() => parseInt(searchParams.get("radius") || "0", 10) || 0);
  const [searchCenter, setSearchCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [cityCoordsMap, setCityCoordsMap] = useState<Map<string, CityCoords>>(new Map());
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [geoApplied, setGeoApplied] = useState(false);
  const geocodingRef = useRef(false);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>(defaultAdvancedFilters);

  // Data
  const [realEstate, setRealEstate] = useState<RealEstateListing[]>([]);
  const [seasonal, setSeasonal] = useState<SeasonalListing[]>([]);
  const [services, setServices] = useState<ServiceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Geo-detection passive
  useEffect(() => {
    if (geoApplied) return;
    if (searchParams.get("location") || searchParams.get("q")) return;
    if (!geo.detection || geo.loading) return;
    setGeoApplied(true);
  }, [geo.detection, geo.loading, geoApplied, searchParams]);

  // Data fetch
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setLoadError(null);
      const [reRes, seaRes, svcRes] = await Promise.allSettled([
        supabase.rpc("get_public_real_estate_listings", { p_limit: 200 }),
        supabase.from("public_listings").select("*").eq("active", true).order("created_at", { ascending: false }).limit(200),
        supabase.rpc("get_public_marketplace_services", {}),
      ]);
      const reData = reRes.status === "fulfilled" ? (reRes.value.data || []) as RealEstateListing[] : [];
      const seaData = seaRes.status === "fulfilled" ? (seaRes.value.data || []) as any[] : [];
      const svcData = svcRes.status === "fulfilled" ? (svcRes.value.data || []) as ServiceListing[] : [];
      const hadFailure = [reRes, seaRes, svcRes].some(r => r.status === "rejected" || (r.status === "fulfilled" && r.value.error));

      let seasonalListings: SeasonalListing[] = seaData as SeasonalListing[];
      const propertyIds = [...new Set(seaData.map(l => l.property_id).filter(Boolean))];
      if (propertyIds.length > 0) {
        const propsRes = await supabase.rpc("get_public_listing_properties", { p_property_ids: propertyIds });
        const propMap: Record<string, any> = {};
        if (propsRes.data) for (const p of propsRes.data as any[]) propMap[p.id] = p;
        seasonalListings = seaData.map(l => {
          const prop = propMap[l.property_id];
          const photos = Array.isArray(prop?.photo_urls) ? prop.photo_urls : [];
          return { ...l, city: prop?.city || "", country: prop?.country || "", cover_url: photos[0] || null };
        });
      }
      if (cancelled) return;
      setRealEstate(reData);
      setServices(svcData);
      setSeasonal(seasonalListings);
      setLoadError(hadFailure ? "Some listings could not be loaded right now." : null);
      setLoading(false);
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  // Geocode
  useEffect(() => {
    if (loading || geocodingRef.current) return;
    geocodingRef.current = true;
    const uniqueCities: Array<{ city: string; country?: string }> = [];
    const seen = new Set<string>();
    for (const list of [realEstate, seasonal, services]) {
      for (const item of list) {
        const c = (item as any).city;
        const co = (item as any).country;
        if (!c) continue;
        const k = cityKey(c, co);
        if (seen.has(k)) continue;
        seen.add(k);
        uniqueCities.push({ city: c, country: co });
      }
    }
    if (uniqueCities.length > 0) {
      batchGeocideCities(uniqueCities, 15).then(map => setCityCoordsMap(map));
    }
  }, [loading, realEstate, seasonal, services]);

  // Filters
  const matchText = useCallback((item: any) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (item.title || "").toLowerCase().includes(q) || (item.description || "").toLowerCase().includes(q) || (item.category || "").toLowerCase().includes(q);
  }, [searchQuery]);

  const matchLocation = useCallback((item: any) => {
    if (radiusKm === 0 && !locationQuery) return true;
    const itemCity = (item.city || "").toLowerCase();
    const itemCountry = (item.country || "").toLowerCase();
    if (searchCenter && radiusKm > 0) {
      const key = cityKey(item.city || "", item.country || "");
      const coords = cityCoordsMap.get(key);
      if (coords) {
        const dist = haversineKm(searchCenter.lat, searchCenter.lng, coords.lat, coords.lng);
        return dist <= radiusKm;
      }
      if (locationQuery) {
        const q = locationQuery.toLowerCase();
        return itemCity.includes(q) || itemCountry.includes(q);
      }
      return true;
    }
    if (locationQuery) {
      const q = locationQuery.toLowerCase();
      return itemCity.includes(q) || itemCountry.includes(q);
    }
    return true;
  }, [locationQuery, radiusKm, searchCenter, cityCoordsMap]);

  const matchCategory = useCallback((item: any) => {
    if (activeGroup === "all" && activeSubcategory === "all") return true;
    const type = item._type as string;
    if (activeSubcategory !== "all") {
      if (activeSubcategory === "seasonal") return type === "seasonal";
      if (activeSubcategory === "property_sale") return type === "real-estate" && item.listing_type === "sale";
      if (activeSubcategory === "long_term_rental") return type === "real-estate" && item.listing_type !== "sale";
      if (activeSubcategory === "new_development") return type === "real-estate";
      if (activeSubcategory === "roommate" || activeSubcategory === "office_commercial") return type === "real-estate";
      return type === "service" && item.category === activeSubcategory;
    }
    const group = CATEGORY_HIERARCHY.find(g => g.value === activeGroup);
    if (!group) return true;
    const subValues = group.subcategories.map(s => s.value);
    if (subValues.includes("seasonal") && type === "seasonal") return true;
    if ((subValues.includes("property_sale") || subValues.includes("long_term_rental")) && type === "real-estate") return true;
    if (type === "service" && subValues.includes(item.category)) return true;
    return false;
  }, [activeGroup, activeSubcategory]);

  const matchAdvanced = useCallback((item: any) => {
    const price = item.price || item.price_per_night || 0;
    if (advancedFilters.priceMin > 0 && price < advancedFilters.priceMin) return false;
    if (advancedFilters.priceMax < 50000 && price > advancedFilters.priceMax) return false;
    return true;
  }, [advancedFilters]);

  // Aggregations
  const allCountries = useMemo(() => {
    const set = new Set<string>();
    realEstate.forEach(l => l.country && set.add(l.country));
    seasonal.forEach(l => l.country && set.add(l.country));
    services.forEach(l => l.country && set.add(l.country));
    return Array.from(set).sort();
  }, [realEstate, seasonal, services]);

  const allCities = useMemo(() => {
    const set = new Set<string>();
    realEstate.forEach(l => l.city && set.add(l.city));
    seasonal.forEach(l => l.city && set.add(l.city));
    services.forEach(l => l.city && set.add(l.city));
    return Array.from(set).sort();
  }, [realEstate, seasonal, services]);

  const locationSuggestions = useMemo(() => {
    const q = locationQuery.toLowerCase().trim();
    const suggestions: { label: string; type: "geo" | "city" | "country" }[] = [];
    if (geo.detection?.city && (!q || "near me".includes(q) || geo.detection.city.toLowerCase().includes(q))) {
      suggestions.push({ label: `📍 Near me — ${geo.detection.city}, ${geo.country.toUpperCase()}`, type: "geo" });
    }
    allCities.filter(c => !q || c.toLowerCase().includes(q)).slice(0, 6).forEach(c => suggestions.push({ label: c, type: "city" }));
    allCountries.filter(c => !q || c.toLowerCase().includes(q)).slice(0, 4).forEach(c => suggestions.push({ label: c.toUpperCase(), type: "country" }));
    return suggestions.slice(0, 8);
  }, [locationQuery, allCities, allCountries, geo.detection, geo.country]);

  const unfilteredItems = useMemo(() => {
    const items: Array<any & { _type: string }> = [];
    seasonal.filter(l => matchText(l) && matchLocation(l)).forEach(l => items.push({ ...l, _type: "seasonal" }));
    realEstate.filter(l => matchText(l) && matchLocation(l)).forEach(l => items.push({ ...l, _type: "real-estate" }));
    services.filter(l => matchText(l) && matchLocation(l)).forEach(l => items.push({ ...l, _type: "service" }));
    return items;
  }, [seasonal, realEstate, services, matchText, matchLocation]);

  const allItems = useMemo(() => unfilteredItems.filter(matchCategory).filter(matchAdvanced), [unfilteredItems, matchCategory, matchAdvanced]);

  const groupCounts = useMemo(() => {
    const counts: Record<string, number> = { all: unfilteredItems.length };
    for (const group of CATEGORY_HIERARCHY) {
      const subValues = group.subcategories.map(s => s.value);
      counts[group.value] = unfilteredItems.filter(item => {
        const type = item._type as string;
        if (subValues.includes("seasonal") && type === "seasonal") return true;
        if ((subValues.includes("property_sale") || subValues.includes("long_term_rental")) && type === "real-estate") return true;
        if (type === "service" && subValues.includes(item.category)) return true;
        return false;
      }).length;
    }
    return counts;
  }, [unfilteredItems]);

  useEffect(() => { setVisibleCount(ITEMS_PER_PAGE); }, [activeGroup, activeSubcategory, searchQuery, locationQuery, radiusKm]);

  // Actions
  const handleSelectLocation = (suggestion: { label: string; type: string }) => {
    if (suggestion.type === "geo" && geo.detection?.city) {
      setLocationQuery(geo.detection.city);
      setRadiusKm(25);
      if (geo.detection.lat && geo.detection.lng) {
        setSearchCenter({ lat: geo.detection.lat, lng: geo.detection.lng });
      }
    } else {
      setLocationQuery(suggestion.label);
      if (suggestion.type === "city") {
        setRadiusKm(25);
        import("@/lib/city-geocoder").then(({ getCityCoords }) => {
          getCityCoords(suggestion.label).then(coords => {
            if (coords) setSearchCenter(coords);
          });
        });
      }
    }
    setGeoApplied(true);
  };

  const handleNearMe = () => {
    if (geo.detection?.city) {
      setLocationQuery(geo.detection.city);
      setRadiusKm(25);
      if (geo.detection.lat && geo.detection.lng) {
        setSearchCenter({ lat: geo.detection.lat, lng: geo.detection.lng });
      }
    } else if (geo.country) {
      setLocationQuery(geo.country);
      setRadiusKm(100);
    }
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.set("q", searchQuery);
    if (locationQuery) params.set("location", locationQuery);
    if (activeGroup !== "all") params.set("group", activeGroup);
    if (activeSubcategory !== "all") params.set("sub", activeSubcategory);
    if (radiusKm > 0) params.set("radius", String(radiusKm));
    setSearchParams(params);
  };

  const clearAll = () => {
    setSearchQuery(""); setLocationQuery(""); setActiveGroup("all"); setActiveSubcategory("all");
    setRadiusKm(0); setSearchCenter(null); setVisibleCount(ITEMS_PER_PAGE); setSearchParams({});
    setGeoApplied(false);
  };

  const loadMore = () => setVisibleCount(c => c + ITEMS_PER_PAGE);
  const hasFilters = !!(searchQuery || locationQuery || activeGroup !== "all" || activeSubcategory !== "all" || radiusKm > 0);
  const radiusLabel = radiusKm === 0 ? "Worldwide" : `${radiusKm} km`;

  return {
    // Data
    loading, loadError, allItems, unfilteredItems, groupCounts,
    visibleCount, loadMore,
    // Search
    searchQuery, setSearchQuery,
    locationQuery, setLocationQuery,
    activeGroup, setActiveGroup,
    activeSubcategory, setActiveSubcategory,
    radiusKm, setRadiusKm,
    advancedFilters, setAdvancedFilters,
    // Geo
    geo, geoApplied, searchCenter,
    locationSuggestions,
    // UI
    showMobileSearch, setShowMobileSearch,
    hasFilters, radiusLabel,
    // Actions
    handleSelectLocation, handleNearMe, handleSearch, clearAll,
    // Params
    searchParams,
    ITEMS_PER_PAGE,
  };
}
