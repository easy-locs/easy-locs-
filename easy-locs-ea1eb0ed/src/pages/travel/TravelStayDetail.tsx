/**
 * TravelStayDetail — Full stay/seasonal rental detail page.
 * Gallery, amenities, host info, reviews, pricing, booking CTA.
 */
import { useParams } from "react-router-dom";
import { Star, MapPin, Wifi, Shield, Clock, ChevronRight, User, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MobilePageHeader } from "@/components/ui/mobile-page-header";

export default function TravelStayDetail() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="app-mobile-page bg-background pb-28">
      <MobilePageHeader title="Stay Details" backTo="/travel/stays" />

      <div className="px-4 space-y-4">
        {/* Gallery */}
        <div className="h-48 rounded-2xl bg-muted/30 flex items-center justify-center border border-border/10">
          <span className="text-muted-foreground/30 text-sm">Gallery</span>
        </div>

        {/* Title */}
        <div>
          <h1 className="text-lg font-black text-foreground">Charming apartment in city center</h1>
          <div className="flex items-center gap-2 mt-1">
            <Star className="h-3 w-3 fill-warning text-warning" />
            <span className="text-xs text-muted-foreground">4.8 · 54 reviews</span>
          </div>
          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" /> Old Town, City
          </div>
        </div>

        {/* Host */}
        <div className="flex items-center gap-3 p-3 rounded-xl border border-border/15 bg-card/50">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-foreground">Hosted by Name</p>
            <p className="text-[10px] text-muted-foreground">Superhost · Joined 2022</p>
          </div>
          <Button variant="outline" size="sm" className="h-7 text-[10px]">Contact</Button>
        </div>

        {/* Key info */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Entire place", icon: Home },
            { label: "Self check-in", icon: Clock },
            { label: "Free cancel", icon: Shield },
          ].map(({ label, icon: Icon }) => (
            <div key={label} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-muted/20 border border-border/10">
              <Icon className="h-4 w-4 text-primary" />
              <span className="text-[10px] font-medium text-foreground text-center">{label}</span>
            </div>
          ))}
        </div>

        {/* Amenities */}
        <div>
          <h2 className="text-sm font-bold text-foreground mb-2">Amenities</h2>
          <div className="flex flex-wrap gap-2">
            {["WiFi", "Kitchen", "Washer", "Air conditioning", "TV", "Parking"].map(a => (
              <span key={a} className="px-2 py-1 rounded-lg bg-muted/30 border border-border/10 text-[10px] font-medium text-foreground">{a}</span>
            ))}
          </div>
        </div>

        {/* Pricing */}
        <div className="p-3 rounded-xl border border-border/15 bg-card/50 space-y-1.5">
          <div className="flex justify-between text-xs"><span className="text-muted-foreground">$75 × 5 nights</span><span className="text-foreground font-semibold">$375</span></div>
          <div className="flex justify-between text-xs"><span className="text-muted-foreground">Cleaning fee</span><span className="text-foreground font-semibold">$40</span></div>
          <div className="flex justify-between text-xs"><span className="text-muted-foreground">Service fee</span><span className="text-foreground font-semibold">$25</span></div>
          <div className="flex justify-between text-xs"><span className="text-muted-foreground">Taxes</span><span className="text-foreground font-semibold">$35</span></div>
          <div className="border-t border-border/20 pt-1.5 flex justify-between text-sm">
            <span className="font-bold text-foreground">Total</span>
            <span className="font-black text-foreground">$475</span>
          </div>
        </div>

        {/* Check-in/out */}
        <div className="p-3 rounded-xl bg-muted/20 border border-border/10 space-y-1">
          <div className="flex items-center gap-2 text-xs">
            <Clock className="h-3 w-3 text-primary" />
            <span className="font-semibold text-foreground">Check-in:</span>
            <span className="text-muted-foreground">From 15:00</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Clock className="h-3 w-3 text-primary" />
            <span className="font-semibold text-foreground">Check-out:</span>
            <span className="text-muted-foreground">Until 11:00</span>
          </div>
        </div>

        {/* Map */}
        <div className="h-32 rounded-xl bg-muted/20 border border-border/10 flex items-center justify-center">
          <MapPin className="h-5 w-5 text-muted-foreground/20" />
        </div>

        {/* Reviews */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-foreground">Reviews</h2>
            <button className="text-[10px] font-medium text-primary flex items-center gap-0.5">See all <ChevronRight className="h-3 w-3" /></button>
          </div>
          <div className="p-3 rounded-xl border border-border/15 bg-card/50">
            <p className="text-xs text-muted-foreground italic">"Perfect location, very clean and cozy."</p>
            <p className="text-[10px] text-muted-foreground mt-1">— Guest, Feb 2026</p>
          </div>
        </div>
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-20 left-0 right-0 px-4 pb-2 z-40">
        <div className="flex items-center justify-between p-3 rounded-2xl bg-card border border-border/20 shadow-lg backdrop-blur-sm">
          <div>
            <p className="text-lg font-black text-foreground">$75</p>
            <p className="text-[10px] text-muted-foreground">/night · $475 total</p>
          </div>
          <Button size="sm" className="font-bold">Reserve</Button>
        </div>
      </div>
    </div>
  );
}
