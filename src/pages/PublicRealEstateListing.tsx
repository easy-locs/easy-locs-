import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import * as realEstateRepo from "@/repositories/real-estate.repository";
import { dispatchSyncEvent } from "@/lib/shared/sync-engine";
import { getShareLinks } from "@/lib/social-share";
import { useAutoTranslateBatch } from "@/hooks/useAutoTranslate";
import SEOHead from "@/components/SEOHead";
import AppLogo from "@/components/AppLogo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  MapPin, Ruler, BedDouble, Bath, Home, Car, TreePine, Sun,
  Building, Armchair, ChevronLeft, ChevronRight, Send,
  Mail, Phone, Share2, ArrowLeft, Eye, CheckCircle2, Shield, Star,
  MessageCircle,
} from "lucide-react";
import ListingContactButtons from "@/components/public/ListingContactButtons";
import ListingMapSection from "@/components/public/ListingMapSection";

interface Listing {
  id: string; title: string; description: string; listing_type: string;
  price: number; currency: string; property_type: string; country: string;
  city: string; address: string; surface_sqm: number; rooms: number;
  bedrooms: number; bathrooms: number; photo_urls: string[]; slug: string;
  contact_email: string; contact_phone: string; features: any;
  parking: boolean; garden: boolean; terrace: boolean; elevator: boolean;
  furnished: boolean; energy_class: string; org_id: string; views_count: number;
  agency_name?: string; agent_name?: string; agency_logo_url?: string;
  license_number?: string; company_registration?: string;
  agency_phone?: string; agency_email?: string;
  lat?: number; lng?: number;
}

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; seoLabel: string }> = {
  sale:            { label: "For Sale",         color: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-500/10",  border: "border-emerald-500/30", seoLabel: "for Sale" },
  long_term_rent:  { label: "Long-term Rent",   color: "text-sky-700 dark:text-sky-300",        bg: "bg-sky-500/10",      border: "border-sky-500/30",     seoLabel: "for Long-term Rent" },
};

const PROPERTY_TYPES: Record<string, string> = {
  apartment: "Apartment", house: "House", studio: "Studio", villa: "Villa",
  office: "Office", land: "Land", commercial: "Commercial",
};

const ENERGY_COLORS: Record<string, string> = {
  A: "bg-emerald-500", B: "bg-emerald-400", C: "bg-lime-500", D: "bg-yellow-400",
  E: "bg-amber-500", F: "bg-orange-500", G: "bg-destructive",
};

const PRICE_LABEL: Record<string, string> = {
  sale: "",
  long_term_rent: "/month",
};

export default function PublicRealEstateListing() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [contactForm, setContactForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [fullscreenGallery, setFullscreenGallery] = useState(false);

  // Auto-translate listing content based on visitor's browser language
  const translate = useAutoTranslateBatch(
    { title: listing?.title, description: listing?.description },
    listing?.country?.toLowerCase() === "fr" ? "fr" : listing?.country?.toLowerCase() === "es" ? "es" : "en"
  );

  useEffect(() => {
    if (!slug) return;
    const load = async () => {
      const { data } = await supabase.rpc("get_public_real_estate_listing", { p_slug: slug });
      setListing(data as any);
      setLoading(false);
      supabase.rpc("increment_listing_views", { p_slug: slug });
    };
    load();
  }, [slug]);

  const handleSubmitContact = async () => {
    if (!contactForm.name || !contactForm.email || !listing) return;
    setSubmitting(true);
    const { data: inserted, error } = await supabase.from("real_estate_leads").insert({
      org_id: listing.org_id, listing_id: listing.id,
      name: contactForm.name, email: contactForm.email,
      phone: contactForm.phone, message: contactForm.message,
    }).select("id").single();
    setSubmitting(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setSubmitted(true);
    toast({ title: "✅ Message sent!", description: "The property owner will contact you shortly." });

    // Sync engine: lead_created (replaces legacy direct email + DB trigger notification)
    if (inserted?.id) {
      dispatchSyncEvent({
        type: "lead_created",
        context: {
          orgId: listing.org_id,
          leadId: inserted.id,
          countryCode: listing.country || "",
        },
        actorUserId: "", // public visitor, no auth
        targetEmail: listing.contact_email || undefined,
        leadName: contactForm.name,
        leadEmail: contactForm.email,
        leadMessage: contactForm.message || "",
        listingTitle: listing.title,
        listingId: listing.id,
      }).catch(() => {});
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: listing?.title, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({ title: "🔗 Link copied!" });
    }
  };

  if (loading) return (
    <div className="app-mobile-page bg-background flex items-center justify-center">
      <div className="animate-pulse space-y-4 w-full max-w-2xl px-4">
        <div className="h-64 sm:h-80 bg-muted rounded-2xl" />
        <div className="h-8 bg-muted rounded w-3/4" />
        <div className="h-5 bg-muted rounded w-1/2" />
      </div>
    </div>
  );

  if (!listing) return (
    <div className="app-mobile-page bg-background flex flex-col items-center justify-center gap-5 px-4">
      <Home className="h-16 sm:h-20 w-16 sm:w-20 text-muted-foreground/15" />
      <p className="text-muted-foreground text-lg sm:text-xl font-medium">Listing not found</p>
      <Link to="/properties"><Button variant="outline" className="rounded-lg min-h-[44px]"><ArrowLeft className="h-4 w-4 mr-2" /> Browse properties</Button></Link>
    </div>
  );

  const photos = listing.photo_urls || [];
  const tc = TYPE_CONFIG[listing.listing_type] || TYPE_CONFIG.sale;
  const priceLabel = PRICE_LABEL[listing.listing_type] || "";
  const propType = PROPERTY_TYPES[listing.property_type] || listing.property_type;

  const amenities = [
    listing.parking && { label: "Parking", icon: Car },
    listing.garden && { label: "Garden", icon: TreePine },
    listing.terrace && { label: "Terrace / Balcony", icon: Sun },
    listing.elevator && { label: "Elevator", icon: Building },
    listing.furnished && { label: "Furnished", icon: Armchair },
  ].filter(Boolean) as { label: string; icon: any }[];

  // Enhanced SEO: City + Property Type + Listing Type + Price
  const seoTitle = `${propType} ${tc.seoLabel} in ${listing.city}${listing.country ? `, ${listing.country}` : ""} — ${listing.price.toLocaleString()} ${listing.currency}${priceLabel} | Easy-Locs`;
  const seoDescription = `${propType} ${tc.seoLabel} in ${listing.city}${listing.country ? `, ${listing.country}` : ""}. ${listing.title}. ${listing.surface_sqm > 0 ? listing.surface_sqm + " m²" : ""}${listing.bedrooms > 0 ? ", " + listing.bedrooms + " bedrooms" : ""}${listing.bathrooms > 0 ? ", " + listing.bathrooms + " bathrooms" : ""}. ${listing.price.toLocaleString()} ${listing.currency}${priceLabel}. View photos and contact the owner directly.`;

  const seoJsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "RealEstateListing",
      name: listing.title,
      description: listing.description || seoDescription,
      url: `https://www.easy-locs.com/properties/${listing.slug}`,
      image: photos.length > 0 ? photos : undefined,
      datePosted: undefined,
      address: {
        "@type": "PostalAddress",
        addressLocality: listing.city,
        addressCountry: listing.country,
        streetAddress: listing.address || undefined,
      },
      offers: {
        "@type": "Offer",
        price: listing.price,
        priceCurrency: listing.currency,
        availability: "https://schema.org/InStock",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Properties", item: "https://www.easy-locs.com/properties" },
        { "@type": "ListItem", position: 2, name: `${listing.city} ${tc.label}`, item: `https://www.easy-locs.com/properties/${listing.slug}` },
      ],
    },
  ];

  return (
    <div className="app-mobile-page bg-background">
      <SEOHead
        title={`${listing.title} — ${listing.city} | Easy-Locs`}
        description={seoDescription}
        canonical={`https://www.easy-locs.com/properties/${listing.slug}`}
        ogImage={photos[0] || "https://www.easy-locs.com/pwa-512x512.png"}
        jsonLd={seoJsonLd as any}
      />

      {/* ─── Header ─── */}
      <header className="border-b border-border bg-card/95 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 h-14">
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => window.history.length > 1 ? navigate(-1) : navigate("/explore")}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[44px] min-w-[44px] rounded-lg hover:bg-muted/50 px-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back</span>
            </button>
            <AppLogo variant="header" linkTo="/" />
          </div>
          <div className="flex gap-2 items-center">
            <Button variant="ghost" size="sm" onClick={handleShare} className="gap-1.5 text-muted-foreground hover:text-foreground rounded-lg min-h-[44px] min-w-[44px]">
              <Share2 className="h-4 w-4" /> <span className="hidden sm:inline">Share</span>
            </Button>
            <Link to="/signup" className="bg-primary text-primary-foreground text-sm font-semibold px-4 sm:px-5 py-2 rounded-lg hover:opacity-90 transition-opacity min-h-[44px] flex items-center">Sign up</Link>
          </div>
        </div>
      </header>

      {/* ─── Photo Gallery ─── */}
      <section className="bg-muted/20">
        <div className="max-w-7xl mx-auto">
          {photos.length > 0 ? (
            <>
              {/* Desktop grid */}
              <div className="hidden md:grid grid-cols-4 grid-rows-2 gap-2 p-2 max-h-[520px]">
                <div className="col-span-2 row-span-2 relative rounded-l-2xl overflow-hidden cursor-pointer group" onClick={() => setFullscreenGallery(true)}>
                <img src={photos[0]} alt={`${listing.title} — main photo`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  {/* Watermark */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <span className="text-white/15 text-4xl font-black tracking-widest select-none rotate-[-15deg]">EASY-LOCS</span>
                  </div>
                  {/* Desktop type badge on main photo */}
                  <Badge className={`absolute top-4 left-4 ${tc.bg} ${tc.color} border ${tc.border} text-sm px-4 py-1.5 font-semibold backdrop-blur-md`}>
                    {tc.label}
                  </Badge>
                </div>
                {photos.slice(1, 5).map((url, i) => (
                  <div key={i}
                    className={`relative overflow-hidden cursor-pointer group ${
                      i === 1 ? "rounded-tr-2xl" : i === 3 ? "rounded-br-2xl" : ""
                    }`}
                    onClick={() => { setPhotoIndex(i + 1); setFullscreenGallery(true); }}
                  >
                    <img src={url} alt={`${listing.title} — photo ${i + 2}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                    {/* Watermark */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <span className="text-white/10 text-xl font-black tracking-widest select-none rotate-[-15deg]">EASY-LOCS</span>
                    </div>
                    {i === 3 && photos.length > 5 && (
                      <div className="absolute inset-0 bg-foreground/50 flex items-center justify-center backdrop-blur-sm">
                        <span className="text-background font-bold text-xl">+{photos.length - 5}</span>
                      </div>
                    )}
                  </div>
                ))}
                {photos.length < 5 && Array.from({ length: Math.max(0, 4 - (photos.length - 1)) }).map((_, i) => (
                  <div key={`empty-${i}`} className="bg-muted flex items-center justify-center">
                    <Home className="h-10 w-10 text-muted-foreground/10" />
                  </div>
                ))}
              </div>

              {/* Mobile carousel — safe touch targets */}
              <div className="md:hidden relative aspect-[4/3] overflow-hidden">
                <img src={photos[photoIndex]} alt={`${listing.title} — photo ${photoIndex + 1}`} className="w-full h-full object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/30 via-transparent to-transparent" />
                {/* Watermark */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <span className="text-white/15 text-3xl font-black tracking-widest select-none rotate-[-15deg]">EASY-LOCS</span>
                </div>
                {photos.length > 1 && (
                  <>
                    <button onClick={() => setPhotoIndex(i => (i - 1 + photos.length) % photos.length)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-md rounded-full w-11 h-11 flex items-center justify-center active:scale-95 shadow-lg">
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button onClick={() => setPhotoIndex(i => (i + 1) % photos.length)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-md rounded-full w-11 h-11 flex items-center justify-center active:scale-95 shadow-lg">
                      <ChevronRight className="h-5 w-5" />
                    </button>
                    {/* Thumbnail strip instead of dots */}
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 max-w-[90%] overflow-x-auto pb-1">
                      {photos.slice(0, 8).map((url, i) => (
                        <button key={i} onClick={() => setPhotoIndex(i)}
                          className={`shrink-0 w-10 h-7 rounded-md overflow-hidden border-2 transition-all ${i === photoIndex ? "border-white scale-110" : "border-transparent opacity-50"}`}>
                          <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
                        </button>
                      ))}
                    </div>
                  </>
                )}
                {/* Mobile type badge */}
                <Badge className={`absolute top-3 left-3 ${tc.bg} ${tc.color} border ${tc.border} text-xs sm:text-sm px-3 py-1.5 font-semibold backdrop-blur-md`}>
                  {tc.label}
                </Badge>
                {/* Photo count */}
                {photos.length > 1 && (
                  <span className="absolute top-3 right-3 bg-foreground/50 backdrop-blur-md text-background text-[10px] px-2 py-1 rounded-full font-medium">
                    {photoIndex + 1}/{photos.length}
                  </span>
                )}
              </div>
            </>
          ) : (
            <div className="aspect-[16/9] md:aspect-[3/1] bg-muted flex items-center justify-center">
              <Home className="h-16 sm:h-24 w-16 sm:w-24 text-muted-foreground/10" />
            </div>
          )}
        </div>
      </section>

      {/* ─── Content ─── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-10">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-8 sm:space-y-10">
            {/* Title + Price block */}
            <div>
              <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3 sm:mb-4">
                <Badge className={`${tc.bg} ${tc.color} border ${tc.border} text-[11px] sm:text-xs font-semibold px-2.5 sm:px-3 py-0.5 sm:py-1`}>
                  {tc.label}
                </Badge>
                <Badge variant="outline" className="text-[11px] sm:text-xs font-medium">{propType}</Badge>
                {listing.energy_class && (
                  <Badge variant="outline" className="text-[11px] sm:text-xs gap-1 font-medium">
                    <span className={`w-2 h-2 rounded-full ${ENERGY_COLORS[listing.energy_class.toUpperCase()] || "bg-muted-foreground"}`} />
                    Energy {listing.energy_class}
                  </Badge>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-[2.75rem] font-extrabold text-foreground leading-tight tracking-tight">{translate.get("title")}</h1>
              {translate.isTranslated && (
                <p className="text-xs text-muted-foreground mt-1 italic">🌐 Auto-translated to {translate.browserLang.toUpperCase()}</p>
              )}
              <div className="flex items-center gap-2 mt-3 sm:mt-4 text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0 text-accent" />
                <span className="text-sm sm:text-base">{listing.address ? `${listing.address}, ` : ""}{listing.city}{listing.country ? `, ${listing.country}` : ""}</span>
              </div>

              {/* Desktop price block */}
              <div className="hidden md:flex mt-6 p-5 rounded-2xl bg-accent/[0.06] border border-accent/20 items-baseline gap-2">
                <span className="text-4xl font-extrabold text-accent tabular-nums">{listing.price.toLocaleString()}</span>
                <span className="text-lg text-muted-foreground font-medium">{listing.currency}</span>
                {priceLabel && <span className="text-base text-muted-foreground">{priceLabel}</span>}
              </div>

              {/* Mobile price block */}
              <div className="md:hidden mt-4 p-4 rounded-xl bg-accent/[0.06] border border-accent/20 flex items-baseline gap-1.5">
                <span className="text-2xl font-extrabold text-accent tabular-nums">{listing.price.toLocaleString()}</span>
                <span className="text-sm text-muted-foreground font-medium">{listing.currency}</span>
                {priceLabel && <span className="text-xs text-muted-foreground">{priceLabel}</span>}
              </div>

              <div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground">
                <Eye className="h-3.5 w-3.5" /> {listing.views_count || 0} views
              </div>
            </div>

            {/* Key specs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              {[
                { icon: Ruler, label: "Surface", value: `${listing.surface_sqm} m²`, show: listing.surface_sqm > 0 },
                { icon: Home, label: "Rooms", value: `${listing.rooms}`, show: listing.rooms > 0 },
                { icon: BedDouble, label: "Bedrooms", value: `${listing.bedrooms}`, show: listing.bedrooms > 0 },
                { icon: Bath, label: "Bathrooms", value: `${listing.bathrooms}`, show: listing.bathrooms > 0 },
              ].filter(s => s.show).map(s => (
                <div key={s.label} className="flex items-center gap-2.5 sm:gap-3 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-border bg-card">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                    <s.icon className="h-4.5 w-4.5 sm:h-5 sm:w-5 text-accent" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] sm:text-[11px] text-muted-foreground uppercase tracking-wider font-semibold truncate">{s.label}</div>
                    <div className="font-extrabold text-foreground text-lg sm:text-xl">{s.value}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Description */}
            {listing.description && (
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-foreground mb-3 sm:mb-4">About This Property</h2>
                <div className="text-muted-foreground whitespace-pre-wrap leading-relaxed text-sm sm:text-[15px]">{translate.get("description")}</div>
              </div>
            )}

            {/* Amenities */}
            {amenities.length > 0 && (
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-foreground mb-3 sm:mb-4">Amenities & Features</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                  {amenities.map(a => (
                    <div key={a.label} className="flex items-center gap-3 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-border bg-card">
                      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                        <a.icon className="h-4.5 w-4.5 sm:h-5 sm:w-5 text-accent" />
                      </div>
                      <span className="font-semibold text-foreground text-sm sm:text-base">{a.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Agency / Agent info */}
            {(listing.agency_name || listing.agent_name) && (
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-foreground mb-3 sm:mb-4">Listed by</h2>
                <div className="flex items-start gap-4 p-4 rounded-xl border border-border bg-card">
                  {listing.agency_logo_url && (
                    <img src={listing.agency_logo_url} alt={listing.agency_name || ""} className="w-14 h-14 rounded-xl object-cover shrink-0" />
                  )}
                  <div className="space-y-1 min-w-0">
                    {listing.agency_name && <p className="font-semibold text-foreground">{listing.agency_name}</p>}
                    {listing.agent_name && <p className="text-sm text-muted-foreground">Agent: {listing.agent_name}</p>}
                    {listing.license_number && <p className="text-xs text-muted-foreground">License: {listing.license_number}</p>}
                    {listing.company_registration && <p className="text-xs text-muted-foreground">Reg: {listing.company_registration}</p>}
                    <div className="flex gap-3 pt-1">
                      {listing.agency_phone && (
                        <a href={`tel:${listing.agency_phone}`} className="text-xs text-accent hover:underline">📞 {listing.agency_phone}</a>
                      )}
                      {listing.agency_email && (
                        <a href={`mailto:${listing.agency_email}`} className="text-xs text-accent hover:underline">✉️ Email</a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Map & Directions */}
            <ListingMapSection
              lat={listing.lat}
              lng={listing.lng}
              address={listing.address}
              city={listing.city}
              country={listing.country}
            />
            <div className="lg:hidden">
              <ContactCard
                listing={listing}
                tc={tc}
                priceLabel={priceLabel}
                contactForm={contactForm}
                setContactForm={setContactForm}
                submitting={submitting}
                submitted={submitted}
                handleSubmitContact={handleSubmitContact}
                handleShare={handleShare}
              />
            </div>
          </div>

          {/* ─── Desktop Sidebar ─── */}
          <div className="hidden lg:block space-y-5">
            <ContactCard
              listing={listing}
              tc={tc}
              priceLabel={priceLabel}
              contactForm={contactForm}
              setContactForm={setContactForm}
              submitting={submitting}
              submitted={submitted}
              handleSubmitContact={handleSubmitContact}
              handleShare={handleShare}
            />
          </div>
        </div>
      </div>

      {/* ─── Fullscreen Gallery ─── */}
      {fullscreenGallery && photos.length > 0 && (
        <div className="fixed inset-0 bg-foreground/95 z-[60] flex flex-col" onClick={() => setFullscreenGallery(false)}>
          <div className="flex items-center justify-between px-4 py-3 sm:p-4">
            <span className="text-background/80 text-sm font-medium">{photoIndex + 1} / {photos.length}</span>
            <button onClick={() => setFullscreenGallery(false)} className="text-background hover:opacity-70 text-sm font-semibold px-3 py-2 rounded-lg border border-background/20 min-h-[44px]">Close ✕</button>
          </div>
          <div className="flex-1 flex items-center justify-center px-2 sm:px-4" onClick={e => e.stopPropagation()}>
            <button onClick={() => setPhotoIndex(i => (i - 1 + photos.length) % photos.length)}
              className="text-background p-2 sm:p-3 hover:opacity-70 min-w-[44px] min-h-[44px] flex items-center justify-center"><ChevronLeft className="h-6 sm:h-8 w-6 sm:w-8" /></button>
            <div className="relative">
              <img src={photos[photoIndex]} alt={`Property photo ${photoIndex + 1}`} className="max-h-[70vh] sm:max-h-[75vh] max-w-[calc(100%-5rem)] object-contain rounded-xl" loading="lazy" />
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <span className="text-white/10 text-5xl font-black tracking-widest select-none rotate-[-15deg]">EASY-LOCS</span>
              </div>
            </div>
            <button onClick={() => setPhotoIndex(i => (i + 1) % photos.length)}
              className="text-background p-2 sm:p-3 hover:opacity-70 min-w-[44px] min-h-[44px] flex items-center justify-center"><ChevronRight className="h-6 sm:h-8 w-6 sm:w-8" /></button>
          </div>
          <div className="flex gap-2 justify-center px-4 py-3 sm:p-4 overflow-x-auto">
            {photos.map((url, i) => (
              <button key={i} onClick={(e) => { e.stopPropagation(); setPhotoIndex(i); }}
                className={`shrink-0 w-14 sm:w-16 h-10 sm:h-12 rounded-lg overflow-hidden border-2 transition-all ${
                  i === photoIndex ? "border-background scale-105" : "border-transparent opacity-40 hover:opacity-70"
                }`}>
                <img src={url} alt={`Thumbnail ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── Footer ─── */}
      <footer className="border-t border-border py-8 sm:py-10 px-4 mt-12 sm:mt-16 bg-card/50">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Easy-Locs — Global Property Management</p>
          <div className="flex gap-5 sm:gap-6">
            <Link to="/properties" className="hover:text-foreground transition-colors">All properties</Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ─── Contact Card Component ─── */
function ContactCard({
  listing, tc, priceLabel, contactForm, setContactForm,
  submitting, submitted, handleSubmitContact, handleShare,
}: {
  listing: Listing; tc: any; priceLabel: string;
  contactForm: { name: string; email: string; phone: string; message: string };
  setContactForm: (fn: (f: any) => any) => void;
  submitting: boolean; submitted: boolean;
  handleSubmitContact: () => void; handleShare: () => void;
}) {
  return (
    <div className="space-y-4 sm:space-y-5">
      <Card className="sticky top-[4.5rem] shadow-2xl border-2 border-accent/20 rounded-2xl overflow-hidden">
        <CardContent className="p-0">
          {/* Price header */}
          <div className="p-4 sm:p-6 bg-accent/[0.06] border-b border-accent/15">
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="text-2xl sm:text-3xl font-extrabold text-accent tabular-nums">{listing.price.toLocaleString()}</span>
              <span className="text-sm sm:text-base text-muted-foreground font-medium">{listing.currency}</span>
              {priceLabel && <span className="text-xs sm:text-sm text-muted-foreground">{priceLabel}</span>}
            </div>
            <Badge className={`mt-2 sm:mt-3 ${tc.bg} ${tc.color} border ${tc.border} text-[11px] sm:text-xs font-semibold px-2.5 sm:px-3 py-0.5 sm:py-1`}>{tc.label}</Badge>
          </div>

          {/* Contact form */}
          <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
            {submitted ? (
              <div className="text-center py-4 sm:py-6 space-y-3">
                <CheckCircle2 className="h-10 sm:h-12 w-10 sm:w-12 text-emerald-500 mx-auto" />
                <h3 className="font-bold text-foreground text-base sm:text-lg">Message Sent!</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">The property owner will contact you shortly.</p>
              </div>
            ) : (
              <>
                <h3 className="font-bold text-foreground text-base sm:text-lg">Interested? Contact the owner</h3>
                <div>
                  <Label className="text-[11px] sm:text-xs font-semibold">Your Name *</Label>
                  <Input value={contactForm.name} onChange={e => setContactForm((f: any) => ({ ...f, name: e.target.value }))} placeholder="John Doe" className="mt-1 sm:mt-1.5 rounded-lg h-11" />
                </div>
                <div>
                  <Label className="text-[11px] sm:text-xs font-semibold">Email *</Label>
                  <Input type="email" value={contactForm.email} onChange={e => setContactForm((f: any) => ({ ...f, email: e.target.value }))} placeholder="john@example.com" className="mt-1 sm:mt-1.5 rounded-lg h-11" />
                </div>
                <div>
                  <Label className="text-[11px] sm:text-xs font-semibold">Phone</Label>
                  <Input value={contactForm.phone} onChange={e => setContactForm((f: any) => ({ ...f, phone: e.target.value }))} placeholder="+33 6 12 34 56 78" className="mt-1 sm:mt-1.5 rounded-lg h-11" />
                </div>
                <div>
                  <Label className="text-[11px] sm:text-xs font-semibold">Message</Label>
                  <Textarea value={contactForm.message} onChange={e => setContactForm((f: any) => ({ ...f, message: e.target.value }))} rows={3}
                    placeholder={`I'm interested in this property ${listing.listing_type === "sale" ? "for sale" : "for rent"}…`}
                    className="mt-1 sm:mt-1.5 rounded-lg" />
                </div>
                <Button className="w-full h-12 font-bold text-sm sm:text-base rounded-xl" onClick={handleSubmitContact} disabled={submitting || !contactForm.name || !contactForm.email}>
                  <Send className="h-4 w-4 mr-2" /> {submitting ? "Sending…" : "Send Message"}
                </Button>

                {/* Trust signals */}
                <div className="flex items-center justify-center gap-3 pt-1">
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Shield className="h-3 w-3" /> Secure</span>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Star className="h-3 w-3" /> Free inquiry</span>
                </div>
              </>
            )}

            {(listing.contact_email || listing.contact_phone) && !submitted && (
              <>
                <Separator />
                <ListingContactButtons
                  contactEmail={listing.contact_email}
                  contactPhone={listing.contact_phone}
                  hasPhone={(listing as any).has_phone ?? !!listing.contact_phone}
                  hasWhatsapp={(listing as any).has_whatsapp ?? false}
                  listingTitle={listing.title}
                  listingUrl={`https://www.easy-locs.com/properties/${listing.slug}`}
                  listingPrice={`${listing.price.toLocaleString()} ${listing.currency}${priceLabel}`}
                  listingCity={listing.city}
                  listingCountry={listing.country}
                  listingId={listing.id}
                  orgId={listing.org_id}
                  source="real_estate"
                />
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardContent className="p-4 sm:p-5 space-y-3">
          <span className="text-xs sm:text-sm text-muted-foreground font-semibold uppercase tracking-wider">Share this listing</span>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" className="h-10 gap-2 rounded-lg text-xs font-medium"
              onClick={() => { const links = getShareLinks("real-estate", listing.slug, listing.title); window.open(links.whatsapp, "_blank"); }}>
              <MessageCircle className="h-4 w-4 shrink-0" /> WhatsApp
            </Button>
            <Button variant="outline" size="sm" className="h-10 gap-2 rounded-lg text-xs font-medium"
              onClick={() => { const links = getShareLinks("real-estate", listing.slug, listing.title); window.open(links.telegram, "_blank"); }}>
              <Send className="h-4 w-4 shrink-0" /> Telegram
            </Button>
            <Button variant="outline" size="sm" className="h-10 gap-2 rounded-lg text-xs font-medium col-span-2" onClick={handleShare}>
              <Share2 className="h-3.5 w-3.5 shrink-0" /> Copy link
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
