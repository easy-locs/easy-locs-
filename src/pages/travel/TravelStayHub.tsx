/**
 * TravelStayHub — Premium immersive Travel / Stay page.
 * Booking.com + Airbnb level UX with calendar, filters, and real listings.
 */
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plane, Hotel, Home, Calendar, MapPin, Users, Search,
  Star, SlidersHorizontal, Wifi, Car, UtensilsCrossed,
  Waves, Dumbbell, ChevronRight, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import SEOHead from "@/components/SEOHead";
import PremiumMerchantCard from "@/components/discovery/PremiumMerchantCard";
import { useVerticalListings, type ListingItem } from "@/hooks/useVerticalListings";
import { getSubcategoryLabel } from "@/lib/discovery/verticals";

type StayTab = "hotels" | "vacation" | "short_stay";

const STAY_TABS: { key: StayTab; label: string; icon: React.ReactNode; emoji: string }[] = [
  { key: "hotels", label: "Hotels", icon: <Hotel className="h-4 w-4" />, emoji: "🏨" },
  { key: "vacation", label: "Vacation", icon: <Home className="h-4 w-4" />, emoji: "🏖️" },
  { key: "short_stay", label: "Short Stay", icon: <Sparkles className="h-4 w-4" />, emoji: "🛏️" },
];

const AMENITY_FILTERS = [
  { key: "wifi", label: "WiFi", icon: <Wifi className="h-3 w-3" /> },
  { key: "pool", label: "Pool", icon: <Waves className="h-3 w-3" /> },
  { key: "parking", label: "Parking", icon: <Car className="h-3 w-3" /> },
  { key: "gym", label: "Gym", icon: <Dumbbell className="h-3 w-3" /> },
  { key: "breakfast", label: "Breakfast", icon: <UtensilsCrossed className="h-3 w-3" /> },
];

const HERO_IMAGES = [
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80",
  "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200&q=80",
  "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1200&q=80",
];

type SortMode = "price" | "rating" | "distance" | "reviews";

export default function TravelStayHub() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<StayTab>("hotels");
  const [destination, setDestination] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState("2 Guests");
  const [sortBy, setSortBy] = useState<SortMode>("rating");
  const [activeAmenities, setActiveAmenities] = useState<string[]>([]);

  // Use property vertical listings (hotels/short_stay are subcategories)
  const subFilter = activeTab === "hotels" ? "apartment" : activeTab === "short_stay" ? "short_stay" : null;
  const { data: listings = [], isLoading } = useVerticalListings("property", subFilter);

  const filtered = useMemo(() => {
    let items = [...listings];
    if (destination) {
      const q = destination.toLowerCase();
      items = items.filter(l =>
        l.name.toLowerCase().includes(q) || l.address?.toLowerCase().includes(q)
      );
    }
    // Sort
    switch (sortBy) {
      case "price": items.sort((a, b) => (a.ranking_score ?? 0) - (b.ranking_score ?? 0)); break;
      case "rating": items.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)); break;
      case "distance": items.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999)); break;
      case "reviews": items.sort((a, b) => (b.reviews_count ?? 0) - (a.reviews_count ?? 0)); break;
    }
    return items;
  }, [listings, destination, sortBy]);

  const toggleAmenity = (key: string) => {
    setActiveAmenities(prev =>
      prev.includes(key) ? prev.filter(a => a !== key) : [...prev, key]
    );
  };

  return (
    <div className="min-h-screen pb-28" style={{ background: "hsl(var(--background))" }}>
      <SEOHead
        title="Travel & Stays — Hotels, Vacation Rentals | Easy-Locs"
        description="Book hotels, vacation rentals and short stays worldwide. Best prices, instant booking."
      />

      {/* ═══ IMMERSIVE HERO ═══ */}
      <div className="relative overflow-hidden" style={{ minHeight: 320 }}>
        {/* Background image with parallax feel */}
        <div className="absolute inset-0">
          <img
            src={HERO_IMAGES[0]}
            alt="Travel destinations"
            className="w-full h-full object-cover scale-105"
            loading="eager"
          />
        </div>

        {/* Deep overlay */}
        <div className="absolute inset-0" style={{
          background: "linear-gradient(180deg, hsla(220,50%,8%,0.45) 0%, hsla(220,50%,8%,0.75) 60%, hsla(220,50%,8%,0.95) 100%)"
        }} />

        {/* Animated glow */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 60% 40%, hsla(38,65%,56%,0.08), transparent 70%)" }}
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 5, repeat: Infinity }}
        />

        {/* Hero content */}
        <div className="relative z-10 px-4 pt-14 pb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-xl mb-4 active:scale-90 transition-transform"
              style={{ background: "hsla(0,0%,100%,0.1)", border: "1px solid hsla(0,0%,100%,0.08)" }}
            >
              <Plane className="h-4 w-4 text-white rotate-[-30deg]" />
            </button>

            <h1 className="text-3xl font-black text-white tracking-tight leading-tight">
              Where to <span style={{ color: "hsl(38 65% 56%)" }}>next</span>?
            </h1>
            <p className="text-sm text-white/60 mt-1 font-medium">
              Hotels, vacation rentals & short stays worldwide
            </p>
          </motion.div>

          {/* ═══ SEARCH CARD ═══ */}
          <motion.div
            className="mt-5 rounded-2xl p-4 backdrop-blur-xl"
            style={{
              background: "hsla(0,0%,100%,0.08)",
              border: "1px solid hsla(0,0%,100%,0.1)",
              boxShadow: "0 8px 32px hsla(0,0%,0%,0.3)",
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            {/* Destination */}
            <div className="relative mb-3">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-white/40" />
              <Input
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="City, area or property"
                className="pl-9 h-11 text-sm rounded-xl border-white/10 bg-white/5 text-white placeholder:text-white/30 focus:border-white/30"
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-white/40" />
                <Input
                  type="date"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  placeholder="Check-in"
                  className="pl-9 h-11 text-sm rounded-xl border-white/10 bg-white/5 text-white placeholder:text-white/30"
                />
              </div>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-white/40" />
                <Input
                  type="date"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  placeholder="Check-out"
                  className="pl-9 h-11 text-sm rounded-xl border-white/10 bg-white/5 text-white placeholder:text-white/30"
                />
              </div>
            </div>

            {/* Guests + Search */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Users className="absolute left-3 top-3 h-4 w-4 text-white/40" />
                <Input
                  value={guests}
                  onChange={(e) => setGuests(e.target.value)}
                  placeholder="2 Guests"
                  className="pl-9 h-11 text-sm rounded-xl border-white/10 bg-white/5 text-white placeholder:text-white/30"
                />
              </div>
              <Button
                className="h-11 px-5 rounded-xl font-bold gap-2 text-sm shadow-lg"
                style={{
                  background: "hsl(38 65% 56%)",
                  color: "hsl(220 40% 13%)",
                }}
              >
                <Search className="h-4 w-4" /> Search
              </Button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ═══ CONTENT ═══ */}
      <div className="px-4 mt-6">

        {/* Tab selector */}
        <div className="flex gap-2 mb-5">
          {STAY_TABS.map(({ key, label, icon, emoji }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-2xl transition-all active:scale-95"
              style={{
                background: activeTab === key
                  ? "hsl(var(--primary))"
                  : "hsl(var(--card))",
                color: activeTab === key
                  ? "hsl(var(--primary-foreground))"
                  : "hsl(var(--muted-foreground))",
                border: `1px solid ${activeTab === key ? "hsl(var(--primary))" : "hsl(var(--border) / 0.3)"}`,
                boxShadow: activeTab === key ? "var(--shadow-elevated)" : "none",
              }}
            >
              <span className="text-lg">{emoji}</span>
              <span className="text-[11px] font-bold">{label}</span>
            </button>
          ))}
        </div>

        {/* Amenity filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none -mx-1 px-1 mb-4">
          {AMENITY_FILTERS.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => toggleAmenity(key)}
              className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-[11px] font-semibold transition-all active:scale-95"
              style={{
                background: activeAmenities.includes(key)
                  ? "hsl(var(--primary) / 0.12)"
                  : "hsl(var(--card))",
                color: activeAmenities.includes(key)
                  ? "hsl(var(--primary))"
                  : "hsl(var(--muted-foreground))",
                border: `1px solid ${activeAmenities.includes(key) ? "hsl(var(--primary) / 0.3)" : "hsl(var(--border) / 0.2)"}`,
              }}
            >
              {icon} {label}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-1.5 mb-4 overflow-x-auto scrollbar-none">
          {(["rating", "price", "distance", "reviews"] as SortMode[]).map(s => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className="shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all"
              style={{
                background: sortBy === s ? "hsl(var(--primary))" : "hsl(var(--muted))",
                color: sortBy === s ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))",
              }}
            >
              {s === "rating" ? "Top rated" : s === "price" ? "Best price" : s === "distance" ? "Nearest" : "Most reviewed"}
            </button>
          ))}
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-[12px] font-bold text-foreground">
            {filtered.length} {activeTab === "hotels" ? "hotels" : activeTab === "vacation" ? "vacation rentals" : "short stays"} found
          </p>
          <button className="text-[11px] font-semibold flex items-center gap-0.5" style={{ color: "hsl(var(--primary))" }}>
            <SlidersHorizontal className="h-3 w-3" /> More filters
          </button>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col items-center py-16 gap-3">
            <motion.div
              className="w-8 h-8 rounded-full border-2 border-t-transparent"
              style={{ borderColor: "hsl(var(--primary))" }}
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
            />
            <p className="text-xs text-muted-foreground">Finding stays…</p>
          </div>
        )}

        {/* Listings */}
        {!isLoading && filtered.length > 0 && (
          <div className="space-y-3">
            {/* Featured first result */}
            {filtered.length > 0 && (
              <PremiumMerchantCard
                to={filtered[0].slug ? `/s/${filtered[0].slug}` : `/s/${filtered[0].id}`}
                image={filtered[0].banner_url || filtered[0].logo_url}
                name={filtered[0].name}
                category={filtered[0].address || getSubcategoryLabel("property", filtered[0].subcategory || "")}
                rating={filtered[0].rating > 0 ? filtered[0].rating : undefined}
                reviewCount={filtered[0].reviews_count}
                distance={filtered[0].distanceKm ? `${filtered[0].distanceKm.toFixed(1)} km` : undefined}
                badge={filtered[0].reviews_count > 50 ? "Popular" : undefined}
                variant="featured"
                verticalType="property"
                index={0}
              />
            )}

            {/* Rest in horizontal */}
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
            className="flex flex-col items-center py-16 gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <span className="text-5xl">🏨</span>
            <p className="text-sm font-bold text-foreground">No stays found yet</p>
            <p className="text-xs text-muted-foreground text-center max-w-[260px]">
              Try searching for a destination or adjusting your filters
            </p>
          </motion.div>
        )}

        {/* Popular destinations section */}
        <div className="mt-8 mb-4">
          <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4" style={{ color: "hsl(var(--accent))" }} />
            Popular destinations
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {[
              { name: "Dubai Marina", emoji: "🏙️", img: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400&q=80" },
              { name: "Palm Jumeirah", emoji: "🌴", img: "https://images.unsplash.com/photo-1582672060674-bc2bd808a8b5?w=400&q=80" },
              { name: "Downtown Dubai", emoji: "🏛️", img: "https://images.unsplash.com/photo-1546412414-e1885259563a?w=400&q=80" },
              { name: "Abu Dhabi", emoji: "🕌", img: "https://images.unsplash.com/photo-1512632578888-169bbbc64f33?w=400&q=80" },
            ].map((dest, i) => (
              <motion.button
                key={dest.name}
                className="relative rounded-2xl overflow-hidden aspect-[3/2] active:scale-95 transition-transform"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.08 }}
                onClick={() => setDestination(dest.name)}
              >
                <img src={dest.img} alt={dest.name} className="w-full h-full object-cover" loading="lazy" />
                <div className="absolute inset-0" style={{
                  background: "linear-gradient(to top, hsla(0,0%,0%,0.65) 0%, transparent 60%)"
                }} />
                <div className="absolute bottom-2 left-2.5 flex items-center gap-1.5">
                  <span className="text-lg">{dest.emoji}</span>
                  <span className="text-xs font-bold text-white">{dest.name}</span>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
