import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { buildAppUrl } from "@/lib/app-domain";
import ShareButtons from "@/components/public/ShareButtons";
import TrustMetrics from "@/components/marketplace/TrustMetrics";
import SortableReviewList from "@/components/marketplace/SortableReviewList";
import ReviewRatingBreakdown from "@/components/marketplace/ReviewRatingBreakdown";
import MobileCTABar from "@/components/marketplace/MobileCTABar";
import { MapPin, ExternalLink, Loader2, Star, CheckCircle2 } from "lucide-react";
import { useRef } from "react";
import { useI18n } from "@/lib/i18n";

const fmtPrice = (amount: number, currency: string = "EUR") => {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: currency.toUpperCase(), minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
};

export default function StorePage() {
  const { storeSlug } = useParams<{ storeSlug: string }>();
  const servicesRef = useRef<HTMLDivElement>(null);
  const { t } = useI18n();

  const { data: showcase, isLoading } = useQuery({
    queryKey: ["store-showcase", storeSlug],
    queryFn: async () => {
      const { data: landlord } = await supabase
        .from("landlord_profiles")
        .select("*")
        .eq("slug", storeSlug!)
        .eq("active", true)
        .maybeSingle();

      if (landlord) {
        const { data: services } = await supabase
          .from("concierge_services_public" as any)
          .select("*")
          .eq("org_id", landlord.org_id)
          .order("sort_order");
        return { type: "landlord" as const, profile: landlord, services: services || [] };
      }

      const { data: providerRows } = await supabase
        .rpc("get_public_marketplace_providers", { p_slug: storeSlug!, p_active_only: true });
      const provider = providerRows && providerRows.length > 0 ? providerRows[0] : null;

      if (provider) {
        const { data: services } = await supabase
          .from("marketplace_services_public" as any)
          .select("*")
          .eq("provider_id", provider.id)
          .order("sort_order");
        return { type: "provider" as const, profile: provider, services: (services || []) };
      }

      return null;
    },
    enabled: !!storeSlug,
  });

  if (isLoading) return (
    <div className="app-mobile-page bg-background flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );

  if (!showcase) return (
    <>
      <SEOHead title={`${t("mp.store_not_found") || "Store not found"} | Easy-Locs`} description="This store does not exist." />
      <div className="app-mobile-page bg-background flex items-center justify-center">
        <p className="text-muted-foreground">{t("mp.store_not_found") || "Store not found"}</p>
      </div>
    </>
  );

  const profile = showcase.profile as Record<string, any>;
  const name = profile.display_name || profile.company_name || storeSlug;
  const rating = Number(profile.rating || 0);
  const reviewsCount = Number(profile.reviews_count || 0);
  const completedJobs = Number(profile.completed_jobs || 0);
  const responseRate = Number(profile.response_rate || 0);
  const responseTime = profile.response_time || null;
  const memberSince = profile.created_at || null;
  const verifiedSince = profile.verified_at || null;

  // Real reviews for provider-type stores
  const providerId = showcase.type === "provider" ? profile.id : null;
  const { data: reviews = [] } = useQuery({
    queryKey: ["store-reviews", providerId],
    queryFn: async () => {
      const { data } = await supabase
        .rpc("get_provider_reviews", { p_provider_id: providerId!, p_limit: 100 });
      return (data || []) as { id: string; reviewer_name: string; rating: number; comment: string; response: string | null; service_title: string | null; verified: boolean; created_at: string }[];
    },
    enabled: !!providerId,
  });

  const verifiedReviewsCount = reviews.filter(r => r.verified).length;
  const repliedCount = reviews.filter(r => r.response).length;
  const replyRate = reviewsCount > 0 ? Math.round((repliedCount / reviewsCount) * 100) : 0;

  const serviceCities = [...new Set(showcase.services.map((s: any) => s.city).filter(Boolean))] as string[];

  return (
    <>
      <SEOHead
        title={`${name} — Services & Listings | Easy-Locs`}
        description={`${profile.bio || `Browse services and listings by ${name}`}${profile.city ? ` in ${profile.city}` : ""}${profile.country ? `, ${profile.country}` : ""}. Book directly on Easy-Locs.`.slice(0, 160)}
        ogImage={profile.avatar_url || profile.cover_photo_url}
        canonical={buildAppUrl(`/store/${storeSlug}`)}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          name,
          description: profile.bio || `Services by ${name}`,
          url: buildAppUrl(`/store/${storeSlug}`),
          image: profile.avatar_url || profile.cover_photo_url || undefined,
          ...(profile.city ? {
            address: { "@type": "PostalAddress", addressLocality: profile.city, addressCountry: profile.country || "" },
          } : {}),
          ...(profile.phone ? { telephone: profile.phone } : {}),
          ...(profile.email ? { email: profile.email } : {}),
          ...(showcase.services.length > 0 ? {
            makesOffer: showcase.services.slice(0, 10).map((s: any) => ({
              "@type": "Offer",
              itemOffered: {
                "@type": "Service",
                name: s.title,
                ...(s.price > 0 ? { offers: { "@type": "Offer", price: s.price, priceCurrency: s.currency || "EUR" } } : {}),
              },
            })),
          } : {}),
        }}
      />
      <div className="app-mobile-page bg-background pb-16 sm:pb-0">
        {/* Header */}
        <div className="bg-gradient-to-br from-accent/10 to-background border-b border-border">
          <div className="max-w-5xl mx-auto px-4 py-10 text-center">
            {profile.avatar_url && (
              <img src={profile.avatar_url} alt={name} className="w-20 h-20 rounded-full mx-auto mb-4 object-cover border-2 border-border" />
            )}
            <div className="flex items-center justify-center gap-2 mb-1">
              <h1 className="text-3xl font-bold text-foreground">{name}</h1>
              {profile.verified && (
                <span className="flex items-center gap-0.5 bg-accent/10 text-accent text-xs font-semibold px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="h-3.5 w-3.5" /> {t("mp.verified") || "Verified"}
                </span>
              )}
            </div>
            {profile.city && (
              <p className="text-muted-foreground mt-1 flex items-center justify-center gap-1">
                <MapPin className="h-4 w-4" /> {profile.city}{profile.country ? `, ${profile.country}` : ""}
              </p>
            )}

            {/* Trust metrics grid */}
            <div className="max-w-md mx-auto mt-4">
              <TrustMetrics
                rating={rating}
                reviewsCount={reviewsCount}
                verifiedReviewsCount={verifiedReviewsCount}
                completedJobs={completedJobs}
                responseRate={responseRate}
                responseTime={responseTime}
                replyRate={replyRate}
                memberSince={memberSince}
                verifiedSince={verifiedSince}
                verified={profile.verified}
                layout="grid"
              />
            </div>

            {profile.bio && <p className="text-muted-foreground mt-4 max-w-xl mx-auto">{profile.bio}</p>}
            <div className="mt-4 flex justify-center">
              <ShareButtons type="host" slug={storeSlug || ""} title={name} />
            </div>
          </div>
        </div>

        {/* Services */}
        <div ref={servicesRef} className="max-w-5xl mx-auto px-4 py-8">
          <h2 className="text-xl font-bold text-foreground mb-6">{t("mp.my_services") || "Services"} ({showcase.services.length})</h2>
          {showcase.services.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">{t("mp.no_services_listed") || "No services listed yet"}</CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {showcase.services.map((s: any) => {
                const photo = s.photo_url || (Array.isArray(s.photo_urls) && s.photo_urls[0]);
                const slug = s.booking_slug;
                return (
                  <Card key={s.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    {photo && (
                      <div className="aspect-video bg-muted">
                        <img src={photo} alt={s.title} className="w-full h-full object-cover" loading="lazy" />
                      </div>
                    )}
                    <CardContent className="p-4 space-y-2">
                      <h3 className="font-semibold text-foreground truncate">{s.title}</h3>
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="text-xs">{s.category}</Badge>
                        <span className="font-bold text-accent">{fmtPrice(s.price, s.currency)}</span>
                      </div>
                      {slug && (
                        <Button size="sm" className="w-full mt-2" asChild>
                          <Link to={`/book/${slug}`}><ExternalLink className="h-3 w-3 mr-1" /> {t("mp.book") || "Book"}</Link>
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Reviews */}
        {reviews.length > 0 && (
          <div className="max-w-5xl mx-auto px-4 pb-10">
            <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <Star className="h-5 w-5 text-[hsl(var(--chart-4))]" /> {t("mp.reviews") || "Reviews"} ({reviewsCount})
            </h2>
            <div className="mb-6 p-4 bg-muted/20 rounded-xl border border-border/40">
              <ReviewRatingBreakdown
                rating={rating}
                reviewsCount={reviewsCount}
                verifiedCount={reviews.filter(r => r.verified).length}
                reviews={reviews.map((r) => ({ rating: r.rating }))}
              />
            </div>
            <SortableReviewList
              reviews={reviews}
              totalCount={reviewsCount}
            />
          </div>
        )}

        {/* SEO internal links */}
        {serviceCities.length > 0 && (
          <div className="max-w-5xl mx-auto px-4 pb-10">
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">{t("mp.explore_nearby") || "Explore nearby"}</h2>
            <div className="flex flex-wrap gap-2">
              {serviceCities.map((city) => (
                <Button key={city} variant="ghost" size="sm" className="text-xs text-muted-foreground" asChild>
                  <Link to={`/shop/all-${city.toLowerCase().replace(/\s+/g, "-")}`}>{t("mp.services_in") || "Services in"} {city}</Link>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Mobile CTA */}
        <MobileCTABar
          phone={profile.phone}
          whatsapp={profile.whatsapp}
          telegram={profile.telegram}
          email={profile.email}
          listingTitle={name}
          listingUrl={buildAppUrl(`/store/${storeSlug}`)}
          onBook={() => servicesRef.current?.scrollIntoView({ behavior: "smooth" })}
        />
      </div>
    </>
  );
}
