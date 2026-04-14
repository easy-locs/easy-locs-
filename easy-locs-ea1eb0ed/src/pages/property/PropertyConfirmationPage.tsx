import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MobilePageHeader } from "@/components/ui/mobile-page-header";
import SubPageShell from "@/components/layout/SubPageShell";
import { Button } from "@/components/ui/button";
import { usePropertyBooking } from "@/hooks/usePropertyBooking";
import {
  CheckCircle2, Calendar, MapPin, User, MessageCircle,
  Download, Share2, Home, Clock, Phone, Copy,
} from "lucide-react";
import { toast } from "sonner";
import { useUiEngine } from "@/hooks/useUiEngine";

const NAVY = "hsl(225 22% 16%)";
const GOLD = "hsl(var(--accent))";

export default function PropertyConfirmationPage() {
  useUiEngine("property-propertyconfirmationpage");
  const navigate = useNavigate();
  const { booking, pricing, selectedListing, reset } = usePropertyBooking();

  useEffect(() => {
    if (!booking || booking.status !== "confirmed") navigate("/property/search", { replace: true });
  }, [booking, navigate]);

  if (!booking || booking.status !== "confirmed") {
    return (
      <SubPageShell noContentPad className="flex items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
    </SubPageShell>
    );
  }

  const listing = selectedListing;
  const isShort = booking.mode === "short_term";

  const copyRef = () => {
    navigator.clipboard.writeText(booking.bookingRef);
    toast.success("Booking reference copied");
  };

  return (
    <SubPageShell noContentPad>
      <MobilePageHeader title="Booking Confirmed" />

      <div className="px-4 space-y-4">
        <div className="text-center py-6">
          <div
            className="w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-3"
            style={{ background: `${GOLD}20` }}
          >
            <CheckCircle2 className="h-8 w-8" style={{ color: GOLD }} />
          </div>
          <h1 className="text-lg font-bold text-foreground mb-1">
            {isShort ? "Booking Confirmed!" : "Application Submitted!"}
          </h1>
          <p className="text-xs text-muted-foreground">
            {isShort
              ? "Your stay has been reserved. Get ready for your trip!"
              : "Your rental application has been submitted. The landlord will review it shortly."}
          </p>
        </div>

        <div className="p-4 rounded-xl border border-border/15 bg-card/50 text-center">
          <p className="text-[10px] text-muted-foreground mb-1">Booking Reference</p>
          <button onClick={copyRef} className="flex items-center gap-2 mx-auto">
            <span className="text-lg font-extrabold font-mono tracking-wider" style={{ color: NAVY }}>
              {booking.bookingRef}
            </span>
            <Copy className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="p-3 rounded-xl border border-border/15 bg-card/50 space-y-2">
          <h2 className="text-sm font-bold text-foreground">Property</h2>
          <div className="flex gap-3">
            <div className="w-16 h-12 rounded-lg bg-muted/20 flex items-center justify-center shrink-0">
              <Home className="h-5 w-5 text-muted-foreground/30" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-foreground line-clamp-1">{booking.propertyTitle}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Hosted by {booking.hostName}
              </p>
            </div>
          </div>
        </div>

        <div className="p-3 rounded-xl border border-border/15 bg-card/50 space-y-2">
          <h2 className="text-sm font-bold text-foreground">Stay Details</h2>
          {booking.checkIn && booking.checkOut ? (
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2 text-xs">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Check-in</p>
                  <p className="font-semibold tabular-nums">{booking.checkIn}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Check-out</p>
                  <p className="font-semibold tabular-nums">{booking.checkOut}</p>
                </div>
              </div>
            </div>
          ) : booking.moveInDate ? (
            <div className="flex items-center gap-2 text-xs">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <div>
                <p className="text-[10px] text-muted-foreground">Move-in date</p>
                <p className="font-semibold tabular-nums">{booking.moveInDate}</p>
              </div>
            </div>
          ) : null}
          {listing?.checkInTime && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              Check-in from {listing.checkInTime} · Check-out by {listing.checkOutTime}
            </div>
          )}
          <div className="flex items-center gap-2 text-xs">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{booking.guests.adults} adult{booking.guests.adults > 1 ? "s" : ""}{booking.guests.children > 0 ? `, ${booking.guests.children} child${booking.guests.children > 1 ? "ren" : ""}` : ""}</span>
          </div>
        </div>

        <div className="p-3 rounded-xl border border-border/15 bg-card/50 space-y-2">
          <h2 className="text-sm font-bold text-foreground">Guest</h2>
          <div className="flex items-center gap-2 text-xs">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{booking.mainGuest.firstName} {booking.mainGuest.lastName}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Phone className="h-3.5 w-3.5" /> {booking.mainGuest.phone}
          </div>
        </div>

        {pricing && (
          <div className="p-3 rounded-xl border border-border/15 bg-card/50 space-y-2">
            <h2 className="text-sm font-bold text-foreground">Payment</h2>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Amount paid</span>
              <span className="font-extrabold tabular-nums" style={{ color: NAVY }}>€{pricing.totalPrice}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Payment method</span>
              <span className="font-semibold capitalize">{booking.paymentMethod?.replace("_", " ")}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Status</span>
              <span className="font-bold" style={{ color: GOLD }}>Confirmed</span>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 h-10 rounded-xl text-xs font-bold gap-1"
            onClick={() => navigate("/orbit")}
          >
            <MessageCircle className="h-3.5 w-3.5" /> Contact Host
          </Button>
          <Button
            variant="outline"
            className="flex-1 h-10 rounded-xl text-xs font-bold gap-1"
          >
            <Download className="h-3.5 w-3.5" /> Download
          </Button>
          <Button
            variant="outline"
            className="h-10 w-10 rounded-xl p-0"
          >
            <Share2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        <Button
          onClick={reset}
          className="w-full h-11 rounded-xl font-bold text-sm"
          style={{ background: NAVY, color: GOLD }}
        >
          Search Another Property
        </Button>
      </div>
    </SubPageShell>
  );
}
