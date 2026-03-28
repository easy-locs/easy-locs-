import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchPublicProviders, fetchPublicServices, fetchProviderReviews, insertBooking } from "@/repositories/marketplace.repository";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import ServiceCard from "./ServiceCard";
import BookingDialog from "./BookingDialog";
import TrustMetrics from "./TrustMetrics";
import SortableReviewList from "./SortableReviewList";
import ReviewRatingBreakdown from "./ReviewRatingBreakdown";
import MobileCTABar from "./MobileCTABar";
import { getCategoryInfo } from "@/lib/taxonomy/category-tree";
import { MapPin, Globe, Phone, Mail, Star, CheckCircle2, MessageSquare, Store, ChevronLeft, ChevronRight, Shield } from "lucide-react";
import LiveBadge from "./LiveBadge";
import { useState, useRef } from "react";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";
import SEOHead from "@/components/SEOHead";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import ShareButtons from "@/components/public/ShareButtons";

export default function ProviderStorefront() {
  const { providerSlug } = useParams<{ providerSlug: string }>();
  const [bookingService, setBookingService] = useState<any>(null);
  const [galleryIdx, setGalleryIdx] = useState(0);
  const servicesRef = useRef<HTMLDivElement>(null);
  const { t } = useI18n();

  const { data: provider, isLoading } = useQuery({
    queryKey: ["marketplace_provider_public", providerSlug],
    queryFn: async () => {
      const data = await fetchPublicProviders(providerSlug!);
      return (data && data.length > 0) ? data[0] : null;
    },
    enabled: !!providerSlug,
  });

  const { data: services = [] } = useQuery({
    queryKey: ["marketplace_services_public", provider?.id],
    queryFn: () => fetchPublicServices(provider!.id),
    enabled: !!provider?.id,
  });

  // Placeholder reviews — will come from DB when reviews table exists
  const providerAny = provider as Record<string, any> | null;
  const reviewsCount = Number(providerAny?.reviews_count || 0);

  // Fetch ALL reviews from DB for client-side pagination
  const { data: reviews = [] } = useQuery({
    queryKey: ["provider_reviews", provider?.id],
    queryFn: () => fetchProviderReviews(provider!.id),
    enabled: !!provider?.id,
  });

  const verifiedReviewsCount = reviews.filter(r => r.verified).length;
  const repliedCount = reviews.filter(r => r.response).length;
  const replyRate = reviewsCount > 0 ? Math.round((repliedCount / reviewsCount) * 100) : 0;

  const handleBookingSubmit = async (formData: any) => {
    try {
      await insertBooking({
        service_id: bookingService.id,
        provider_id: provider.id,
        org_id: bookingService.org_id,
        booker_name: formData.booker_name,
        booker_email: formData.booker_email,
        booker_phone: formData.booker_phone,
        service_date: formData.service_date,
        service_time: formData.service_time,
        quantity: formData.quantity,
        total_price: Number(bookingService.price) * formData.quantity,
        currency: bookingService.currency,
        notes: formData.notes,
      });
      toast.success(t("mp.booking_submitted") || "Booking request sent!");
      setBookingService(null);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-32">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <Store className="h-12 w-12 text-muted-foreground/30" />
          <p className="text-muted-foreground font-medium">{t("mp.provider_not_found") || "Provider not found"}</p>
        </div>
        <Footer />
      </div>
    );
  }

  const allPhotos = services.flatMap((s: any) => (s.photo_urls || []) as string[]);
  const galleryPhotos = provider.cover_photo_url
    ? [provider.cover_photo_url, ...allPhotos.slice(0, 7)]
    : allPhotos.slice(0, 8);

  const whatsappLink = provider.whatsapp
    ? `https://wa.me/${provider.whatsapp.replace(/[^0-9]/g, "")}`
    : null;

  const rating = Number(providerAny?.rating || 0);
  const completedJobs = Number(providerAny?.completed_jobs || 0);
  const responseRate = Number(providerAny?.response_rate || 0);
  const responseTime = providerAny?.response_time || null;
  const memberSince = providerAny?.created_at || null;
  const verifiedSince = providerAny?.verified_at || null;

  const serviceAreas = [...new Set(services.map((s: any) => s.city).filter(Boolean))] as string[];
  const serviceCountries = [...new Set(services.map((s: any) => s.country).filter(Boolean))] as string[];

  const scrollToServices = () => {
    servicesRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background pb-16 sm:pb-0">
      <SEOHead
        title={`${provider.display_name} — Services | EASY-LOCS®`}
        description={provider.bio || `Discover services by ${provider.display_name}`}
        ogImage={provider.avatar_url || provider.cover_photo_url}
        canonical={`https://www.easy-locs.com/provider/${providerSlug}`}
      />
      <Navbar />

      {/* Photo gallery strip */}
      {galleryPhotos.length > 0 && (
        <div className="relative bg-muted h-48 sm:h-64 overflow-hidden">
          <img
            src={galleryPhotos[galleryIdx]}
            alt={provider.display_name}
            className="w-full h-full object-cover transition-all duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10 pointer-events-none" />
          {galleryPhotos.length > 1 && (
            <>
              <button
                onClick={() => setGalleryIdx((i) => (i - 1 + galleryPhotos.length) % galleryPhotos.length)}
                className="absolute left-3 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm rounded-full w-9 h-9 flex items-center justify-center shadow-sm"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setGalleryIdx((i) => (i + 1) % galleryPhotos.length)}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm rounded-full w-9 h-9 flex items-center justify-center shadow-sm"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <div className="absolute bottom-3 right-3 bg-background/80 backdrop-blur-sm text-xs font-medium px-2.5 py-1 rounded-full">
                {galleryIdx + 1} / {galleryPhotos.length}
              </div>
            </>
          )}
        </div>
      )}

      {/* Hero Header */}
      <div className="bg-gradient-to-br from-accent/8 via-background to-muted/30 border-b border-border/60">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="flex flex-col sm:flex-row items-start gap-5">
            <Avatar className="h-20 w-20 shrink-0 ring-2 ring-accent/20 ring-offset-2 ring-offset-background -mt-12 sm:-mt-14 relative z-10">
              {provider.avatar_url ? (
                <img src={provider.avatar_url} alt={provider.display_name} className="h-full w-full object-cover" />
              ) : (
                <AvatarFallback className="text-2xl bg-accent/10 text-accent font-bold">
                  {provider.display_name?.charAt(0) || "P"}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-bold text-foreground">{provider.display_name}</h1>
                <LiveBadge isLive={!!(provider as any).is_live} size="md" />
                {provider.verified && (
                   <span className="flex items-center gap-1 bg-accent/10 text-accent text-xs font-semibold px-2 py-0.5 rounded-full">
                     <CheckCircle2 className="h-3.5 w-3.5" /> {t("mp.verified") || "Verified"}
                   </span>
                )}
                <Badge variant="outline" className="text-xs">{provider.provider_type === "company" ? (t("mp.company") || "Company") : (t("mp.individual") || "Individual")}</Badge>
              </div>
              {provider.company_name && <p className="text-sm text-muted-foreground">{provider.company_name}</p>}

              {/* Location */}
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 text-accent/70" /> {provider.city}, {provider.country}
              </div>

              {/* Trust metrics — grid on this page */}
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
                verified={provider.verified}
                layout="grid"
              />

              {/* Categories */}
              <div className="flex flex-wrap gap-2">
                {(provider.categories || []).map((c: string) => {
                  const info = getCategoryInfo(c);
                  return <Badge key={c} variant="secondary" className="text-xs">{info.icon} {info.label}</Badge>;
                })}
              </div>

              {/* Contact + Share — desktop */}
              <div className="hidden sm:flex flex-wrap gap-2 pt-1">
                {provider.email && (
                  <Button size="sm" variant="outline" asChild>
                    <a href={`mailto:${provider.email}`}><Mail className="h-4 w-4 mr-1.5" /> Email</a>
                  </Button>
                )}
                {provider.phone && (
                  <Button size="sm" variant="outline" asChild>
                    <a href={`tel:${provider.phone}`}><Phone className="h-4 w-4 mr-1.5" /> Call</a>
                  </Button>
                )}
                {whatsappLink && (
                  <Button size="sm" variant="outline" className="text-[#25D366] border-[#25D366]/30 hover:bg-[#25D366]/10" asChild>
                    <a href={whatsappLink} target="_blank" rel="noopener noreferrer"><MessageSquare className="h-4 w-4 mr-1.5" /> WhatsApp</a>
                  </Button>
                )}
                {provider.website_url && (
                  <Button size="sm" variant="outline" asChild>
                    <a href={provider.website_url} target="_blank" rel="noopener noreferrer"><Globe className="h-4 w-4 mr-1.5" /> Website</a>
                  </Button>
                )}
                {providerSlug && (
                  <ShareButtons type="provider" slug={providerSlug} title={provider.display_name} />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* About section */}
      {provider.bio && (
        <div className="max-w-5xl mx-auto px-4 py-8 border-b border-border/40">
           <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
             <Shield className="h-4.5 w-4.5 text-accent" /> {t("mp.about") || "About"}
           </h2>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">{provider.bio}</p>
        </div>
      )}

      {/* Service areas with country grouping */}
      {serviceAreas.length > 0 && (
        <div className="max-w-5xl mx-auto px-4 py-6 border-b border-border/40">
           <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
             <MapPin className="h-4 w-4 text-accent" /> {t("mp.service_coverage") || "Service Coverage"}
           </h2>
          {serviceCountries.length > 1 ? (
            <div className="space-y-3">
              {serviceCountries.map((country) => {
                const cities = services.filter((s: any) => s.country === country).map((s: any) => s.city).filter(Boolean);
                const unique = [...new Set(cities)] as string[];
                return (
                  <div key={country}>
                    <span className="text-xs font-medium text-foreground">{country}</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {unique.map((city) => (
                        <Badge key={city} variant="outline" className="text-xs">{city}</Badge>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {serviceAreas.map((city) => (
                <Badge key={city} variant="outline" className="text-xs">{city}</Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Services */}
      <div ref={servicesRef} className="max-w-5xl mx-auto px-4 py-10">
         <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
           <Store className="h-5 w-5 text-accent" />
           {t("mp.my_services") || "Services"} ({services.length})
         </h2>
        {services.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <Store className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">{t("mp.no_services_listed") || "No services listed yet"}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {services.map((s) => (
              <ServiceCard key={s.id} service={s} provider={provider} onBook={() => setBookingService(s)} />
            ))}
          </div>
        )}
      </div>

      {/* Reviews section */}
      {reviews.length > 0 && (
        <div className="max-w-5xl mx-auto px-4 pb-10">
          <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Star className="h-5 w-5 text-[hsl(var(--chart-4))]" />
            {t("mp.reviews") || "Reviews"} ({reviewsCount})
          </h2>

          {/* Rating breakdown */}
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
      {serviceAreas.length > 0 && (
        <div className="max-w-5xl mx-auto px-4 pb-10">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">{t("mp.discover_more") || "Discover more services"}</h2>
          <div className="flex flex-wrap gap-2">
            {serviceAreas.map((city) => (
              <Button key={city} variant="ghost" size="sm" className="text-xs text-muted-foreground" asChild>
                <Link to={`/shop/all-${city.toLowerCase().replace(/\s+/g, "-")}`}>{t("mp.services_in") || "Services in"} {city}</Link>
              </Button>
            ))}
            {(provider.categories || []).slice(0, 4).map((c: string) => {
              const info = getCategoryInfo(c);
              return (
                <Button key={c} variant="ghost" size="sm" className="text-xs text-muted-foreground" asChild>
                  <Link to={`/shop/${c}-${(provider.city || "").toLowerCase().replace(/\s+/g, "-")}`}>
                    {info.icon} {info.label} in {provider.city}
                  </Link>
                </Button>
              );
            })}
          </div>
        </div>
      )}

      <Footer />

      {/* Sticky mobile CTA */}
      <MobileCTABar
        phone={provider.phone}
        whatsapp={provider.whatsapp}
        email={provider.email}
        listingTitle={provider.display_name}
        onBook={scrollToServices}
      />

      {bookingService && (
        <BookingDialog
          open={!!bookingService}
          onOpenChange={(v) => !v && setBookingService(null)}
          service={bookingService}
          provider={provider}
          onSubmit={handleBookingSubmit}
        />
      )}
    </div>
  );
}
