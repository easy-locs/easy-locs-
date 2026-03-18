/**
 * TravelHub — Main entry for the Travel universe.
 * Simplified: Flights + Stays (hotels & seasonal rentals inside Stays).
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plane, Home, Search, Calendar, MapPin, Users, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import CategoryCard from "@/components/universe/CategoryCard";
import SEOHead from "@/components/SEOHead";
import { motion } from "framer-motion";

type TravelTab = "flights" | "stays";

export default function TravelHub() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TravelTab>("flights");

  return (
    <div className="min-h-screen bg-background pb-24">
      <SEOHead
        title="Travel — Flights & Stays Worldwide | Easy-Locs"
        description="Search and book flights, hotels, vacation rentals and seasonal stays worldwide. Compare prices and find the best deals."
      />

      {/* Hero */}
      <div className="relative overflow-hidden rounded-b-3xl" style={{ background: "linear-gradient(135deg, hsl(250 65% 45%), hsl(250 55% 60%))" }}>
        <div className="px-4 pt-11 pb-7 relative z-10">
          <div className="flex items-center gap-3 mb-1">
            <button
              onClick={() => navigate(-1)}
              className="w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-xl transition-transform active:scale-90"
              style={{ background: "hsl(0 0% 100% / 0.12)" }}
              aria-label="Go back"
            >
              <ArrowLeft className="h-4 w-4 text-primary-foreground" />
            </button>
            <Plane className="h-5 w-5 text-primary-foreground" />
            <h1 className="text-xl font-black text-primary-foreground tracking-tight">Travel</h1>
          </div>
          <p className="text-xs text-primary-foreground/60 ml-11">Flights & stays worldwide</p>
        </div>
        <div className="absolute inset-0 opacity-10" style={{ background: "radial-gradient(circle at 80% 20%, white, transparent 60%)" }} />
      </div>

      <div className="px-4 mt-5">
        {/* Tab Selector — 2 tabs only */}
        <div className="flex gap-2 mb-4">
          {([
            { key: "flights" as TravelTab, label: "Flights", icon: <Plane className="h-4.5 w-4.5" /> },
            { key: "stays" as TravelTab, label: "Stays", icon: <Home className="h-4.5 w-4.5" /> },
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
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Explore</h2>
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
      </div>
    </div>
  );
}

/* ═══ Quick Search Forms ═══ */

function FlightQuickSearch({ onSearch }: { onSearch: () => void }) {
  return (
    <div className="space-y-2 p-4 rounded-2xl bg-card border border-border/20 shadow-sm">
      <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
        <Plane className="h-4 w-4 text-primary" /> Search flights
      </h3>
      <div className="grid grid-cols-2 gap-2">
        <InputIcon icon={<MapPin />} placeholder="From" />
        <InputIcon icon={<MapPin />} placeholder="To" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <InputIcon icon={<Calendar />} type="date" />
        <InputIcon icon={<Calendar />} type="date" placeholder="Return" />
      </div>
      <div className="flex items-center gap-2">
        <InputIcon icon={<Users />} placeholder="1 Adult" className="flex-1" />
        <Button size="sm" onClick={onSearch} className="gap-1.5 rounded-xl h-9 px-4">
          <Search className="h-3.5 w-3.5" /> Search
        </Button>
      </div>
    </div>
  );
}

function StayQuickSearch({ onSearch }: { onSearch: () => void }) {
  return (
    <div className="space-y-2 p-4 rounded-2xl bg-card border border-border/20 shadow-sm">
      <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
        <Home className="h-4 w-4 text-primary" /> Search stays
      </h3>
      <p className="text-2xs text-muted-foreground">Hotels, vacation rentals & seasonal stays</p>
      <InputIcon icon={<MapPin />} placeholder="City, area or property name" />
      <div className="grid grid-cols-2 gap-2">
        <InputIcon icon={<Calendar />} type="date" />
        <InputIcon icon={<Calendar />} type="date" />
      </div>
      <div className="flex items-center gap-2">
        <InputIcon icon={<Users />} placeholder="2 Guests, 1 Room" className="flex-1" />
        <Button size="sm" onClick={onSearch} className="gap-1.5 rounded-xl h-9 px-4">
          <Search className="h-3.5 w-3.5" /> Search
        </Button>
      </div>
    </div>
  );
}

function InputIcon({ icon, placeholder, type, className }: { icon: React.ReactNode; placeholder?: string; type?: string; className?: string }) {
  return (
    <div className={`relative ${className || ""}`}>
      <span className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground [&>svg]:h-3.5 [&>svg]:w-3.5">{icon}</span>
      <Input type={type} placeholder={placeholder} className="pl-8 h-9 text-xs rounded-xl" />
    </div>
  );
}
