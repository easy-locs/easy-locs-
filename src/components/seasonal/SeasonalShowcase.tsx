import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/lib/i18n";
import { buildAppUrl } from "@/lib/app-domain";
import {
  Globe, MapPin, Eye, EyeOff, ExternalLink, CalendarDays,
  Edit, BookOpen, ChevronLeft, ChevronRight, Image as ImageIcon,
  Loader2, Users, Moon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ListingWithProperty {
  id: string;
  title: string;
  slug: string;
  active: boolean | null;
  price_per_night: number | null;
  min_nights: number | null;
  max_guests: number | null;
  property_id: string;
  created_at: string | null;
  // joined from properties
  property_label: string;
  property_city: string;
  property_country: string;
  property_photo_urls: any;
}

interface BookingForListing {
  listing_id: string;
  check_in: string;
  check_out: string;
  guest_name: string;
  status: string;
}

interface SeasonalShowcaseProps {
  onEditListing: (propertyId: string) => void;
  onViewCalendar: (propertyId: string) => void;
  onViewBookings: (propertyId: string) => void;
}

const COUNTRY_FLAGS: Record<string, string> = {
  FR: "🇫🇷", ES: "🇪🇸", PT: "🇵🇹", IT: "🇮🇹", DE: "🇩🇪", GB: "🇬🇧", US: "🇺🇸",
  BE: "🇧🇪", CH: "🇨🇭", NL: "🇳🇱", AT: "🇦🇹", GR: "🇬🇷", HR: "🇭🇷", MA: "🇲🇦",
  TN: "🇹🇳", TR: "🇹🇷", TH: "🇹🇭", MX: "🇲🇽", BR: "🇧🇷", JP: "🇯🇵", AU: "🇦🇺",
};

const SeasonalShowcase = ({ onEditListing, onViewCalendar, onViewBookings }: SeasonalShowcaseProps) => {
  const { orgId } = useAuth();
  const { t } = useI18n();
  const [listings, setListings] = useState<ListingWithProperty[]>([]);
  const [bookings, setBookings] = useState<BookingForListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [countryFilter, setCountryFilter] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);

    const [{ data: rawListings }, { data: props }, { data: reqs }] = await Promise.all([
      supabase.from("public_listings").select("*").eq("org_id", orgId).order("created_at", { ascending: false }),
      supabase.from("properties").select("id, label, city, country, photo_urls").eq("org_id", orgId),
      supabase.from("booking_requests").select("id, listing_id, check_in, check_out, guest_name, status").eq("org_id", orgId).order("check_in"),
    ]);

    const propMap = new Map((props || []).map(p => [p.id, p]));

    const merged: ListingWithProperty[] = (rawListings || []).map((l: any) => {
      const prop = propMap.get(l.property_id);
      return {
        id: l.id,
        title: l.title || prop?.label || "—",
        slug: l.slug,
        active: l.active,
        price_per_night: l.price_per_night,
        min_nights: l.min_nights,
        max_guests: l.max_guests,
        property_id: l.property_id,
        created_at: l.created_at,
        property_label: prop?.label || "—",
        property_city: prop?.city || "",
        property_country: (prop?.country || "").toUpperCase(),
        property_photo_urls: prop?.photo_urls,
      };
    });

    setListings(merged);
    setBookings((reqs || []).map((r: any) => ({
      listing_id: r.listing_id,
      check_in: r.check_in,
      check_out: r.check_out,
      guest_name: r.guest_name,
      status: r.status,
    })));
    setLoading(false);
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  const countries = useMemo(() => {
    const set = new Set(listings.map(l => l.property_country).filter(Boolean));
    return Array.from(set).sort();
  }, [listings]);

  const filteredListings = useMemo(() => {
    if (!countryFilter) return listings;
    return listings.filter(l => l.property_country === countryFilter);
  }, [listings, countryFilter]);

  const getMainPhoto = (photoUrls: any): string | null => {
    if (!photoUrls) return null;
    if (Array.isArray(photoUrls) && photoUrls.length > 0) return photoUrls[0];
    if (typeof photoUrls === "object" && photoUrls.urls) return photoUrls.urls[0];
    return null;
  };

  const getListingBookings = (listingId: string) =>
    bookings.filter(b => b.listing_id === listingId && b.status !== "rejected" && b.status !== "cancelled");

  const getNextBooking = (listingId: string) => {
    const today = new Date().toISOString().slice(0, 10);
    return getListingBookings(listingId)
      .filter(b => b.check_in >= today)
      .sort((a, b) => a.check_in.localeCompare(b.check_in))[0] || null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <CalendarDays className="h-12 w-12 mx-auto mb-4 opacity-40" />
        <p className="text-lg font-medium">{t("page.seasonal.no_listings") || "No seasonal listings yet"}</p>
        <p className="text-sm mt-1">{t("page.seasonal.no_listings_hint") || "Create your first listing from a property's seasonal tab."}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Country filter */}
      {countries.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <button
            onClick={() => setCountryFilter(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              !countryFilter
                ? "bg-accent text-accent-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {t("common.all") || "All"} ({listings.length})
          </button>
          {countries.map(c => {
            const count = listings.filter(l => l.property_country === c).length;
            return (
              <button
                key={c}
                onClick={() => setCountryFilter(c === countryFilter ? null : c)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  countryFilter === c
                    ? "bg-accent text-accent-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {COUNTRY_FLAGS[c] || "🌍"} {c} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filteredListings.map(listing => (
          <ListingCard
            key={listing.id}
            listing={listing}
            bookings={getListingBookings(listing.id)}
            nextBooking={getNextBooking(listing.id)}
            onEdit={() => onEditListing(listing.property_id)}
            onCalendar={() => onViewCalendar(listing.property_id)}
            onBookings={() => onViewBookings(listing.property_id)}
            getMainPhoto={getMainPhoto}
            t={t}
          />
        ))}
      </div>
    </div>
  );
};

/* ─── Mini Calendar ─── */
function MiniCalendar({ bookings, t }: { bookings: BookingForListing[]; t: (k: string) => string }) {
  const [month, setMonth] = useState(() => new Date());

  const y = month.getFullYear();
  const m = month.getMonth();
  const firstDay = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const offset = firstDay === 0 ? 6 : firstDay - 1;
  const days: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (days.length % 7 !== 0) days.push(null);

  const dayNames = (t("page.seasonal.day_names") || "Mon,Tue,Wed,Thu,Fri,Sat,Sun").split(",").map(d => d.slice(0, 1));

  const isBooked = (day: number) => {
    const dateStr = `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return bookings.some(b => b.check_in <= dateStr && b.check_out > dateStr);
  };

  const today = new Date();
  const isToday = (day: number) => y === today.getFullYear() && m === today.getMonth() && day === today.getDate();

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <button onClick={() => setMonth(new Date(y, m - 1))} className="p-0.5 rounded hover:bg-muted">
          <ChevronLeft className="h-3 w-3 text-muted-foreground" />
        </button>
        <span className="text-[10px] font-medium text-muted-foreground capitalize">
          {month.toLocaleDateString("fr-FR", { month: "short", year: "numeric" })}
        </span>
        <button onClick={() => setMonth(new Date(y, m + 1))} className="p-0.5 rounded hover:bg-muted">
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-px">
        {dayNames.map((d, i) => (
          <div key={i} className="text-[8px] text-center text-muted-foreground font-medium">{d}</div>
        ))}
        {days.map((day, i) => (
          <div
            key={i}
            className={`text-[9px] text-center leading-[18px] rounded-sm ${
              !day ? "" :
              isBooked(day) ? "bg-accent/20 text-accent font-semibold" :
              isToday(day) ? "bg-primary/10 text-primary font-bold" :
              "text-foreground/60"
            }`}
          >
            {day || ""}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Listing Card ─── */
function ListingCard({
  listing,
  bookings,
  nextBooking,
  onEdit,
  onCalendar,
  onBookings,
  getMainPhoto,
  t,
}: {
  listing: ListingWithProperty;
  bookings: BookingForListing[];
  nextBooking: BookingForListing | null;
  onEdit: () => void;
  onCalendar: () => void;
  onBookings: () => void;
  getMainPhoto: (urls: any) => string | null;
  t: (k: string) => string;
}) {
  const photo = getMainPhoto(listing.property_photo_urls);
  const publicUrl = buildAppUrl(`/listing/${listing.slug}`);

  return (
    <Card className="overflow-hidden group hover:shadow-md transition-shadow">
      {/* Photo */}
      <div className="relative h-40 bg-muted overflow-hidden">
        {photo ? (
          <img src={photo} alt={listing.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="h-10 w-10 text-muted-foreground/30" />
          </div>
        )}
        {/* Status badge */}
        <div className="absolute top-2 right-2">
          <Badge
            variant={listing.active ? "default" : "secondary"}
            className={listing.active
              ? "bg-emerald-500/90 text-white border-0 text-[10px]"
              : "bg-muted/90 text-muted-foreground border-0 text-[10px]"
            }
          >
            {listing.active ? (
              <><Eye className="h-3 w-3 mr-1" /> {t("page.listing_mgr.active") || "Active"}</>
            ) : (
              <><EyeOff className="h-3 w-3 mr-1" /> {t("page.listing_mgr.draft") || "Draft"}</>
            )}
          </Badge>
        </div>
        {/* Country flag */}
        {listing.property_country && (
          <div className="absolute top-2 left-2 bg-background/80 backdrop-blur-sm rounded-md px-1.5 py-0.5 text-xs font-medium">
            {COUNTRY_FLAGS[listing.property_country] || "🌍"} {listing.property_country}
          </div>
        )}
      </div>

      <CardContent className="p-4 space-y-3">
        {/* Title & location */}
        <div>
          <h3 className="font-semibold text-sm text-foreground line-clamp-1">{listing.title}</h3>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <MapPin className="h-3 w-3" />
            {[listing.property_city, listing.property_country].filter(Boolean).join(", ")}
          </p>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3 text-xs">
          <span className="font-semibold text-foreground">
            {listing.price_per_night ? `${listing.price_per_night}€` : "—"}<span className="text-muted-foreground font-normal">/{t("page.listing_mgr.night") || "night"}</span>
          </span>
          {listing.min_nights && listing.min_nights > 1 && (
            <span className="text-muted-foreground flex items-center gap-0.5">
              <Moon className="h-3 w-3" /> min {listing.min_nights}
            </span>
          )}
          {listing.max_guests && (
            <span className="text-muted-foreground flex items-center gap-0.5">
              <Users className="h-3 w-3" /> {listing.max_guests}
            </span>
          )}
        </div>

        {/* Mini calendar */}
        <div className="border border-border/50 rounded-lg p-2">
          <MiniCalendar bookings={bookings} t={t} />
        </div>

        {/* Next booking */}
        {nextBooking ? (
          <div className="bg-accent/5 border border-accent/20 rounded-lg p-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-0.5">
              {t("page.seasonal.next_booking") || "Next booking"}
            </p>
            <p className="text-xs font-medium text-foreground">{nextBooking.guest_name}</p>
            <p className="text-[10px] text-muted-foreground">
              {nextBooking.check_in} → {nextBooking.check_out}
            </p>
          </div>
        ) : (
          <div className="bg-muted/30 rounded-lg p-2">
            <p className="text-[10px] text-muted-foreground italic text-center">
              {t("page.seasonal.no_upcoming") || "No upcoming bookings"}
            </p>
          </div>
        )}

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-1.5 pt-1">
          <Button variant="outline" size="sm" onClick={onEdit} className="text-[11px] h-7">
            <Edit className="h-3 w-3" /> {t("page.seasonal.edit") || "Edit"}
          </Button>
          <Button variant="outline" size="sm" onClick={onCalendar} className="text-[11px] h-7">
            <CalendarDays className="h-3 w-3" /> {t("page.seasonal.calendar") || "Calendar"}
          </Button>
          <Button variant="outline" size="sm" onClick={onBookings} className="text-[11px] h-7">
            <BookOpen className="h-3 w-3" /> {t("page.seasonal.bookings_btn") || "Bookings"}
          </Button>
          <Button variant="outline" size="sm" asChild className="text-[11px] h-7">
            <a href={publicUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3 w-3" /> {t("page.seasonal.view_page") || "Public"}
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default SeasonalShowcase;
