import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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
  Building, Armchair, Zap, ChevronLeft, ChevronRight, Send,
  Mail, Phone, Share2, ArrowLeft, Eye, CheckCircle2,
} from "lucide-react";

interface Listing {
  id: string; title: string; description: string; listing_type: string;
  price: number; currency: string; property_type: string; country: string;
  city: string; address: string; surface_sqm: number; rooms: number;
  bedrooms: number; bathrooms: number; photo_urls: string[]; slug: string;
  contact_email: string; contact_phone: string; features: any;
  parking: boolean; garden: boolean; terrace: boolean; elevator: boolean;
  furnished: boolean; energy_class: string; org_id: string; views_count: number;
}

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; accent: string }> = {
  sale:            { label: "For Sale",         color: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-500/10",  border: "border-emerald-500/30", accent: "emerald" },
  long_term_rent:  { label: "Long-term Rent",   color: "text-sky-700 dark:text-sky-300",        bg: "bg-sky-500/10",      border: "border-sky-500/30",     accent: "sky" },
  seasonal_rent:   { label: "Seasonal Rental",   color: "text-amber-700 dark:text-amber-300",    bg: "bg-amber-500/10",    border: "border-amber-500/30",   accent: "amber" },
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
  seasonal_rent: "/night",
};

export default function PublicRealEstateListing() {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [contactForm, setContactForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [fullscreenGallery, setFullscreenGallery] = useState(false);

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
    const { error } = await supabase.from("real_estate_leads").insert({
      org_id: listing.org_id, listing_id: listing.id,
      name: contactForm.name, email: contactForm.email,
      phone: contactForm.phone, message: contactForm.message,
    });
    setSubmitting(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setSubmitted(true);
    toast({ title: "✅ Message sent!", description: "The owner will contact you shortly." });
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
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-pulse space-y-4 w-full max-w-2xl px-4">
        <div className="h-80 bg-muted rounded-2xl" />
        <div className="h-8 bg-muted rounded w-3/4" />
        <div className="h-5 bg-muted rounded w-1/2" />
      </div>
    </div>
  );

  if (!listing) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-5">
      <Home className="h-20 w-20 text-muted-foreground/15" />
      <p className="text-muted-foreground text-xl font-medium">Listing not found</p>
      <Link to="/properties"><Button variant="outline" className="rounded-lg"><ArrowLeft className="h-4 w-4 mr-2" /> Browse properties</Button></Link>
    </div>
  );

  const photos = listing.photo_urls || [];
  const tc = TYPE_CONFIG[listing.listing_type] || TYPE_CONFIG.sale;
  const priceLabel = PRICE_LABEL[listing.listing_type] || "";
  const amenities = [
    listing.parking && { label: "Parking", icon: Car },
    listing.garden && { label: "Garden", icon: TreePine },
    listing.terrace && { label: "Terrace / Balcony", icon: Sun },
    listing.elevator && { label: "Elevator", icon: Building },
    listing.furnished && { label: "Furnished", icon: Armchair },
  ].filter(Boolean) as { label: string; icon: any }[];

  const seoTitle = `${listing.title} — ${tc.label} in ${listing.city}${listing.country ? `, ${listing.country}` : ""} | Easy-Locs`;
  const seoDescription = `${tc.label}: ${listing.title} in ${listing.city}. ${listing.surface_sqm > 0 ? listing.surface_sqm + "m², " : ""}${listing.bedrooms > 0 ? listing.bedrooms + " bedrooms, " : ""}${listing.price.toLocaleString()} ${listing.currency}${priceLabel}. Contact the owner directly.`;

  const seoJsonLd = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: listing.title,
    description: listing.description || seoDescription,
    url: `https://www.easy-locs.com/properties/${listing.slug}`,
    image: photos[0] || undefined,
    address: {
      "@type": "PostalAddress",
      addressLocality: listing.city,
      addressCountry: listing.country,
      streetAddress: listing.address,
    },
    offers: {
      "@type": "Offer",
      price: listing.price,
      priceCurrency: listing.currency,
      availability: "https://schema.org/InStock",
    },
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={seoTitle}
        description={seoDescription}
        canonical={`https://www.easy-locs.com/properties/${listing.slug}`}
        jsonLd={seoJsonLd}
      />

      {/* ─── Header ─── */}
      <header className="border-b border-border bg-card/95 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 py-3">
          <div className="flex items-center gap-4">
            <AppLogo variant="header" linkTo="/" />
            <Link to="/properties" className="text-sm text-muted-foreground hover:text-foreground hidden sm:flex items-center gap-1.5 transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" /> All properties
            </Link>
          </div>
          <div className="flex gap-2 items-center">
            <Button variant="ghost" size="sm" onClick={handleShare} className="gap-1.5 text-muted-foreground hover:text-foreground rounded-lg">
              <Share2 className="h-4 w-4" /> <span className="hidden sm:inline">Share</span>
            </Button>
            <Link to="/signup" className="bg-primary text-primary-foreground text-sm font-semibold px-5 py-2 rounded-lg hover:opacity-90 transition-opacity">Sign up</Link>
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
                  <img src={photos[0]} alt={listing.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                {photos.slice(1, 5).map((url, i) => (
                  <div key={i}
                    className={`relative overflow-hidden cursor-pointer group ${
                      i === 1 ? "rounded-tr-2xl" : i === 3 ? "rounded-br-2xl" : ""
                    }`}
                    onClick={() => { setPhotoIndex(i + 1); setFullscreenGallery(true); }}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
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

              {/* Mobile carousel */}
              <div className="md:hidden relative aspect-[4/3] overflow-hidden">
                <img src={photos[photoIndex]} alt={listing.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/40 via-transparent to-transparent" />
                {photos.length > 1 && (
                  <>
                    <button onClick={() => setPhotoIndex(i => (i - 1 + photos.length) % photos.length)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-md rounded-full p-2.5 active:scale-95 shadow-lg">
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button onClick={() => setPhotoIndex(i => (i + 1) % photos.length)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-md rounded-full p-2.5 active:scale-95 shadow-lg">
                      <ChevronRight className="h-5 w-5" />
                    </button>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {photos.slice(0, 8).map((_, i) => (
                        <button key={i} onClick={() => setPhotoIndex(i)}
                          className={`w-2 h-2 rounded-full transition-all ${i === photoIndex ? "bg-background w-5" : "bg-background/50"}`} />
                      ))}
                    </div>
                  </>
                )}
                {/* Mobile type badge */}
                <Badge className={`absolute top-4 left-4 ${tc.bg} ${tc.color} border ${tc.border} text-sm px-3 py-1.5 font-semibold backdrop-blur-md`}>
                  {tc.label}
                </Badge>
                {/* Mobile price overlay */}
                <div className="absolute bottom-4 left-4">
                  <span className="text-2xl font-bold text-background drop-shadow-lg tabular-nums">
                    {listing.price.toLocaleString()} {listing.currency}
                  </span>
                  {priceLabel && <span className="text-background/80 text-sm ml-1">{priceLabel}</span>}
                </div>
              </div>
            </>
          ) : (
            <div className="aspect-[16/9] md:aspect-[3/1] bg-muted flex items-center justify-center">
              <Home className="h-24 w-24 text-muted-foreground/10" />
            </div>
          )}
        </div>
      </section>

      {/* ─── Content ─── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-10">
            {/* Title + Price block */}
            <div>
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge className={`${tc.bg} ${tc.color} border ${tc.border} text-xs font-semibold px-3 py-1`}>
                  {tc.label}
                </Badge>
                <Badge variant="outline" className="text-xs font-medium">{PROPERTY_TYPES[listing.property_type] || listing.property_type}</Badge>
                {listing.energy_class && (
                  <Badge variant="outline" className="text-xs gap-1.5 font-medium">
                    <span className={`w-2.5 h-2.5 rounded-full ${ENERGY_COLORS[listing.energy_class.toUpperCase()] || "bg-muted-foreground"}`} />
                    Energy {listing.energy_class}
                  </Badge>
                )}
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-extrabold text-foreground leading-tight tracking-tight">{listing.title}</h1>
              <div className="flex items-center gap-2 mt-4 text-muted-foreground">
                <MapPin className="h-4.5 w-4.5 shrink-0 text-accent" />
                <span className="text-base">{listing.address ? `${listing.address}, ` : ""}{listing.city}{listing.country ? `, ${listing.country}` : ""}</span>
              </div>

              {/* Desktop price block */}
              <div className="hidden md:flex mt-6 p-5 rounded-2xl bg-accent/[0.06] border border-accent/20 items-baseline gap-2">
                <span className="text-4xl font-extrabold text-accent tabular-nums">{listing.price.toLocaleString()}</span>
                <span className="text-lg text-muted-foreground font-medium">{listing.currency}</span>
                {priceLabel && <span className="text-base text-muted-foreground">{priceLabel}</span>}
              </div>

              <div className="flex items-center gap-1.5 mt-4 text-xs text-muted-foreground">
                <Eye className="h-3.5 w-3.5" /> {listing.views_count || 0} views
              </div>
            </div>

            {/* Key specs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { icon: Ruler, label: "Surface", value: `${listing.surface_sqm} m²`, show: listing.surface_sqm > 0 },
                { icon: Home, label: "Rooms", value: `${listing.rooms}`, show: listing.rooms > 0 },
                { icon: BedDouble, label: "Bedrooms", value: `${listing.bedrooms}`, show: listing.bedrooms > 0 },
                { icon: Bath, label: "Bathrooms", value: `${listing.bathrooms}`, show: listing.bathrooms > 0 },
              ].filter(s => s.show).map(s => (
                <div key={s.label} className="flex items-center gap-3 p-4 rounded-2xl border border-border bg-card hover:bg-muted/30 transition-colors">
                  <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                    <s.icon className="h-5.5 w-5.5 text-accent" />
                  </div>
                  <div>
                    <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">{s.label}</div>
                    <div className="font-extrabold text-foreground text-xl">{s.value}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Description */}
            {listing.description && (
              <div>
                <h2 className="text-xl font-bold text-foreground mb-4">About This Property</h2>
                <div className="text-muted-foreground whitespace-pre-wrap leading-relaxed text-[15px]">{listing.description}</div>
              </div>
            )}

            {/* Amenities */}
            {amenities.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-foreground mb-4">Amenities & Features</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {amenities.map(a => (
                    <div key={a.label} className="flex items-center gap-3 p-4 rounded-2xl border border-border bg-card hover:bg-muted/20 transition-colors">
                      <div className="w-11 h-11 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                        <a.icon className="h-5 w-5 text-accent" />
                      </div>
                      <span className="font-semibold text-foreground">{a.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mobile CTA */}
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
          <div className="flex items-center justify-between p-4">
            <span className="text-background/80 text-sm font-medium">{photoIndex + 1} / {photos.length}</span>
            <button onClick={() => setFullscreenGallery(false)} className="text-background hover:opacity-70 text-sm font-semibold px-3 py-1.5 rounded-lg border border-background/20">Close ✕</button>
          </div>
          <div className="flex-1 flex items-center justify-center px-4" onClick={e => e.stopPropagation()}>
            <button onClick={() => setPhotoIndex(i => (i - 1 + photos.length) % photos.length)}
              className="text-background p-3 hover:opacity-70"><ChevronLeft className="h-8 w-8" /></button>
            <img src={photos[photoIndex]} alt="" className="max-h-[75vh] max-w-full object-contain rounded-xl" />
            <button onClick={() => setPhotoIndex(i => (i + 1) % photos.length)}
              className="text-background p-3 hover:opacity-70"><ChevronRight className="h-8 w-8" /></button>
          </div>
          <div className="flex gap-2 justify-center p-4 overflow-x-auto">
            {photos.map((url, i) => (
              <button key={i} onClick={(e) => { e.stopPropagation(); setPhotoIndex(i); }}
                className={`shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                  i === photoIndex ? "border-background scale-105" : "border-transparent opacity-40 hover:opacity-70"
                }`}>
                <img src={url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── Footer ─── */}
      <footer className="border-t border-border py-10 px-4 mt-16 bg-card/50">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Easy-Locs — Global Property Management</p>
          <div className="flex gap-6">
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
    <div className="space-y-5">
      <Card className="sticky top-20 shadow-2xl border-2 border-accent/20 rounded-2xl overflow-hidden">
        <CardContent className="p-0">
          {/* Price header */}
          <div className="p-6 bg-accent/[0.06] border-b border-accent/15">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold text-accent tabular-nums">{listing.price.toLocaleString()}</span>
              <span className="text-base text-muted-foreground font-medium">{listing.currency}</span>
              {priceLabel && <span className="text-sm text-muted-foreground">{priceLabel}</span>}
            </div>
            <Badge className={`mt-3 ${tc.bg} ${tc.color} border ${tc.border} text-xs font-semibold px-3 py-1`}>{tc.label}</Badge>
          </div>

          {/* Contact form */}
          <div className="p-6 space-y-4">
            {submitted ? (
              <div className="text-center py-6 space-y-3">
                <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
                <h3 className="font-bold text-foreground text-lg">Message Sent!</h3>
                <p className="text-sm text-muted-foreground">The property owner will contact you shortly.</p>
              </div>
            ) : (
              <>
                <h3 className="font-bold text-foreground text-lg">Interested? Contact the owner</h3>
                <div>
                  <Label className="text-xs font-semibold">Your Name *</Label>
                  <Input value={contactForm.name} onChange={e => setContactForm((f: any) => ({ ...f, name: e.target.value }))} placeholder="John Doe" className="mt-1.5 rounded-lg h-11" />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Email *</Label>
                  <Input type="email" value={contactForm.email} onChange={e => setContactForm((f: any) => ({ ...f, email: e.target.value }))} placeholder="john@example.com" className="mt-1.5 rounded-lg h-11" />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Phone</Label>
                  <Input value={contactForm.phone} onChange={e => setContactForm((f: any) => ({ ...f, phone: e.target.value }))} placeholder="+33 6 12 34 56 78" className="mt-1.5 rounded-lg h-11" />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Message</Label>
                  <Textarea value={contactForm.message} onChange={e => setContactForm((f: any) => ({ ...f, message: e.target.value }))} rows={3}
                    placeholder={`I'm interested in this property ${listing.listing_type === "sale" ? "for sale" : "for rent"}…`}
                    className="mt-1.5 rounded-lg" />
                </div>
                <Button className="w-full h-12 font-bold text-base rounded-xl" onClick={handleSubmitContact} disabled={submitting || !contactForm.name || !contactForm.email}>
                  <Send className="h-4 w-4 mr-2" /> {submitting ? "Sending…" : "Send Message"}
                </Button>
              </>
            )}

            {(listing.contact_email || listing.contact_phone) && !submitted && (
              <>
                <Separator />
                <div className="space-y-2.5">
                  <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-widest">Or contact directly</p>
                  {listing.contact_email && (
                    <a href={`mailto:${listing.contact_email}`} className="flex items-center gap-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors p-2 rounded-lg hover:bg-muted/50">
                      <Mail className="h-4 w-4 text-accent" /> {listing.contact_email}
                    </a>
                  )}
                  {listing.contact_phone && (
                    <a href={`tel:${listing.contact_phone}`} className="flex items-center gap-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors p-2 rounded-lg hover:bg-muted/50">
                      <Phone className="h-4 w-4 text-accent" /> {listing.contact_phone}
                    </a>
                  )}
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardContent className="p-4 flex items-center justify-between">
          <span className="text-sm text-muted-foreground font-medium">Share this listing</span>
          <Button variant="outline" size="sm" onClick={handleShare} className="gap-1.5 rounded-lg">
            <Share2 className="h-3.5 w-3.5" /> Share
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
