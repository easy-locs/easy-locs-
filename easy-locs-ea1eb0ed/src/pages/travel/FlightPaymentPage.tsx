import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { CreditCard, Wallet, Clock, Shield, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MobilePageHeader } from "@/components/ui/mobile-page-header";
import { useFlightFlow } from "@/hooks/useFlightFlow";
import { useUiEngine } from "@/hooks/useUiEngine";

const NAVY = "hsl(220 40% 18%)";
const GOLD = "hsl(38 65% 56%)";

function formatTimeLeft(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const mins = Math.floor(diff / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function FlightPaymentPage() {
  useUiEngine("travel-flightpaymentpage");
  const { booking, confirmPayment, loading, error } = useFlightFlow();
  const [timeLeft, setTimeLeft] = useState("");
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!booking?.holdExpiresAt) return;
    const update = () => {
      const diff = new Date(booking.holdExpiresAt!).getTime() - Date.now();
      if (diff <= 0) {
        setExpired(true);
        setTimeLeft("Expired");
      } else {
        setTimeLeft(formatTimeLeft(booking.holdExpiresAt!));
      }
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [booking?.holdExpiresAt]);

  const handlePay = useCallback(() => {
    if (!booking || expired) return;
    const paymentRef = `wp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    confirmPayment(paymentRef);
  }, [booking, expired, confirmPayment]);

  if (!booking) {
    return (
      <div className="app-mobile-page bg-background">
        <MobilePageHeader title="Payment" backTo="/travel/flight-passengers" />
        <div className="text-center py-16 px-4">
          <p className="text-sm font-semibold text-foreground">No booking found</p>
        </div>
      </div>
    );
  }

  const offer = booking.offer;
  const firstSeg = offer.segments[0];
  const lastSeg = offer.segments[offer.segments.length - 1];

  return (
    <div className="app-mobile-page bg-background pb-28">
      <MobilePageHeader title="Payment" backTo="/travel/flight-passengers" />

      <div className="px-4 space-y-4 pt-2">
        {!expired && booking.holdExpiresAt && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 p-3 rounded-xl"
            style={{ background: `${GOLD}10`, border: `1px solid ${GOLD}25` }}
          >
            <Clock className="h-4 w-4 shrink-0" style={{ color: GOLD }} />
            <div className="flex-1">
              <p className="text-[11px] font-bold text-foreground">Booking held</p>
              <p className="text-[10px] text-muted-foreground">Complete payment before it expires</p>
            </div>
            <span className="text-sm font-extrabold tabular-nums" style={{ color: NAVY }}>{timeLeft}</span>
          </motion.div>
        )}

        {expired && (
          <div className="p-3 rounded-xl flex items-center gap-2" style={{ background: "hsl(0 72% 58% / 0.08)", border: "1px solid hsl(0 72% 58% / 0.2)" }}>
            <AlertTriangle className="h-4 w-4 shrink-0" style={{ color: "hsl(0 72% 58%)" }} />
            <p className="text-xs font-bold" style={{ color: "hsl(0 72% 58%)" }}>Booking expired — please search again</p>
          </div>
        )}

        <div className="p-4 rounded-2xl" style={{ background: `${NAVY}06`, border: `1px solid ${NAVY}10` }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-foreground">{firstSeg.airline} · {firstSeg.flightNumber}</p>
            {booking.pnr && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${GOLD}15`, color: NAVY }}>
                PNR: {booking.pnr}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="text-center">
              <p className="text-sm font-bold text-foreground">{firstSeg.origin}</p>
              <p className="text-[10px] text-muted-foreground">{firstSeg.originCity}</p>
            </div>
            <div className="flex-1 text-center">
              <p className="text-[10px] text-muted-foreground">→</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-foreground">{lastSeg.destination}</p>
              <p className="text-[10px] text-muted-foreground">{lastSeg.destinationCity}</p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-bold text-foreground mb-2">Passengers</h2>
          <div className="space-y-1.5">
            {booking.passengers.map((p, i) => (
              <div key={p.passengerId} className="flex items-center gap-2 p-2 rounded-lg bg-muted/20 border border-border/10">
                <span className="text-[10px] font-bold text-muted-foreground w-5 text-center tabular-nums">{i + 1}</span>
                <span className="text-xs font-semibold text-foreground flex-1">{p.title} {p.firstName} {p.lastName}</span>
                <span className="text-[10px] text-muted-foreground capitalize">{p.type}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-3 rounded-xl border border-border/15 bg-card/50 space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Flight total</span>
            <span className="text-foreground font-semibold tabular-nums">{booking.currency} {booking.totalAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Service fee</span>
            <span className="text-foreground font-semibold tabular-nums">{booking.currency} {booking.platformFee.toFixed(2)}</span>
          </div>
          <div className="border-t border-border/20 pt-1.5 flex justify-between text-sm">
            <span className="font-bold text-foreground">Total to pay</span>
            <span className="font-extrabold tabular-nums" style={{ color: NAVY }}>{booking.currency} {booking.totalAmount.toFixed(2)}</span>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-bold text-foreground mb-2">Payment Method</h2>
          <button
            className="w-full p-3 rounded-xl flex items-center gap-3 transition-colors active:scale-[0.98]"
            style={{ background: `${NAVY}06`, border: `2px solid ${GOLD}` }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${GOLD}15` }}>
              <Wallet className="h-5 w-5" style={{ color: GOLD }} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-xs font-bold text-foreground">Easy-Locs Wallet</p>
              <p className="text-[10px] text-muted-foreground">Instant payment · Secure</p>
            </div>
            <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center" style={{ borderColor: GOLD }}>
              <div className="w-2 h-2 rounded-full" style={{ background: GOLD }} />
            </div>
          </button>
        </div>

        <div className="flex items-center gap-1.5 px-1">
          <Shield className="h-3.5 w-3.5 text-muted-foreground" />
          <p className="text-[10px] text-muted-foreground">Payment secured by Easy-Locs. Your ticket will be issued immediately after payment.</p>
        </div>

        {error && (
          <div className="p-3 rounded-xl text-xs font-semibold" style={{ background: "hsl(0 72% 58% / 0.08)", color: "hsl(0 72% 58%)" }}>
            {error}
          </div>
        )}
      </div>

      <div className="fixed bottom-20 left-0 right-0 px-4 pb-2 z-40">
        <Button
          onClick={handlePay}
          disabled={loading || expired}
          className="w-full h-12 rounded-xl font-bold text-sm"
          style={{ background: expired ? "var(--muted)" : NAVY, color: "#fff" }}
        >
          {loading ? (
            <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Processing...</>
          ) : expired ? (
            "Booking expired"
          ) : (
            `Pay ${booking.currency} ${booking.totalAmount.toFixed(2)}`
          )}
        </Button>
      </div>
    </div>
  );
}
