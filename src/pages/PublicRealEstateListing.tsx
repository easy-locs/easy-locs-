import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
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
  Mail, Phone, Euro,
} from "lucide-react";
import { Link } from "react-router-dom";

interface Listing {
  id: string; title: string; description: string; listing_type: string;
  price: number; currency: string; property_type: string; country: string;
  city: string; address: string; surface_sqm: number; rooms: number;
  bedrooms: number; bathrooms: number; photo_urls: string[]; status: string;
  slug: string; contact_email: string; contact_phone: string; features: string[];
  parking: boolean; garden: boolean; terrace: boolean; elevator: boolean;
  furnished: boolean; energy_class: string; org_id: string;
}

const FEATURE_ICONS: Record<string, any> = {
  parking: Car, garden: TreePine, terrace: Sun, elevator: Building, furnished: Armchair,
};

const TYPE_LABELS: Record<string, string> = {
  sale: "For Sale", long_term_rent: "For Rent", seasonal_rent: "Seasonal Rental",
};

export default function PublicRealEstateListing() {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [contactForm, setContactForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!slug) return;
    supabase.from("real_estate_listings").select("*").eq("slug", slug).eq("status", "active").maybeSingle()
      .then(({ data }) => { setListing(data as any); setLoading(false); });
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

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Loading…</div>;
  if (!listing) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Listing not found</div>;

  const photos = listing.photo_urls || [];
  const amenities = [
    listing.parking && "Parking",
    listing.garden && "Garden",
    listing.terrace && "Terrace",
    listing.elevator && "Elevator",
    listing.furnished && "Furnished",
  ].filter(Boolean) as string[];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={`${listing.title} — ${TYPE_LABELS[listing.listing_type]} | Easy-Locs`}
        description={`${listing.title} in ${listing.city}. ${listing.surface_sqm}m², ${listing.rooms} rooms. ${listing.price.toLocaleString()} ${listing.currency}`}
      />

      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3">
          <AppLogo variant="header" linkTo="/" />
          <div className="flex gap-3">
            <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground px-3 py-1.5">Login</Link>
            <Link to="/signup" className="bg-gradient-gold text-accent-foreground text-sm font-semibold px-4 py-1.5 rounded-lg">Sign up</Link>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Photo gallery */}
            {photos.length > 0 ? (
              <div className="relative rounded-2xl overflow-hidden aspect-video bg-muted">
                <img src={photos[photoIndex]} alt={listing.title} className="w-full h-full object-cover" />
                {photos.length > 1 && (
                  <>
                    <button onClick={() => setPhotoIndex(i => (i - 1 + photos.length) % photos.length)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur rounded-full p-2">
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button onClick={() => setPhotoIndex(i => (i + 1) % photos.length)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur rounded-full p-2">
                      <ChevronRight className="h-5 w-5" />
                    </button>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {photos.map((_, i) => (
                        <button key={i} onClick={() => setPhotoIndex(i)}
                          className={`w-2 h-2 rounded-full ${i === photoIndex ? "bg-white" : "bg-white/40"}`} />
                      ))}
                    </div>
                  </>
                )}
                <Badge className="absolute top-4 left-4 bg-accent text-accent-foreground text-sm px-3 py-1">
                  {TYPE_LABELS[listing.listing_type]}
                </Badge>
              </div>
            ) : (
              <div className="rounded-2xl bg-muted aspect-video flex items-center justify-center">
                <Home className="h-20 w-20 text-muted-foreground/20" />
              </div>
            )}

            {/* Title & price */}
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{listing.title}</h1>
              <div className="flex items-center gap-2 mt-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{listing.address ? `${listing.address}, ` : ""}{listing.city}{listing.country ? `, ${listing.country}` : ""}</span>
              </div>
              <div className="mt-3">
                <span className="text-3xl font-bold text-accent">{listing.price.toLocaleString()} {listing.currency}</span>
                {listing.listing_type !== "sale" && <span className="text-muted-foreground ml-1">/month</span>}
              </div>
            </div>

            {/* Key specs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { icon: Ruler, label: "Surface", value: `${listing.surface_sqm} m²` },
                { icon: Home, label: "Rooms", value: `${listing.rooms}` },
                { icon: BedDouble, label: "Bedrooms", value: `${listing.bedrooms}` },
                { icon: Bath, label: "Bathrooms", value: `${listing.bathrooms}` },
              ].map(s => (
                <Card key={s.label}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <s.icon className="h-5 w-5 text-accent" />
                    <div>
                      <div className="text-xs text-muted-foreground">{s.label}</div>
                      <div className="font-semibold text-foreground">{s.value}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Description */}
            {listing.description && (
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-2">Description</h2>
                <p className="text-muted-foreground whitespace-pre-wrap">{listing.description}</p>
              </div>
            )}

            {/* Amenities */}
            {amenities.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-3">Amenities</h2>
                <div className="flex flex-wrap gap-2">
                  {amenities.map(a => (
                    <Badge key={a} variant="outline" className="text-sm py-1.5 px-3">{a}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Energy class */}
            {listing.energy_class && (
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-accent" />
                <span className="text-sm text-muted-foreground">Energy class:</span>
                <Badge variant="outline">{listing.energy_class}</Badge>
              </div>
            )}
          </div>

          {/* Sidebar - Contact form */}
          <div className="space-y-4">
            <Card className="sticky top-20">
              <CardContent className="p-6 space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Interested? Contact the owner</h3>
                <div className="space-y-3">
                  <div><Label>Your Name *</Label><Input value={contactForm.name} onChange={e => setContactForm(f => ({ ...f, name: e.target.value }))} /></div>
                  <div><Label>Email *</Label><Input type="email" value={contactForm.email} onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))} /></div>
                  <div><Label>Phone</Label><Input value={contactForm.phone} onChange={e => setContactForm(f => ({ ...f, phone: e.target.value }))} /></div>
                  <div><Label>Message</Label><Textarea value={contactForm.message} onChange={e => setContactForm(f => ({ ...f, message: e.target.value }))} rows={3} placeholder="I'm interested in this property…" /></div>
                  <Button className="w-full" onClick={handleSubmitContact} disabled={submitting || !contactForm.name || !contactForm.email}>
                    <Send className="h-4 w-4 mr-1" /> {submitting ? "Sending…" : "Send Message"}
                  </Button>
                </div>

                {(listing.contact_email || listing.contact_phone) && (
                  <>
                    <Separator />
                    <div className="space-y-2 text-sm">
                      {listing.contact_email && (
                        <a href={`mailto:${listing.contact_email}`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                          <Mail className="h-4 w-4" /> {listing.contact_email}
                        </a>
                      )}
                      {listing.contact_phone && (
                        <a href={`tel:${listing.contact_phone}`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
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
            <Link to="/terms" className="hover:text-foreground">Terms</Link>
            <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
