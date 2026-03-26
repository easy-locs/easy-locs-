import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { dispatchSyncEvent } from "@/lib/shared/sync-engine";
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
  MapPin, Ruler, BedDouble, Bath, Home, Search, Building2,
  Car, TreePine, Sun, Armchair, ArrowRight, Eye, Send,
  CheckCircle2, Shield, Star, Globe, Mail, Phone, Share2,
} from "lucide-react";

interface ShowcaseProfile {
  id: string; display_name: string; bio: string | null;
  avatar_url: string | null; city: string | null; country: string | null;
  verified: boolean; slug: string; org_id: string;
}

interface ShowcaseListing {
  id: string; title: string; description: string; listing_type: string;
  price: number; currency: string; property_type: string; country: string;
  city: string; address: string; surface_sqm: number; rooms: number;
  bedrooms: number; bathrooms: number; photo_urls: string[] | null; slug: string;
  features: any; parking: boolean; garden: boolean; terrace: boolean;
  elevator: boolean; furnished: boolean; energy_class: string;
  views_count: number; created_at: string;
}

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string; border: string }> = {
  sale:           { label: "For Sale",       color: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-500/10",  icon: "🏷️", border: "border-emerald-500/30" },
  long_term_rent: { label: "Long-term Rent", color: "text-sky-700 dark:text-sky-300",        bg: "bg-sky-500/10",      icon: "🏠", border: "border-sky-500/30" },
};

const PRICE_LABEL: Record<string, string> = { sale: "", long_term_rent: "/mo" };

export default function AccountShowcase() {
  const { accountSlug } = useParams<{ accountSlug: string }>();
  const { toast } = useToast();
  const [profile, setProfile] = useState<ShowcaseProfile | null>(null);
  const [listings, setListings] = useState<ShowcaseListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  const [citySearch, setCitySearch] = useState("");
  const [countries, setCountries] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);

  // Contact form
  const [contactForm, setContactForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!accountSlug) return;
    const load = async () => {
      const { data } = await supabase.rpc("get_real_estate_showcase", { p_slug: accountSlug });
      if (data) {
        const p = (data as any).profile;
        // If showcase is disabled, treat as not found
        if (p && p.showcase_enabled === false) {
          setProfile(null);
          setLoading(false);
          return;
        }
        setProfile(p);
        setListings((data as any).listings || []);
        setCountries((data as any).countries || []);
        setCities((data as any).cities || []);
      }
      setLoading(false);
    };
    load();
  }, [accountSlug]);

  const filtered = useMemo(() => {
    let res = listings;
    if (typeFilter !== "all") res = res.filter(l => l.listing_type === typeFilter);
    if (citySearch.trim()) res = res.filter(l => l.city.toLowerCase().includes(citySearch.toLowerCase()));
    return res;
  }, [listings, typeFilter, citySearch]);

  const counts = useMemo(() => ({
    all: listings.length,
    sale: listings.filter(l => l.listing_type === "sale").length,
    long_term_rent: listings.filter(l => l.listing_type === "long_term_rent").length,
  }), [listings]);

  const handleContact = async () => {
    if (!contactForm.name || !contactForm.email || !profile) return;
    setSubmitting(true);
    const targetListing = listings[0];
    if (targetListing) {
      const { data: inserted } = await supabase.from("real_estate_leads").insert({
        org_id: profile.org_id, listing_id: targetListing.id,
        name: contactForm.name, email: contactForm.email,
        phone: contactForm.phone, message: `[General inquiry via showcase] ${contactForm.message}`,
      }).select("id").single();

      // Sync engine: lead_created (replaces legacy direct email + DB trigger notification)
      if (inserted?.id) {
        dispatchSyncEvent({
          type: "lead_created",
          context: {
            orgId: profile.org_id,
            leadId: inserted.id,
            countryCode: (targetListing as any).country || "",
          },
          actorUserId: "",
          targetEmail: (targetListing as any).contact_email || undefined,
          leadName: contactForm.name,
          leadEmail: contactForm.email,
          leadMessage: contactForm.message || "",
          listingTitle: targetListing.title || "",
          listingId: targetListing.id,
        }).catch(() => {});
      }
    }
    setSubmitting(false);
    setSubmitted(true);
    toast({ title: "✅ Message sent!", description: "The agency will contact you shortly." });
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: profile?.display_name, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({ title: "🔗 Link copied!" });
    }
  };

  if (loading) return (
    <div className="app-mobile-page bg-background flex items-center justify-center">
      <div className="animate-pulse space-y-4 w-full max-w-xl px-4">
        <div className="h-24 bg-muted rounded-2xl" />
        <div className="h-6 bg-muted rounded w-1/2" />
        <div className="h-48 bg-muted rounded-xl" />
      </div>
    </div>
  );

  if (!profile) return (
    <div className="app-mobile-page bg-background flex flex-col items-center justify-center gap-5 px-4">
      <Building2 className="h-16 w-16 text-muted-foreground/15" />
      <p className="text-muted-foreground text-lg font-medium">Agency not found</p>
      <Link to="/properties"><Button variant="outline" className="rounded-lg min-h-[44px]">Browse all properties</Button></Link>
    </div>
  );

  const seoTitle = `${profile.display_name} — Real Estate Listings | Easy-Locs`;
  const seoDescription = `Browse ${listings.length} professional property listings from ${profile.display_name}${profile.city ? ` in ${profile.city}` : ""}. Properties for sale, long-term rent, and seasonal rental. Contact directly.`;

  return (
    <div className="app-mobile-page bg-background">
      <SEOHead title={seoTitle} description={seoDescription} canonical={`https://www.easy-locs.com/agency/${accountSlug}`} />

      {/* Header */}
      <header className="border-b border-border bg-card/95 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 h-14">
          <AppLogo variant="header" linkTo="/" />
          <div className="flex gap-2 items-center">
            <Link to="/properties" className="text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 hidden sm:block transition-colors">All Properties</Link>
            <Button variant="ghost" size="sm" onClick={handleShare} className="gap-1.5 min-h-[44px] min-w-[44px]">
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Agency Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/[0.04] via-accent/[0.03] to-background pt-10 sm:pt-14 pb-8 sm:pb-10 px-4">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--accent)/0.08),transparent)]" />
        <div className="max-w-4xl mx-auto relative z-10">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-6">
            {/* Avatar */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-accent/10 border-2 border-accent/20 flex items-center justify-center shrink-0 overflow-hidden">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.display_name} className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <Building2 className="h-10 w-10 text-accent/60" />
              )}
            </div>
            <div className="text-center sm:text-left flex-1 min-w-0">
              <div className="flex items-center gap-2 justify-center sm:justify-start flex-wrap">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-foreground tracking-tight">{profile.display_name}</h1>
                {profile.verified && (
                  <Badge className="bg-accent/10 text-accent border border-accent/20 text-xs">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Verified
                  </Badge>
                )}
              </div>
              {profile.bio && <p className="text-muted-foreground mt-2 text-sm sm:text-base leading-relaxed max-w-2xl">{profile.bio}</p>}
              <div className="flex flex-wrap gap-3 mt-3 justify-center sm:justify-start text-sm text-muted-foreground">
                {profile.city && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-accent" />{profile.city}{profile.country ? `, ${profile.country}` : ""}</span>}
                <span className="flex items-center gap-1"><Home className="h-3.5 w-3.5 text-accent" />{listings.length} listings</span>
                {countries.length > 1 && <span className="flex items-center gap-1"><Globe className="h-3.5 w-3.5 text-accent" />{countries.length} countries</span>}
              </div>
              {/* Coverage badges */}
              {cities.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3 justify-center sm:justify-start">
                  {cities.slice(0, 8).map(c => (
                    <Badge key={c} variant="outline" className="text-[10px] sm:text-xs">{c}</Badge>
                  ))}
                  {cities.length > 8 && <Badge variant="outline" className="text-[10px] sm:text-xs">+{cities.length - 8} more</Badge>}
                </div>
              )}
            </div>
          </div>

          {/* Type pills */}
          <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-6 sm:mt-8">
            {[
              { key: "all", label: "All", icon: "🏢", count: counts.all },
              ...Object.entries(TYPE_CONFIG).map(([k, v]) => ({ key: k, label: v.label, icon: v.icon, count: (counts as any)[k] || 0 })),
            ].map(t => (
              <button key={t.key} onClick={() => setTypeFilter(t.key)}
                className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all border-2 min-h-[44px] ${
                  typeFilter === t.key
                    ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                    : "bg-card text-foreground border-border hover:border-accent/40"
                }`}>
                <span className="mr-1">{t.icon}</span> {t.label}
                <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${
                  typeFilter === t.key ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>{t.count}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Listings */}
          <div className="lg:col-span-2">
            {/* City search */}
            <div className="mb-5 relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="h-11 pl-9 rounded-lg" placeholder="Filter by city…" value={citySearch} onChange={e => setCitySearch(e.target.value)} />
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-16">
                <Building2 className="h-14 w-14 text-muted-foreground/10 mx-auto mb-3" />
                <p className="text-muted-foreground">No properties match your criteria.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filtered.map(listing => <ShowcaseCard key={listing.id} listing={listing} />)}
              </div>
            )}
          </div>

          {/* Sidebar - Contact */}
          <div className="space-y-5">
            <Card className="sticky top-[4.5rem] shadow-xl border-2 border-accent/20 rounded-2xl overflow-hidden">
              <CardContent className="p-0">
                <div className="p-4 sm:p-5 bg-accent/[0.06] border-b border-accent/15">
                  <h3 className="font-bold text-foreground text-base sm:text-lg">Contact {profile.display_name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">Send a message directly to this agency</p>
                </div>
                <div className="p-4 sm:p-5 space-y-3">
                  {submitted ? (
                    <div className="text-center py-6 space-y-3">
                      <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
                      <h3 className="font-bold text-foreground">Message Sent!</h3>
                      <p className="text-xs text-muted-foreground">You'll hear back shortly.</p>
                    </div>
                  ) : (
                    <>
                      <div>
                        <Label className="text-xs font-semibold">Your Name *</Label>
                        <Input value={contactForm.name} onChange={e => setContactForm(f => ({ ...f, name: e.target.value }))} className="mt-1 rounded-lg h-11" />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold">Email *</Label>
                        <Input type="email" value={contactForm.email} onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))} className="mt-1 rounded-lg h-11" />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold">Phone</Label>
                        <Input value={contactForm.phone} onChange={e => setContactForm(f => ({ ...f, phone: e.target.value }))} className="mt-1 rounded-lg h-11" />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold">Message</Label>
                        <Textarea value={contactForm.message} onChange={e => setContactForm(f => ({ ...f, message: e.target.value }))} rows={3} className="mt-1 rounded-lg" placeholder="I'm looking for…" />
                      </div>
                      <Button className="w-full h-12 font-bold rounded-xl" onClick={handleContact} disabled={submitting || !contactForm.name || !contactForm.email}>
                        <Send className="h-4 w-4 mr-2" /> {submitting ? "Sending…" : "Send Message"}
                      </Button>
                      <div className="flex items-center justify-center gap-3 pt-1">
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Shield className="h-3 w-3" /> Secure</span>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Star className="h-3 w-3" /> Free inquiry</span>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4 mt-12 bg-card/50">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Easy-Locs — Global Property Management</p>
          <div className="flex gap-5">
            <Link to="/properties" className="hover:text-foreground transition-colors">All properties</Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ─── Showcase Card ─── */
function ShowcaseCard({ listing }: { listing: ShowcaseListing }) {
  const photos = listing.photo_urls || [];
  const tc = TYPE_CONFIG[listing.listing_type] || TYPE_CONFIG.sale;
  const priceLabel = PRICE_LABEL[listing.listing_type] || "";

  return (
    <Link to={`/properties/${listing.slug}`} className="group">
      <Card className="overflow-hidden hover:shadow-2xl transition-all duration-300 group-hover:-translate-y-1 h-full border-border/60 hover:border-accent/30">
        <div className="h-44 sm:h-52 bg-muted relative overflow-hidden">
          {photos[0] ? (
            <img src={photos[0] as string} alt={`${listing.title} — ${tc.label}`} className="w-full h-full object-cover group-hover:scale-[1.05] transition-transform duration-700" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted/50">
              <Home className="h-12 w-12 text-muted-foreground/10" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/50 via-foreground/5 to-transparent" />
          <Badge className={`absolute top-3 left-3 ${tc.bg} ${tc.color} border ${tc.border} text-[11px] font-semibold backdrop-blur-md px-2.5 py-1`}>
            {tc.icon} {tc.label}
          </Badge>
          <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
            <div>
              <span className="text-xl font-bold text-background drop-shadow-lg tabular-nums">
                {listing.price.toLocaleString()} {listing.currency}
              </span>
              {priceLabel && <span className="text-background/80 text-xs ml-1">{priceLabel}</span>}
            </div>
          </div>
        </div>
        <CardContent className="p-4 space-y-2">
          <h3 className="font-bold text-foreground text-base leading-tight line-clamp-2 group-hover:text-accent transition-colors">{listing.title}</h3>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-accent/70" />
            <span className="truncate">{listing.city}{listing.country ? `, ${listing.country}` : ""}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
            {listing.surface_sqm > 0 && <span className="flex items-center gap-1"><Ruler className="h-3.5 w-3.5 text-accent/60" />{listing.surface_sqm}m²</span>}
            {listing.bedrooms > 0 && <span className="flex items-center gap-1"><BedDouble className="h-3.5 w-3.5 text-accent/60" />{listing.bedrooms} bed</span>}
            {listing.bathrooms > 0 && <span className="flex items-center gap-1"><Bath className="h-3.5 w-3.5 text-accent/60" />{listing.bathrooms} bath</span>}
          </div>
          <Separator className="!mt-3" />
          <div className="flex items-center justify-between pt-0.5">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Eye className="h-3 w-3" /> {listing.views_count || 0} views
            </div>
            <span className="text-[10px] font-semibold text-accent flex items-center gap-0.5 group-hover:gap-1.5 transition-all">
              View details <ArrowRight className="h-3 w-3" />
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
