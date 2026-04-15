/**
 * TravelHotelDetail — Full Booking.com-level hotel detail page.
 * Gallery, rooms, rate plans, amenities, policies, reviews, booking CTA.
 */
import { useParams, useNavigate } from "react-router-dom";
import { useState, useMemo, useEffect } from "react";
import {
  Star, MapPin, Wifi, Car, Coffee, Shield, Clock, ChevronRight, ChevronLeft,
  Users, BedDouble, Maximize2, UtensilsCrossed, Waves, Dumbbell, Sparkles,
  CalendarDays, X, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MobilePageHeader } from "@/components/ui/mobile-page-header";
import SubPageShell from "@/components/layout/SubPageShell";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useHotelDetail, type HotelRoom } from "@/hooks/useHotelDetail";
import { format, differenceInDays, addDays } from "date-fns";
import { useUiEngine } from "@/hooks/useUiEngine";
import { useInAppNavigation } from "@/stores/useInAppNavigation";
import { createHotelService } from "@/domains/hotel/service";
import type { AvailabilityResult } from "@/domains/hotel/ports";

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
  domainAvailability,
  checkingAvailability,
}: {
  room: HotelRoom;
  checkIn: string | null;
  checkOut: string | null;
  onBook: (room: HotelRoom) => void;
  domainAvailability?: AvailabilityResult;
  checkingAvailability?: boolean;
}) {
  const priceForRange = useMemo(() => {
    if (domainAvailability) {
      return domainAvailability.available ? domainAvailability.pricePerNight : null;
    }
    if (checkingAvailability) return null;
    if (!checkIn || !checkOut) return room.lowestPrice;
    return null;
  }, [room, checkIn, checkOut, domainAvailability, checkingAvailability]);

  const isAvailable = priceForRange !== null;

  return (
    <div className="rounded-2xl border border-border/15 bg-card/80 overflow-hidden">
      {/* Room image */}
      {room.images_json.length > 0 && (
        <div className="h-32 bg-muted/20 overflow-hidden">
          <img loading="lazy" src={room.images_json[0]} alt={room.name} className="w-full h-full object-cover" />
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
            {checkingAvailability ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-auto" />
            ) : isAvailable ? (
              <>
                <p className="text-base font-extrabold text-foreground tabular-nums">AED {priceForRange}</p>
                <p className="text-[10px] text-muted-foreground">/night</p>
                {domainAvailability?.appliedSeasonalPricing && (
                  <p className="text-[9px] text-primary">{domainAvailability.appliedSeasonalPricing}</p>
                )}
              </>
            ) : (
              <p className="text-xs text-destructive font-medium">Fully booked</p>
            )}
          </div>
        </div>

        {/* Room amenities */}
        {room.amenities_json.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {room.amenities_json.slice(0, 4).map((a: string) => (
              <span key={a} className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted/30 text-muted-foreground">{a}</span>
            ))}
          </div>
        )}

        {/* Rate plans */}
        {room.rate_plans.length > 0 && (
          <div className="space-y-1">
            {room.rate_plans.map(plan => (
              <div key={plan.id} className="flex items-center gap-1.5 text-[10px]">
                {plan.refundable ? (
                  <Badge variant="outline" className="text-[10px] h-4 border-success/30 text-success">Refundable</Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] h-4 border-destructive/30 text-destructive">Non-refundable</Badge>
                )}
                <span className="text-muted-foreground">{plan.name}</span>
              </div>
            ))}
          </div>
        )}

        <Button
          size="sm"
          className="w-full font-bold text-xs"
          disabled={!isAvailable || checkingAvailability}
          onClick={() => onBook(room)}
        >
          {checkingAvailability ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> Checking…</>
          ) : isAvailable ? (
            domainAvailability ? `Available — ${domainAvailability.totalPrice.toLocaleString()} AED total` : "Select dates to check"
          ) : checkIn && checkOut && !domainAvailability ? "Unable to verify — select dates" : "Fully Booked"}
        </Button>
      </div>
    </div>
  );
}

export default function TravelHotelDetail() {
  useUiEngine("travel-travelhoteldetail");
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: hotel, isLoading } = useHotelDetail(id);
  const [galleryIdx, setGalleryIdx] = useState(0);
  const [checkIn, setCheckIn] = useState<Date | undefined>(() => {
    const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(0,0,0,0); return d;
  });
  const [checkOut, setCheckOut] = useState<Date | undefined>(() => {
    const d = new Date(); d.setDate(d.getDate() + 2); d.setHours(0,0,0,0); return d;
  });
  const [guests, setGuests] = useState(2);
  const [availabilityMap, setAvailabilityMap] = useState<Record<string, AvailabilityResult>>({});
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  useEffect(() => {
    if (!hotel || !checkIn || !checkOut || differenceInDays(checkOut, checkIn) <= 0) return;
    let cancelled = false;
    setCheckingAvailability(true);
    const service = createHotelService(null);
    const ciStr = format(checkIn, "yyyy-MM-dd");
    const coStr = format(checkOut, "yyyy-MM-dd");
    Promise.all(
      hotel.rooms.map(async (room) => {
        const result = await service.checkAvailability(id ?? "", room.id, ciStr, coStr, guests);
        return { roomId: room.id, result };
      })
    ).then(results => {
      if (cancelled) return;
      const map: Record<string, AvailabilityResult> = {};
      for (const r of results) {
        if (r.result.ok) map[r.roomId] = r.result.data;
      }
      setAvailabilityMap(map);
      setCheckingAvailability(false);
    }).catch(() => { if (!cancelled) setCheckingAvailability(false); });
    return () => { cancelled = true; };
  }, [hotel, checkIn, checkOut, guests, id]);

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
      <SubPageShell noContentPad>
        <MobilePageHeader title="Hotel" backTo="/travel/stays" />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
        </div>
    </SubPageShell>
    );
  }

  if (!hotel) {
    return (
      <SubPageShell noContentPad>
        <MobilePageHeader title="Hotel" backTo="/travel/stays" />
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <MapPin className="h-8 w-8 mb-2 opacity-30" />
          <p className="text-sm">Hotel not found</p>
        </div>
      </SubPageShell>
    );
  }

  return (
    <SubPageShell noContentPad>
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
          <h1 className="text-xl font-bold text-foreground mt-1">{hotel.name}</h1>
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
                <RoomCard key={room.id} room={room} checkIn={checkInStr} checkOut={checkOutStr} onBook={handleBook} domainAvailability={availabilityMap[room.id]} checkingAvailability={checkingAvailability} />
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

        {/* ═══ LOCATION ═══ */}
        {hotel.lat && hotel.lng && (
          <div>
            <h2 className="text-sm font-bold text-foreground mb-2">Location</h2>
            <div className="rounded-xl bg-gradient-to-br from-primary/5 to-muted/10 border border-border/10 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground">{hotel.address}</p>
                  <p className="text-[11px] text-muted-foreground">{hotel.city}, {hotel.country}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  const { openNavigation } = useInAppNavigation.getState();
                  openNavigation({ lat: hotel.lat, lng: hotel.lng, label: hotel.name || undefined });
                }}
                className="mt-3 flex items-center justify-center gap-1.5 w-full py-2 rounded-lg bg-primary/10 text-xs font-semibold text-primary active:scale-[0.97] transition-transform"
              >
                <MapPin className="h-3.5 w-3.5" /> Navigate
              </button>
            </div>
          </div>
        )}

        {/* ═══ REVIEWS ═══ */}
        {hotel.reviews_count > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h2 className="text-sm font-bold text-foreground">Reviews</h2>
              <button className="text-[10px] font-medium text-primary flex items-center gap-0.5">
                See all <ChevronRight className="h-3 w-3" />
              </button>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl border border-border/15 bg-card/50">
              <div className="flex flex-col items-center">
                <p className="text-2xl font-extrabold text-foreground tabular-nums">{hotel.rating}</p>
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
                  <p className="text-lg font-extrabold text-foreground tabular-nums">AED {hotel.rooms[0].lowestPrice}</p>
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
    </SubPageShell>
  );
}
