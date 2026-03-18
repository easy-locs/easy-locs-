/**
 * TravelHub — Main entry for the Travel universe.
 * Groups: Flights, Hotels, Short-term Stays / Seasonal Rentals.
 */
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plane, Hotel, Home, Search, ArrowRight, Calendar, MapPin, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";

type TravelTab = "flights" | "stays" | "hotels";

const TABS: { key: TravelTab; label: string; icon: typeof Plane; route: string }[] = [
  { key: "flights", label: "Flights", icon: Plane, route: "/travel/flights" },
  { key: "hotels", label: "Hotels", icon: Hotel, route: "/travel/hotels" },
  { key: "stays", label: "Stays", icon: Home, route: "/travel/stays" },
];

export default function TravelHub() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TravelTab>("flights");

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-b-3xl" style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))" }}>
        <div className="px-4 pt-12 pb-8 relative z-10">
          <h1 className="text-2xl font-black text-primary-foreground mb-1">Travel</h1>
          <p className="text-sm text-primary-foreground/70">Flights, hotels & seasonal stays</p>
        </div>
        <div className="absolute inset-0 opacity-10" style={{ background: "radial-gradient(circle at 80% 20%, white, transparent 60%)" }} />
      </div>

      {/* Tab Selector */}
      <div className="flex gap-2 px-4 -mt-5 relative z-20">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-2xl border transition-all ${
              activeTab === key
                ? "bg-primary text-primary-foreground border-primary shadow-lg"
                : "bg-card text-muted-foreground border-border/30"
            }`}
          >
            <Icon className="h-5 w-5" />
            <span className="text-xs font-bold">{label}</span>
          </button>
        ))}
      </div>

      {/* Quick Search */}
      <div className="px-4 mt-5 space-y-3">
        {activeTab === "flights" && <FlightQuickSearch onSearch={() => navigate("/travel/flights")} />}
        {activeTab === "hotels" && <HotelQuickSearch onSearch={() => navigate("/travel/hotels")} />}
        {activeTab === "stays" && <StayQuickSearch onSearch={() => navigate("/travel/stays")} />}
      </div>

      {/* Quick Links */}
      <div className="px-4 mt-6">
        <h2 className="text-sm font-bold text-foreground mb-3">Explore</h2>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Popular destinations", icon: "🌍", to: "/travel/stays" },
            { label: "Last-minute deals", icon: "⚡", to: "/travel/hotels" },
            { label: "Weekend getaways", icon: "🏖️", to: "/travel/stays" },
            { label: "Business travel", icon: "💼", to: "/travel/flights" },
          ].map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
            >
              <Link
                to={item.to}
                className="flex items-center gap-2 p-3 rounded-xl border border-border/20 bg-card/50 active:scale-95 transition-transform"
              >
                <span className="text-lg">{item.icon}</span>
                <span className="text-xs font-semibold text-foreground">{item.label}</span>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══ Quick Search Forms ═══ */

function FlightQuickSearch({ onSearch }: { onSearch: () => void }) {
  return (
    <div className="space-y-2 p-4 rounded-2xl bg-card border border-border/20">
      <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
        <Plane className="h-4 w-4 text-primary" /> Search flights
      </h3>
      <div className="grid grid-cols-2 gap-2">
        <div className="relative">
          <MapPin className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="From" className="pl-8 h-9 text-xs" />
        </div>
        <div className="relative">
          <MapPin className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="To" className="pl-8 h-9 text-xs" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="relative">
          <Calendar className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input type="date" className="pl-8 h-9 text-xs" />
        </div>
        <div className="relative">
          <Calendar className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input type="date" placeholder="Return" className="pl-8 h-9 text-xs" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Users className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Passengers" className="pl-8 h-9 text-xs" defaultValue="1 Adult" />
        </div>
        <Button size="sm" onClick={onSearch} className="gap-1.5">
          <Search className="h-3.5 w-3.5" /> Search
        </Button>
      </div>
    </div>
  );
}

function HotelQuickSearch({ onSearch }: { onSearch: () => void }) {
  return (
    <div className="space-y-2 p-4 rounded-2xl bg-card border border-border/20">
      <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
        <Hotel className="h-4 w-4 text-primary" /> Search hotels
      </h3>
      <div className="relative">
        <MapPin className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
        <Input placeholder="City, area or hotel name" className="pl-8 h-9 text-xs" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="relative">
          <Calendar className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input type="date" className="pl-8 h-9 text-xs" />
        </div>
        <div className="relative">
          <Calendar className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input type="date" className="pl-8 h-9 text-xs" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Users className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Guests & rooms" className="pl-8 h-9 text-xs" defaultValue="2 Guests, 1 Room" />
        </div>
        <Button size="sm" onClick={onSearch} className="gap-1.5">
          <Search className="h-3.5 w-3.5" /> Search
        </Button>
      </div>
    </div>
  );
}

function StayQuickSearch({ onSearch }: { onSearch: () => void }) {
  return (
    <div className="space-y-2 p-4 rounded-2xl bg-card border border-border/20">
      <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
        <Home className="h-4 w-4 text-primary" /> Search stays
      </h3>
      <div className="relative">
        <MapPin className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
        <Input placeholder="Destination" className="pl-8 h-9 text-xs" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="relative">
          <Calendar className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input type="date" className="pl-8 h-9 text-xs" />
        </div>
        <div className="relative">
          <Calendar className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input type="date" className="pl-8 h-9 text-xs" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Users className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Guests" className="pl-8 h-9 text-xs" defaultValue="2 Guests" />
        </div>
        <Button size="sm" onClick={onSearch} className="gap-1.5">
          <Search className="h-3.5 w-3.5" /> Search
        </Button>
      </div>
    </div>
  );
}
