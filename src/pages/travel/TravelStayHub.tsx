/**
 * TravelStayHub — Premium immersive Travel / Stay page.
 * Backend-connected calendar, real listings, Booking.com-level UX.
 */
import { useState, useMemo, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Hotel, Home, Calendar as CalendarIcon, MapPin, Users, Search,
  Star, SlidersHorizontal, Wifi, Car, UtensilsCrossed,
  Waves, Dumbbell, ChevronRight, Sparkles, ArrowLeft,
  Plane, BedDouble, Coffee, Bath, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { motion, AnimatePresence } from "framer-motion";
import { format, addDays, differenceInDays } from "date-fns";
import SEOHead from "@/components/SEOHead";
import PremiumMerchantCard from "@/components/discovery/PremiumMerchantCard";
import { BoostSlotRenderer } from "@/components/boost/BoostSlotRenderer";
import { useVerticalListings, type ListingItem } from "@/hooks/useVerticalListings";
import { getSubcategoryLabel } from "@/lib/discovery/verticals";
import { resolveCanonicalUI } from "@/lib/ui-engine";
import { tc } from "@/lib/i18n-canonical";

type StayTab = "hotel" | "resort" | "short_stay" | "serviced_apartment";
type SortMode = "rating" | "price" | "distance" | "reviews";

const STAY_TABS: { key: StayTab; labelKey: string; emoji: string }[] = [
  { key: "hotel", labelKey: "discovery.subcategory.hotel.title", emoji: "🏨" },
  { key: "resort", labelKey: "discovery.subcategory.resort.title", emoji: "🏖️" },
  { key: "short_stay", labelKey: "discovery.subcategory.short_stay.title", emoji: "🛏️" },
  { key: "serviced_apartment", labelKey: "discovery.subcategory.serviced_apartment.title", emoji: "🏢" },
];

const AMENITY_FILTERS = [
  { key: "wifi", labelKey: "travel.wifi", icon: <Wifi className="h-3.5 w-3.5" /> },
  { key: "pool", labelKey: "travel.pool", icon: <Waves className="h-3.5 w-3.5" /> },
  { key: "parking", labelKey: "travel.parking", icon: <Car className="h-3.5 w-3.5" /> },
  { key: "gym", labelKey: "travel.gym", icon: <Dumbbell className="h-3.5 w-3.5" /> },
  { key: "breakfast", labelKey: "travel.breakfast", icon: <Coffee className="h-3.5 w-3.5" /> },
  { key: "spa", labelKey: "travel.spa", icon: <Bath className="h-3.5 w-3.5" /> },
];

export default function TravelStayHub() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<StayTab>("hotel");
  const [destination, setDestination] = useState("");
  const [checkIn, setCheckIn] = useState<Date | undefined>(undefined);
  const [checkOut, setCheckOut] = useState<Date | undefined>(undefined);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [checkOutOpen, setCheckOutOpen] = useState(false);
  const [guestCount, setGuestCount] = useState(2);
  const [roomCount, setRoomCount] = useState(1);
  const [sortBy, setSortBy] = useState<SortMode>("rating");
  const [activeAmenities, setActiveAmenities] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // ═══ CANONICAL UI ENGINE — drives hero, wording, CTA ═══
  const ui = useMemo(() => resolveCanonicalUI("property", activeTab), [activeTab]);

  const { data: listings = [], isLoading } = useVerticalListings("property", activeTab);

  const nightCount = checkIn && checkOut ? Math.max(1, differenceInDays(checkOut, checkIn)) : 0;

  const filtered = useMemo(() => {
    let items = [...listings];
    if (destination) {
      const q = destination.toLowerCase();
      items = items.filter(l =>
        l.name.toLowerCase().includes(q) ||
        l.address?.toLowerCase().includes(q)
      );
    }
    switch (sortBy) {
      case "price": items.sort((a, b) => (a.ranking_score ?? 0) - (b.ranking_score ?? 0)); break;
      case "rating": items.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)); break;
      case "distance": items.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999)); break;
      case "reviews": items.sort((a, b) => (b.reviews_count ?? 0) - (a.reviews_count ?? 0)); break;
    }
    return items;
  }, [listings, destination, sortBy]);

  const handleCheckInSelect = useCallback((date: Date | undefined) => {
    setCheckIn(date);
    if (date && (!checkOut || checkOut <= date)) {
      setCheckOut(addDays(date, 1));
    }
    setCheckInOpen(false);
  }, [checkOut]);

  const handleCheckOutSelect = useCallback((date: Date | undefined) => {
    setCheckOut(date);
    setCheckOutOpen(false);
  }, []);

  const toggleAmenity = (key: string) => {
    setActiveAmenities(prev =>
      prev.includes(key) ? prev.filter(a => a !== key) : [...prev, key]
    );
  };

  return (
    <div className="app-mobile-page pb-28" style={{ background: "hsl(var(--background))" }}>
      <SEOHead
        title="Travel & Stays — Hotels, Resorts, Vacation | Easy-Locs"
        description="Book hotels, resorts, vacation rentals and short stays across UAE. Best prices, instant booking."
      />

      {/* ═══ IMMERSIVE HERO ═══ */}
      <div className="relative overflow-hidden" style={{ minHeight: 380 }}>
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80"
            alt="Luxury hotel pool"
            className="w-full h-full object-cover scale-110"
            loading="eager"
          />
        </div>
        <div className="absolute inset-0" style={{
          background: "linear-gradient(180deg, hsla(220,50%,5%,0.3) 0%, hsla(220,50%,5%,0.55) 40%, hsla(220,50%,5%,0.92) 100%)"
        }} />
        
        {/* Animated golden glow */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 50% 60%, hsla(38,70%,55%,0.06), transparent 70%)" }}
          animate={{ opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 6, repeat: Infinity }}
        />

        {/* Floating light particles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full"
              style={{
                background: "hsla(38,70%,65%,0.4)",
                left: `${10 + i * 12}%`,
                top: `${20 + (i % 4) * 18}%`,
              }}
              animate={{ y: [-8, -28, -8], opacity: [0.15, 0.5, 0.15] }}
              transition={{ duration: 4 + i * 0.6, repeat: Infinity, delay: i * 0.5 }}
            />
          ))}
        </div>

        <div className="relative z-10 px-4 pt-12 pb-4">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-xl mb-5 active:scale-90 transition-transform"
              style={{ background: "hsla(0,0%,100%,0.1)", border: "1px solid hsla(0,0%,100%,0.08)" }}
            >
              <ArrowLeft className="h-4 w-4 text-white" />
            </button>

            <h1 className="text-[28px] font-black text-white tracking-tight leading-tight">
              {tc("travel.hero_title")}
            </h1>
            <p className="text-[13px] text-white/55 mt-1 font-medium">
              {tc("travel.hero_subtitle")}
            </p>
          </motion.div>

          {/* ═══ PREMIUM SEARCH CARD ═══ */}
          <motion.div
            className="mt-5 rounded-[20px] p-4 space-y-3 backdrop-blur-xl"
            style={{
              background: "hsla(0,0%,100%,0.07)",
              border: "1px solid hsla(0,0%,100%,0.1)",
              boxShadow: "0 12px 40px hsla(0,0%,0%,0.35)",
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
          >
            {/* Destination */}
            <div className="relative">
              <MapPin className="absolute left-3.5 top-3.5 h-4 w-4 text-white/35" />
              <Input
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="Dubai Marina, Palm Jumeirah, Abu Dhabi…"
                className="pl-10 h-12 text-[13px] rounded-xl border-white/8 bg-white/6 text-white placeholder:text-white/28 focus:border-white/25 focus:bg-white/10 transition-all"
              />
            </div>

            {/* Date pickers with real Calendar component */}
            <div className="grid grid-cols-2 gap-2">
              <Popover open={checkInOpen} onOpenChange={setCheckInOpen}>
                <PopoverTrigger asChild>
                  <button
                    className="flex items-center gap-2 h-12 px-3.5 rounded-xl text-[12px] text-left transition-all"
                    style={{
                      background: "hsla(0,0%,100%,0.06)",
                      border: "1px solid hsla(0,0%,100%,0.08)",
                      color: checkIn ? "white" : "hsla(0,0%,100%,0.28)",
                    }}
                  >
                    <CalendarIcon className="h-4 w-4 shrink-0" style={{ color: "hsla(38,70%,58%,0.7)" }} />
                    <div className="flex flex-col">
                      <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "hsla(38,70%,58%,0.6)" }}>{tc("travel.check_in")}</span>
                      <span className="font-bold">{checkIn ? format(checkIn, "dd MMM") : tc("common.add_date")}</span>
                    </div>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-2xl overflow-hidden" align="start">
                  <Calendar
                    mode="single"
                    selected={checkIn}
                    onSelect={handleCheckInSelect}
                    disabled={(date) => date < new Date()}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>

              <Popover open={checkOutOpen} onOpenChange={setCheckOutOpen}>
                <PopoverTrigger asChild>
                  <button
                    className="flex items-center gap-2 h-12 px-3.5 rounded-xl text-[12px] text-left transition-all"
                    style={{
                      background: "hsla(0,0%,100%,0.06)",
                      border: "1px solid hsla(0,0%,100%,0.08)",
                      color: checkOut ? "white" : "hsla(0,0%,100%,0.28)",
                    }}
                  >
                    <CalendarIcon className="h-4 w-4 shrink-0" style={{ color: "hsla(38,70%,58%,0.7)" }} />
                    <div className="flex flex-col">
                      <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "hsla(38,70%,58%,0.6)" }}>{tc("travel.check_out")}</span>
                      <span className="font-bold">{checkOut ? format(checkOut, "dd MMM") : tc("common.add_date")}</span>
                    </div>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-2xl overflow-hidden" align="start">
                  <Calendar
                    mode="single"
                    selected={checkOut}
                    onSelect={handleCheckOutSelect}
                    disabled={(date) => date < (checkIn ? addDays(checkIn, 1) : new Date())}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Nights indicator */}
            {nightCount > 0 && (
              <motion.div
                className="flex items-center justify-center gap-1.5 text-[11px] font-semibold"
                style={{ color: "hsl(38 70% 58%)" }}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
              >
                <BedDouble className="h-3.5 w-3.5" />
                {nightCount} {nightCount > 1 ? tc("common.nights", { count: nightCount }) : tc("common.night", { count: nightCount })}
              </motion.div>
            )}

            {/* Guests + Rooms + Search */}
            <div className="flex gap-2">
              <div className="flex-1 flex gap-2">
                <button
                  className="flex-1 flex items-center justify-center gap-1.5 h-12 rounded-xl text-[12px] font-bold transition-all"
                  style={{
                    background: "hsla(0,0%,100%,0.06)",
                    border: "1px solid hsla(0,0%,100%,0.08)",
                    color: "white",
                  }}
                  onClick={() => setGuestCount(g => Math.max(1, g === 4 ? 1 : g + 1))}
                >
                  <Users className="h-3.5 w-3.5" style={{ color: "hsla(38,70%,58%,0.7)" }} />
                  {guestCount} {guestCount > 1 ? tc("common.guests", { count: guestCount }) : tc("common.guest", { count: guestCount })}
                </button>
                <button
                  className="flex items-center justify-center gap-1.5 h-12 px-3 rounded-xl text-[12px] font-bold transition-all"
                  style={{
                    background: "hsla(0,0%,100%,0.06)",
                    border: "1px solid hsla(0,0%,100%,0.08)",
                    color: "white",
                  }}
                  onClick={() => setRoomCount(r => r === 3 ? 1 : r + 1)}
                >
                  <BedDouble className="h-3.5 w-3.5" style={{ color: "hsla(38,70%,58%,0.7)" }} />
                  {roomCount}
                </button>
              </div>
              <Button
                className="h-12 px-6 rounded-xl font-black gap-2 text-[13px] shadow-lg active:scale-95 transition-transform"
                style={{
                  background: "linear-gradient(135deg, hsl(38 70% 52%), hsl(28 75% 48%))",
                  color: "hsl(220 40% 10%)",
                }}
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ═══ CONTENT ═══ */}
      <div className="px-4 mt-6">
        {/* ═══ BOOST SLOT — Travel Stays ═══ */}
        <BoostSlotRenderer
          surface="travel"
          slotKey="hero_primary"
          variant="inline"
          vertical="travel"
          subcategory={activeTab}
          className="mb-4"
        />
        {/* ═══ BREADCRUMB ═══ */}
        <nav className="flex items-center gap-1.5 mb-4 text-[11px] overflow-x-auto scrollbar-none">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 shrink-0">
            <Home className="h-3 w-3" /> {tc("nav.home")}
          </Link>
          <ChevronRight className="h-3 w-3 text-muted-foreground/50 shrink-0" />
          <Link to="/travel" className="text-muted-foreground hover:text-foreground transition-colors shrink-0">{tc("discovery.vertical.travel.title")}</Link>
          <ChevronRight className="h-3 w-3 text-muted-foreground/50 shrink-0" />
          <span className="font-bold shrink-0" style={{ color: "hsl(38 70% 52%)" }}>{tc("travel.stays")}</span>
        </nav>

        {/* Tab selector */}
        <div className="flex gap-1.5 mb-5 overflow-x-auto scrollbar-none -mx-1 px-1">
          {STAY_TABS.map(({ key, labelKey, emoji }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-2xl transition-all active:scale-95"
              style={{
                background: activeTab === key
                  ? "linear-gradient(135deg, hsl(38 70% 52%), hsl(28 75% 48%))"
                  : "hsl(var(--card))",
                color: activeTab === key
                  ? "hsl(220 40% 10%)"
                  : "hsl(var(--muted-foreground))",
                border: `1px solid ${activeTab === key ? "transparent" : "hsl(var(--border) / 0.2)"}`,
                fontWeight: activeTab === key ? 800 : 600,
                boxShadow: activeTab === key ? "0 4px 12px hsla(38,70%,40%,0.3)" : "none",
              }}
            >
              <span className="text-base">{emoji}</span>
              <span className="text-[12px]">{tc(labelKey)}</span>
            </button>
          ))}
        </div>

        {/* Amenity filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none -mx-1 px-1 mb-4">
          {AMENITY_FILTERS.map(({ key, labelKey, icon }) => (
            <button
              key={key}
              onClick={() => toggleAmenity(key)}
              className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[11px] font-semibold transition-all active:scale-95"
              style={{
                background: activeAmenities.includes(key)
                  ? "hsl(38 70% 52% / 0.12)"
                  : "hsl(var(--card))",
                color: activeAmenities.includes(key)
                  ? "hsl(38 70% 45%)"
                  : "hsl(var(--muted-foreground))",
                border: `1px solid ${activeAmenities.includes(key) ? "hsl(38 70% 52% / 0.3)" : "hsl(var(--border) / 0.15)"}`,
              }}
            >
              {icon} {tc(labelKey)}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-1.5 mb-4 overflow-x-auto scrollbar-none">
          {(["rating", "price", "distance", "reviews"] as SortMode[]).map(s => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className="shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all"
              style={{
                background: sortBy === s ? "hsl(var(--foreground))" : "hsl(var(--muted))",
                color: sortBy === s ? "hsl(var(--background))" : "hsl(var(--muted-foreground))",
              }}
            >
              {s === "rating" ? `⭐ ${tc("common.top_rated")}` : s === "price" ? `💰 ${tc("common.best_price")}` : s === "distance" ? `📍 ${tc("common.nearest")}` : `💬 ${tc("common.most_reviewed")}`}
            </button>
          ))}
        </div>

        {/* Results header */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-[13px] font-black text-foreground">
            {filtered.length} {activeTab === "hotel" ? "hotels" : activeTab === "resort" ? "resorts" : activeTab === "short_stay" ? "stays" : "serviced apartments"}
          </p>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="text-[11px] font-bold flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all"
            style={{ color: "hsl(38 70% 45%)", background: "hsl(38 70% 52% / 0.08)" }}
          >
            <SlidersHorizontal className="h-3 w-3" /> Filters
          </button>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col items-center py-20 gap-3">
            <motion.div
              className="w-10 h-10 rounded-full border-[3px] border-t-transparent"
              style={{ borderColor: "hsl(38 70% 52%)" }}
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
            />
            <p className="text-[12px] font-semibold text-muted-foreground">Finding stays…</p>
          </div>
        )}

        {/* Listings */}
        {!isLoading && filtered.length > 0 && (
          <div className="space-y-3">
            {filtered.length > 0 && (
              <PremiumMerchantCard
                to={filtered[0].slug ? `/s/${filtered[0].slug}` : `/s/${filtered[0].id}`}
                image={filtered[0].banner_url || filtered[0].logo_url}
                name={filtered[0].name}
                category={filtered[0].address || getSubcategoryLabel("property", filtered[0].subcategory || "")}
                rating={filtered[0].rating > 0 ? filtered[0].rating : undefined}
                reviewCount={filtered[0].reviews_count}
                distance={filtered[0].distanceKm ? `${filtered[0].distanceKm.toFixed(1)} km` : undefined}
                badge={filtered[0].reviews_count > 50 ? "🔥 Popular" : filtered[0].rating >= 4.5 ? "⭐ Top Pick" : undefined}
                variant="featured"
                verticalType="property"
                index={0}
              />
            )}
            {filtered.slice(1).map((item, i) => (
              <PremiumMerchantCard
                key={item.id}
                to={item.slug ? `/s/${item.slug}` : `/s/${item.id}`}
                image={item.banner_url || item.logo_url}
                name={item.name}
                category={item.address || getSubcategoryLabel("property", item.subcategory || "")}
                rating={item.rating > 0 ? item.rating : undefined}
                reviewCount={item.reviews_count}
                distance={item.distanceKm ? `${item.distanceKm.toFixed(1)} km` : undefined}
                variant="horizontal"
                verticalType="property"
                index={i + 1}
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && filtered.length === 0 && (
          <motion.div
            className="flex flex-col items-center py-20 gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: "hsl(38 70% 52% / 0.1)" }}>
              <span className="text-4xl">🏨</span>
            </div>
            <div className="text-center">
              <p className="text-[14px] font-black text-foreground">No stays found</p>
              <p className="text-[12px] text-muted-foreground mt-1 max-w-[240px]">
                Try a different destination or adjust your dates
              </p>
            </div>
          </motion.div>
        )}

        {/* Popular Destinations */}
        <div className="mt-8 mb-6">
          <h2 className="text-[14px] font-black text-foreground mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4" style={{ color: "hsl(38 70% 52%)" }} />
            Popular in UAE
          </h2>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { name: "Dubai Marina", emoji: "🌃", img: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400&q=80" },
              { name: "Palm Jumeirah", emoji: "🌴", img: "https://images.unsplash.com/photo-1582672060674-bc2bd808a8b5?w=400&q=80" },
              { name: "Abu Dhabi", emoji: "🕌", img: "https://images.unsplash.com/photo-1512632578888-169bbbc64f33?w=400&q=80" },
              { name: "Ras Al Khaimah", emoji: "🏔️", img: "https://images.unsplash.com/photo-1540541338287-41700207dee6?w=400&q=80" },
              { name: "Sharjah", emoji: "🏛️", img: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&q=80" },
              { name: "Fujairah", emoji: "🏖️", img: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=80" },
            ].map((dest, i) => (
              <motion.button
                key={dest.name}
                className="relative rounded-2xl overflow-hidden aspect-[3/2] active:scale-[0.97] transition-transform"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 + i * 0.06 }}
                onClick={() => setDestination(dest.name)}
              >
                <img src={dest.img} alt={dest.name} className="w-full h-full object-cover" loading="lazy" />
                <div className="absolute inset-0" style={{
                  background: "linear-gradient(to top, hsla(0,0%,0%,0.7) 0%, hsla(0,0%,0%,0.1) 50%, transparent 100%)"
                }} />
                <div className="absolute bottom-2 left-2.5 flex items-center gap-1.5">
                  <span className="text-lg">{dest.emoji}</span>
                  <span className="text-[12px] font-black text-white drop-shadow-md">{dest.name}</span>
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Why book section */}
        <div className="mt-4 mb-8 p-4 rounded-2xl" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border) / 0.1)" }}>
          <h3 className="text-[13px] font-black text-foreground mb-3">Why book with us?</h3>
          <div className="space-y-2.5">
            {[
              { icon: "🔒", title: "Best price guarantee", desc: "We match or beat any price" },
              { icon: "⚡", title: "Instant confirmation", desc: "No waiting, book in seconds" },
              { icon: "🌍", title: "All 7 Emirates covered", desc: "Dubai to Fujairah and beyond" },
              { icon: "💳", title: "Flexible payment", desc: "Pay now or at the property" },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="text-lg shrink-0">{item.icon}</span>
                <div>
                  <p className="text-[12px] font-bold text-foreground">{item.title}</p>
                  <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
