import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { usePublicLocale } from "@/hooks/usePublicLocale";
import PublicLanguageSwitcher from "@/components/public/PublicLanguageSwitcher";
import SEOHead from "@/components/SEOHead";
import { MapPin, Users, Euro, Loader2, Star } from "lucide-react";
import AppLogo from "@/components/AppLogo";

const HostCatalog = () => {
  const { hostSlug } = useParams<{ hostSlug: string }>();
  const { t, setLocale } = useI18n();
  const { locale, changeLocale, supportedLocales } = usePublicLocale();
  const [host, setHost] = useState<any>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => { setLocale(locale); }, [locale, setLocale]);

  useEffect(() => {
    const load = async () => {
      if (!hostSlug) { setNotFound(true); setLoading(false); return; }

      const { data: profile } = await supabase
        .from("landlord_profiles")
        .select("*")
        .eq("slug", hostSlug)
        .eq("active", true)
        .maybeSingle();

      if (!profile) { setNotFound(true); setLoading(false); return; }
      setHost(profile);

      const { data: hostListings } = await supabase
        .from("public_listings")
        .select("*")
        .eq("org_id", profile.org_id)
        .eq("active", true)
        .order("created_at", { ascending: false });

      setListings(hostListings || []);
      setLoading(false);
    };
    load();
  }, [hostSlug]);

  if (loading) {
    return (
      <div className="app-mobile-page bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="app-mobile-page bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">{t("page.host.not_found")}</h1>
          <p className="text-muted-foreground">{t("page.host.not_found_desc")}</p>
        </div>
      </div>
    );
  }

  const hostName = host?.display_name || "Host";
  const hostCity = host?.city || "";
  const hostSeoTitle = `${hostName} — Properties on Easy-Locs`.slice(0, 60);
  const hostSeoDesc = `Browse ${listings.length} vacation rentals by ${hostName}${hostCity ? ` in ${hostCity}` : ""}. Book directly with this verified host on Easy-Locs.`.slice(0, 160);
  const hostJsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: hostName,
    url: `https://www.easy-locs.com/host/${hostSlug}`,
    image: host?.avatar_url,
    description: host?.bio?.slice(0, 200) || hostSeoDesc,
    ...(host?.rating ? { aggregateRating: { "@type": "AggregateRating", ratingValue: host.rating, bestRating: 5 } } : {}),
  };

  return (
    <div className="app-mobile-page bg-background">
      <SEOHead
        title={hostSeoTitle}
        description={hostSeoDesc}
        canonical={`https://www.easy-locs.com/host/${hostSlug}`}
        ogImage={host?.avatar_url}
        jsonLd={hostJsonLd}
      />
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-12 flex items-center justify-between">
          <AppLogo variant="header" linkTo="/" />
          <PublicLanguageSwitcher locale={locale} supportedLocales={supportedLocales} onChange={changeLocale} />
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Host header */}
        <div className="flex items-center gap-4 mb-8">
          {host.avatar_url ? (
            <img src={host.avatar_url} alt={host.display_name} className="h-16 w-16 rounded-full object-cover border-2 border-border" />
          ) : (
            <div className="h-16 w-16 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold text-xl">
              {host.display_name?.charAt(0) || "H"}
            </div>
          )}
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
              {host.display_name}
              {host.verified && <Star className="h-4 w-4 text-accent fill-accent" />}
            </h1>
            {host.city && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {host.city}{host.country ? `, ${host.country}` : ""}
              </p>
            )}
            {host.bio && <p className="text-sm text-muted-foreground mt-1">{host.bio}</p>}
          </div>
        </div>

        <h2 className="text-lg font-semibold text-foreground mb-4">
          {listings.length} {t("page.host.listings_count")}
        </h2>

        {listings.length === 0 ? (
          <p className="text-muted-foreground text-center py-20">{t("page.host.no_listings")}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map(l => (
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

export default HostCatalog;
