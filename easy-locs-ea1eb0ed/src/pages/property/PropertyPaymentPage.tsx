import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MobilePageHeader } from "@/components/ui/mobile-page-header";
import { Button } from "@/components/ui/button";
import { usePropertyBooking } from "@/hooks/usePropertyBooking";
import {
  CreditCard, Wallet, Smartphone, Building2, Shield,
  Loader2, AlertCircle, X, CheckCircle2, Lock,
} from "lucide-react";

const NAVY = "hsl(220 40% 18%)";
const GOLD = "hsl(38 65% 56%)";

type PaymentMethod = "wallet" | "card" | "bank_transfer" | "mobile_money";

const PAYMENT_METHODS: { key: PaymentMethod; label: string; icon: typeof CreditCard; desc: string }[] = [
  { key: "wallet", label: "Easy-Locs Wallet", icon: Wallet, desc: "Pay instantly from your wallet balance" },
  { key: "card", label: "Credit / Debit Card", icon: CreditCard, desc: "Visa, Mastercard, Amex" },
  { key: "bank_transfer", label: "Bank Transfer", icon: Building2, desc: "Direct bank payment" },
  { key: "mobile_money", label: "Mobile Money", icon: Smartphone, desc: "M-Pesa, Orange Money, Wave" },
];

export default function PropertyPaymentPage() {
  const navigate = useNavigate();
  const { booking, pricing, confirmPayment, loading, error, clearError } = usePropertyBooking();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("wallet");

  useEffect(() => {
    if (!booking || !pricing) navigate("/property/search", { replace: true });
  }, [booking, pricing, navigate]);

  if (!booking || !pricing) {
    return (
      <div className="app-mobile-page flex items-center justify-center h-[60dvh]">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const handlePay = useCallback(async () => {
    await confirmPayment(selectedMethod);
  }, [selectedMethod, confirmPayment]);

  return (
    <div className="app-mobile-page bg-background pb-28">
      <MobilePageHeader title="Payment" backTo="/property/booking" />

      <div className="px-4 space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
            <span className="text-xs text-destructive flex-1">{error}</span>
            <button onClick={clearError}><X className="h-3.5 w-3.5 text-destructive" /></button>
          </div>
        )}

        <div className="p-3 rounded-xl border border-border/15 bg-card/50 space-y-2">
          <h2 className="text-sm font-bold text-foreground">Booking Summary</h2>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Property</span>
            <span className="font-semibold text-foreground text-right max-w-[60%] line-clamp-1">{booking.propertyTitle}</span>
          </div>
          {booking.checkIn && booking.checkOut && (
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Dates</span>
              <span className="font-semibold tabular-nums">{booking.checkIn} → {booking.checkOut}</span>
            </div>
          )}
          {booking.moveInDate && (
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Move-in</span>
              <span className="font-semibold tabular-nums">{booking.moveInDate}</span>
            </div>
          )}
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Guests</span>
            <span className="font-semibold tabular-nums">{booking.guests.adults + booking.guests.children}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Booking ref</span>
            <span className="font-bold font-mono text-[10px]" style={{ color: GOLD }}>{booking.bookingRef}</span>
          </div>
          <div className="border-t border-border/20 pt-2 flex justify-between text-sm">
            <span className="font-bold">Amount Due</span>
            <span className="font-extrabold tabular-nums" style={{ color: NAVY }}>€{pricing.totalPrice}</span>
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-sm font-bold text-foreground">Payment Method</h2>
          {PAYMENT_METHODS.map(m => {
            const Icon = m.icon;
            const active = selectedMethod === m.key;
            return (
              <button
                key={m.key}
                onClick={() => setSelectedMethod(m.key)}
                className="w-full flex items-center gap-3 p-3 rounded-xl border transition-colors text-left"
                style={{
                  borderColor: active ? GOLD : "var(--border)",
                  background: active ? `${GOLD}08` : "transparent",
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: active ? `${GOLD}20` : "var(--muted)" }}
                >
                  <Icon className="h-5 w-5" style={{ color: active ? GOLD : "var(--muted-foreground)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground">{m.label}</p>
                  <p className="text-[10px] text-muted-foreground">{m.desc}</p>
                </div>
                <div
                  className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                  style={{ borderColor: active ? GOLD : "var(--border)" }}
                >
                  {active && <div className="w-2.5 h-2.5 rounded-full" style={{ background: GOLD }} />}
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/20 border border-border/10">
          <Lock className="h-4 w-4 shrink-0" style={{ color: GOLD }} />
          <p className="text-[10px] text-muted-foreground">
            Your payment is encrypted and secure. Easy-Locs holds your payment until 24h after check-in.
          </p>
        </div>

        <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/20 border border-border/10">
          <Shield className="h-4 w-4 shrink-0" style={{ color: GOLD }} />
          <p className="text-[10px] text-muted-foreground">
            {booking.cancellationPolicy.charAt(0).toUpperCase() + booking.cancellationPolicy.slice(1)} cancellation policy. 
            {booking.cancellationPolicy === "flexible" ? " Free cancellation up to 24h before check-in." : ""}
          </p>
        </div>

        <Button
          onClick={handlePay}
          disabled={loading}
          className="w-full h-12 rounded-xl font-bold text-sm"
          style={{ background: NAVY, color: GOLD }}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Pay €{pricing.totalPrice}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
