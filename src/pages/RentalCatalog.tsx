import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { usePublicLocale } from "@/hooks/usePublicLocale";
import PublicLanguageSwitcher from "@/components/public/PublicLanguageSwitcher";
import SEOHead from "@/components/SEOHead";
import { MapPin, Users, Euro, Loader2, Search, SlidersHorizontal, Key } from "lucide-react";
import { Input } from "@/components/ui/input";
import AppLogo from "@/components/AppLogo";
import { RENTAL_TYPES } from "@/lib/listing-types";

const RentalCatalog = () => {
  const { country, city } = useParams<{ country?: string; city?: string }>();
  const { t, setLocale } = useI18n();
  const { locale, changeLocale, supportedLocales } = usePublicLocale();
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [guestFilter, setGuestFilter] = useState(0);

  useEffect(() => { setLocale(locale); }, [locale, setLocale]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      // Load all active public listings with property info via RPC or direct join
      const { data } = await supabase
        .from("public_listings")
        .select("*")
        .eq("active", true)
        .in("listing_type", RENTAL_TYPES as any)
        .order("created_at", { ascending: false });

      setListings(data || []);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    let result = listings;
    if (country) {
      result = result.filter(l => (l.country || "").toLowerCase() === country.toLowerCase());
    }
    if (city) {
      result = result.filter(l => (l.city || "").toLowerCase().replace(/\s+/g, "-") === city.toLowerCase());
    }
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(l => (l.title || "").toLowerCase().includes(s) || (l.description || "").toLowerCase().includes(s));
    }
    if (guestFilter > 0) {
      result = result.filter(l => (l.max_guests || 0) >= guestFilter);
    }
    return result;
  }, [listings, country, city, search, guestFilter]);

  const pageTitle = city
    ? `${city.charAt(0).toUpperCase() + city.slice(1).replace(/-/g, " ")} — ${t("page.catalog.title")}`
    : country
    ? `${country.charAt(0).toUpperCase() + country.slice(1)} — ${t("page.catalog.title")}`
    : t("page.catalog.title");

  const seoTitle = city
    ? `Long-term Rentals in ${city.charAt(0).toUpperCase() + city.slice(1).replace(/-/g, " ")} | Easy-Locs`
    : country
    ? `Long-term Rentals in ${country.charAt(0).toUpperCase() + country.slice(1)} | Easy-Locs`
    : "Long-term Rentals Worldwide | Easy-Locs — Rent Direct";
  const seoDesc = city
    ? `Browse long-term rental properties in ${city.replace(/-/g, " ")}. Rent directly from verified landlords on Easy-Locs.`
    : country
    ? `Find long-term rentals in ${country}. Rent directly with verified property owners. No commission fees.`
    : "Discover long-term rental properties in 190+ countries. Rent directly from verified landlords. Best prices.";

  const catalogJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: seoTitle,
    description: seoDesc,
    numberOfItems: filtered.length,
    url: `https://www.easy-locs.com/rentals${country ? `/${country}` : ""}${city ? `/${city}` : ""}`,
    itemListElement: filtered.slice(0, 10).map((l, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `https://www.easy-locs.com/listing/${l.slug}`,
      name: l.title,
    })),
  };

  return (
    <div className="app-mobile-page bg-background">
      <SEOHead
        title={seoTitle}
        description={seoDesc}
        canonical={`https://www.easy-locs.com/rentals${country ? `/${country}` : ""}${city ? `/${city}` : ""}`}
        jsonLd={catalogJsonLd}
      />
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-12 flex items-center justify-between">
          <AppLogo variant="header" linkTo="/" />
          <PublicLanguageSwitcher locale={locale} supportedLocales={supportedLocales} onChange={changeLocale} />
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-6">{pageTitle}</h1>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-8">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t("page.catalog.search_placeholder")}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2 bg-background border border-border rounded-xl px-4 py-3">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
            <select
              value={guestFilter}
              onChange={e => setGuestFilter(Number(e.target.value))}
              className="bg-transparent text-sm text-foreground focus:outline-none"
            >
              <option value={0}>{t("page.catalog.all_guests")}</option>
              {[1, 2, 4, 6, 8, 10].map(n => (
                <option key={n} value={n}>{n}+ {t("page.listing.guests_max")}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground">{t("page.catalog.no_results")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(l => (
              <Link
                key={l.id}
                to={`/listing/${l.slug}`}
                className="group bg-card border border-border rounded-2xl overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="aspect-[16/10] bg-muted overflow-hidden">
                  {l.cover_url ? (
                    <img src={l.cover_url} alt={l.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">{t("page.listing.no_photos")}</div>
                  )}
                </div>
                <div className="p-4 space-y-2">
                  <h3 className="font-semibold text-foreground text-sm line-clamp-1">{l.title}</h3>
                  {(l.city || l.country) && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {l.city}{l.city && l.country ? ", " : ""}{l.country}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-xs">
                    {l.price_per_night > 0 && (
                      <span className="flex items-center gap-1 font-medium text-accent">
                        <Euro className="h-3 w-3" /> {l.price_per_night}€ {t("page.listing.per_night")}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Users className="h-3 w-3" /> {l.max_guests}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <footer className="text-center py-6 text-xs text-muted-foreground border-t border-border">
        {t("page.tsignup.powered_by")} <span className="font-semibold">EASY-LOCS®</span>
      </footer>
    </div>
  );
};

export default RentalCatalog;
