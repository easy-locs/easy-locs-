/**
 * ConciergeShowcase — Public shareable catalog of services, properties, and activities.
 * Accessible via /showcase/:orgSlug or shared via link/WhatsApp/email.
 */

import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { fetchShowcaseBySlug, fetchShowcaseServices, fetchShowcaseListings } from "@/repositories/concierge.repository";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import SEOHead from "@/components/SEOHead";
import AppLogo from "@/components/AppLogo";
import {
  MapPin, Clock, Star, Search, Share2, Mail, Phone,
  MessageCircle, Copy, ExternalLink, Loader2, Building2, Sparkles
} from "lucide-react";
import { toast } from "sonner";

const CATEGORY_ICONS: Record<string, string> = {
  transfer: "✈️", car_rental: "🚗", yacht: "⛵", excursion: "🏔️",
  chef: "👨‍🍳", cleaning: "🧹", babysitting: "👶", vip: "🌟",
  maintenance: "🔧", laundry: "👔", chauffeur: "🚘", grocery: "🛒",
  welcome: "🎁", spa: "🧖", security: "🛡️", key_handover: "🔑",
  events: "🎉", other: "📦",
};

export default function ConciergeShowcase() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const [org, setOrg] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!orgSlug) { setLoading(false); return; }

      const profile = await fetchShowcaseBySlug(orgSlug);

      if (profile) {
        setOrg({ ...profile, org: (profile as any).orgs });
        const orgId = profile.org_id;
        const [svc, lst] = await Promise.all([
          fetchShowcaseServices(orgId),
          fetchShowcaseListings(orgId),
        ]);
        setServices(svc);
        setListings(lst);
      }

      setLoading(false);
    };
    load();
  }, [orgSlug]);

  const categories = useMemo(() => {
    const cats = new Set(services.map(s => s.category));
    return Array.from(cats);
  }, [services]);

  const filtered = useMemo(() => {
    let result = services;
    if (filterCat) result = result.filter(s => s.category === filterCat);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(s =>
        s.title.toLowerCase().includes(q) ||
        (s.description || "").toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q)
      );
    }
    return result;
  }, [services, filterCat, search]);

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  const shareVia = (method: "whatsapp" | "email" | "copy") => {
    const text = `Check out our services: ${org?.display_name || ""}`;
    switch (method) {
      case "whatsapp":
        window.open(`https://wa.me/?text=${encodeURIComponent(text + "\n" + shareUrl)}`, "_blank");
        break;
      case "email":
        window.open(`mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(shareUrl)}`, "_blank");
        break;
      case "copy":
        navigator.clipboard.writeText(shareUrl);
        toast.success("Link copied!");
        break;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!org) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Showcase not found</h1>
          <p className="text-muted-foreground">This catalog link may be invalid.</p>
        </div>
      </div>
    );
  }

  const orgData = org.org || {};
  const brandName = orgData.brand_name || org.display_name || "Our Services";

  return (
    <>
      <SEOHead
        title={`${brandName} — Services & Rentals`}
        description={`Explore premium concierge services and rental properties from ${brandName}`}
      />

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {orgData.logo_url ? (
                <img src={orgData.logo_url} alt={brandName} className="h-8 w-8 rounded-lg object-cover" />
              ) : (
                <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-accent" />
                </div>
              )}
              <div>
                <h1 className="text-lg font-bold text-foreground">{brandName}</h1>
                {orgData.city && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />{orgData.city}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={() => shareVia("copy")} title="Copy link">
                <Copy className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => shareVia("whatsapp")} title="Share via WhatsApp">
                <MessageCircle className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => shareVia("email")} title="Share via Email">
                <Mail className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search services..."
              className="pl-10"
            />
          </div>

          {/* Category Filter */}
          {categories.length > 1 && (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant={!filterCat ? "default" : "outline"} onClick={() => setFilterCat("")}>All</Button>
              {categories.map(cat => (
                <Button key={cat} size="sm" variant={filterCat === cat ? "default" : "outline"} onClick={() => setFilterCat(cat)}>
                  {CATEGORY_ICONS[cat] || "📦"} {cat.replace(/_/g, " ")}
                </Button>
              ))}
            </div>
          )}

          {/* Services Grid */}
          {filtered.length > 0 && (
            <section>
              <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-accent" /> Services
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((s) => {
                  const photos: string[] = Array.isArray(s.photo_urls) ? s.photo_urls : s.photo_url ? [s.photo_url] : [];
                  return (
                    <Card key={s.id} className="overflow-hidden group hover:shadow-lg transition-shadow">
                      {photos.length > 0 && (
                        <div className="aspect-[16/9] overflow-hidden bg-muted">
                          <img src={photos[0]} alt={s.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                        </div>
                      )}
                      <CardContent className="pt-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-[10px]">
                            {CATEGORY_ICONS[s.category] || "📦"} {s.category.replace(/_/g, " ")}
                          </Badge>
                          {s.duration_minutes && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                              <Clock className="h-3 w-3" />{s.duration_minutes}min
                            </span>
                          )}
                        </div>
                        <h3 className="font-semibold text-foreground">{s.title}</h3>
                        {s.description && <p className="text-xs text-muted-foreground line-clamp-2">{s.description}</p>}
                        {s.location && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />{s.location}
                          </p>
                        )}
                        <div className="flex items-center justify-between pt-2">
                          <span className="text-lg font-bold text-accent">{s.price} {s.currency}</span>
                          {s.booking_slug && (
                            <Button size="sm" asChild>
                              <a href={`/book/${s.booking_slug}`} target="_blank" rel="noopener">
                                Book Now <ExternalLink className="h-3 w-3 ml-1" />
                              </a>
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          )}

          {/* Rental Listings */}
          {listings.length > 0 && (
            <section>
              <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" /> Rental Properties
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {listings.map((l: any) => {
                  const photos: string[] = Array.isArray(l.photo_urls) ? l.photo_urls : [];
                  return (
                    <Card key={l.id} className="overflow-hidden group hover:shadow-lg transition-shadow">
                      {photos.length > 0 && (
                        <div className="aspect-[16/9] overflow-hidden bg-muted">
                          <img src={photos[0]} alt={l.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                        </div>
                      )}
                      <CardContent className="pt-4 space-y-2">
                        <h3 className="font-semibold text-foreground">{l.title}</h3>
                        {l.city && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />{l.city}
                          </p>
                        )}
                        {l.price_per_night > 0 && (
                          <span className="text-lg font-bold text-primary">{l.price_per_night} {l.currency || "EUR"}/night</span>
                        )}
                        {l.slug && (
                          <Button size="sm" variant="outline" asChild className="w-full">
                            <a href={`/listing/${l.slug}`} target="_blank" rel="noopener">
                              View Details
                            </a>
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          )}

          {filtered.length === 0 && listings.length === 0 && (
            <div className="text-center py-16">
              <Sparkles className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">No services or listings available yet.</p>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-border py-6 mt-12">
          <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {orgData.email && (
                <Button size="sm" variant="ghost" asChild>
                  <a href={`mailto:${orgData.email}`}><Mail className="h-4 w-4 mr-1" />{orgData.email}</a>
                </Button>
              )}
              {orgData.phone && (
                <Button size="sm" variant="ghost" asChild>
                  <a href={`tel:${orgData.phone}`}><Phone className="h-4 w-4 mr-1" />{orgData.phone}</a>
                </Button>
              )}
            </div>
            <AppLogo />
          </div>
        </footer>
      </div>
    </>
  );
}
