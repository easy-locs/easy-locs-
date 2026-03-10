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
  Building2, X, Car, TreePine, Sun, Armchair, ArrowRight, Eye,
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

const TYPE_CONFIG: Record<string, { label: string; sublabel: string; color: string; bg: string; icon: string; border: string }> = {
  sale:            { label: "For Sale",        sublabel: "Buy",      color: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-500/10",  icon: "🏷️", border: "border-emerald-500/30" },
  long_term_rent:  { label: "Long-term Rent",  sublabel: "Rent",     color: "text-sky-700 dark:text-sky-300",        bg: "bg-sky-500/10",      icon: "🏠", border: "border-sky-500/30" },
  seasonal_rent:   { label: "Seasonal Rental",  sublabel: "Season",   color: "text-amber-700 dark:text-amber-300",    bg: "bg-amber-500/10",    icon: "🏖️", border: "border-amber-500/30" },
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

const PRICE_LABEL: Record<string, string> = {
  sale: "",
  long_term_rent: "/mo",
  seasonal_rent: "/night",
};

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

  const counts = useMemo(() => ({
    all: listings.length,
    sale: listings.filter(l => l.listing_type === "sale").length,
    long_term_rent: listings.filter(l => l.listing_type === "long_term_rent").length,
    seasonal_rent: listings.filter(l => l.listing_type === "seasonal_rent").length,
  }), [listings]);

  const seoJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Real Estate Listings — Easy-Locs",
    description: "Professional property listings for sale, long-term rent, and seasonal rental worldwide.",
    numberOfItems: listings.length,
    itemListElement: listings.slice(0, 10).map((l, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `https://www.easy-locs.com/properties/${l.slug}`,
      name: l.title,
    })),
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Properties for Sale & Rent Worldwide | Easy-Locs Real Estate"
        description="Browse professional real estate listings worldwide. Find properties for sale, long-term rent, or seasonal rental with photos, details, and direct owner contact."
        canonical="https://www.easy-locs.com/properties"
        jsonLd={seoJsonLd}
      />

      {/* ─── Header ─── */}
      <header className="border-b border-border bg-card/95 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 py-3">
          <AppLogo variant="header" linkTo="/" />
          <div className="flex gap-3 items-center">
            <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 hidden sm:block transition-colors">Login</Link>
            <Link to="/signup" className="bg-primary text-primary-foreground text-sm font-semibold px-5 py-2 rounded-lg hover:opacity-90 transition-opacity">Sign up</Link>
          </div>
        </div>
      </header>

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/[0.04] via-accent/[0.03] to-background pt-16 pb-12 px-4">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--accent)/0.08),transparent)]" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <Badge variant="outline" className="mb-5 text-xs px-3 py-1 border-accent/30 text-accent">
            🌍 Global Real Estate Marketplace
          </Badge>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-foreground mb-5 leading-[1.1] tracking-tight">
            Find Your Next<br />
            <span className="text-accent">Property</span>
          </h1>
          <p className="text-muted-foreground text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            Professional listings for sale, long-term rent, and seasonal rental. Discover properties worldwide with direct owner contact.
          </p>

          {/* ─── Type selector pills ─── */}
          <div className="flex flex-wrap justify-center gap-2.5 max-w-2xl mx-auto">
            {[
              { key: "all", label: "All Properties", icon: "🏢", count: counts.all },
              ...Object.entries(TYPE_CONFIG).map(([k, v]) => ({ key: k, label: v.label, icon: v.icon, count: (counts as any)[k] || 0 })),
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setTypeFilter(t.key)}
                className={`px-5 py-3 rounded-xl text-sm font-semibold transition-all border-2 ${
                  typeFilter === t.key
                    ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-[1.02]"
                    : "bg-card text-foreground border-border hover:border-accent/40 hover:shadow-md"
                }`}
              >
                <span className="mr-1.5">{t.icon}</span> {t.label}
                <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                  typeFilter === t.key ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>{t.count}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* ─── Filters bar ─── */}
        <div className="flex flex-wrap items-center gap-3 mb-8">
          <Button variant="outline" size="sm" onClick={() => setFiltersOpen(!filtersOpen)} className="gap-1.5 rounded-lg h-9">
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {activeFilters > 0 && (
              <Badge className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-[10px] bg-accent text-accent-foreground rounded-full">
                {activeFilters}
              </Badge>
            )}
          </Button>

          {activeFilters > 0 && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground gap-1 h-9">
              <X className="h-3 w-3" /> Clear all
            </Button>
          )}

          <span className="ml-auto text-sm text-muted-foreground font-medium">
            {listings.length} {listings.length === 1 ? "property" : "properties"} found
          </span>
        </div>

        {/* ─── Expanded filters ─── */}
        {filtersOpen && (
          <Card className="mb-8 border-accent/10 shadow-sm">
            <CardContent className="p-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="text-[11px] text-muted-foreground mb-1.5 block uppercase tracking-wider font-semibold">Property type</label>
                  <Select value={propertyTypeFilter} onValueChange={setPropertyTypeFilter}>
                    <SelectTrigger className="h-10 rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All types</SelectItem>
                      {PROPERTY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground mb-1.5 block uppercase tracking-wider font-semibold">Country</label>
                  <Select value={countryFilter} onValueChange={setCountryFilter}>
                    <SelectTrigger className="h-10 rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All countries</SelectItem>
                      {countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground mb-1.5 block uppercase tracking-wider font-semibold">City</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input className="h-10 pl-9 rounded-lg" placeholder="Any city" value={cityFilter} onChange={e => setCityFilter(e.target.value)} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-[11px] text-muted-foreground mb-1.5 block uppercase tracking-wider font-semibold">Min price</label>
                    <Input className="h-10 rounded-lg" type="number" placeholder="0" value={minPrice} onChange={e => setMinPrice(e.target.value)} />
                  </div>
                  <div className="flex-1">
                    <label className="text-[11px] text-muted-foreground mb-1.5 block uppercase tracking-wider font-semibold">Max price</label>
                    <Input className="h-10 rounded-lg" type="number" placeholder="∞" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ─── Listing grid ─── */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Card key={i} className="overflow-hidden animate-pulse">
                <div className="h-56 bg-muted" />
                <CardContent className="p-5 space-y-3">
                  <div className="h-5 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                  <div className="h-7 bg-muted rounded w-1/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-28">
            <Building2 className="h-20 w-20 text-muted-foreground/10 mx-auto mb-5" />
            <h2 className="text-2xl font-bold text-foreground mb-2">No properties found</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">Try adjusting your filters or check back later for new listings.</p>
            {activeFilters > 0 && (
              <Button variant="outline" onClick={clearFilters} className="rounded-lg">Clear all filters</Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map(listing => {
              const photos = listing.photo_urls || [];
              const tc = TYPE_CONFIG[listing.listing_type] || TYPE_CONFIG.sale;
              const priceLabel = PRICE_LABEL[listing.listing_type] || "";
              return (
                <Link to={`/properties/${listing.slug}`} key={listing.id} className="group">
                  <Card className="overflow-hidden hover:shadow-2xl transition-all duration-300 group-hover:-translate-y-1.5 h-full border-border/60 hover:border-accent/30">
                    {/* Photo */}
                    <div className="h-56 bg-muted relative overflow-hidden">
                      {photos[0] ? (
                        <img src={photos[0] as string} alt={listing.title} className="w-full h-full object-cover group-hover:scale-[1.06] transition-transform duration-700" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted/50">
                          <Home className="h-16 w-16 text-muted-foreground/10" />
                        </div>
                      )}
                      {/* Gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-foreground/40 via-transparent to-transparent" />
                      {/* Type badge */}
                      <Badge className={`absolute top-3.5 left-3.5 ${tc.bg} ${tc.color} border ${tc.border} text-xs font-semibold backdrop-blur-md px-3 py-1`}>
                        {tc.icon} {tc.label}
                      </Badge>
                      {/* Price overlay on photo */}
                      <div className="absolute bottom-3 left-3.5">
                        <span className="text-2xl font-bold text-background drop-shadow-lg tabular-nums">
                          {listing.price.toLocaleString()} {listing.currency}
                        </span>
                        {priceLabel && <span className="text-background/80 text-sm ml-1">{priceLabel}</span>}
                      </div>
                      {photos.length > 1 && (
                        <span className="absolute bottom-3 right-3 bg-foreground/50 backdrop-blur-md text-background text-[11px] px-2.5 py-1 rounded-full font-medium">
                          📷 {photos.length}
                        </span>
                      )}
                    </div>

                    <CardContent className="p-5 space-y-3">
                      <h3 className="font-bold text-foreground text-lg leading-tight line-clamp-2 group-hover:text-accent transition-colors">
                        {listing.title}
                      </h3>

                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-accent/70" />
                        <span className="truncate">{listing.city}{listing.country ? `, ${listing.country}` : ""}</span>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground pt-1">
                        {listing.surface_sqm > 0 && (
                          <span className="flex items-center gap-1"><Ruler className="h-3.5 w-3.5 text-accent/60" />{listing.surface_sqm} m²</span>
                        )}
                        {listing.bedrooms > 0 && (
                          <span className="flex items-center gap-1"><BedDouble className="h-3.5 w-3.5 text-accent/60" />{listing.bedrooms} bed</span>
                        )}
                        {listing.bathrooms > 0 && (
                          <span className="flex items-center gap-1"><Bath className="h-3.5 w-3.5 text-accent/60" />{listing.bathrooms} bath</span>
                        )}
                      </div>

                      {/* Amenity chips */}
                      {(listing.parking || listing.garden || listing.terrace || listing.furnished) && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {listing.parking && <Badge variant="outline" className="text-[10px] py-0.5 h-5 gap-0.5 border-border/60"><Car className="h-2.5 w-2.5" /> Parking</Badge>}
                          {listing.garden && <Badge variant="outline" className="text-[10px] py-0.5 h-5 gap-0.5 border-border/60"><TreePine className="h-2.5 w-2.5" /> Garden</Badge>}
                          {listing.terrace && <Badge variant="outline" className="text-[10px] py-0.5 h-5 gap-0.5 border-border/60"><Sun className="h-2.5 w-2.5" /> Terrace</Badge>}
                          {listing.furnished && <Badge variant="outline" className="text-[10px] py-0.5 h-5 gap-0.5 border-border/60"><Armchair className="h-2.5 w-2.5" /> Furnished</Badge>}
                        </div>
                      )}

                      <Separator className="!mt-4" />

                      <div className="flex items-center justify-between pt-0.5">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Eye className="h-3 w-3" /> {listing.views_count || 0} views
                        </div>
                        <span className="text-xs font-semibold text-accent flex items-center gap-0.5 group-hover:gap-1.5 transition-all">
                          View details <ArrowRight className="h-3 w-3" />
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── Footer ─── */}
      <footer className="border-t border-border py-10 px-4 mt-16 bg-card/50">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Easy-Locs — Global Property Management</p>
          <div className="flex gap-6">
            <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link to="/contact" className="hover:text-foreground transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
