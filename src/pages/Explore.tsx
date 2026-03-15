import { useMemo } from "react";
import { ErrorState } from "@/components/ui/error-state";
import { useExploreRealtimeSync } from "@/hooks/useListingSync";
import { Link } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, LocateFixed } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/lib/i18n";
import { useExploreState } from "@/hooks/useExploreState";

// Extracted components
import { ExploreDesktopSearchBar, ExploreMobileSearch } from "@/components/explore/ExploreSearchBar";
import { ExploreCategoryBar } from "@/components/explore/ExploreCategoryBar";
import { ExploreListingCard } from "@/components/explore/ExploreListingCard";
import { ExploreFiltersStrip } from "@/components/explore/ExploreFiltersStrip";
import { ExploreSEOFooter } from "@/components/explore/ExploreSEOFooter";
import { ExploreEmptyState } from "@/components/explore/ExploreEmptyState";
import SmartSuggestions from "@/components/explore/SmartSuggestions";
import ExploreHeader from "@/components/explore/ExploreHeader";
import ExploreBreadcrumbs from "@/components/explore/ExploreBreadcrumbs";
import ExploreAdvancedFilters, { defaultAdvancedFilters } from "@/components/explore/ExploreAdvancedFilters";

export default function Explore() {
  const { t } = useI18n();
  useExploreRealtimeSync();

  const state = useExploreState();
  const {
    loading, loadError, allItems, unfilteredItems, groupCounts,
    visibleCount, loadMore,
    searchQuery, setSearchQuery,
    locationQuery, setLocationQuery,
    activeGroup, setActiveGroup,
    activeSubcategory, setActiveSubcategory,
    radiusKm, setRadiusKm,
    advancedFilters, setAdvancedFilters,
    geo, geoApplied,
    locationSuggestions,
    showMobileSearch, setShowMobileSearch,
    hasFilters, radiusLabel,
    handleSelectLocation, handleNearMe, handleSearch, clearAll,
    searchParams,
  } = state;

  const exploreJsonLd = useMemo(() => ({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Explore Properties, Rentals & Services — Easy-Locs",
    description: "Discover properties for sale, vacation rentals, and local services worldwide on Easy-Locs.",
    url: "https://www.easy-locs.com/explore",
    provider: { "@type": "Organization", name: "Easy-Locs", url: "https://www.easy-locs.com" },
    numberOfItems: allItems.length,
  }), [allItems.length]);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Explore — Real Estate, Rentals & Services Worldwide | Easy-Locs"
        description="Discover properties for sale, vacation rentals, and local services worldwide. Browse verified listings from trusted hosts and providers on Easy-Locs."
        canonical="https://www.easy-locs.com/explore"
        jsonLd={exploreJsonLd}
      />

      <ExploreHeader
        searchQuery={searchQuery}
        locationQuery={locationQuery}
        geoCity={geo.detection?.city}
        geoCountry={geo.country}
        onOpenSearch={() => setShowMobileSearch(v => !v)}
        categoryBar={
          <ExploreCategoryBar
            activeGroup={activeGroup}
            activeSubcategory={activeSubcategory}
            onGroupChange={setActiveGroup}
            onSubcategoryChange={setActiveSubcategory}
            groupCounts={groupCounts}
          />
        }
      >
        <ExploreDesktopSearchBar
          searchQuery={searchQuery}
          locationQuery={locationQuery}
          radiusKm={radiusKm}
          activeGroup={activeGroup}
          geoCity={geo.detection?.city}
          geoCountry={geo.country}
          geoLat={geo.detection?.lat}
          geoLng={geo.detection?.lng}
          locationSuggestions={locationSuggestions}
          resultCount={allItems.length}
          onSearchQueryChange={setSearchQuery}
          onLocationQueryChange={setLocationQuery}
          onRadiusKmChange={setRadiusKm}
          onGroupChange={(g) => { setActiveGroup(g); setActiveSubcategory("all"); }}
          onSelectLocation={handleSelectLocation}
          onNearMe={handleNearMe}
          onSearch={handleSearch}
          onReset={clearAll}
        />
      </ExploreHeader>

      {/* Mobile search panel */}
      <AnimatePresence>
        {showMobileSearch && (
          <ExploreMobileSearch
            searchQuery={searchQuery}
            locationQuery={locationQuery}
            radiusKm={radiusKm}
            activeGroup={activeGroup}
            geoCity={geo.detection?.city}
            geoCountry={geo.country}
            geoLat={geo.detection?.lat}
            geoLng={geo.detection?.lng}
            hasFilters={hasFilters}
            resultCount={allItems.length}
            onSearchQueryChange={setSearchQuery}
            onLocationQueryChange={setLocationQuery}
            onRadiusKmChange={setRadiusKm}
            onGroupChange={(g) => { setActiveGroup(g); setActiveSubcategory("all"); }}
            onNearMe={handleNearMe}
            onSearch={handleSearch}
            onClearAll={clearAll}
            onClose={() => setShowMobileSearch(false)}
          />
        )}
      </AnimatePresence>

      {/* ═══════ RESULTS ═══════ */}
      <main className="max-w-[1400px] mx-auto px-3 sm:px-4 py-6">
        <ExploreBreadcrumbs
          activeGroup={activeGroup}
          activeSubcategory={activeSubcategory}
          locationQuery={locationQuery}
          onGroupChange={setActiveGroup}
          onSubcategoryChange={setActiveSubcategory}
          onClearLocation={() => setLocationQuery("")}
        />

        <ExploreAdvancedFilters
          filters={advancedFilters}
          onChange={setAdvancedFilters}
          onReset={() => setAdvancedFilters(defaultAdvancedFilters)}
          activeGroup={activeGroup}
        />

        {hasFilters && (
          <ExploreFiltersStrip
            searchQuery={searchQuery}
            locationQuery={locationQuery}
            radius={radiusKm === 0 ? "worldwide" : String(radiusKm) as any}
            radiusLabel={radiusLabel}
            activeSubcategory={activeSubcategory}
            onClearSearch={() => setSearchQuery("")}
            onClearLocation={() => setLocationQuery("")}
            onClearRadius={() => setRadiusKm(0)}
            onClearSubcategory={() => setActiveSubcategory("all")}
            onClearAll={clearAll}
          />
        )}

        {/* GPS Near Me */}
        {!loading && !locationQuery && geo.detection?.city && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 px-4 py-3 mb-6 rounded-xl bg-accent/5 border border-accent/15">
            <LocateFixed className="h-4 w-4 text-accent shrink-0" />
            <span className="text-sm text-muted-foreground flex-1">
              📍 {t("explore.detected_location") || "Detected location"}: <strong className="text-foreground">{geo.detection.city}, {geo.country.toUpperCase()}</strong>
            </span>
            <button onClick={handleNearMe} className="text-xs font-semibold text-accent-foreground bg-accent px-3 py-1.5 rounded-full hover:opacity-90 transition-opacity whitespace-nowrap min-h-[44px]">
              {t("explore.near_me") || "Near me"}
            </button>
          </motion.div>
        )}

        {/* Geo banner */}
        {!loading && geo.detection?.city && locationQuery && geoApplied && !searchParams.get("location") && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 px-4 py-3 mb-6 rounded-xl bg-accent/5 border border-accent/15">
            <LocateFixed className="h-4 w-4 text-accent shrink-0" />
            <span className="text-sm text-muted-foreground">
              📍 Auto-located to <strong className="text-foreground">{geo.detection.country?.toUpperCase()}</strong>.
              {geo.detection.city && (
                <> <button onClick={handleNearMe} className="text-accent font-semibold hover:underline ml-1">Show near {geo.detection.city}</button></>
              )}
              {" · "}
              <button onClick={clearAll} className="text-muted-foreground hover:text-foreground underline">Show worldwide</button>
            </span>
          </motion.div>
        )}

        {loadError && (
          <ErrorState message={loadError} onRetry={() => window.location.reload()} className="mb-6" />
        )}

        {/* Results header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-lg font-bold text-foreground">
            {loading ? "..." : locationQuery
              ? `${locationQuery} — ${allItems.length} ${allItems.length === 1 ? (t("explore.result") || "result") : (t("explore.results") || "results")}`
              : `${allItems.length} ${t("explore.listings") || "listings"}`}
            {radiusKm > 0 && <span className="text-muted-foreground font-normal"> · {radiusKm} km</span>}
          </h1>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="responsive-card-grid">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="rounded-2xl overflow-hidden border border-border bg-card">
                <Skeleton className="aspect-[4/3] w-full" />
                <div className="p-4 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-5 w-1/3 mt-2" />
                </div>
              </div>
            ))}
          </div>
        ) : allItems.length === 0 ? (
          <ExploreEmptyState onClear={clearAll} hasFilters={hasFilters} />
        ) : (
          <>
            <div className="responsive-card-grid">
              {allItems.slice(0, visibleCount).map((item, i) => (
                <motion.div key={`${item._type}-${item.id}`} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.3) }}>
                  <ExploreListingCard item={item} />
                </motion.div>
              ))}
            </div>
            {visibleCount < allItems.length && (
              <div className="flex justify-center pt-10">
                <Button variant="outline" size="lg" onClick={loadMore} className="rounded-full gap-2 px-8 min-h-[48px] shadow-sm hover:shadow-md transition-shadow">
                  {t("explore.show_more") || "Show more"} ({allItems.length - visibleCount})
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}

        {/* Smart Suggestions */}
        {!loading && allItems.length > 0 && (() => {
          const currentCategories = new Set(allItems.slice(0, 6).map((i: any) => i.category || i._type));
          const suggestions = unfilteredItems
            .filter((item: any) => !currentCategories.has(item.category || item._type))
            .slice(0, 8)
            .map((item: any) => ({
              id: item.id,
              title: item.title,
              city: item.city,
              country: item.country,
              photo_url: item._type === "seasonal" ? item.cover_url : item.photo_urls?.[0],
              price: item.price || item.price_per_night,
              currency: item.currency || "EUR",
              href: item._type === "seasonal"
                ? `/listing/${item.slug}`
                : item._type === "real-estate"
                ? `/properties/${item.slug}`
                : `/book/${item.booking_slug}`,
            }));
          return <SmartSuggestions items={suggestions} title={t("explore.you_may_like") || "You may also be interested in"} />;
        })()}
      </main>

      <ExploreSEOFooter />

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground mt-auto">
        <div className="max-w-[1400px] mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span>© {new Date().getFullYear()} <span className="font-semibold">EASY-LOCS®</span> — All rights reserved</span>
          <div className="flex items-center gap-1 sm:gap-4 flex-wrap justify-center sm:justify-end">
            <Link to="/about" className="hover:text-foreground transition-colors px-2 py-2 min-h-[44px] inline-flex items-center">About</Link>
            <Link to="/contact" className="hover:text-foreground transition-colors px-2 py-2 min-h-[44px] inline-flex items-center">Contact</Link>
            <Link to="/terms" className="hover:text-foreground transition-colors px-2 py-2 min-h-[44px] inline-flex items-center">Terms</Link>
            <Link to="/privacy" className="hover:text-foreground transition-colors px-2 py-2 min-h-[44px] inline-flex items-center">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
