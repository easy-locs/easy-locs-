/**
 * TravelHotelDetail — Full hotel detail page.
 * Shows: gallery, rooms, amenities, reviews, map, booking CTA.
 */
import { useParams } from "react-router-dom";
import { Star, MapPin, Wifi, Car, Coffee, Shield, Clock, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MobilePageHeader } from "@/components/ui/mobile-page-header";

export default function TravelHotelDetail() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="min-h-screen bg-background pb-28">
      <MobilePageHeader title="Hotel Details" backTo="/travel/hotels" />

      <div className="px-4 space-y-4">
        {/* Image Gallery placeholder */}
        <div className="h-48 rounded-2xl bg-muted/30 flex items-center justify-center border border-border/10">
          <span className="text-muted-foreground/30 text-sm">Gallery</span>
        </div>

        {/* Title & Rating */}
        <div>
          <h1 className="text-lg font-black text-foreground">Hotel Name</h1>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex items-center gap-0.5">
              {[1,2,3,4,5].map(i => <Star key={i} className="h-3 w-3 fill-warning text-warning" />)}
            </div>
            <span className="text-xs text-muted-foreground">4.5 · 328 reviews</span>
          </div>
          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" /> City Center, District
          </div>
        </div>

        {/* Amenities */}
        <div>
          <h2 className="text-sm font-bold text-foreground mb-2">Amenities</h2>
          <div className="flex flex-wrap gap-2">
            {[
              { icon: Wifi, label: "Free WiFi" },
              { icon: Car, label: "Parking" },
              { icon: Coffee, label: "Breakfast" },
              { icon: Shield, label: "Free cancellation" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-muted/30 border border-border/10">
                <Icon className="h-3 w-3 text-primary" />
                <span className="text-[10px] font-medium text-foreground">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Room Options */}
        <div>
          <h2 className="text-sm font-bold text-foreground mb-2">Available Rooms</h2>
          {[
            { name: "Standard Double", price: 89, maxGuests: 2 },
            { name: "Superior Suite", price: 149, maxGuests: 3 },
            { name: "Family Room", price: 179, maxGuests: 4 },
          ].map(room => (
            <div key={room.name} className="flex items-center justify-between p-3 rounded-xl border border-border/15 bg-card/50 mb-2">
              <div>
                <p className="text-xs font-bold text-foreground">{room.name}</p>
                <p className="text-[10px] text-muted-foreground">Up to {room.maxGuests} guests</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-foreground">${room.price}</p>
                <p className="text-[10px] text-muted-foreground">/night</p>
              </div>
            </div>
          ))}
        </div>

        {/* Check-in/out rules */}
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

        {/* Cancellation */}
        <div className="p-3 rounded-xl bg-success/5 border border-success/20">
          <div className="flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-success" />
            <span className="text-xs font-bold text-success">Free cancellation</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">Cancel up to 24 hours before check-in for a full refund</p>
        </div>

        {/* Map placeholder */}
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
            <p className="text-xs text-muted-foreground italic">"Great location, friendly staff, clean rooms."</p>
            <p className="text-[10px] text-muted-foreground mt-1">— Guest, March 2026</p>
          </div>
        </div>
      </div>

      {/* Sticky Booking CTA */}
      <div className="fixed bottom-20 left-0 right-0 px-4 pb-2 z-40">
        <div className="flex items-center justify-between p-3 rounded-2xl bg-card border border-border/20 shadow-lg backdrop-blur-sm">
          <div>
            <p className="text-lg font-black text-foreground">$89</p>
            <p className="text-[10px] text-muted-foreground">/night · taxes included</p>
          </div>
          <Button size="sm" className="font-bold">Book Now</Button>
        </div>
      </div>
    </div>
  );
}
