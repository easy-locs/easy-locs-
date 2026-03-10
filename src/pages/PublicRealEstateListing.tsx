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
  Mail, Phone, Share2, ArrowLeft, Heart, Eye, Calendar,
  Tag,
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

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  sale:            { label: "For Sale",        color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/25" },
  long_term_rent:  { label: "For Rent",        color: "text-sky-700 dark:text-sky-400",        bg: "bg-sky-500/15 border-sky-500/25" },
  seasonal_rent:   { label: "Seasonal Rental",  color: "text-amber-700 dark:text-amber-400",    bg: "bg-amber-500/15 border-amber-500/25" },
};

const PROPERTY_TYPES: Record<string, string> = {
  apartment: "Apartment", house: "House", studio: "Studio", villa: "Villa",
  office: "Office", land: "Land", commercial: "Commercial",
};

const ENERGY_COLORS: Record<string, string> = {
  A: "bg-emerald-500", B: "bg-emerald-400", C: "bg-lime-500", D: "bg-yellow-400",
  E: "bg-amber-500", F: "bg-orange-500", G: "bg-destructive",
};

export default function PublicRealEstateListing() {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [contactForm, setContactForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
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
    toast({ title: "✅ Message sent!", description: "The owner will contact you shortly." });
    setContactForm({ name: "", email: "", phone: "", message: "" });
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
      <div className="animate-pulse space-y-4 w-full max-w-xl px-4">
        <div className="h-64 bg-muted rounded-2xl" />
        <div className="h-6 bg-muted rounded w-3/4" />
        <div className="h-4 bg-muted rounded w-1/2" />
      </div>
    </div>
  );

  if (!listing) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
      <Home className="h-16 w-16 text-muted-foreground/20" />
      <p className="text-muted-foreground text-lg">Listing not found</p>
      <Link to="/properties"><Button variant="outline"><ArrowLeft className="h-4 w-4 mr-1" /> Browse properties</Button></Link>
    </div>
  );

  const photos = listing.photo_urls || [];
  const tc = TYPE_CONFIG[listing.listing_type] || TYPE_CONFIG.sale;
  const amenities = [
    listing.parking && { label: "Parking", icon: Car },
    listing.garden && { label: "Garden", icon: TreePine },
    listing.terrace && { label: "Terrace / Balcony", icon: Sun },
    listing.elevator && { label: "Elevator", icon: Building },
    listing.furnished && { label: "Furnished", icon: Armchair },
  ].filter(Boolean) as { label: string; icon: any }[];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={`${listing.title} — ${tc.label} | Easy-Locs`}
        description={`${listing.title} in ${listing.city}. ${listing.surface_sqm}m², ${listing.rooms} rooms, ${listing.bedrooms} bedrooms. ${listing.price.toLocaleString()} ${listing.currency}`}
      />

      {/* ─── Sticky Header ─── */}
      <header className="border-b border-border bg-card/90 backdrop-blur-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-4">
            <AppLogo variant="header" linkTo="/" />
            <Link to="/properties" className="text-sm text-muted-foreground hover:text-foreground hidden sm:flex items-center gap-1 transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" /> Properties
            </Link>
          </div>
          <div className="flex gap-2 items-center">
            <Button variant="ghost" size="sm" onClick={handleShare} className="gap-1.5 text-muted-foreground hover:text-foreground">
              <Share2 className="h-4 w-4" /> <span className="hidden sm:inline">Share</span>
            </Button>
            <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 hidden sm:block">Login</Link>
            <Link to="/signup" className="bg-primary text-primary-foreground text-sm font-semibold px-4 py-1.5 rounded-lg hover:opacity-90 transition-opacity">Sign up</Link>
          </div>
        </div>
      </header>

      {/* ─── Photo Gallery ─── */}
      <section className="bg-muted/30">
        <div className="max-w-7xl mx-auto">
          {photos.length > 0 ? (
            <>
              {/* Desktop: grid layout */}
              <div className="hidden md:grid grid-cols-4 grid-rows-2 gap-1.5 p-1.5 max-h-[480px]">
                {/* Main photo */}
                <div className="col-span-2 row-span-2 relative rounded-l-xl overflow-hidden cursor-pointer group" onClick={() => setFullscreenGallery(true)}>
                  <img src={photos[0]} alt={listing.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <Badge className={`absolute top-4 left-4 ${tc.bg} ${tc.color} border text-sm px-3 py-1`}>
                    {tc.label}
                  </Badge>
                </div>
                {/* Secondary photos */}
                {photos.slice(1, 5).map((url, i) => (
                  <div key={i}
                    className={`relative overflow-hidden cursor-pointer group ${
                      i === 1 ? "rounded-tr-xl" : i === 3 ? "rounded-br-xl" : ""
                    }`}
                    onClick={() => { setPhotoIndex(i + 1); setFullscreenGallery(true); }}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                    {i === 3 && photos.length > 5 && (
                      <div className="absolute inset-0 bg-foreground/40 flex items-center justify-center">
                        <span className="text-background font-bold text-lg">+{photos.length - 5} photos</span>
                      </div>
                    )}
                  </div>
                ))}
                {/* Fill empty slots */}
                {photos.length < 5 && Array.from({ length: Math.max(0, 4 - (photos.length - 1)) }).map((_, i) => (
                  <div key={`empty-${i}`} className="bg-muted flex items-center justify-center">
                    <Home className="h-8 w-8 text-muted-foreground/15" />
                  </div>
                ))}
              </div>

              {/* Mobile: carousel */}
              <div className="md:hidden relative aspect-[4/3] overflow-hidden">
                <img src={photos[photoIndex]} alt={listing.title} className="w-full h-full object-cover" />
                {photos.length > 1 && (
                  <>
                    <button onClick={() => setPhotoIndex(i => (i - 1 + photos.length) % photos.length)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur rounded-full p-2 active:scale-95">
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button onClick={() => setPhotoIndex(i => (i + 1) % photos.length)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur rounded-full p-2 active:scale-95">
                      <ChevronRight className="h-5 w-5" />
                    </button>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {photos.slice(0, 8).map((_, i) => (
                        <button key={i} onClick={() => setPhotoIndex(i)}
                          className={`w-2 h-2 rounded-full transition-all ${i === photoIndex ? "bg-background w-4" : "bg-background/50"}`} />
                      ))}
                    </div>
                  </>
                )}
                <Badge className={`absolute top-3 left-3 ${tc.bg} ${tc.color} border text-sm px-3 py-1`}>
                  {tc.label}
                </Badge>
              </div>
            </>
          ) : (
            <div className="aspect-[16/9] md:aspect-[3/1] bg-muted flex items-center justify-center">
              <Home className="h-20 w-20 text-muted-foreground/15" />
            </div>
          )}
        </div>
      </section>

      {/* ─── Content ─── */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Title block */}
            <div>
              <div className="flex flex-wrap gap-2 mb-3">
                <Badge variant="outline" className="text-xs">{PROPERTY_TYPES[listing.property_type] || listing.property_type}</Badge>
                <Badge variant="outline" className={`text-xs ${tc.bg} ${tc.color} border`}>{tc.label}</Badge>
                {listing.energy_class && (
                  <Badge variant="outline" className="text-xs gap-1">
                    <span className={`w-2 h-2 rounded-full ${ENERGY_COLORS[listing.energy_class.toUpperCase()] || "bg-muted-foreground"}`} />
                    Energy {listing.energy_class}
                  </Badge>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground leading-tight">{listing.title}</h1>
              <div className="flex items-center gap-2 mt-3 text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0 text-primary" />
                <span className="text-sm">{listing.address ? `${listing.address}, ` : ""}{listing.city}{listing.country ? `, ${listing.country}` : ""}</span>
              </div>

              {/* Price block */}
              <div className="mt-5 p-4 rounded-xl bg-muted/50 border border-border inline-flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-bold text-primary tabular-nums">{listing.price.toLocaleString()}</span>
                <span className="text-lg text-muted-foreground">{listing.currency}</span>
                {listing.listing_type !== "sale" && <span className="text-sm text-muted-foreground">/month</span>}
              </div>

              {/* Views */}
              <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
                <Eye className="h-3 w-3" /> {listing.views_count || 0} views
              </div>
            </div>

            {/* Key specs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: Ruler, label: "Surface", value: `${listing.surface_sqm} m²`, show: listing.surface_sqm > 0 },
                { icon: Home, label: "Rooms", value: `${listing.rooms}`, show: listing.rooms > 0 },
                { icon: BedDouble, label: "Bedrooms", value: `${listing.bedrooms}`, show: listing.bedrooms > 0 },
                { icon: Bath, label: "Bathrooms", value: `${listing.bathrooms}`, show: listing.bathrooms > 0 },
              ].filter(s => s.show).map(s => (
                <div key={s.label} className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card">
                  <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center">
                    <s.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{s.label}</div>
                    <div className="font-bold text-foreground text-lg">{s.value}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Description */}
            {listing.description && (
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Tag className="h-5 w-5 text-primary" /> Description
                </h2>
                <div className="text-muted-foreground whitespace-pre-wrap leading-relaxed text-[15px]">{listing.description}</div>
              </div>
            )}

            {/* Amenities */}
            {amenities.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-4">Amenities & Features</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {amenities.map(a => (
                    <div key={a.label} className="flex items-center gap-3 p-3.5 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <a.icon className="h-5 w-5 text-primary" />
                      </div>
                      <span className="font-medium text-foreground">{a.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ─── Sidebar ─── */}
          <div className="space-y-4">
            {/* CTA Card */}
            <Card className="sticky top-16 shadow-xl border-2 border-primary/20">
              <CardContent className="p-0">
                {/* Price header */}
                <div className="p-5 bg-primary/5 border-b border-border">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-primary tabular-nums">{listing.price.toLocaleString()}</span>
                    <span className="text-sm text-muted-foreground">{listing.currency}</span>
                    {listing.listing_type !== "sale" && <span className="text-xs text-muted-foreground">/month</span>}
                  </div>
                  <Badge className={`mt-2 ${tc.bg} ${tc.color} border text-xs`}>{tc.label}</Badge>
                </div>

                {/* Contact form */}
                <div className="p-5 space-y-3">
                  <h3 className="font-semibold text-foreground">Contact the owner</h3>
                  <div>
                    <Label className="text-xs">Your Name *</Label>
                    <Input value={contactForm.name} onChange={e => setContactForm(f => ({ ...f, name: e.target.value }))} placeholder="John Doe" className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Email *</Label>
                    <Input type="email" value={contactForm.email} onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))} placeholder="john@example.com" className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Phone</Label>
                    <Input value={contactForm.phone} onChange={e => setContactForm(f => ({ ...f, phone: e.target.value }))} placeholder="+33 6 12 34 56 78" className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Message</Label>
                    <Textarea value={contactForm.message} onChange={e => setContactForm(f => ({ ...f, message: e.target.value }))} rows={3} placeholder={`I'm interested in this property ${listing.listing_type === "sale" ? "for sale" : "for rent"}…`} className="mt-1" />
                  </div>
                  <Button className="w-full h-11 font-semibold text-base" onClick={handleSubmitContact} disabled={submitting || !contactForm.name || !contactForm.email}>
                    <Send className="h-4 w-4 mr-2" /> {submitting ? "Sending…" : "Send Message"}
                  </Button>

                  {(listing.contact_email || listing.contact_phone) && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">Or contact directly</p>
                        {listing.contact_email && (
                          <a href={`mailto:${listing.contact_email}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                            <Mail className="h-4 w-4" /> {listing.contact_email}
                          </a>
                        )}
                        {listing.contact_phone && (
                          <a href={`tel:${listing.contact_phone}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                            <Phone className="h-4 w-4" /> {listing.contact_phone}
                          </a>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Share card */}
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Share this listing</span>
                <Button variant="outline" size="sm" onClick={handleShare} className="gap-1.5">
                  <Share2 className="h-3.5 w-3.5" /> Share
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* ─── Fullscreen Gallery Modal ─── */}
      {fullscreenGallery && photos.length > 0 && (
        <div className="fixed inset-0 bg-foreground/90 z-[60] flex flex-col" onClick={() => setFullscreenGallery(false)}>
          <div className="flex items-center justify-between p-4">
            <span className="text-background text-sm">{photoIndex + 1} / {photos.length}</span>
            <button onClick={() => setFullscreenGallery(false)} className="text-background hover:opacity-70 text-sm font-medium">Close ✕</button>
          </div>
          <div className="flex-1 flex items-center justify-center px-4" onClick={e => e.stopPropagation()}>
            <button onClick={() => setPhotoIndex(i => (i - 1 + photos.length) % photos.length)}
              className="text-background p-3 hover:opacity-70"><ChevronLeft className="h-8 w-8" /></button>
            <img src={photos[photoIndex]} alt="" className="max-h-[75vh] max-w-full object-contain rounded-lg" />
            <button onClick={() => setPhotoIndex(i => (i + 1) % photos.length)}
              className="text-background p-3 hover:opacity-70"><ChevronRight className="h-8 w-8" /></button>
          </div>
          <div className="flex gap-2 justify-center p-4 overflow-x-auto">
            {photos.map((url, i) => (
              <button key={i} onClick={(e) => { e.stopPropagation(); setPhotoIndex(i); }}
                className={`shrink-0 w-16 h-11 rounded-lg overflow-hidden border-2 transition-colors ${
                  i === photoIndex ? "border-background" : "border-transparent opacity-50 hover:opacity-75"
                }`}>
                <img src={url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4 mt-12">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Easy-Locs</p>
          <div className="flex gap-4">
            <Link to="/properties" className="hover:text-foreground">All properties</Link>
            <Link to="/terms" className="hover:text-foreground">Terms</Link>
            <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
