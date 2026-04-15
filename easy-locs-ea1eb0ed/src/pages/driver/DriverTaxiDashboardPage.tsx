import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { createRideService } from "@/domains/ride/service";
import SubPageShell from "@/components/layout/SubPageShell";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Power, PowerOff, DollarSign, Car, Clock, MapPin, Navigation,
  Check, X, ChevronRight, Loader2, ExternalLink, Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StarRating } from "@/components/social/StarRating";

type DriverStep = "idle" | "offer" | "navigating_pickup" | "waiting_passenger" | "in_trip" | "completed";

interface OfferData {
  id: string;
  jobId: string;
  pickupLabel: string;
  pickupAddress: string;
  pickupLat: number;
  pickupLng: number;
  dropoffLabel: string;
  dropoffAddress: string;
  dropoffLat: number;
  dropoffLng: number;
  estimatedPrice: number;
  currency: string;
  distanceToPickup: number;
  clientRating?: number;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function DriverTaxiDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(false);
  const [step, setStep] = useState<DriverStep>("idle");
  const [todayTrips, setTodayTrips] = useState(0);
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [offer, setOffer] = useState<OfferData | null>(null);
  const [offerCountdown, setOfferCountdown] = useState(30);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [clientRating, setClientRating] = useState(0);
  const [clientComment, setClientComment] = useState("");
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [completedJob, setCompletedJob] = useState<any>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval>>();
  const [myLat, setMyLat] = useState(0);
  const [myLng, setMyLng] = useState(0);

  const service = useMemo(
    () => user?.id ? createRideService({ userId: user.id }) : null,
    [user?.id]
  );

  useEffect(() => {
    if (!navigator.geolocation) return;
    const watcher = navigator.geolocation.watchPosition(
      (pos) => { setMyLat(pos.coords.latitude); setMyLng(pos.coords.longitude); },
      () => {},
      { enableHighAccuracy: true, timeout: 10000 }
    );
    return () => navigator.geolocation.clearWatch(watcher);
  }, []);

  useEffect(() => {
    if (!service) return;
    const loadStats = async () => {
      try {
        const result = await service.getDriverStats(user!.id, "today");
        if (result.ok) {
          setTodayTrips(result.data.totalTrips);
          setTodayEarnings(result.data.totalEarnings);
        }
      } catch {}
    };
    loadStats();
  }, [service, user?.id]);

  const toggleOnline = async () => {
    if (!service) return;
    const newStatus = !isOnline;
    setIsOnline(newStatus);
    try {
      const result = await service.toggleDriverOnline(newStatus);
      if (!result.ok) throw new Error(result.error);
      toast.success(newStatus ? "You are now online" : "You are now offline");
    } catch {
      setIsOnline(!newStatus);
      toast.error("Failed to update status");
    }
  };

  useEffect(() => {
    if (!service || !isOnline) return;

    const subscription = service.subscribeToOffers((payload: any) => {
      if (payload.new?.status === "pending" && step === "idle") {
        const o = payload.new;
        const loadOffer = async () => {
          try {
            const jobResult = await service.fetchJobRaw(o.job_id);
            if (!jobResult.ok || !jobResult.data) return;
            const job = jobResult.data;
            const dist = myLat ? haversineKm(myLat, myLng, job.pickup_lat, job.pickup_lng) : 0;
            setOffer({
              id: o.id,
              jobId: o.job_id,
              pickupLabel: job.pickup_label || "Pickup",
              pickupAddress: job.pickup_address || "",
              pickupLat: job.pickup_lat,
              pickupLng: job.pickup_lng,
              dropoffLabel: job.dropoff_label || "Dropoff",
              dropoffAddress: job.dropoff_address || "",
              dropoffLat: job.dropoff_lat,
              dropoffLng: job.dropoff_lng,
              estimatedPrice: job.quoted_price ?? 0,
              currency: job.currency ?? "AED",
              distanceToPickup: Math.round(dist * 10) / 10,
            });
            setOfferCountdown(30);
            setStep("offer");
          } catch {}
        };
        loadOffer();
      }
    });

    return () => { subscription.unsubscribe(); };
  }, [service, isOnline, step, myLat, myLng]);

  useEffect(() => {
    if (step !== "offer") return;
    countdownRef.current = setInterval(() => {
      setOfferCountdown(prev => {
        if (prev <= 1) {
          handleRejectOffer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [step]);

  const handleAcceptOffer = useCallback(async () => {
    if (!offer || !service) return;
    setLoading(true);
    try {
      const respondResult = await service.respondToOffer(offer.id, "accept");
      if (!respondResult.ok) throw new Error(respondResult.error);

      setActiveJobId(offer.jobId);

      await service.advanceStatus(offer.jobId, "rider_arriving_pickup");

      setStep("navigating_pickup");
      toast.success("Offer accepted!");
    } catch {
      toast.error("Failed to accept offer");
    } finally {
      setLoading(false);
    }
  }, [offer, service]);

  const handleRejectOffer = useCallback(async () => {
    if (!offer || !service) return;
    try {
      await service.respondToOffer(offer.id, "reject");
    } catch {}
    setOffer(null);
    setStep("idle");
    if (countdownRef.current) clearInterval(countdownRef.current);
  }, [offer, service]);

  const handleAdvanceStatus = useCallback(async (newStatus: string) => {
    if (!activeJobId || !service) return;
    setLoading(true);
    try {
      const result = await service.advanceStatus(activeJobId, newStatus as any);
      if (!result.ok) throw new Error(result.error);

      switch (newStatus) {
        case "rider_arrived_pickup":
          setStep("waiting_passenger");
          toast.success("You have arrived at pickup");
          break;
        case "in_progress":
          setStep("in_trip");
          toast.success("Trip started");
          break;
        case "completed":
          try {
            const jobResult = await service.fetchJobRaw(activeJobId);
            if (jobResult.ok) setCompletedJob(jobResult.data);
          } catch {}
          setStep("completed");
          toast.success("Trip completed!");
          break;
      }
    } catch (err) {
      toast.error("Failed to update status");
    } finally {
      setLoading(false);
    }
  }, [activeJobId, service]);

  const handleRateClient = async () => {
    if (!activeJobId || !service || !completedJob || clientRating === 0) {
      toast.info("Please select a rating");
      return;
    }
    setRatingSubmitting(true);
    try {
      await service.rateClient(
        activeJobId,
        user!.id,
        completedJob.customer_user_id,
        clientRating,
        clientComment
      );
      toast.success("Rating submitted");
      resetToIdle();
    } catch {
      toast.error("Failed to submit rating");
    } finally {
      setRatingSubmitting(false);
    }
  };

  const resetToIdle = () => {
    setStep("idle");
    setOffer(null);
    setActiveJobId(null);
    setCompletedJob(null);
    setClientRating(0);
    setClientComment("");
  };

  const openInMaps = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`, "_blank");
  };

  return (
    <SubPageShell noContentPad className="bg-background pb-[120px]" style={{ paddingTop: "max(8px, env(safe-area-inset-top, 0px))" }}>
      <header className="sticky top-0 z-20 backdrop-blur-xl flex items-center justify-between px-4 pt-3 pb-2" style={{ background: "hsl(226 24% 14% / 0.95)" }}>
        <div className="flex items-center gap-2">
          <Car className="w-5 h-5" style={{ color: "hsl(var(--accent))" }} />
          <h1 className="text-lg font-bold text-white tracking-tight">Driver Dashboard</h1>
        </div>
        <button
          onClick={() => navigate("/driver/taxi/earnings")}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold"
          style={{ background: "hsl(0 0% 100% / 0.1)", color: "hsl(var(--accent))" }}
        >
          <DollarSign className="w-3 h-3" /> Earnings
        </button>
      </header>

      <div className="px-4 mt-4 space-y-4">
        <AnimatePresence mode="wait">
          {step === "idle" && (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="flex flex-col items-center py-8 space-y-6">
                <motion.button
                  onClick={toggleOnline}
                  whileTap={{ scale: 0.95 }}
                  className={cn(
                    "w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl",
                    isOnline
                      ? "ring-4"
                      : ""
                  )}
                  style={isOnline
                    ? { background: "hsl(142 71% 45%)", boxShadow: "0 0 40px hsl(142 71% 45% / 0.4)", ringColor: "hsl(142 71% 45% / 0.3)" }
                    : { background: "hsl(226 24% 14%)", boxShadow: "0 8px 32px hsl(0 0% 0% / 0.3)" }
                  }
                >
                  {isOnline
                    ? <Power className="w-12 h-12 text-white" />
                    : <PowerOff className="w-12 h-12 text-white/60" />
                  }
                </motion.button>
                <div className="text-center">
                  <p className="text-lg font-bold text-foreground">
                    {isOnline ? "You are online" : "You are offline"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {isOnline ? "Waiting for ride requests..." : "Go online to receive rides"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-border/20 bg-card p-4 text-center">
                  <p className="text-2xl font-bold text-foreground">{todayTrips}</p>
                  <p className="text-xs text-muted-foreground mt-1">Trips today</p>
                </div>
                <div className="rounded-2xl border border-border/20 bg-card p-4 text-center">
                  <p className="text-2xl font-bold text-foreground">{todayEarnings.toFixed(0)} <span className="text-sm text-muted-foreground">AED</span></p>
                  <p className="text-xs text-muted-foreground mt-1">Earned today</p>
                </div>
              </div>
            </motion.div>
          )}

          {step === "offer" && offer && (
            <motion.div
              key="offer"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-4"
            >
              <div className="text-center space-y-2">
                <p className="text-lg font-bold text-foreground">New Ride Request</p>
                <div className="relative w-20 h-20 mx-auto">
                  <svg className="w-20 h-20 -rotate-90" viewBox="0 0 72 72">
                    <circle cx="36" cy="36" r="32" fill="none" stroke="hsl(var(--muted))" strokeWidth="4" />
                    <circle
                      cx="36" cy="36" r="32" fill="none"
                      stroke="hsl(var(--accent))"
                      strokeWidth="4"
                      strokeDasharray={2 * Math.PI * 32}
                      strokeDashoffset={2 * Math.PI * 32 * (1 - offerCountdown / 30)}
                      strokeLinecap="round"
                      className="transition-all duration-1000"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-xl font-bold text-foreground">
                    {offerCountdown}s
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-border/20 bg-card p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ background: "hsl(142 71% 45%)" }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground line-clamp-1">{offer.pickupLabel}</p>
                    <p className="text-[10px] text-muted-foreground line-clamp-1">{offer.pickupAddress}</p>
                  </div>
                </div>
                <div className="ml-1.5 border-l-2 border-dashed border-border/30 h-3" />
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ background: "hsl(var(--accent))" }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground line-clamp-1">{offer.dropoffLabel}</p>
                    <p className="text-[10px] text-muted-foreground line-clamp-1">{offer.dropoffAddress}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl border border-border/20 bg-card p-3 text-center">
                  <Navigation className="w-4 h-4 mx-auto mb-1" style={{ color: "hsl(var(--accent))" }} />
                  <p className="text-sm font-bold text-foreground">{offer.distanceToPickup} km</p>
                  <p className="text-[10px] text-muted-foreground">to pickup</p>
                </div>
                <div className="rounded-xl border border-border/20 bg-card p-3 text-center">
                  <DollarSign className="w-4 h-4 mx-auto mb-1" style={{ color: "hsl(var(--accent))" }} />
                  <p className="text-sm font-bold text-foreground">{offer.estimatedPrice}</p>
                  <p className="text-[10px] text-muted-foreground">{offer.currency}</p>
                </div>
                <div className="rounded-xl border border-border/20 bg-card p-3 text-center">
                  <Star className="w-4 h-4 mx-auto mb-1" style={{ color: "hsl(var(--accent))" }} />
                  <p className="text-sm font-bold text-foreground">{offer.clientRating ? offer.clientRating.toFixed(1) : "—"}</p>
                  <p className="text-[10px] text-muted-foreground">Client</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleRejectOffer}
                  className="flex-1 py-4 rounded-2xl text-sm font-bold border border-border/20 text-muted-foreground active:scale-[0.97] transition-all"
                >
                  Decline
                </button>
                <button
                  onClick={handleAcceptOffer}
                  disabled={loading}
                  className="flex-[2] py-4 rounded-2xl text-sm font-bold text-white active:scale-[0.97] transition-all flex items-center justify-center gap-2"
                  style={{ background: "hsl(142 71% 45%)", boxShadow: "0 4px 16px hsl(142 71% 45% / 0.3)" }}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-5 h-5" />}
                  ACCEPT
                </button>
              </div>
            </motion.div>
          )}

          {step === "navigating_pickup" && offer && (
            <motion.div key="navigating" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="rounded-2xl p-5 text-center" style={{ background: "hsl(226 24% 14%)" }}>
                <p className="text-xs uppercase tracking-wider font-bold mb-2" style={{ color: "hsl(var(--accent) / 0.7)" }}>Navigate to pickup</p>
                <p className="text-lg font-bold text-white">{offer.pickupLabel}</p>
                <p className="text-xs text-white/60 mt-1">{offer.pickupAddress}</p>
              </div>

              <button
                onClick={() => openInMaps(offer.pickupLat, offer.pickupLng)}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-bold text-white active:scale-[0.97] transition-all"
                style={{ background: "hsl(var(--accent))" }}
              >
                <ExternalLink className="w-4 h-4" /> Open in Google Maps
              </button>

              <button
                onClick={() => handleAdvanceStatus("rider_arrived_pickup")}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-bold text-white active:scale-[0.97] transition-all"
                style={{ background: "hsl(142 71% 45%)", boxShadow: "0 4px 16px hsl(142 71% 45% / 0.3)" }}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-5 h-5" />}
                I have arrived at pickup
              </button>
            </motion.div>
          )}

          {step === "waiting_passenger" && (
            <motion.div key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="rounded-2xl p-5 text-center" style={{ background: "hsl(226 24% 14%)" }}>
                <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-3" style={{ background: "hsl(var(--accent) / 0.15)" }}>
                  <Clock className="w-8 h-8" style={{ color: "hsl(var(--accent))" }} />
                </div>
                <p className="text-lg font-bold text-white">Waiting for passenger</p>
                <p className="text-xs text-white/60 mt-1">The client has been notified of your arrival</p>
              </div>

              <button
                onClick={() => handleAdvanceStatus("in_progress")}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-bold text-white active:scale-[0.97] transition-all"
                style={{ background: "hsl(142 71% 45%)", boxShadow: "0 4px 16px hsl(142 71% 45% / 0.3)" }}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Car className="w-5 h-5" />}
                Passenger on board — Start trip
              </button>
            </motion.div>
          )}

          {step === "in_trip" && offer && (
            <motion.div key="in_trip" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="rounded-2xl p-5 text-center" style={{ background: "hsl(226 24% 14%)" }}>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "hsl(var(--accent))" }} />
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "hsl(var(--accent))" }}>Trip in progress</span>
                </div>
                <p className="text-lg font-bold text-white">{offer.dropoffLabel}</p>
                <p className="text-xs text-white/60 mt-1">{offer.dropoffAddress}</p>
              </div>

              <button
                onClick={() => openInMaps(offer.dropoffLat, offer.dropoffLng)}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold border border-border/20 text-foreground active:scale-[0.97] transition-all"
              >
                <ExternalLink className="w-4 h-4" /> Navigate to destination
              </button>

              <button
                onClick={() => handleAdvanceStatus("completed")}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-bold text-white active:scale-[0.97] transition-all"
                style={{ background: "hsl(142 71% 45%)", boxShadow: "0 4px 16px hsl(142 71% 45% / 0.3)" }}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-5 h-5" />}
                Complete trip
              </button>
            </motion.div>
          )}

          {step === "completed" && (
            <motion.div key="completed" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="space-y-4 py-4">
              <div className="flex flex-col items-center text-center space-y-3">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{ background: "hsl(142 71% 45% / 0.15)" }}
                >
                  <Check className="w-8 h-8" style={{ color: "hsl(142 71% 45%)" }} />
                </motion.div>
                <h2 className="text-lg font-bold text-foreground">Trip completed</h2>
                {completedJob && (
                  <p className="text-2xl font-bold text-foreground">
                    {completedJob.current_price ?? completedJob.quoted_price} <span className="text-sm text-muted-foreground">{completedJob.currency ?? "AED"}</span>
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-border/20 bg-card p-4 space-y-3">
                <p className="text-sm font-bold text-foreground text-center">How was the passenger?</p>
                <div className="flex justify-center">
                  <StarRating value={clientRating} onChange={setClientRating} size={32} />
                </div>
                <textarea
                  value={clientComment}
                  onChange={(e) => setClientComment(e.target.value)}
                  placeholder="Optional comment..."
                  rows={2}
                  maxLength={500}
                  className="w-full rounded-xl border border-border/20 bg-background px-3 py-2 text-sm resize-none placeholder:text-muted-foreground/50"
                />
                <button
                  onClick={handleRateClient}
                  disabled={ratingSubmitting || clientRating === 0}
                  className="w-full py-3 rounded-xl text-sm font-bold text-white disabled:opacity-40 active:scale-[0.97] transition-all"
                  style={{ background: "hsl(226 24% 14%)" }}
                >
                  {ratingSubmitting ? "Submitting..." : "Submit & continue"}
                </button>
                <button
                  onClick={resetToIdle}
                  className="w-full text-center text-xs text-muted-foreground"
                >
                  Skip
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </SubPageShell>
  );
}
