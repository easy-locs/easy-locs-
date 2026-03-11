import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import ServiceCard from "./ServiceCard";
import BookingDialog from "./BookingDialog";
import { getCategoryInfo } from "./MarketplaceCategories";
import { MapPin, Globe, Phone, Mail, Star, CheckCircle2, MessageSquare, Store, Briefcase, Shield, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import SEOHead from "@/components/SEOHead";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import ShareButtons from "@/components/public/ShareButtons";

export default function ProviderStorefront() {
  const { providerSlug } = useParams<{ providerSlug: string }>();
  const [bookingService, setBookingService] = useState<any>(null);
  const [galleryIdx, setGalleryIdx] = useState(0);

  const { data: provider, isLoading } = useQuery({
    queryKey: ["marketplace_provider_public", providerSlug],
    queryFn: async () => {
      const { data } = await supabase
        .rpc("get_public_marketplace_providers", { p_slug: providerSlug!, p_active_only: true });
      return (data && data.length > 0) ? data[0] : null;
    },
    enabled: !!providerSlug,
  });

  const { data: services = [] } = useQuery({
    queryKey: ["marketplace_services_public", provider?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("marketplace_services")
        .select("*")
        .eq("provider_id", provider!.id)
        .eq("active", true)
        .order("sort_order");
      return (data || []);
    },
    enabled: !!provider?.id,
  });

  const handleBookingSubmit = async (formData: any) => {
    const { error } = await supabase.from("marketplace_bookings").insert({
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
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Booking request sent!");
      setBookingService(null);
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
          <p className="text-muted-foreground font-medium">Provider not found</p>
        </div>
        <Footer />
      </div>
    );
  }

  // Collect all service photos for the gallery
  const allPhotos = services.flatMap((s: any) => (s.photo_urls || []) as string[]);
  const galleryPhotos = provider.cover_photo_url
    ? [provider.cover_photo_url, ...allPhotos.slice(0, 7)]
    : allPhotos.slice(0, 8);

  const whatsappLink = provider.whatsapp
    ? `https://wa.me/${provider.whatsapp.replace(/[^0-9]/g, "")}`
    : null;

  const rating = Number(provider.rating || 0);
  const reviewsCount = Number(provider.reviews_count || 0);
  const completedJobs = Number(provider.completed_jobs || 0);

  // Service areas — unique cities from services
  const serviceAreas = [...new Set(services.map((s: any) => s.city).filter(Boolean))] as string[];

  return (
    <div className="min-h-screen bg-background">
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
                {provider.verified && (
                  <span className="flex items-center gap-1 bg-accent/10 text-accent text-xs font-semibold px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Verified
                  </span>
                )}
                <Badge variant="outline" className="text-xs">{provider.provider_type === "company" ? "Company" : "Individual"}</Badge>
              </div>
              {provider.company_name && <p className="text-sm text-muted-foreground">{provider.company_name}</p>}

              {/* Trust metrics */}
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <MapPin className="h-4 w-4 text-accent/70" /> {provider.city}, {provider.country}
                </span>
                {rating > 0 && (
                  <span className="flex items-center gap-1 font-medium text-foreground">
                    <Star className="h-4 w-4 text-[hsl(var(--chart-4))] fill-[hsl(var(--chart-4))]" />
                    {rating.toFixed(1)}
                    {reviewsCount > 0 && <span className="text-muted-foreground font-normal text-xs">({reviewsCount} reviews)</span>}
                  </span>
                )}
                {completedJobs > 0 && (
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Briefcase className="h-4 w-4 text-accent/70" /> {completedJobs} completed
                  </span>
                )}
              </div>

              {/* Categories */}
              <div className="flex flex-wrap gap-2">
                {(provider.categories || []).map((c: string) => {
                  const info = getCategoryInfo(c);
                  return <Badge key={c} variant="secondary" className="text-xs">{info.icon} {info.label}</Badge>;
                })}
              </div>

              {/* Contact + Share */}
              <div className="flex flex-wrap gap-2 pt-1">
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
                  <Button size="sm" variant="outline" asChild>
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
            <Shield className="h-4.5 w-4.5 text-accent" /> About
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">{provider.bio}</p>
        </div>
      )}

      {/* Service areas */}
      {serviceAreas.length > 1 && (
        <div className="max-w-5xl mx-auto px-4 py-6 border-b border-border/40">
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-accent" /> Service Areas
          </h2>
          <div className="flex flex-wrap gap-2">
            {serviceAreas.map((city) => (
              <Badge key={city} variant="outline" className="text-xs">{city}</Badge>
            ))}
          </div>
        </div>
      )}

      {/* Services */}
      <div className="max-w-5xl mx-auto px-4 py-10">
        <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
          <Store className="h-5 w-5 text-accent" />
          Services ({services.length})
        </h2>
        {services.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <Store className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No services listed yet</p>
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

      {/* Reviews placeholder */}
      {reviewsCount > 0 && (
        <div className="max-w-5xl mx-auto px-4 pb-10">
          <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Star className="h-5 w-5 text-[hsl(var(--chart-4))]" />
            Reviews ({reviewsCount})
          </h2>
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              <Star className="h-8 w-8 mx-auto mb-2 text-[hsl(var(--chart-4))]/30" />
              <p>Average rating: <strong className="text-foreground">{rating.toFixed(1)}/5</strong> based on {reviewsCount} reviews</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Footer />

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
