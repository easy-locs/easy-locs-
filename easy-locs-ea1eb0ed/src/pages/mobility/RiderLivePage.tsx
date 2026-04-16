import { useEffect, useState, useCallback, useRef, type ReactNode } from "react";
import { useDriverMissions, type DeliveryJob } from "@/hooks/useDriverMissions";
import { useRiderDispatchStore } from "@/stores/riderDispatchStore";
import { usePlatformBrain } from "@/hooks/usePlatformBrain";
import { fleetService } from "@/services/fleet.service";
import { useAuth } from "@/contexts/AuthContext";
import { tc } from "@/lib/i18n-canonical";
import { getDriverNextAction, isValidTransition } from "@/lib/mobility/status-machine";
import { startGPSScheduler, stopGPSScheduler, setGPSPhase, computePhase, getGPSHealth } from "@/lib/mobility/gps-scheduler";
import { GPSHealthBadge } from "@/components/mobility/GPSHealthBadge";
import { MobilityLiveMap, type MobilityLiveMapHandle } from "@/components/mobility/MobilityLiveMap";
import RiderBottomSheet, { type RiderSnapPoint } from "@/components/mobility/RiderBottomSheet";
import { preloadMapLibre } from "@/lib/maplibre/maplibre-loader";
import {
  ArrowLeft, Power, Package, MapPin, Check, X, Clock,
  DollarSign, TrendingUp, Bike, Car, Users, Zap,
  CloudRain, Sun, Cloud, Navigation, Star, User,
  BarChart3, Timer, Target, Activity,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";
import { useInAppNavigation } from "@/stores/useInAppNavigation";
import ShareButtons from "@/components/public/ShareButtons";

const WEATHER_ICON: Record<string, ReactNode> = {
  clear: <Sun className="w-3.5 h-3.5 text-amber-400" />,
  cloudy: <Cloud className="w-3.5 h-3.5 text-muted-foreground" />,
  rain: <CloudRain className="w-3.5 h-3.5 text-blue-400" />,
  storm: <CloudRain className="w-3.5 h-3.5 text-destructive" />,
};

const OFFER_TIMEOUT_S = 30;

function OfferCountdownBar({ offeredAt, expiresAt, onExpire }: { offeredAt: string | null; expiresAt: string | null; onExpire: () => void }) {
  const [progress, setProgress] = useState(1);
  const [remainingSec, setRemainingSec] = useState(OFFER_TIMEOUT_S);

  useEffect(() => {
    let expired = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    const totalMs = expiresAt && offeredAt
      ? new Date(expiresAt).getTime() - new Date(offeredAt).getTime()
      : OFFER_TIMEOUT_S * 1000;
    const startTime = offeredAt ? new Date(offeredAt).getTime() : Date.now();
    const endTime = startTime + totalMs;

    const tick = () => {
      const now = Date.now();
      const remaining = Math.max(0, endTime - now);
      const pct = remaining / totalMs;
      setProgress(pct);
      setRemainingSec(Math.ceil(remaining / 1000));
      if (remaining <= 0 && !expired) {
        expired = true;
        if (intervalId) clearInterval(intervalId);
        onExpire();
      }
    };
    tick();
    if (!expired) {
      intervalId = setInterval(tick, 200);
    }
    return () => { if (intervalId) clearInterval(intervalId); };
  }, [offeredAt, expiresAt]);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[0.625rem]">
        <span className="font-bold" style={{ color: progress < 0.3 ? "hsl(0 84% 60%)" : "hsl(var(--accent))" }}>
          Accept in {remainingSec}s
        </span>
        <Timer className="w-3 h-3" style={{ color: progress < 0.3 ? "hsl(0 84% 60%)" : "hsl(var(--accent))" }} />
      </div>
      <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{
            background: progress < 0.3 ? "hsl(0 84% 60%)" : "hsl(var(--accent))",
            width: `${progress * 100}%`,
          }}
          transition={{ duration: 0.2 }}
        />
      </div>
    </div>
  );
}

function StatCard({ value, label, accent, icon, suffix }: { value: string | number; label: string; accent: string; icon?: React.ReactNode; suffix?: string }) {
  return (
    <div className="bg-card border border-border/20 rounded-xl p-3">
      <div className={cn("flex items-center gap-1.5", accent)}>
        {icon}
        <p className="text-lg font-bold">{value}</p>
        {suffix && <span className="text-[0.625rem] text-muted-foreground ml-0.5">{suffix}</span>}
      </div>
      <p className="text-[0.625rem] text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

export default function RiderLivePage() {
  useUiEngine("mobility-riderlivepage");
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeMissions, completedMissions, stats, loading, updateStatus, confirmDelivery } = useDriverMissions();
  const offers = useRiderDispatchStore(s => s.offers);
  const hydrateOffers = useRiderDispatchStore(s => s.hydrateOffers);
  const acceptOffer = useRiderDispatchStore(s => s.acceptOffer);
  const rejectOffer = useRiderDispatchStore(s => s.rejectOffer);
  const { arbitration: station } = usePlatformBrain();
  const [isOnline, setIsOnline] = useState(false);
  const [gpsHealth, setGpsHealth] = useState(getGPSHealth());
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [onlineStartedAt, setOnlineStartedAt] = useState<number | null>(null);
  const [onlineHoursToday, setOnlineHoursToday] = useState(0);
  const accumulatedRef = useRef(0);
  const [sheetSnap, setSheetSnap] = useState<RiderSnapPoint>("half");
  const [viewportHeight, setViewportHeight] = useState(() => typeof window !== "undefined" ? window.innerHeight : 800);
  const prevOfferCountRef = useRef(offers.length);
  const [focusedMissionId, setFocusedMissionId] = useState<string | null>(null);
  const mapHandleRef = useRef<MobilityLiveMapHandle>(null);
  const [driverPos, setDriverPos] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    const onResize = () => setViewportHeight(window.innerHeight);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => { preloadMapLibre(); }, []);
  useEffect(() => { hydrateOffers(); }, []);

  useEffect(() => {
    if (!isOnline) return;
    const watchId = navigator.geolocation?.watchPosition(
      (pos) => setDriverPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
    return () => { if (watchId != null) navigator.geolocation?.clearWatch(watchId); };
  }, [isOnline]);

  useEffect(() => {
    if (offers.length > prevOfferCountRef.current && offers.length > 0) {
      setSheetSnap("half");
    }
    prevOfferCountRef.current = offers.length;
  }, [offers.length]);

  useEffect(() => {
    if (!user?.id) return;
    fleetService.fetchRiderPresence(user.id)
      .then((data) => {
        if (data) {
          setIsOnline(data.is_online);
          if (data.is_online) setOnlineStartedAt(Date.now());
        }
      })
      .catch(() => {});
  }, [user?.id]);

  useEffect(() => {
    if (!isOnline || !onlineStartedAt) return;
    const interval = setInterval(() => {
      const currentSessionHours = (Date.now() - onlineStartedAt) / (1000 * 60 * 60);
      setOnlineHoursToday(accumulatedRef.current + currentSessionHours);
    }, 30000);
    return () => clearInterval(interval);
  }, [isOnline, onlineStartedAt]);

  useEffect(() => {
    if (!user?.id || !isOnline) {
      stopGPSScheduler();
      return;
    }
    const activeJob = activeMissions[0];
    startGPSScheduler({
      userId: user.id,
      jobId: activeJob?.id ?? null,
      initialPhase: activeJob ? computePhase(activeJob.status, null, null, activeJob.pickup_lat, activeJob.pickup_lng) : "idle",
    });
    return () => stopGPSScheduler();
  }, [user?.id, isOnline, activeMissions[0]?.id]);

  useEffect(() => {
    const m = activeMissions[0];
    if (!m) { setGPSPhase("idle"); return; }
    const phase = computePhase(m.status, null, null, m.pickup_lat, m.pickup_lng);
    setGPSPhase(phase);
  }, [activeMissions[0]?.status]);

  useEffect(() => {
    const t = setInterval(() => setGpsHealth(getGPSHealth()), 5000);
    return () => clearInterval(t);
  }, []);

  const toggleOnline = async () => {
    if (!user?.id) return;
    const newStatus = !isOnline;
    await fleetService.upsertRiderPresence(user.id, newStatus);
    setIsOnline(newStatus);
    if (newStatus) {
      setOnlineStartedAt(Date.now());
    } else {
      if (onlineStartedAt) {
        const sessionHours = (Date.now() - onlineStartedAt) / (1000 * 60 * 60);
        accumulatedRef.current += sessionHours;
        setOnlineHoursToday(accumulatedRef.current);
      }
      setOnlineStartedAt(null);
    }
    toast.success(newStatus ? tc("ride.online") + " 🟢" : tc("ride.offline"));
  };

  const handleAdvanceStatus = useCallback(async (mission: DeliveryJob) => {
    const action = getDriverNextAction(mission.status);
    if (!action) return;
    if (!isValidTransition(mission.status, action.nextStatus)) {
      toast.error("Invalid transition");
      return;
    }
    setActionLoading(mission.id);
    try {
      if (action.nextStatus === "completed") {
        await confirmDelivery(mission.id);
      } else {
        await updateStatus(mission.id, action.nextStatus);
      }
      toast.success(tc(action.labelKey));
    } catch (e: any) {
      toast.error("Action failed");
    } finally {
      setActionLoading(null);
    }
  }, [confirmDelivery, updateStatus]);

  const flyToPoint = useCallback((lat?: number | null, lng?: number | null) => {
    if (lat == null || lng == null) return;
    mapHandleRef.current?.flyTo(lat, lng, 16);
  }, []);

  const openExternalNav = useCallback((lat?: number | null, lng?: number | null) => {
    if (lat == null || lng == null) return;
    const { openNavigation } = useInAppNavigation.getState();
    openNavigation({ lat, lng });
  }, []);

  const todayEarnings = completedMissions
    .filter(m => m.status === "completed" && m.completed_at && new Date(m.completed_at).toDateString() === new Date().toDateString())
    .reduce((sum, m) => sum + (m.current_price || m.quoted_price || 0), 0);

  const totalCompleted = completedMissions.filter(m => m.status === "completed").length;
  const totalCancelled = completedMissions.filter(m => m.status === "cancelled").length;
  const acceptanceRate = totalCompleted + totalCancelled > 0
    ? Math.round((totalCompleted / (totalCompleted + totalCancelled)) * 100) : 100;
  const cancellationRate = totalCompleted + totalCancelled > 0
    ? Math.round((totalCancelled / (totalCompleted + totalCancelled)) * 100) : 0;

  const focusedMission = activeMissions.find(m => m.id === focusedMissionId) ?? activeMissions[0] ?? null;
  const activeJob = activeMissions[0];
  const mapPickupLat = focusedMission?.pickup_lat ?? undefined;
  const mapPickupLng = focusedMission?.pickup_lng ?? undefined;
  const mapDropoffLat = focusedMission?.dropoff_lat ?? undefined;
  const mapDropoffLng = focusedMission?.dropoff_lng ?? undefined;
  const sheetPx = sheetSnap === "peek" ? 240 : sheetSnap === "half" ? viewportHeight * 0.55 : viewportHeight * 0.85;

  return (
    <SubPageShell
      fullScreen
      noContentPad
      className="bg-background"
      style={{ paddingTop: 0, height: "100dvh", minHeight: "100dvh" }}
    >
      <MobilityLiveMap
        ref={mapHandleRef}
        mode="delivery"
        nearbyRiders={4}
        fullScreen
        driverLat={driverPos?.lat}
        driverLng={driverPos?.lng}
        pickupLat={mapPickupLat}
        pickupLng={mapPickupLng}
        dropoffLat={mapDropoffLat}
        dropoffLng={mapDropoffLng}
        bottomPadding={sheetPx}
      />

      <header
        className="absolute top-0 left-0 right-0 z-30 flex items-center gap-3 px-4 pb-2"
        style={{
          paddingTop: "max(12px, env(safe-area-inset-top, 0px))",
          background: "linear-gradient(to bottom, hsl(226 24% 10% / 0.85) 0%, hsl(226 24% 10% / 0.4) 70%, transparent 100%)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        }}
      >
        <button
          onClick={() => window.history.length > 1 ? navigate(-1) : navigate("/")}
          className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 transition-transform"
          style={{ background: "hsl(0 0% 100% / 0.12)", backdropFilter: "blur(8px)" }}
          aria-label={tc("nav.back")}
        >
          <ArrowLeft className="w-4.5 h-4.5 text-white" />
        </button>

        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Bike className="w-5 h-5 shrink-0" style={{ color: "hsl(var(--accent))" }} />
          <h1 className="text-lg font-bold text-white tracking-tight">{tc("ride.driver_hub")}</h1>
          {station.label && (
            <span className="text-[0.625rem] text-white/60 truncate">· {station.label}</span>
          )}
          {activeMissions.length > 0 && (
            <span
              className="ml-1 text-[0.625rem] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: "hsl(var(--accent) / 0.2)", color: "hsl(var(--accent))" }}
            >
              {activeMissions.length}
            </span>
          )}
        </div>

        <GPSHealthBadge health={gpsHealth} />

        {activeJob && (
          <ShareButtons
            type="ride"
            slug={activeJob.id}
            title={`${tc("ride.driver_hub")} — ${activeJob.status?.replace(/_/g, " ") ?? "En cours"}`}
          />
        )}

        <motion.button
          onClick={toggleOnline}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
            isOnline
              ? "text-emerald-400 border border-emerald-500/30"
              : "text-white/60 border border-white/10"
          )}
          style={{
            background: isOnline ? "hsl(142 71% 45% / 0.15)" : "hsl(0 0% 100% / 0.08)",
            backdropFilter: "blur(8px)",
          }}
          whileTap={{ scale: 0.95 }}
          aria-label={isOnline ? tc("ride.online") : tc("ride.offline")}
        >
          <div className="relative">
            <Power className="h-3.5 w-3.5" />
            {isOnline && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />}
          </div>
          {isOnline ? tc("ride.online") : tc("ride.offline")}
        </motion.button>
      </header>

      {activeMissions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute z-40 left-4 right-4 flex items-center gap-3 rounded-2xl px-4 py-3"
          style={{
            top: "max(64px, calc(env(safe-area-inset-top, 0px) + 56px))",
            background: "hsl(226 24% 14% / 0.95)",
            border: "1px solid hsl(var(--accent) / 0.3)",
            backdropFilter: "blur(16px)",
            boxShadow: "0 4px 24px hsl(0 0% 0% / 0.3)",
          }}
        >
          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: "hsl(var(--accent) / 0.15)" }}>
            <Navigation className="h-4.5 w-4.5" style={{ color: "hsl(var(--accent))" }} />
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-sm font-bold text-white">{activeMissions.length} active mission{activeMissions.length > 1 ? "s" : ""}</p>
            <p className="text-[0.625rem]" style={{ color: "hsl(var(--accent) / 0.8)" }}>
              {activeJob?.status?.replace(/_/g, " ")}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Activity className="w-3.5 h-3.5" style={{ color: "hsl(var(--accent))" }} />
            <span className="text-xs font-bold" style={{ color: "hsl(var(--accent))" }}>LIVE</span>
          </div>
        </motion.div>
      )}

      <RiderBottomSheet snap={sheetSnap} onSnapChange={setSheetSnap}>
        <div className="space-y-4">
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 gap-2">
            <StatCard value={stats.active} label="Active" accent="text-primary" icon={<Activity className="w-3.5 h-3.5" />} />
            <StatCard value={stats.completed} label="Completed" accent="text-emerald-500" icon={<Check className="w-3.5 h-3.5" />} />
            <StatCard value={`${todayEarnings.toFixed(0)}`} label="Today earnings" accent="text-amber-500" icon={<DollarSign className="w-3.5 h-3.5" />} suffix="AED" />
            <StatCard value={`${stats.totalEarnings.toFixed(0)}`} label="Total earnings" accent="text-foreground" icon={<TrendingUp className="w-3.5 h-3.5" />} suffix="AED" />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-border/20 bg-card p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-emerald-500 mb-0.5">
                <Target className="w-3 h-3" />
                <span className="text-sm font-bold">{acceptanceRate}%</span>
              </div>
              <p className="text-[0.625rem] text-muted-foreground">Acceptance</p>
            </div>
            <div className="rounded-xl border border-border/20 bg-card p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-orange-500 mb-0.5">
                <X className="w-3 h-3" />
                <span className="text-sm font-bold">{cancellationRate}%</span>
              </div>
              <p className="text-[0.625rem] text-muted-foreground">Cancellation</p>
            </div>
            <div className="rounded-xl border border-border/20 bg-card p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-cyan-500 mb-0.5">
                <Clock className="w-3 h-3" />
                <span className="text-sm font-bold">
                  {onlineHoursToday < 1
                    ? `${Math.round(onlineHoursToday * 60)}m`
                    : `${onlineHoursToday.toFixed(1)}h`}
                </span>
              </div>
              <p className="text-[0.625rem] text-muted-foreground">Online today</p>
            </div>
          </motion.div>

          {station.zoneKey && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border/20 bg-card/60 p-3">
              <div className="flex items-center justify-between">
                <span className="text-[0.625rem] font-bold text-muted-foreground uppercase tracking-wider">Zone Intelligence</span>
                <span className="text-[0.625rem] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">{station.zoneKey}</span>
              </div>
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-xs text-foreground">{station.riderCount} drivers</span>
                </div>
                <div className="flex items-center gap-1">
                  {WEATHER_ICON[station.weatherType ?? "clear"]}
                  <span className="text-xs text-foreground capitalize">{station.weatherType ?? "clear"}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Car className={cn("w-3.5 h-3.5", station.trafficLevel === "heavy" ? "text-orange-400" : "text-emerald-400")} />
                  <span className="text-xs text-foreground capitalize">{station.trafficLevel ?? "normal"}</span>
                </div>
                {station.surge > 1.05 && (
                  <div className="flex items-center gap-1 ml-auto px-2 py-0.5 rounded-full bg-destructive/10">
                    <Zap className="w-3 h-3 text-destructive" />
                    <span className="text-[0.625rem] font-bold text-destructive">+{Math.round((station.surge - 1) * 100)}%</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {station.zoneKey && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="rounded-xl border border-border/20 bg-card/60 p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <BarChart3 className="w-3.5 h-3.5" style={{ color: "hsl(var(--accent))" }} />
                <span className="text-[0.625rem] font-bold text-muted-foreground uppercase tracking-wider">Demand zones</span>
                <span className="ml-auto text-[0.5625rem] px-1.5 py-0.5 rounded-full font-semibold" style={{ background: "hsl(var(--accent) / 0.15)", color: "hsl(var(--accent))" }}>
                  MAP OVERLAY
                </span>
              </div>
              <p className="text-[0.625rem] text-muted-foreground">
                {station.surge > 1.2
                  ? "🔥 High demand zones visible on map — earn more!"
                  : "Demand zones are highlighted on the map above. Stay alert for rides."}
              </p>
            </motion.div>
          )}

          <AnimatePresence>
            {offers.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider">🔔 New Offers</span>
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                </div>
                {offers.map(offer => (
                  <motion.div
                    key={offer.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="rounded-2xl border-2 border-primary/30 bg-gradient-to-r from-primary/5 to-transparent p-4 space-y-3"
                  >
                    <OfferCountdownBar
                      offeredAt={offer.offered_at}
                      expiresAt={offer.expires_at}
                      onExpire={() => rejectOffer(offer.id).catch(() => {})}
                    />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-primary" />
                        <span className="text-sm font-bold text-foreground capitalize">
                          {offer.job?.job_type?.replace(/_/g, " ") ?? "Delivery"}
                        </span>
                      </div>
                      {offer.job?.current_price != null && (
                        <span className="text-sm font-bold text-primary">
                          {offer.job.currency ?? "AED"} {offer.job.current_price}
                        </span>
                      )}
                    </div>

                    {(offer.job?.customer_name || offer.job?.customer_photo_url || offer.job?.customer_rating != null) && (
                      <div className="flex items-center gap-2.5 py-1.5 px-2 rounded-lg bg-card/60 border border-border/10">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 overflow-hidden" style={{ background: "hsl(226 24% 14%)" }}>
                          {offer.job.customer_photo_url ? (
                            <img loading="lazy" src={offer.job.customer_photo_url} alt={`${offer.job.customer_name || "Customer"} photo`} className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-4 h-4 text-white" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground">{offer.job.customer_name || "Customer"}</p>
                          {offer.job.customer_rating != null && (
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                              <span className="text-[0.625rem] text-muted-foreground">{Number(offer.job.customer_rating).toFixed(1)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 text-emerald-500" />
                        {offer.job?.pickup_address || offer.job?.pickup_label || "Pickup"}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Navigation className="w-3 h-3 text-primary" />
                        {offer.job?.dropoff_address || offer.job?.dropoff_label || "Dropoff"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 h-10 text-sm font-bold gap-1.5 bg-primary hover:bg-primary/90"
                        onClick={() => acceptOffer(offer.id).catch(() => toast.error("Something went wrong. Please try again."))}
                      >
                        <Check className="h-4 w-4" /> Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-10 px-4 text-sm text-destructive border-destructive/30"
                        onClick={() => rejectOffer(offer.id).catch(() => toast.error("Something went wrong. Please try again."))}
                        aria-label="Reject ride offer"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-2">
            <h2 className="text-xs font-bold text-foreground uppercase tracking-wider">{tc("ride.active_missions")}</h2>
            {loading ? (
              <div className="space-y-2">{[1, 2].map(i => <div key={i} className="h-28 bg-muted/30 rounded-2xl animate-pulse" />)}</div>
            ) : activeMissions.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-10">
                <div className="w-16 h-16 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto mb-3">
                  <Bike className="h-8 w-8 text-muted-foreground/30" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">
                  {isOnline ? tc("ride.waiting_missions") : tc("ride.go_online_prompt")}
                </p>
              </motion.div>
            ) : activeMissions.map((m, i) => {
              const action = getDriverNextAction(m.status);
              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={cn(
                    "rounded-2xl border bg-card overflow-hidden cursor-pointer transition-colors",
                    focusedMission?.id === m.id ? "border-primary/40 ring-1 ring-primary/20" : "border-border/20"
                  )}
                  onClick={() => {
                    setFocusedMissionId(m.id);
                    setTimeout(() => mapHandleRef.current?.fitRoute(), 100);
                  }}
                >
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-foreground capitalize">{m.job_type.replace(/_/g, " ")}</span>
                      <Badge variant="secondary" className="text-[0.625rem] font-semibold">{m.status.replace(/_/g, " ")}</Badge>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 text-emerald-500 shrink-0" />
                        <span className="truncate">{m.pickup_address || "Pickup"}</span>
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 text-primary shrink-0" />
                        <span className="truncate">{m.dropoff_address || "Dropoff"}</span>
                      </p>
                    </div>
                    {m.current_price != null && (
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-sm font-bold text-foreground">{m.current_price} {m.currency}</span>
                      </div>
                    )}
                    <div className="flex gap-2 flex-wrap">
                      {["accepted", "rider_arriving_pickup"].includes(m.status) && (
                        <>
                          <Button variant="outline" size="sm" className="h-10 gap-1.5 text-xs"
                            onClick={() => flyToPoint(m.pickup_lat, m.pickup_lng)}>
                            <MapPin className="w-3.5 h-3.5 text-emerald-500" /> View Pickup
                          </Button>
                          <Button variant="ghost" size="sm" className="h-10 gap-1.5 text-xs text-muted-foreground"
                            onClick={() => openExternalNav(m.pickup_lat, m.pickup_lng)}>
                            <Navigation className="w-3.5 h-3.5" /> GPS Nav
                          </Button>
                        </>
                      )}
                      {["picked_up", "in_progress", "rider_arriving_dropoff"].includes(m.status) && (
                        <>
                          <Button variant="outline" size="sm" className="h-10 gap-1.5 text-xs"
                            onClick={() => flyToPoint(m.dropoff_lat, m.dropoff_lng)}>
                            <MapPin className="w-3.5 h-3.5 text-primary" /> View Dropoff
                          </Button>
                          <Button variant="ghost" size="sm" className="h-10 gap-1.5 text-xs text-muted-foreground"
                            onClick={() => openExternalNav(m.dropoff_lat, m.dropoff_lng)}>
                            <Navigation className="w-3.5 h-3.5" /> GPS Nav
                          </Button>
                        </>
                      )}
                      {action && (
                        <Button
                          size="sm"
                          className="flex-1 h-10 gap-1.5 text-xs font-bold bg-primary hover:bg-primary/90"
                          disabled={actionLoading === m.id}
                          onClick={() => handleAdvanceStatus(m)}
                        >
                          <Check className="w-3.5 h-3.5" />
                          {actionLoading === m.id ? "..." : tc(action.labelKey)}
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {completedMissions.length > 0 && (
            <div className="space-y-2 pt-2">
              <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Recent History</h2>
              {completedMissions.slice(0, 8).map(m => (
                <div key={m.id} className="bg-card border border-border/20 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-foreground capitalize">{m.job_type.replace(/_/g, " ")}</p>
                    <p className="text-[0.625rem] text-muted-foreground">{m.completed_at ? new Date(m.completed_at).toLocaleDateString() : "—"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {m.current_price != null && (
                      <span className="text-xs font-bold text-foreground">{m.current_price} {m.currency}</span>
                    )}
                    <Badge variant={m.status === "completed" ? "default" : "secondary"} className="text-[0.625rem]">{m.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </RiderBottomSheet>
    </SubPageShell>
  );
}
