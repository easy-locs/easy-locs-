import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MobilePageHeader } from "@/components/ui/mobile-page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePropertyBooking } from "@/hooks/usePropertyBooking";
import { useAuth } from "@/contexts/AuthContext";
import {
  User, Mail, Phone, MessageSquare, BedDouble, Calendar,
  MapPin, Loader2, AlertCircle, X, Shield,
} from "lucide-react";

const NAVY = "hsl(220 40% 18%)";
const GOLD = "hsl(38 65% 56%)";

export default function PropertyBookingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectedListing, pricing, searchParams, submitBooking, loading, error, clearError } = usePropertyBooking();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");

  useEffect(() => {
    if (!selectedListing || !pricing) navigate("/property/search", { replace: true });
  }, [selectedListing, pricing, navigate]);

  if (!selectedListing || !pricing) {
    return (
      <div className="app-mobile-page flex items-center justify-center h-[60dvh]">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const listing = selectedListing;
  const isShort = listing.mode === "short_term";
  const canSubmit = firstName.trim() && lastName.trim() && email.trim() && phone.trim();

  const handleSubmit = useCallback(async () => {
    if (!user?.id || !canSubmit) return;
    await submitBooking(user.id, {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      specialRequests: specialRequests.trim() || undefined,
    });
  }, [user, canSubmit, firstName, lastName, email, phone, specialRequests, submitBooking]);

  return (
    <div className="app-mobile-page bg-background pb-28">
      <MobilePageHeader title="Complete Booking" backTo="/property/detail" />

      <div className="px-4 space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
            <span className="text-xs text-destructive flex-1">{error}</span>
            <button onClick={clearError}><X className="h-3.5 w-3.5 text-destructive" /></button>
          </div>
        )}

        <div className="flex gap-3 p-3 rounded-xl border border-border/15 bg-card/50">
          <div className="w-20 h-16 rounded-xl bg-muted/20 flex items-center justify-center shrink-0">
            <BedDouble className="h-5 w-5 text-muted-foreground/30" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-xs font-bold text-foreground line-clamp-1">{listing.title}</h3>
            <div className="flex items-center gap-1 mt-0.5 text-[10px] text-muted-foreground">
              <MapPin className="h-3 w-3" /> {listing.location.city}, {listing.location.country}
            </div>
            {searchParams?.checkIn && searchParams.checkOut ? (
              <div className="flex items-center gap-1 mt-0.5 text-[10px] text-muted-foreground">
                <Calendar className="h-3 w-3" /> {searchParams.checkIn} → {searchParams.checkOut}
              </div>
            ) : searchParams?.moveInDate ? (
              <div className="flex items-center gap-1 mt-0.5 text-[10px] text-muted-foreground">
                <Calendar className="h-3 w-3" /> Move-in: {searchParams.moveInDate}
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-bold text-foreground">Guest Information</h2>
          <div className="grid grid-cols-2 gap-2">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="First name"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                className="pl-10 h-11 rounded-xl bg-muted/20 border-border/20"
              />
            </div>
            <div>
              <Input
                placeholder="Last name"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                className="h-11 rounded-xl bg-muted/20 border-border/20"
              />
            </div>
          </div>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="pl-10 h-11 rounded-xl bg-muted/20 border-border/20"
            />
          </div>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Phone number"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="pl-10 h-11 rounded-xl bg-muted/20 border-border/20"
            />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-sm font-bold text-foreground">Special Requests</h2>
          <div className="relative">
            <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <textarea
              placeholder="Late check-in, extra towels, accessibility needs..."
              value={specialRequests}
              onChange={e => setSpecialRequests(e.target.value)}
              className="w-full pl-10 pr-3 py-3 h-20 rounded-xl bg-muted/20 border border-border/20 resize-none text-sm placeholder:text-muted-foreground/50"
            />
          </div>
        </div>

        <div className="p-3 rounded-xl border border-border/15 bg-card/50 space-y-2">
          <h2 className="text-sm font-bold text-foreground">Price Breakdown</h2>
          {isShort && pricing.pricePerNight && pricing.nights && (
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">€{pricing.pricePerNight} × {pricing.nights} nights</span>
              <span className="font-semibold tabular-nums">€{pricing.basePrice}</span>
            </div>
          )}
          {!isShort && pricing.pricePerMonth && (
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Monthly rent</span>
              <span className="font-semibold tabular-nums">€{pricing.pricePerMonth}</span>
            </div>
          )}
          {pricing.cleaningFee > 0 && (
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Cleaning fee</span>
              <span className="font-semibold tabular-nums">€{pricing.cleaningFee}</span>
            </div>
          )}
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Service fee</span>
            <span className="font-semibold tabular-nums">€{pricing.serviceFee}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Taxes</span>
            <span className="font-semibold tabular-nums">€{pricing.taxes}</span>
          </div>
          {pricing.deposit && pricing.deposit > 0 && (
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Security deposit (refundable)</span>
              <span className="font-semibold tabular-nums">€{pricing.deposit}</span>
            </div>
          )}
          <div className="border-t border-border/20 pt-2 flex justify-between text-sm">
            <span className="font-bold">Total</span>
            <span className="font-extrabold tabular-nums" style={{ color: NAVY }}>€{pricing.totalPrice}</span>
          </div>
        </div>

        <div className="flex items-start gap-2 p-3 rounded-xl bg-muted/20 border border-border/10">
          <Shield className="h-4 w-4 shrink-0 mt-0.5" style={{ color: GOLD }} />
          <p className="text-[10px] text-muted-foreground">
            Your booking is protected by Easy-Locs. {listing.cancellationPolicy === "flexible"
              ? "Free cancellation up to 24h before check-in."
              : `${listing.cancellationPolicy.charAt(0).toUpperCase() + listing.cancellationPolicy.slice(1)} cancellation policy applies.`}
          </p>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={loading || !canSubmit}
          className="w-full h-12 rounded-xl font-bold text-sm"
          style={{ background: NAVY, color: GOLD }}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue to Payment"}
        </Button>
      </div>
    </div>
  );
}
