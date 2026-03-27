/**
 * TravelHotelDetail — Full Booking.com-level hotel detail page.
 * Gallery, rooms, rate plans, amenities, policies, reviews, booking CTA.
 */
import { useParams, useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";
import {
  Star, MapPin, Wifi, Car, Coffee, Shield, Clock, ChevronRight, ChevronLeft,
  Users, BedDouble, Maximize2, UtensilsCrossed, Waves, Dumbbell, Sparkles,
  CalendarDays, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MobilePageHeader } from "@/components/ui/mobile-page-header";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useHotelDetail, type HotelRoom } from "@/hooks/useHotelDetail";
import { format, differenceInDays, addDays } from "date-fns";

const AMENITY_ICONS: Record<string, any> = {
  wifi: Wifi, parking: Car, breakfast: Coffee, pool: Waves, spa: Sparkles,
  gym: Dumbbell, restaurant: UtensilsCrossed, "free cancellation": Shield,
};

function StarRating({ stars, size = "sm" }: { stars: number; size?: "sm" | "md" }) {
  const s = size === "md" ? "h-4 w-4" : "h-3 w-3";
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={cn(s, i < stars ? "fill-warning text-warning" : "text-muted-foreground/20")} />
      ))}
    </div>
  );
}

function RoomCard({
  room,
  checkIn,
  checkOut,
  onBook,
}: {
  room: HotelRoom;
  checkIn: string | null;
  checkOut: string | null;
  onBook: (room: HotelRoom) => void;
}) {
  const priceForRange = useMemo(() => {
    if (!checkIn || !checkOut) return room.lowestPrice;
    const nights = differenceInDays(new Date(checkOut), new Date(checkIn));
    if (nights <= 0) return room.lowestPrice;
    let total = 0;
    let allAvail = true;
    for (let d = 0; d < nights; d++) {
      const dateStr = format(addDays(new Date(checkIn), d), "yyyy-MM-dd");
      const day = room.availability.find(a => a.date === dateStr);
      if (!day || !day.available) { allAvail = false; break; }
      total += day.final_price;
    }
    if (!allAvail) return null;
    return Math.round(total / nights);
  }, [room, checkIn, checkOut]);

  const isAvailable = priceForRange !== null;

  return (
    <div className="rounded-2xl border border-border/15 bg-card/80 overflow-hidden">
      {/* Room image */}
      {room.images_json.length > 0 && (
        <div className="h-32 bg-muted/20 overflow-hidden">
          <img src={room.images_json[0]} alt={room.name} className="w-full h-full object-cover" />
        </div>
      )}
      <div className="p-3 space-y-2">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-bold text-foreground">{room.name}</h3>
            <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-0.5"><Users className="h-3 w-3" /> {room.capacity}</span>
              <span className="flex items-center gap-0.5"><BedDouble className="h-3 w-3" /> {room.bed_type}</span>
              {room.size_m2 && <span className="flex items-center gap-0.5"><Maximize2 className="h-3 w-3" /> {room.size_m2}m²</span>}
            </div>
          </div>
          <div className="text-right">
            {isAvailable ? (
              <>
                <p className="text-base font-black text-foreground">AED {priceForRange}</p>
                <p className="text-[10px] text-muted-foreground">/night</p>
              </>
            ) : (
              <p className="text-xs text-destructive font-medium">Unavailable</p>
            )}
          </div>
        </div>

        {/* Room amenities */}
        {room.amenities_json.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {room.amenities_json.slice(0, 4).map((a: string) => (
              <span key={a} className="text-[9px] px-1.5 py-0.5 rounded-md bg-muted/30 text-muted-foreground">{a}</span>
            ))}
          </div>
        )}

        {/* Rate plans */}
        {room.rate_plans.length > 0 && (
          <div className="space-y-1">
            {room.rate_plans.map(plan => (
              <div key={plan.id} className="flex items-center gap-1.5 text-[10px]">
                {plan.refundable ? (
                  <Badge variant="outline" className="text-[9px] h-4 border-success/30 text-success">Refundable</Badge>
                ) : (
                  <Badge variant="outline" className="text-[9px] h-4 border-destructive/30 text-destructive">Non-refundable</Badge>
                )}
                <span className="text-muted-foreground">{plan.name}</span>
              </div>
            ))}
          </div>
        )}

        <Button
          size="sm"
          className="w-full font-bold text-xs"
          disabled={!isAvailable}
          onClick={() => onBook(room)}
        >
          {isAvailable ? "Reserve" : "Not Available"}
        </Button>
      </div>
    </div>
  );
}

export default function TravelHotelDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: hotel, isLoading } = useHotelDetail(id);
  const [galleryIdx, setGalleryIdx] = useState(0);
  const [checkIn, setCheckIn] = useState<Date | undefined>(undefined);
  const [checkOut, setCheckOut] = useState<Date | undefined>(undefined);
  const [guests, setGuests] = useState(2);

  const allImages = useMemo(() => {
    if (!hotel) return [];
    const imgs = hotel.cover_image ? [hotel.cover_image] : [];
    return [...imgs, ...(hotel.gallery_json ?? [])];
  }, [hotel]);

  const checkInStr = checkIn ? format(checkIn, "yyyy-MM-dd") : null;
  const checkOutStr = checkOut ? format(checkOut, "yyyy-MM-dd") : null;
  const nights = checkIn && checkOut ? differenceInDays(checkOut, checkIn) : 0;

  const handleBook = (room: HotelRoom) => {
    if (!checkIn || !checkOut) return;
    const plan = room.rate_plans[0];
    const planId = plan?.id ?? "";
    const params = new URLSearchParams({
      hotel: id ?? "",
      room: room.id,
      plan: planId,
      checkin: checkInStr!,
      checkout: checkOutStr!,
      adults: String(guests),
      children: "0",
    });
    navigate(`/travel/hotel-checkout?${params.toString()}`);
  };

  if (isLoading) {
    return (
      <div className="app-mobile-page bg-background">
        <MobilePageHeader title="Hotel" backTo="/travel/stays" />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (!hotel) {
    return (
      <div className="app-mobile-page bg-background">
        <MobilePageHeader title="Hotel" backTo="/travel/stays" />
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <MapPin className="h-8 w-8 mb-2 opacity-30" />
          <p className="text-sm">Hotel not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-mobile-page bg-background pb-32">
      <MobilePageHeader title={hotel.name} backTo="/travel/stays" />

      {/* ═══ GALLERY ═══ */}
      {allImages.length > 0 && (
        <div className="relative h-56 w-full overflow-hidden">
          <img
            src={allImages[galleryIdx]}
            alt={hotel.name}
            className="w-full h-full object-cover"
          />
          {allImages.length > 1 && (
            <>
              <button
                onClick={() => setGalleryIdx(i => (i - 1 + allImages.length) % allImages.length)}
                className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/40 flex items-center justify-center text-white"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setGalleryIdx(i => (i + 1) % allImages.length)}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/40 flex items-center justify-center text-white"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <div className="absolute bottom-2 right-3 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded-full">
                {galleryIdx + 1}/{allImages.length}
              </div>
            </>
          )}
        </div>
      )}

      <div className="px-4 space-y-5 mt-4">
        {/* ═══ HEADER ═══ */}
        <div>
          <div className="flex items-center gap-2">
            <StarRating stars={hotel.stars} size="md" />
            {hotel.rating > 0 && (
              <Badge variant="secondary" className="text-[10px] font-bold">
                {hotel.rating} / 5
              </Badge>
            )}
          </div>
          <h1 className="text-xl font-black text-foreground mt-1">{hotel.name}</h1>
          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            {[hotel.address, hotel.city, hotel.country].filter(Boolean).join(", ")}
          </div>
          {hotel.reviews_count > 0 && (
            <p className="text-[10px] text-muted-foreground mt-0.5">{hotel.reviews_count} reviews</p>
          )}
          {hotel.description && (
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{hotel.description}</p>
          )}
        </div>

        {/* ═══ BOOKING BAR ═══ */}
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3 space-y-3">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4 text-primary" /> Select dates
          </h2>
          <div className="grid grid-cols-2 gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("justify-start text-left text-xs", !checkIn && "text-muted-foreground")}>
                  {checkIn ? format(checkIn, "MMM d") : "Check-in"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={checkIn}
                  onSelect={(d) => { setCheckIn(d); if (d && (!checkOut || checkOut <= d)) setCheckOut(addDays(d, 1)); }}
                  disabled={(d) => d < new Date()}
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("justify-start text-left text-xs", !checkOut && "text-muted-foreground")}>
                  {checkOut ? format(checkOut, "MMM d") : "Check-out"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={checkOut}
                  onSelect={setCheckOut}
                  disabled={(d) => d <= (checkIn || new Date())}
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-foreground font-medium">{guests} guests</span>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => setGuests(g => Math.max(1, g - 1))}>-</Button>
              <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => setGuests(g => Math.min(10, g + 1))}>+</Button>
            </div>
          </div>
          {nights > 0 && (
            <p className="text-[10px] text-primary font-medium">{nights} night{nights > 1 ? "s" : ""} selected</p>
          )}
        </div>

        {/* ═══ ROOMS ═══ */}
        <div>
          <h2 className="text-sm font-bold text-foreground mb-3">
            Available Rooms {hotel.rooms.length > 0 && <span className="text-muted-foreground font-normal">({hotel.rooms.length})</span>}
          </h2>
          {hotel.rooms.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-xs">
              No rooms available yet
            </div>
          ) : (
            <div className="space-y-3">
              {hotel.rooms.map(room => (
                <RoomCard key={room.id} room={room} checkIn={checkInStr} checkOut={checkOutStr} onBook={handleBook} />
              ))}
            </div>
          )}
        </div>

        {/* ═══ AMENITIES ═══ */}
        {hotel.amenities_json.length > 0 && (
          <div>
            <h2 className="text-sm font-bold text-foreground mb-2">Amenities</h2>
            <div className="flex flex-wrap gap-2">
              {hotel.amenities_json.map((a: string) => {
                const Icon = AMENITY_ICONS[a.toLowerCase()] || Sparkles;
                return (
                  <div key={a} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-muted/30 border border-border/10">
                    <Icon className="h-3.5 w-3.5 text-primary" />
                    <span className="text-[11px] font-medium text-foreground capitalize">{a}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══ POLICIES ═══ */}
        <div className="space-y-2">
          <h2 className="text-sm font-bold text-foreground">Hotel Policies</h2>
          <div className="p-3 rounded-xl bg-muted/20 border border-border/10 space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <Clock className="h-3.5 w-3.5 text-primary" />
              <span className="font-semibold text-foreground">Check-in:</span>
              <span className="text-muted-foreground">From {hotel.checkin_time}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Clock className="h-3.5 w-3.5 text-primary" />
              <span className="font-semibold text-foreground">Check-out:</span>
              <span className="text-muted-foreground">Until {hotel.checkout_time}</span>
            </div>
            {hotel.policies_json?.cancellation && (
              <div className="flex items-start gap-2 text-xs">
                <Shield className="h-3.5 w-3.5 text-success mt-0.5" />
                <span className="text-muted-foreground">{hotel.policies_json.cancellation}</span>
              </div>
            )}
          </div>
        </div>

        {/* ═══ MAP PLACEHOLDER ═══ */}
        {hotel.lat && hotel.lng && (
          <div className="h-36 rounded-xl bg-muted/20 border border-border/10 flex items-center justify-center">
            <div className="text-center">
              <MapPin className="h-5 w-5 text-primary mx-auto mb-1" />
              <p className="text-[10px] text-muted-foreground">{hotel.lat?.toFixed(4)}, {hotel.lng?.toFixed(4)}</p>
            </div>
          </div>
        )}

        {/* ═══ REVIEWS ═══ */}
        {hotel.reviews_count > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-foreground">Reviews</h2>
              <button className="text-[10px] font-medium text-primary flex items-center gap-0.5">
                See all <ChevronRight className="h-3 w-3" />
              </button>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl border border-border/15 bg-card/50">
              <div className="flex flex-col items-center">
                <p className="text-2xl font-black text-foreground">{hotel.rating}</p>
                <StarRating stars={Math.round(hotel.rating)} />
                <p className="text-[10px] text-muted-foreground mt-0.5">{hotel.reviews_count} reviews</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══ STICKY BOOKING CTA ═══ */}
      {hotel.rooms.length > 0 && (
        <div className="fixed bottom-20 left-0 right-0 px-4 pb-2 z-40">
          <div className="flex items-center justify-between p-3 rounded-2xl bg-card border border-border/20 shadow-lg backdrop-blur-sm">
            <div>
              {hotel.rooms[0]?.lowestPrice ? (
                <>
                  <p className="text-lg font-black text-foreground">AED {hotel.rooms[0].lowestPrice}</p>
                  <p className="text-[10px] text-muted-foreground">/night · lowest price</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Select dates for pricing</p>
              )}
            </div>
            <Button size="sm" className="font-bold" disabled={!checkIn || !checkOut}>
              {checkIn && checkOut ? `Book ${nights} night${nights > 1 ? "s" : ""}` : "Select Dates"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
