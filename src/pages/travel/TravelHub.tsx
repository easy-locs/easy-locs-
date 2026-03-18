/**
 * TravelHub — Main entry for the Travel universe.
 * Simplified: Flights + Stays (hotels & seasonal rentals live inside Stays).
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plane, Home, Search, Calendar, MapPin, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import UniversePageShell from "@/components/universe/UniversePageShell";
import CategoryCard from "@/components/universe/CategoryCard";
import { motion } from "framer-motion";

type TravelTab = "flights" | "stays";

export default function TravelHub() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TravelTab>("flights");

  return (
    <UniversePageShell
      title="Travel"
      subtitle="Flights & stays worldwide"
      icon={<Plane className="h-6 w-6 text-primary-foreground" />}
      gradient="linear-gradient(135deg, hsl(250 65% 50%), hsl(250 65% 65%))"
    >
      {/* Tab Selector — only 2 tabs */}
      <div className="flex gap-2 -mt-1 mb-4">
        {([
          { key: "flights" as TravelTab, label: "Flights", icon: <Plane className="h-5 w-5" /> },
          { key: "stays" as TravelTab, label: "Stays", icon: <Home className="h-5 w-5" /> },
        ]).map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-2xl border transition-all ${
              activeTab === key
                ? "bg-primary text-primary-foreground border-primary shadow-lg"
                : "bg-card text-muted-foreground border-border/30"
            }`}
          >
            {icon}
            <span className="text-xs font-bold">{label}</span>
          </button>
        ))}
      </div>

      {/* Quick Search Form */}
      {activeTab === "flights" && <FlightQuickSearch onSearch={() => navigate("/travel/flights")} />}
      {activeTab === "stays" && <StayQuickSearch onSearch={() => navigate("/travel/stays")} />}

      {/* Quick Links */}
      <div className="mt-6">
        <h2 className="text-sm font-bold text-foreground mb-3">Explore</h2>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Popular destinations", icon: "🌍", to: "/travel/stays" },
            { label: "Last-minute deals", icon: "⚡", to: "/travel/stays" },
            { label: "Weekend getaways", icon: "🏖️", to: "/travel/stays" },
            { label: "Business travel", icon: "💼", to: "/travel/flights" },
          ].map((item, i) => (
            <CategoryCard key={item.label} to={item.to} icon={item.icon} label={item.label} index={i} />
          ))}
        </div>
      </div>
    </UniversePageShell>
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

function StayQuickSearch({ onSearch }: { onSearch: () => void }) {
  return (
    <div className="space-y-2 p-4 rounded-2xl bg-card border border-border/20">
      <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
        <Home className="h-4 w-4 text-primary" /> Search stays
      </h3>
      <p className="text-2xs text-muted-foreground">Hotels, vacation rentals & seasonal stays</p>
      <div className="relative">
        <MapPin className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
        <Input placeholder="City, area or property name" className="pl-8 h-9 text-xs" />
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
