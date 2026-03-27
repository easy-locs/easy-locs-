/**
 * HotelCheckout — Booking checkout page.
 * Shows room/rate summary, price breakdown, and triggers booking via create_hotel_booking RPC.
 */
import { useSearchParams, useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";
import { MobilePageHeader } from "@/components/ui/mobile-page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useHotelDetail } from "@/hooks/useHotelDetail";
import { useHotelBooking, type BookingResult } from "@/hooks/useHotelBooking";
import { useAuth } from "@/contexts/AuthContext";
import { format, differenceInDays } from "date-fns";
import {
  Star, MapPin, BedDouble, Users, CalendarDays, Shield, Coffee,
  CheckCircle2, AlertCircle, Loader2
} from "lucide-react";
import { toast } from "sonner";

export default function HotelCheckout() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const hotelId = params.get("hotel") ?? "";
  const roomId = params.get("room") ?? "";
  const ratePlanId = params.get("plan") ?? "";
  const checkIn = params.get("checkin") ?? "";
  const checkOut = params.get("checkout") ?? "";
  const adults = parseInt(params.get("adults") ?? "2", 10);
  const children = parseInt(params.get("children") ?? "0", 10);

  const { data: hotel, isLoading } = useHotelDetail(hotelId);
  const bookingMutation = useHotelBooking();
  const [bookingResult, setBookingResult] = useState<BookingResult | null>(null);

  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    return differenceInDays(new Date(checkOut), new Date(checkIn));
  }, [checkIn, checkOut]);

  const room = useMemo(() => hotel?.rooms.find(r => r.id === roomId), [hotel, roomId]);
  const ratePlan = useMemo(() => room?.rate_plans.find(p => p.id === ratePlanId), [room, ratePlanId]);

  // Compute price from availability data
  const priceBreakdown = useMemo(() => {
    if (!room || !checkIn || !checkOut || nights <= 0) return null;
    let totalBase = 0, totalTaxes = 0, totalFees = 0, totalFinal = 0;
    const nightlyPrices: Array<{ date: string; price: number }> = [];

    for (let d = 0; d < nights; d++) {
      const dateStr = format(new Date(new Date(checkIn).getTime() + d * 86400000), "yyyy-MM-dd");
      const day = room.availability.find(a => a.date === dateStr);
      if (!day || !day.available) return null;
      totalBase += day.base_price;
      totalTaxes += day.taxes_amount;
      totalFees += day.fees_amount;
      totalFinal += day.final_price || day.base_price;
      nightlyPrices.push({ date: dateStr, price: day.final_price || day.base_price });
    }
    return { totalBase, totalTaxes, totalFees, totalFinal, nightlyPrices, ppn: Math.round(totalFinal / nights) };
  }, [room, checkIn, checkOut, nights]);

  const handleConfirmBooking = async () => {
    if (!user) {
      toast.error("Please sign in to book");
      navigate("/auth");
      return;
    }
    try {
      const result = await bookingMutation.mutateAsync({
        hotelId,
        roomTypeId: roomId,
        ratePlanId,
        checkinDate: checkIn,
        checkoutDate: checkOut,
        adults,
        children,
      });
      setBookingResult(result);
      toast.success("Booking confirmed! Ref: " + result.booking_reference);
    } catch (err: any) {
      toast.error(err.message || "Booking failed");
    }
  };

  if (isLoading) {
    return (
      <div className="app-mobile-page bg-background">
        <MobilePageHeader title="Checkout" backTo={`/travel/hotel/${hotelId}`} />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!hotel || !room) {
    return (
      <div className="app-mobile-page bg-background">
        <MobilePageHeader title="Checkout" backTo="/travel/stays" />
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <AlertCircle className="h-8 w-8 mb-2 opacity-30" />
          <p className="text-sm">Invalid booking details</p>
        </div>
      </div>
    );
  }

  // ═══ CONFIRMATION VIEW ═══
  if (bookingResult) {
    return (
      <div className="app-mobile-page bg-background">
        <MobilePageHeader title="Booking Confirmed" backTo="/travel/stays" />
        <div className="px-4 py-8 space-y-6">
          <div className="flex flex-col items-center text-center">
            <CheckCircle2 className="h-16 w-16 text-success mb-4" />
            <h1 className="text-xl font-black text-foreground">Booking Confirmed!</h1>
            <p className="text-sm text-muted-foreground mt-1">Your reservation is secured</p>
          </div>

          <div className="rounded-2xl border border-border/15 bg-card/80 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Reference</span>
              <span className="text-sm font-black text-primary">{bookingResult.booking_reference}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Hotel</span>
              <span className="text-sm font-semibold text-foreground">{hotel.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Room</span>
              <span className="text-sm text-foreground">{room.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Dates</span>
              <span className="text-sm text-foreground">
                {format(new Date(checkIn), "MMM d")} → {format(new Date(checkOut), "MMM d")}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Nights</span>
              <span className="text-sm text-foreground">{bookingResult.nights}</span>
            </div>
            <div className="border-t border-border/10 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-foreground">Total</span>
                <span className="text-lg font-black text-foreground">
                  {bookingResult.currency} {bookingResult.total_price.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <Button className="w-full font-bold" onClick={() => navigate("/travel/stays")}>
            Back to Hotels
          </Button>
        </div>
      </div>
    );
  }

  // ═══ CHECKOUT VIEW ═══
  return (
    <div className="app-mobile-page bg-background pb-32">
      <MobilePageHeader title="Review & Book" backTo={`/travel/hotel/${hotelId}`} />

      <div className="px-4 space-y-4 mt-4">
        {/* Hotel Summary */}
        <div className="flex gap-3 p-3 rounded-2xl border border-border/15 bg-card/80">
          {hotel.cover_image && (
            <img src={hotel.cover_image} alt={hotel.name} className="w-20 h-20 rounded-xl object-cover" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              {Array.from({ length: hotel.stars }, (_, i) => (
                <Star key={i} className="h-3 w-3 fill-warning text-warning" />
              ))}
            </div>
            <h2 className="text-sm font-bold text-foreground truncate">{hotel.name}</h2>
            <p className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <MapPin className="h-3 w-3" /> {hotel.city}, {hotel.country}
            </p>
          </div>
        </div>

        {/* Stay Details */}
        <div className="rounded-2xl border border-border/15 bg-card/80 p-4 space-y-3">
          <h3 className="text-sm font-bold text-foreground">Stay Details</h3>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              <div>
                <p className="text-[10px] text-muted-foreground">Check-in</p>
                <p className="text-xs font-semibold text-foreground">{format(new Date(checkIn), "EEE, MMM d")}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              <div>
                <p className="text-[10px] text-muted-foreground">Check-out</p>
                <p className="text-xs font-semibold text-foreground">{format(new Date(checkOut), "EEE, MMM d")}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {adults} adults{children > 0 && `, ${children} children`}</span>
            <span>{nights} night{nights > 1 ? "s" : ""}</span>
          </div>
        </div>

        {/* Room */}
        <div className="rounded-2xl border border-border/15 bg-card/80 p-4 space-y-2">
          <h3 className="text-sm font-bold text-foreground">Room</h3>
          <div className="flex items-center gap-2">
            <BedDouble className="h-4 w-4 text-primary" />
            <span className="text-sm text-foreground font-medium">{room.name}</span>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            <span>{room.capacity} guests max</span>
            <span>{room.bed_type}</span>
            {room.size_m2 && <span>{room.size_m2}m²</span>}
          </div>
        </div>

        {/* Rate Plan */}
        {ratePlan && (
          <div className="rounded-2xl border border-border/15 bg-card/80 p-4 space-y-2">
            <h3 className="text-sm font-bold text-foreground">Rate Plan</h3>
            <p className="text-sm text-foreground">{ratePlan.name}</p>
            <div className="flex flex-wrap gap-1.5">
              {ratePlan.refundable ? (
                <Badge variant="outline" className="text-[9px] border-success/30 text-success">
                  <Shield className="h-3 w-3 mr-0.5" /> Free Cancellation
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[9px] border-destructive/30 text-destructive">
                  Non-refundable
                </Badge>
              )}
              {ratePlan.includes_breakfast && (
                <Badge variant="outline" className="text-[9px] border-primary/30 text-primary">
                  <Coffee className="h-3 w-3 mr-0.5" /> Breakfast
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Price Breakdown */}
        {priceBreakdown ? (
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-2">
            <h3 className="text-sm font-bold text-foreground">Price Breakdown</h3>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{nights} night{nights > 1 ? "s" : ""} × AED {priceBreakdown.ppn}/night</span>
                <span className="text-foreground">AED {priceBreakdown.totalBase.toFixed(2)}</span>
              </div>
              {priceBreakdown.totalTaxes > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Taxes</span>
                  <span className="text-foreground">AED {priceBreakdown.totalTaxes.toFixed(2)}</span>
                </div>
              )}
              {priceBreakdown.totalFees > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Fees</span>
                  <span className="text-foreground">AED {priceBreakdown.totalFees.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-border/10 pt-2 flex justify-between">
                <span className="text-sm font-bold text-foreground">Total</span>
                <span className="text-lg font-black text-foreground">
                  AED {priceBreakdown.totalFinal.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="h-4 w-4" /> Room not available for selected dates
            </p>
          </div>
        )}
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-20 left-0 right-0 px-4 pb-2 z-40">
        <Button
          className="w-full font-bold h-12 text-sm"
          disabled={!priceBreakdown || bookingMutation.isPending}
          onClick={handleConfirmBooking}
        >
          {bookingMutation.isPending ? (
            <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Processing...</>
          ) : priceBreakdown ? (
            `Confirm & Pay AED ${priceBreakdown.totalFinal.toFixed(2)}`
          ) : (
            "Unavailable"
          )}
        </Button>
      </div>
    </div>
  );
}
