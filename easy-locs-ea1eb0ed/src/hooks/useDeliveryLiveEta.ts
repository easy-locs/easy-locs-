import { useCallback, useEffect, useRef, useState } from "react";
import { db } from "@/services/db";

export interface DeliveryLiveETAState {
  totalMinutes: number | null;
  totalRangeMin: number | null;
  totalRangeMax: number | null;
  leg1DriverToMerchantMin: number | null;
  leg2PrepMinutes: number | null;
  leg3MerchantToClientMin: number | null;
  preparingWhileEnRoute: boolean;
  trafficLevel: string;
  weatherImpact: string;
  badge: string | null;
  isStale: boolean;
  lastRecalcAt: string | null;
  driverLat: number | null;
  driverLng: number | null;
  loading: boolean;
  countdownSeconds: number | null;
}

const REFRESH_INTERVAL_MS = 30_000;
const STALE_THRESHOLD_S = 60;
const COUNTDOWN_TICK_MS = 1_000;

export function useDeliveryLiveEta(jobId: string | null, enabled: boolean = true): DeliveryLiveETAState {
  const [state, setState] = useState<DeliveryLiveETAState>({
    totalMinutes: null,
    totalRangeMin: null,
    totalRangeMax: null,
    leg1DriverToMerchantMin: null,
    leg2PrepMinutes: null,
    leg3MerchantToClientMin: null,
    preparingWhileEnRoute: false,
    trafficLevel: "unknown",
    weatherImpact: "none",
    badge: null,
    isStale: false,
    lastRecalcAt: null,
    driverLat: null,
    driverLng: null,
    loading: false,
    countdownSeconds: null,
  });

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
          .select("status, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, merchant_id, job_type")
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

      const merchantLat = job.pickup_lat;
      const merchantLng = job.pickup_lng;
      const clientLat = job.dropoff_lat;
      const clientLng = job.dropoff_lng;

      if (merchantLat == null || merchantLng == null || clientLat == null || clientLng == null) {
        setState(s => ({ ...s, loading: false }));
        return;
      }

      const isPrePickup = ["accepted", "rider_arriving_pickup", "rider_arrived_pickup", "preparing"].includes(job.status);

      if (isPrePickup) {
        try {
          const { computeDeliveryETA } = await import("@/lib/mobility/smart-eta-engine");
          const result = await computeDeliveryETA(
            { lat: liveState.lat, lng: liveState.lng },
            { lat: merchantLat, lng: merchantLng },
            { lat: clientLat, lng: clientLng },
            {
              merchantId: job.merchant_id ?? undefined,
              deliveryCategory: job.job_type ?? "food",
            },
          );

          if (!mountedRef.current) return;

          setState({
            totalMinutes: result.totalMinutes,
            totalRangeMin: result.totalRangeMin,
            totalRangeMax: result.totalRangeMax,
            leg1DriverToMerchantMin: result.leg1DriverToMerchant.etaMinutes,
            leg2PrepMinutes: result.leg2PrepMinutes,
            leg3MerchantToClientMin: result.leg3MerchantToClient.etaMinutes,
            preparingWhileEnRoute: result.preparingWhileEnRoute,
            trafficLevel: result.trafficLevel,
            weatherImpact: result.weatherImpact,
            badge: result.badge,
            isStale,
            lastRecalcAt: new Date().toISOString(),
            driverLat: liveState.lat,
            driverLng: liveState.lng,
            loading: false,
            countdownSeconds: result.totalMinutes * 60,
          });
          return;
        } catch { /* fallback below */ }
      }

      try {
        const { computeSmartETA } = await import("@/lib/mobility/smart-eta-engine");
        const result = await computeSmartETA(
          { lat: liveState.lat, lng: liveState.lng },
          { lat: clientLat, lng: clientLng },
          { skipDriverCount: true },
        );

        if (!mountedRef.current) return;

        setState({
          totalMinutes: result.etaMinutes,
          totalRangeMin: result.etaRangeMin,
          totalRangeMax: result.etaRangeMax,
          leg1DriverToMerchantMin: null,
          leg2PrepMinutes: null,
          leg3MerchantToClientMin: result.etaMinutes,
          preparingWhileEnRoute: false,
          trafficLevel: result.trafficLevel,
          weatherImpact: result.weatherImpact,
          badge: result.badge,
          isStale,
          lastRecalcAt: new Date().toISOString(),
          driverLat: liveState.lat,
          driverLng: liveState.lng,
          loading: false,
          countdownSeconds: result.etaMinutes * 60,
        });
      } catch {
        setState(s => ({ ...s, loading: false, isStale }));
      }
    } catch {
      if (mountedRef.current) setState(s => ({ ...s, loading: false }));
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
        return { ...s, countdownSeconds: Math.max(0, next), totalMinutes: Math.max(0, Math.ceil(next / 60)) };
      });
    }, COUNTDOWN_TICK_MS);
    return () => clearInterval(tick);
  }, [enabled, state.lastRecalcAt]);

  return state;
}
