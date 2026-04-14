import { motion } from "framer-motion";
import { CheckCircle, Plane, Ticket, Share2, Calendar, Copy, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MobilePageHeader } from "@/components/ui/mobile-page-header";
import SubPageShell from "@/components/layout/SubPageShell";
import { useFlightFlow } from "@/hooks/useFlightFlow";
import { useNavigate } from "react-router-dom";
import { useCallback } from "react";
import { toast } from "sonner";
import { useUiEngine } from "@/hooks/useUiEngine";

const NAVY = "hsl(226 24% 14%)";
const GOLD = "hsl(var(--accent))";

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso.slice(11, 16);
  }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" });
  } catch {
    return iso.slice(0, 10);
  }
}

export default function FlightConfirmationPage() {
  useUiEngine("travel-flightconfirmationpage");
  const { booking, tickets, reset } = useFlightFlow();
  const navigate = useNavigate();

  const copyPnr = useCallback(() => {
    if (booking?.pnr) {
      navigator.clipboard.writeText(booking.pnr).catch(() => {});
      toast.success("PNR copied!");
    }
  }, [booking?.pnr]);

  const handleNewSearch = useCallback(() => {
    reset();
  }, [reset]);

  if (!booking) {
    return (
      <SubPageShell noContentPad>
        <MobilePageHeader title="Confirmation" backTo="/travel" />
        <div className="text-center py-16 px-4">
          <p className="text-sm font-semibold text-foreground">No booking found</p>
          <Button onClick={() => navigate("/travel")} className="mt-4" variant="outline">Back to Travel</Button>
        </div>
      </SubPageShell>
    );
  }

  const offer = booking.offer;
  const firstSeg = offer.segments[0];
  const lastSeg = offer.segments[offer.segments.length - 1];

  return (
    <SubPageShell noContentPad>
      <MobilePageHeader title="Booking Confirmed" backTo="/travel" />

      <div className="px-4 space-y-4 pt-2">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-6"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.15 }}
            className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center"
            style={{ background: "hsl(142 71% 45% / 0.1)" }}
          >
            <CheckCircle className="h-8 w-8" style={{ color: "hsl(142 71% 45%)" }} />
          </motion.div>
          <h1 className="text-lg font-bold text-foreground mb-1">Booking Confirmed!</h1>
          <p className="text-xs text-muted-foreground">Your flight has been booked and ticket issued</p>
        </motion.div>

        {booking.pnr && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-4 rounded-2xl text-center"
            style={{ background: `${NAVY}06`, border: `1px solid ${GOLD}30` }}
          >
            <p className="text-[10px] font-bold text-muted-foreground mb-1">YOUR PNR / BOOKING REFERENCE</p>
            <div className="flex items-center justify-center gap-2">
              <p className="text-2xl font-extrabold tracking-wider tabular-nums" style={{ color: NAVY }}>
                {booking.pnr}
              </p>
              <button onClick={copyPnr} className="p-1.5 rounded-lg active:scale-95 transition-transform" style={{ background: `${GOLD}15` }}>
                <Copy className="h-4 w-4" style={{ color: GOLD }} />
              </button>
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-4 rounded-2xl"
          style={{ background: `${NAVY}06`, border: `1px solid ${NAVY}10` }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Plane className="h-4 w-4" style={{ color: NAVY }} />
            <span className="text-xs font-bold text-foreground">{firstSeg.airline} · {firstSeg.flightNumber}</span>
          </div>

          <div className="flex items-center justify-between mb-2">
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">{firstSeg.origin}</p>
              <p className="text-[10px] text-muted-foreground">{firstSeg.originCity}</p>
              <p className="text-xs font-bold text-foreground mt-1 tabular-nums">{formatTime(firstSeg.departureTime)}</p>
              <p className="text-[10px] text-muted-foreground tabular-nums">{formatDate(firstSeg.departureTime)}</p>
            </div>
            <div className="flex-1 flex items-center justify-center px-3">
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">{lastSeg.destination}</p>
              <p className="text-[10px] text-muted-foreground">{lastSeg.destinationCity}</p>
              <p className="text-xs font-bold text-foreground mt-1 tabular-nums">{formatTime(lastSeg.arrivalTime)}</p>
              <p className="text-[10px] text-muted-foreground tabular-nums">{formatDate(lastSeg.arrivalTime)}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <h2 className="text-sm font-bold text-foreground mb-2">Passengers</h2>
          <div className="space-y-1.5">
            {booking.passengers.map((p, i) => (
              <div key={p.passengerId} className="flex items-center gap-2 p-2.5 rounded-xl border border-border/15 bg-card/50">
                <span className="text-[10px] font-bold text-muted-foreground w-5 text-center tabular-nums">{i + 1}</span>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-foreground">{p.title} {p.firstName} {p.lastName}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">{p.type}</p>
                </div>
                {tickets[i] && (
                  <div className="text-right">
                    <p className="text-[10px] font-bold" style={{ color: NAVY }}>
                      <Ticket className="inline h-3 w-3 mr-0.5" />
                      {tickets[i].ticketNumber}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="p-3 rounded-xl border border-border/15 bg-card/50 space-y-1.5"
        >
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Total paid</span>
            <span className="font-bold tabular-nums" style={{ color: NAVY }}>{booking.currency} {booking.totalAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Payment ref</span>
            <span className="text-foreground font-semibold text-[10px] tabular-nums">{booking.paymentRef ?? "—"}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Booking ID</span>
            <span className="text-foreground font-semibold text-[10px] tabular-nums">{booking.bookingId}</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="grid grid-cols-2 gap-2"
        >
          <Button
            variant="outline"
            className="h-11 rounded-xl text-xs font-bold"
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: `Flight ${booking.pnr}`,
                  text: `${firstSeg.origin} → ${lastSeg.destination} on ${formatDate(firstSeg.departureTime)}`,
                }).catch(() => {});
              }
            }}
          >
            <Share2 className="h-3.5 w-3.5 mr-1.5" />
            Share
          </Button>
          <Button
            variant="outline"
            className="h-11 rounded-xl text-xs font-bold"
            onClick={() => {
              toast.success("Added to calendar!");
            }}
          >
            <Calendar className="h-3.5 w-3.5 mr-1.5" />
            Add to calendar
          </Button>
        </motion.div>

        <Button
          onClick={handleNewSearch}
          className="w-full h-12 rounded-xl font-bold text-sm"
          style={{ background: NAVY, color: "#fff" }}
        >
          Search another flight
        </Button>
      </div>
    </SubPageShell>
  );
}
