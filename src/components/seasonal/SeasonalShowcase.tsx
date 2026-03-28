import { useState, useEffect, useCallback, useMemo } from "react";
import * as seasonalRepo from "@/repositories/seasonal.repository";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/lib/i18n";
import { buildAppUrl } from "@/lib/app-domain";
import {
  Globe, MapPin, Eye, EyeOff, ExternalLink, CalendarDays,
  Edit, BookOpen, ChevronLeft, ChevronRight, Image as ImageIcon,
  Loader2, Users, Moon, TrendingUp, BarChart3, Power,
  DollarSign, Percent, Calendar,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

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

interface SeasonalBookingData {
  property_id: string;
  check_in: string;
  check_out: string;
  total_price: number;
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
  const { toast } = useToast();
  const [listings, setListings] = useState<ListingWithProperty[]>([]);
  const [bookings, setBookings] = useState<BookingForListing[]>([]);
  const [seasonalBookings, setSeasonalBookings] = useState<SeasonalBookingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [countryFilter, setCountryFilter] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);

    const [rawListings, props, reqs, sBookings] = await Promise.all([
      seasonalRepo.fetchAllListingsWithProperties(orgId),
      seasonalRepo.fetchPropertiesForSeasonal(orgId),
      seasonalRepo.fetchBookingRequests(orgId),
      seasonalRepo.fetchSeasonalBookingsForAnalytics(orgId),
    ]);

    const propMap = new Map((props).map(p => [p.id, p]));

    const merged: ListingWithProperty[] = (rawListings).map((l: any) => {
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
    setBookings((reqs).map((r: any) => ({
      listing_id: r.listing_id, check_in: r.check_in, check_out: r.check_out,
      guest_name: r.guest_name, status: r.status,
    })));
    setSeasonalBookings(sBookings as SeasonalBookingData[]);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  /* ── Toggle active directly from card ── */
  const toggleActive = async (listing: ListingWithProperty) => {
    setTogglingId(listing.id);
    const newActive = !listing.active;
    await seasonalRepo.toggleListingActive(listing.id, newActive);
    setListings(prev => prev.map(l => l.id === listing.id ? { ...l, active: newActive } : l));
    toast({
      title: newActive
        ? (t("page.listing_mgr.activated") || "✅ Annonce activée")
        : (t("page.listing_mgr.deactivated") || "⏸️ Annonce désactivée"),
    });
    setTogglingId(null);
  };

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

  /* ── Analytics per property ── */
  const getPropertyAnalytics = (propertyId: string) => {
    const propBookings = seasonalBookings.filter(b => b.property_id === propertyId && b.status !== "cancelled");
    const propRequests = bookings.filter(b => {
      const listing = listings.find(l => l.id === b.listing_id);
      return listing?.property_id === propertyId && b.status !== "rejected" && b.status !== "cancelled";
    });

    const totalBookings = propBookings.length + propRequests.filter(r => r.status === "paid" || r.status === "approved").length;
    const totalRevenue = propBookings.reduce((sum, b) => sum + (b.total_price || 0), 0);

    // Occupancy: count booked nights in current month
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 2).padStart(2, "0")}-01`;
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    let bookedNights = 0;
    [...propBookings, ...propRequests.filter(r => r.status === "paid" || r.status === "approved")].forEach(b => {
      const start = b.check_in > monthStart ? b.check_in : monthStart;
      const end = b.check_out < monthEnd ? b.check_out : monthEnd;
      if (start < end) {
        bookedNights += Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000);
      }
    });

    const occupancyRate = daysInMonth > 0 ? Math.min(100, Math.round((bookedNights / daysInMonth) * 100)) : 0;
    const pendingRequests = propRequests.filter(r => r.status === "pending").length;

    return { totalBookings, totalRevenue, occupancyRate, pendingRequests };
  };

  /* ── Global stats ── */
  const globalStats = useMemo(() => {
    const active = listings.filter(l => l.active).length;
    const inactive = listings.length - active;
    const totalRevenue = seasonalBookings.filter(b => b.status !== "cancelled").reduce((s, b) => s + (b.total_price || 0), 0);
    const pendingAll = bookings.filter(b => b.status === "pending").length;
    return { active, inactive, totalRevenue, pendingAll };
  }, [listings, seasonalBookings, bookings]);

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
      {/* ── Global Stats Bar ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatMini icon={<Eye className="h-4 w-4" />} label="Actives" value={globalStats.active} accent="text-success" />
        <StatMini icon={<EyeOff className="h-4 w-4" />} label="Inactives" value={globalStats.inactive} accent="text-muted-foreground" />
        <StatMini icon={<DollarSign className="h-4 w-4" />} label="Revenus" value={`${globalStats.totalRevenue.toLocaleString()}€`} accent="text-primary" />
        <StatMini icon={<Calendar className="h-4 w-4" />} label="En attente" value={globalStats.pendingAll} accent="text-warning" />
      </div>

      {/* Country filter */}
      {countries.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <button
            onClick={() => setCountryFilter(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              !countryFilter ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {t("common.all") || "All"} ({listings.length})
          </button>
          {countries.map(c => {
            const count = listings.filter(l => l.property_country === c).length;
            return (
              <button key={c} onClick={() => setCountryFilter(c === countryFilter ? null : c)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  countryFilter === c ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
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
            analytics={getPropertyAnalytics(listing.property_id)}
            onEdit={() => onEditListing(listing.property_id)}
            onCalendar={() => onViewCalendar(listing.property_id)}
            onBookings={() => onViewBookings(listing.property_id)}
            onToggleActive={() => toggleActive(listing)}
            toggling={togglingId === listing.id}
            getMainPhoto={getMainPhoto}
            t={t}
          />
        ))}
      </div>
    </div>
  );
};

/* ─── Stat Mini Card ─── */
function StatMini({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string | number; accent: string }) {
  return (
    <div className="bg-card rounded-xl border border-border/50 p-3 flex items-center gap-3">
      <div className={`${accent} shrink-0`}>{icon}</div>
      <div>
        <p className={`text-lg font-bold ${accent}`}>{value}</p>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
      </div>
    </div>
  );
}

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
          <div key={i} className={`text-[9px] text-center leading-[18px] rounded-sm ${
            !day ? "" :
            isBooked(day) ? "bg-accent/20 text-accent font-semibold" :
            isToday(day) ? "bg-primary/10 text-primary font-bold" :
            "text-foreground/60"
          }`}>
            {day || ""}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Listing Card ─── */
function ListingCard({
  listing, bookings, nextBooking, analytics, onEdit, onCalendar, onBookings, onToggleActive, toggling, getMainPhoto, t,
}: {
  listing: ListingWithProperty;
  bookings: BookingForListing[];
  nextBooking: BookingForListing | null;
  analytics: { totalBookings: number; totalRevenue: number; occupancyRate: number; pendingRequests: number };
  onEdit: () => void;
  onCalendar: () => void;
  onBookings: () => void;
  onToggleActive: () => void;
  toggling: boolean;
  getMainPhoto: (urls: any) => string | null;
  t: (k: string) => string;
}) {
  const photo = getMainPhoto(listing.property_photo_urls);
  const publicUrl = buildAppUrl(`/listing/${listing.slug}`);

  return (
    <Card className={`overflow-hidden group hover:shadow-md transition-all ${!listing.active ? "opacity-75" : ""}`}>
      {/* Photo */}
      <div className="relative h-40 bg-muted overflow-hidden">
        {photo ? (
          <img src={photo} alt={listing.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="h-10 w-10 text-muted-foreground/30" />
          </div>
        )}

        {/* Toggle button overlay */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleActive(); }}
          disabled={toggling}
          className={`absolute top-2 right-2 flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all backdrop-blur-sm ${
            listing.active
              ? "bg-emerald-500/90 text-white hover:bg-emerald-600/90"
              : "bg-muted/90 text-muted-foreground hover:bg-muted"
          }`}
        >
          {toggling ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : listing.active ? (
            <><Power className="h-3 w-3" /> Live</>
          ) : (
            <><EyeOff className="h-3 w-3" /> Off</>
          )}
        </button>

        {/* Country flag */}
        {listing.property_country && (
          <div className="absolute top-2 left-2 bg-background/80 backdrop-blur-sm rounded-md px-1.5 py-0.5 text-xs font-medium">
            {COUNTRY_FLAGS[listing.property_country] || "🌍"} {listing.property_country}
          </div>
        )}

        {/* Pending badge */}
        {analytics.pendingRequests > 0 && (
          <div className="absolute bottom-2 right-2 bg-warning text-warning-foreground px-2 py-0.5 rounded-full text-[10px] font-bold animate-pulse">
            {analytics.pendingRequests} en attente
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

        {/* Price & specs */}
        <div className="flex items-center gap-3 text-xs">
          <span className="font-semibold text-foreground">
            {listing.price_per_night ? `${listing.price_per_night}€` : "—"}<span className="text-muted-foreground font-normal">/{t("page.listing_mgr.night") || "nuit"}</span>
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

        {/* ── Smart Analytics Row ── */}
        <div className="grid grid-cols-3 gap-2 bg-muted/30 rounded-lg p-2">
          <div className="text-center">
            <p className="text-xs font-bold text-foreground">{analytics.totalBookings}</p>
            <p className="text-[9px] text-muted-foreground">Réservations</p>
          </div>
          <div className="text-center border-x border-border/50">
            <p className="text-xs font-bold text-foreground">{analytics.occupancyRate}%</p>
            <p className="text-[9px] text-muted-foreground">Occupation</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-bold text-foreground">{analytics.totalRevenue > 0 ? `${analytics.totalRevenue.toLocaleString()}€` : "—"}</p>
            <p className="text-[9px] text-muted-foreground">Revenus</p>
          </div>
        </div>

        {/* Mini calendar */}
        <div className="border border-border/50 rounded-lg p-2">
          <MiniCalendar bookings={bookings} t={t} />
        </div>

        {/* Next booking */}
        {nextBooking ? (
          <div className="bg-accent/5 border border-accent/20 rounded-lg p-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-0.5">
              {t("page.seasonal.next_booking") || "Prochaine réservation"}
            </p>
            <p className="text-xs font-medium text-foreground">{nextBooking.guest_name}</p>
            <p className="text-[10px] text-muted-foreground">
              {nextBooking.check_in} → {nextBooking.check_out}
            </p>
          </div>
        ) : (
          <div className="bg-muted/30 rounded-lg p-2">
            <p className="text-[10px] text-muted-foreground italic text-center">
              {t("page.seasonal.no_upcoming") || "Aucune réservation à venir"}
            </p>
          </div>
        )}

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={onEdit} className="text-xs h-9 min-h-[36px] w-full justify-center gap-1.5">
            <Edit className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{t("page.seasonal.edit") || "Modifier"}</span>
          </Button>
          <Button variant="outline" size="sm" onClick={onCalendar} className="text-xs h-9 min-h-[36px] w-full justify-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{t("page.seasonal.calendar") || "Calendrier"}</span>
          </Button>
          <Button variant="outline" size="sm" onClick={onBookings} className="text-xs h-9 min-h-[36px] w-full justify-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{t("page.seasonal.bookings_btn") || "Réservations"}</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.open(publicUrl, "_blank", "noopener,noreferrer")} className="text-xs h-9 min-h-[36px] w-full justify-center gap-1.5">
            <ExternalLink className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{t("page.seasonal.view_page") || "Voir"}</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default SeasonalShowcase;
