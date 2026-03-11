import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import ServiceCard from "./ServiceCard";
import BookingDialog from "./BookingDialog";
import { getCategoryInfo } from "./MarketplaceCategories";
import { MapPin, Globe, Phone, Mail, Star, CheckCircle2, MessageSquare, Store } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import SEOHead from "@/components/SEOHead";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

export default function ProviderStorefront() {
  const { providerSlug } = useParams<{ providerSlug: string }>();
  const [bookingService, setBookingService] = useState<any>(null);

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

  const whatsappLink = provider.whatsapp
    ? `https://wa.me/${provider.whatsapp.replace(/[^0-9]/g, "")}`
    : null;

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={`${provider.display_name} — Services | EASY-LOCS®`}
        description={provider.bio || `Discover services by ${provider.display_name}`}
        ogImage={provider.avatar_url || provider.cover_photo_url}
        canonical={`https://www.easy-locs.com/provider/${providerSlug}`}
      />
      <Navbar />

      {/* Hero Header */}
      <div className="bg-gradient-to-br from-accent/8 via-background to-muted/30 border-b border-border/60">
        <div className="max-w-5xl mx-auto px-4 py-10">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <Avatar className="h-20 w-20 shrink-0 ring-2 ring-accent/20 ring-offset-2 ring-offset-background">
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
                  <span className="flex items-center gap-1 text-accent">
                    <CheckCircle2 className="h-5 w-5" />
                  </span>
                )}
                <Badge variant="outline" className="text-xs">{provider.provider_type === "company" ? "Company" : "Individual"}</Badge>
              </div>
              {provider.company_name && <p className="text-sm text-muted-foreground">{provider.company_name}</p>}
              {provider.bio && <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">{provider.bio}</p>}

              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-accent/70" /> {provider.city}, {provider.country}</span>
                {Number(provider.rating) > 0 && (
                  <span className="flex items-center gap-1.5"><Star className="h-4 w-4 text-[hsl(var(--chart-4))]" /> {Number(provider.rating).toFixed(1)} ({provider.reviews_count} reviews)</span>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {(provider.categories || []).map((c: string) => {
                  const info = getCategoryInfo(c);
                  return <Badge key={c} variant="secondary" className="text-xs">{info.icon} {info.label}</Badge>;
                })}
              </div>

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
              </div>
            </div>
          </div>
        </div>
      </div>

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
              <ServiceCard key={s.id} service={s} onBook={() => setBookingService(s)} />
            ))}
          </div>
        )}
      </div>

      <Footer />

      {/* Booking dialog */}
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
