import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SEOHead from "@/components/SEOHead";
import AppLogo from "@/components/AppLogo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  MapPin, Ruler, BedDouble, Bath, Home, Search, SlidersHorizontal,
  Building2, X, Car, TreePine, Sun, Armchair, Tag,
} from "lucide-react";

interface PublicListing {
  id: string; title: string; description: string; listing_type: string;
  price: number; currency: string; property_type: string; country: string;
  city: string; address: string; surface_sqm: number; rooms: number;
  bedrooms: number; bathrooms: number; photo_urls: string[] | null; slug: string;
  features: any; parking: boolean; garden: boolean; terrace: boolean;
  elevator: boolean; furnished: boolean; energy_class: string;
  views_count: number; created_at: string;
}

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  sale:            { label: "For Sale",        color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/25", icon: "🏷️" },
  long_term_rent:  { label: "For Rent",        color: "text-sky-700 dark:text-sky-400",        bg: "bg-sky-500/15 border-sky-500/25", icon: "🏠" },
  seasonal_rent:   { label: "Seasonal",         color: "text-amber-700 dark:text-amber-400",    bg: "bg-amber-500/15 border-amber-500/25", icon: "🏖️" },
};

const PROPERTY_TYPES = [
  { value: "apartment", label: "Apartment" },
  { value: "house", label: "House" },
  { value: "studio", label: "Studio" },
  { value: "villa", label: "Villa" },
  { value: "office", label: "Office" },
  { value: "land", label: "Land" },
  { value: "commercial", label: "Commercial" },
];

export default function PropertiesShowcase() {
  const [listings, setListings] = useState<PublicListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [propertyTypeFilter, setPropertyTypeFilter] = useState<string>("all");
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState<string>("");
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const params: Record<string, any> = { p_limit: 100 };
      if (typeFilter !== "all") params.p_listing_type = typeFilter;
      if (propertyTypeFilter !== "all") params.p_property_type = propertyTypeFilter;
      if (countryFilter !== "all") params.p_country = countryFilter;
      if (cityFilter.trim()) params.p_city = cityFilter.trim();
      if (minPrice) params.p_min_price = Number(minPrice);
      if (maxPrice) params.p_max_price = Number(maxPrice);

      const { data } = await supabase.rpc("get_public_real_estate_listings", params);
      setListings((data || []) as PublicListing[]);
      setLoading(false);
    };
    load();
  }, [typeFilter, propertyTypeFilter, countryFilter, cityFilter, minPrice, maxPrice]);

  const countries = useMemo(() => {
    const set = new Set(listings.map(l => l.country).filter(Boolean));
    return Array.from(set).sort();
  }, [listings]);

  const activeFilters = [typeFilter !== "all", propertyTypeFilter !== "all", countryFilter !== "all", !!cityFilter, !!minPrice, !!maxPrice].filter(Boolean).length;

  const clearFilters = () => {
    setTypeFilter("all"); setPropertyTypeFilter("all"); setCountryFilter("all");
    setCityFilter(""); setMinPrice(""); setMaxPrice("");
  };

  // Count by type
  const counts = useMemo(() => ({
    all: listings.length,
    sale: listings.filter(l => l.listing_type === "sale").length,
    long_term_rent: listings.filter(l => l.listing_type === "long_term_rent").length,
    seasonal_rent: listings.filter(l => l.listing_type === "seasonal_rent").length,
  }), [listings]);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Properties — Real Estate Listings | Easy-Locs"
        description="Browse properties for sale, long-term rent, and seasonal rental. Professional real estate listings with photos, details, and direct contact."
      />

      {/* Header */}
      <header className="border-b border-border bg-card/90 backdrop-blur-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-2.5">
          <AppLogo variant="header" linkTo="/" />
          <div className="flex gap-3 items-center">
            <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 hidden sm:block">Login</Link>
            <Link to="/signup" className="bg-primary text-primary-foreground text-sm font-semibold px-4 py-1.5 rounded-lg hover:opacity-90 transition-opacity">Sign up</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-muted/30 to-background py-14 px-4">
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4 leading-tight">
            Find Your Perfect Property
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-6">
            Professional listings for sale, long-term rent, and seasonal rental worldwide.
          </p>

          {/* Type cards */}
          <div className="flex flex-wrap justify-center gap-3 max-w-xl mx-auto">
            {[
              { key: "all", label: "All Properties", icon: "🏢" },
              ...Object.entries(TYPE_CONFIG).map(([k, v]) => ({ key: k, label: v.label, icon: v.icon })),
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setTypeFilter(t.key)}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                  typeFilter === t.key
                    ? "bg-primary text-primary-foreground border-primary shadow-md"
                    : "bg-card text-foreground border-border hover:border-primary/50 hover:shadow-sm"
                }`}
              >
                <span className="mr-1.5">{t.icon}</span> {t.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Filters bar */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <Button variant="outline" size="sm" onClick={() => setFiltersOpen(!filtersOpen)} className="gap-1.5">
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {activeFilters > 0 && (
              <Badge className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-[10px] bg-primary text-primary-foreground rounded-full">
                {activeFilters}
              </Badge>
            )}
          </Button>

          {activeFilters > 0 && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground gap-1">
              <X className="h-3 w-3" /> Clear all
            </Button>
          )}

          <span className="ml-auto text-sm text-muted-foreground font-medium">{listings.length} {listings.length === 1 ? "property" : "properties"}</span>
        </div>

        {/* Expanded filters */}
        {filtersOpen && (
          <Card className="mb-6 border-primary/10">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block uppercase tracking-wider font-medium">Property type</label>
                  <Select value={propertyTypeFilter} onValueChange={setPropertyTypeFilter}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All types</SelectItem>
                      {PROPERTY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block uppercase tracking-wider font-medium">Country</label>
                  <Select value={countryFilter} onValueChange={setCountryFilter}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All countries</SelectItem>
                      {countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block uppercase tracking-wider font-medium">City</label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input className="h-9 pl-8" placeholder="Any city" value={cityFilter} onChange={e => setCityFilter(e.target.value)} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-[10px] text-muted-foreground mb-1 block uppercase tracking-wider font-medium">Min price</label>
                    <Input className="h-9" type="number" placeholder="0" value={minPrice} onChange={e => setMinPrice(e.target.value)} />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] text-muted-foreground mb-1 block uppercase tracking-wider font-medium">Max price</label>
                    <Input className="h-9" type="number" placeholder="∞" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Listing grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Card key={i} className="overflow-hidden animate-pulse">
                <div className="h-52 bg-muted" />
                <CardContent className="p-4 space-y-3">
                  <div className="h-5 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                  <div className="h-6 bg-muted rounded w-1/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-24">
            <Building2 className="h-16 w-16 text-muted-foreground/15 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">No properties found</h2>
            <p className="text-muted-foreground mb-4">Try adjusting your filters or check back later.</p>
            {activeFilters > 0 && (
              <Button variant="outline" onClick={clearFilters}>Clear all filters</Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {listings.map(listing => {
              const photos = listing.photo_urls || [];
              const tc = TYPE_CONFIG[listing.listing_type] || TYPE_CONFIG.sale;
              return (
                <Link to={`/properties/${listing.slug}`} key={listing.id} className="group">
                  <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 group-hover:-translate-y-1 h-full border-border/50 hover:border-primary/20">
                    {/* Photo */}
                    <div className="h-52 bg-muted relative overflow-hidden">
                      {photos[0] ? (
                        <img src={photos[0] as string} alt={listing.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted/50">
                          <Home className="h-14 w-14 text-muted-foreground/15" />
                        </div>
                      )}
                      {/* Type badge */}
                      <Badge className={`absolute top-3 left-3 ${tc.bg} ${tc.color} border text-xs backdrop-blur-sm`}>
                        {tc.icon} {tc.label}
                      </Badge>
                      {photos.length > 1 && (
                        <span className="absolute bottom-3 right-3 bg-foreground/60 backdrop-blur-sm text-background text-[10px] px-2 py-0.5 rounded-full font-medium">
                          {photos.length} photos
                        </span>
                      )}
                    </div>

                    <CardContent className="p-4 space-y-2.5">
                      <h3 className="font-semibold text-foreground text-lg leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                        {listing.title}
                      </h3>

                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-primary/60" />
                        <span className="truncate">{listing.city}{listing.country ? `, ${listing.country}` : ""}</span>
                      </div>

                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-primary tabular-nums">
                          {listing.price.toLocaleString()}
                        </span>
                        <span className="text-sm text-muted-foreground">{listing.currency}</span>
                        {listing.listing_type !== "sale" && <span className="text-xs text-muted-foreground">/month</span>}
                      </div>

                      <Separator />

                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        {listing.surface_sqm > 0 && (
                          <span className="flex items-center gap-1"><Ruler className="h-3.5 w-3.5" />{listing.surface_sqm} m²</span>
                        )}
                        {listing.bedrooms > 0 && (
                          <span className="flex items-center gap-1"><BedDouble className="h-3.5 w-3.5" />{listing.bedrooms} bed</span>
                        )}
                        {listing.bathrooms > 0 && (
                          <span className="flex items-center gap-1"><Bath className="h-3.5 w-3.5" />{listing.bathrooms} bath</span>
                        )}
                      </div>

                      {/* Amenity chips */}
                      {(listing.parking || listing.garden || listing.terrace || listing.furnished) && (
                        <div className="flex flex-wrap gap-1">
                          {listing.parking && <Badge variant="outline" className="text-[10px] py-0 h-5 gap-0.5"><Car className="h-2.5 w-2.5" /> Parking</Badge>}
                          {listing.garden && <Badge variant="outline" className="text-[10px] py-0 h-5 gap-0.5"><TreePine className="h-2.5 w-2.5" /> Garden</Badge>}
                          {listing.terrace && <Badge variant="outline" className="text-[10px] py-0 h-5 gap-0.5"><Sun className="h-2.5 w-2.5" /> Terrace</Badge>}
                          {listing.furnished && <Badge variant="outline" className="text-[10px] py-0 h-5 gap-0.5"><Armchair className="h-2.5 w-2.5" /> Furnished</Badge>}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4 mt-12">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Easy-Locs</p>
          <div className="flex gap-4">
            <Link to="/terms" className="hover:text-foreground">Terms</Link>
            <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
