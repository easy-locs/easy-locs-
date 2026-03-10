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
  Mail, Phone, Share2, ArrowLeft,
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

const TYPE_LABELS: Record<string, string> = {
  sale: "For Sale", long_term_rent: "For Rent", seasonal_rent: "Seasonal Rental",
};

const PROPERTY_TYPES: Record<string, string> = {
  apartment: "Apartment", house: "House", studio: "Studio", villa: "Villa",
  office: "Office", land: "Land", commercial: "Commercial",
};

export default function PublicRealEstateListing() {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [contactForm, setContactForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [thumbnailView, setThumbnailView] = useState(false);

  useEffect(() => {
    if (!slug) return;
    const load = async () => {
      const { data } = await supabase.rpc("get_public_real_estate_listing", { p_slug: slug });
      setListing(data as any);
      setLoading(false);
      // Increment views
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
    toast({ title: "Message sent!", description: "The owner will contact you shortly." });
    setContactForm({ name: "", email: "", phone: "", message: "" });
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: listing?.title, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({ title: "Link copied!" });
    }
  };

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Loading…</div>;
  if (!listing) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
      <Home className="h-16 w-16 text-muted-foreground/20" />
      <p className="text-muted-foreground text-lg">Listing not found</p>
      <Link to="/properties"><Button variant="outline"><ArrowLeft className="h-4 w-4 mr-1" /> Browse properties</Button></Link>
    </div>
  );

  const photos = listing.photo_urls || [];
  const amenities = [
    listing.parking && { label: "Parking", icon: Car },
    listing.garden && { label: "Garden", icon: TreePine },
    listing.terrace && { label: "Terrace", icon: Sun },
    listing.elevator && { label: "Elevator", icon: Building },
    listing.furnished && { label: "Furnished", icon: Armchair },
  ].filter(Boolean) as { label: string; icon: any }[];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={`${listing.title} — ${TYPE_LABELS[listing.listing_type]} | Easy-Locs`}
        description={`${listing.title} in ${listing.city}. ${listing.surface_sqm}m², ${listing.rooms} rooms, ${listing.bedrooms} bedrooms. ${listing.price.toLocaleString()} ${listing.currency}`}
      />

      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <AppLogo variant="header" linkTo="/" />
            <Link to="/properties" className="text-sm text-muted-foreground hover:text-foreground hidden sm:flex items-center gap-1">
              <ArrowLeft className="h-3.5 w-3.5" /> All properties
            </Link>
          </div>
          <div className="flex gap-2 items-center">
            <Button variant="ghost" size="sm" onClick={handleShare} className="gap-1.5">
              <Share2 className="h-4 w-4" /> Share
            </Button>
            <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground px-3 py-1.5">Login</Link>
            <Link to="/signup" className="bg-gradient-gold text-accent-foreground text-sm font-semibold px-4 py-1.5 rounded-lg">Sign up</Link>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
        {/* Photo gallery */}
        {photos.length > 0 ? (
          <div className="space-y-3 mb-8">
            {/* Main photo */}
            <div className="relative rounded-2xl overflow-hidden aspect-[16/9] sm:aspect-[2/1] bg-muted">
              <img src={photos[photoIndex]} alt={listing.title} className="w-full h-full object-cover" />
              {photos.length > 1 && (
                <>
                  <button onClick={() => setPhotoIndex(i => (i - 1 + photos.length) % photos.length)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur rounded-full p-2 hover:bg-background transition-colors">
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button onClick={() => setPhotoIndex(i => (i + 1) % photos.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur rounded-full p-2 hover:bg-background transition-colors">
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <div className="absolute bottom-3 right-3 bg-background/80 backdrop-blur text-foreground text-xs px-2.5 py-1 rounded-full">
                    {photoIndex + 1} / {photos.length}
                  </div>
                </>
              )}
              <Badge className="absolute top-4 left-4 bg-primary text-primary-foreground text-sm px-3 py-1 border-0">
                {TYPE_LABELS[listing.listing_type]}
              </Badge>
            </div>
            {/* Thumbnail strip */}
            {photos.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {photos.map((url, i) => (
                  <button key={i} onClick={() => setPhotoIndex(i)}
                    className={`shrink-0 w-20 h-14 rounded-lg overflow-hidden border-2 transition-colors ${
                      i === photoIndex ? "border-primary" : "border-transparent hover:border-muted-foreground/30"
                    }`}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-2xl bg-muted aspect-[16/9] sm:aspect-[2/1] flex items-center justify-center mb-8">
            <Home className="h-20 w-20 text-muted-foreground/20" />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Title & price */}
            <div>
              <div className="flex flex-wrap gap-2 mb-2">
                <Badge variant="outline">{PROPERTY_TYPES[listing.property_type] || listing.property_type}</Badge>
                {listing.energy_class && <Badge variant="outline" className="gap-1"><Zap className="h-3 w-3" /> {listing.energy_class}</Badge>}
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{listing.title}</h1>
              <div className="flex items-center gap-2 mt-2 text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0" />
                <span>{listing.address ? `${listing.address}, ` : ""}{listing.city}{listing.country ? `, ${listing.country}` : ""}</span>
              </div>
              <div className="mt-4">
                <span className="text-3xl sm:text-4xl font-bold text-primary">{listing.price.toLocaleString()} {listing.currency}</span>
                {listing.listing_type !== "sale" && <span className="text-muted-foreground ml-1 text-lg">/month</span>}
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
                <Card key={s.label} className="bg-muted/30">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <s.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">{s.label}</div>
                      <div className="font-bold text-foreground text-lg">{s.value}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Description */}
            {listing.description && (
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-3">Description</h2>
                <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">{listing.description}</p>
              </div>
            )}

            {/* Amenities */}
            {amenities.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-4">Amenities</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {amenities.map(a => (
                    <div key={a.label} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
                      <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center">
                        <a.icon className="h-4 w-4 text-primary" />
                      </div>
                      <span className="text-sm font-medium text-foreground">{a.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Contact form */}
          <div className="space-y-4">
            <Card className="sticky top-20 shadow-lg">
              <CardContent className="p-6 space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Interested? Contact the owner</h3>
                <div className="space-y-3">
                  <div><Label>Your Name *</Label><Input value={contactForm.name} onChange={e => setContactForm(f => ({ ...f, name: e.target.value }))} placeholder="John Doe" /></div>
                  <div><Label>Email *</Label><Input type="email" value={contactForm.email} onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))} placeholder="john@example.com" /></div>
                  <div><Label>Phone</Label><Input value={contactForm.phone} onChange={e => setContactForm(f => ({ ...f, phone: e.target.value }))} placeholder="+33 6 12 34 56 78" /></div>
                  <div><Label>Message</Label><Textarea value={contactForm.message} onChange={e => setContactForm(f => ({ ...f, message: e.target.value }))} rows={4} placeholder="I'm interested in this property…" /></div>
                  <Button className="w-full" onClick={handleSubmitContact} disabled={submitting || !contactForm.name || !contactForm.email}>
                    <Send className="h-4 w-4 mr-1" /> {submitting ? "Sending…" : "Send Message"}
                  </Button>
                </div>

                {(listing.contact_email || listing.contact_phone) && (
                  <>
                    <Separator />
                    <div className="space-y-2 text-sm">
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Direct contact</p>
                      {listing.contact_email && (
                        <a href={`mailto:${listing.contact_email}`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                          <Mail className="h-4 w-4" /> {listing.contact_email}
                        </a>
                      )}
                      {listing.contact_phone && (
                        <a href={`tel:${listing.contact_phone}`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                          <Phone className="h-4 w-4" /> {listing.contact_phone}
                        </a>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4 mt-12">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-sm text-muted-foreground">
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
