import { useCallback, useEffect, useRef, useState } from "react";
import { db } from "@/services/db";

export interface SmartLiveETAState {
  etaMinutes: number | null;
  etaRangeMin: number | null;
  etaRangeMax: number | null;
  countdownSeconds: number | null;
  trafficLevel: string;
  weatherImpact: string;
  badge: string | null;
  isStale: boolean;
  lastRecalcAt: string | null;
  driverLat: number | null;
  driverLng: number | null;
  loading: boolean;
}

const REFRESH_INTERVAL_MS = 30_000;
const STALE_THRESHOLD_S = 60;
const COUNTDOWN_TICK_MS = 1_000;

export function useSmartLiveEta(jobId: string | null, enabled: boolean = true): SmartLiveETAState {
  const [state, setState] = useState<SmartLiveETAState>({
    etaMinutes: null,
    etaRangeMin: null,
    etaRangeMax: null,
    countdownSeconds: null,
    trafficLevel: "unknown",
    weatherImpact: "none",
    badge: null,
    isStale: false,
    lastRecalcAt: null,
    driverLat: null,
    driverLng: null,
    loading: false,
  });

  const lastEtaRef = useRef<number | null>(null);
  const lastRecalcTsRef = useRef<number>(0);
  const mountedRef = useRef(true);

  const recalculate = useCallback(async () => {
    if (!jobId) return;

    setState(s => ({ ...s, loading: true }));

    try {
      const [{ data: liveState }, { data: job }] = await Promise.all([
        db.from("trip_live_state")
          .select("lat, lng, updated_at")
          .eq("job_id", jobId)
          .maybeSingle(),
        db.from("mobility_jobs")
          .select("status, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng")
          .eq("id", jobId)
          .maybeSingle(),
      ]);

      if (!mountedRef.current) return;

      if (liveState?.lat == null || liveState?.lng == null || !job) {
        setState(s => ({ ...s, loading: false, isStale: true }));
        return;
      }

      const staleSeconds = liveState.updated_at
        ? Math.max(0, Math.round((Date.now() - new Date(liveState.updated_at).getTime()) / 1000))
        : null;
      const isStale = staleSeconds != null && staleSeconds > STALE_THRESHOLD_S;

      const isPrePickup = ["accepted", "rider_arriving_pickup", "rider_arrived_pickup"].includes(job.status);
      const isInTrip = ["picked_up", "in_progress", "rider_arriving_dropoff"].includes(job.status);

      let destLat: number | null = null;
      let destLng: number | null = null;

      if (isPrePickup) {
        destLat = job.pickup_lat;
        destLng = job.pickup_lng;
      } else if (isInTrip) {
        destLat = job.dropoff_lat;
        destLng = job.dropoff_lng;
      }

      if (destLat == null || destLng == null) {
        setState(s => ({ ...s, loading: false }));
        return;
      }

      let etaResult: {
        etaMinutes: number;
        etaRangeMin: number;
        etaRangeMax: number;
        trafficLevel: string;
        weatherImpact: string;
        badge: string | null;
      } | null = null;

      try {
        const { computeSmartETA } = await import("@/lib/mobility/smart-eta-engine");
        const result = await computeSmartETA(
          { lat: liveState.lat, lng: liveState.lng },
          { lat: destLat, lng: destLng },
          { skipDriverCount: true },
        );
        etaResult = result;
      } catch {
        const R = 6371;
        const dLat = ((destLat - liveState.lat) * Math.PI) / 180;
        const dLng = ((destLng - liveState.lng) * Math.PI) / 180;
        const a = Math.sin(dLat / 2) ** 2 +
          Math.cos((liveState.lat * Math.PI) / 180) * Math.cos((destLat * Math.PI) / 180) *
          Math.sin(dLng / 2) ** 2;
        const distKm = 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 1.3;
        const eta = Math.max(1, Math.round(distKm * 2.5));
        etaResult = {
          etaMinutes: eta,
          etaRangeMin: Math.max(1, eta - 2),
          etaRangeMax: eta + 3,
          trafficLevel: "unknown",
          weatherImpact: "none",
          badge: null,
        };
      }

      if (!mountedRef.current) return;

      const now = Date.now();
      lastEtaRef.current = etaResult.etaMinutes;
      lastRecalcTsRef.current = now;

      setState({
        etaMinutes: etaResult.etaMinutes,
        etaRangeMin: etaResult.etaRangeMin,
        etaRangeMax: etaResult.etaRangeMax,
        countdownSeconds: etaResult.etaMinutes * 60,
        trafficLevel: etaResult.trafficLevel,
        weatherImpact: etaResult.weatherImpact,
        badge: etaResult.badge,
        isStale,
        lastRecalcAt: new Date(now).toISOString(),
        driverLat: liveState.lat,
        driverLng: liveState.lng,
        loading: false,
      });
    } catch {
      if (mountedRef.current) {
        setState(s => ({ ...s, loading: false }));
      }
    }
  }, [jobId]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!jobId || !enabled) return;

    recalculate();
    const interval = setInterval(recalculate, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [jobId, enabled, recalculate]);

  useEffect(() => {
    if (!enabled || state.countdownSeconds == null || state.countdownSeconds <= 0) return;

    const tick = setInterval(() => {
      setState(s => {
        if (s.countdownSeconds == null || s.countdownSeconds <= 0) return s;
        const next = s.countdownSeconds - 1;
        const newEtaMin = Math.max(0, Math.ceil(next / 60));
        return {
          ...s,
          countdownSeconds: Math.max(0, next),
          etaMinutes: newEtaMin,
        };
      });
    }, COUNTDOWN_TICK_MS);

    return () => clearInterval(tick);
  }, [enabled, state.lastRecalcAt]);

  return state;
}
