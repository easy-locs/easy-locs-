/**
 * useDeliveryHeatmap — Aggregates delivery demand into spatial clusters
 * PASS74-D: Driver Demand Heatmap
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface DemandZone {
  id: string;
  lat: number;
  lng: number;
  count: number;
  intensity: number; // 0-1 normalized
  avgFee: number;
  currency: string;
  recentJobs: number; // last hour
  label?: string;
}

export interface HeatmapStats {
  totalPending: number;
  hotZones: number;
  avgDeliveryFee: number;
  peakHour: string;
}

const GRID_SIZE_KM = 1.5; // cluster radius in km
const LAT_STEP = GRID_SIZE_KM / 111; // ~0.0135 degrees
const LNG_STEP_AT_48 = GRID_SIZE_KM / (111 * Math.cos(48.85 * Math.PI / 180)); // Paris-adjusted

function gridKey(lat: number, lng: number): string {
  const gLat = Math.floor(lat / LAT_STEP) * LAT_STEP;
  const gLng = Math.floor(lng / LNG_STEP_AT_48) * LNG_STEP_AT_48;
  return `${gLat.toFixed(4)}_${gLng.toFixed(4)}`;
}

export function useDeliveryHeatmap(orgId?: string) {
  const [zones, setZones] = useState<DemandZone[]>([]);
  const [stats, setStats] = useState<HeatmapStats>({ totalPending: 0, hotZones: 0, avgDeliveryFee: 0, peakHour: "--" });
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch recent pending/assigned jobs (last 24h)
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      let query = supabase
        .from("delivery_jobs")
        .select("id, pickup_lat, pickup_lng, delivery_fee, currency, priority, status, created_at")
        .in("status", ["pending", "assigned", "accepted", "in_progress"])
        .gte("created_at", since)
        .not("pickup_lat", "is", null)
        .not("pickup_lng", "is", null);

      if (orgId) query = query.eq("org_id", orgId);

      const { data: jobs, error } = await query.limit(500);
      if (error || !jobs) {
        setZones([]);
        return;
      }

      // Cluster into grid cells
      const clusters = new Map<string, { lat: number; lng: number; count: number; fees: number[]; recentCount: number; currency: string }>();
      const oneHourAgo = Date.now() - 60 * 60 * 1000;

      for (const j of jobs) {
        if (!j.pickup_lat || !j.pickup_lng) continue;
        const key = gridKey(j.pickup_lat, j.pickup_lng);
        const existing = clusters.get(key) || {
          lat: j.pickup_lat, lng: j.pickup_lng, count: 0, fees: [], recentCount: 0, currency: j.currency || "EUR",
        };
        existing.count++;
        if (j.delivery_fee) existing.fees.push(j.delivery_fee);
        if (new Date(j.created_at).getTime() > oneHourAgo) existing.recentCount++;
        // Average position
        existing.lat = (existing.lat * (existing.count - 1) + j.pickup_lat) / existing.count;
        existing.lng = (existing.lng * (existing.count - 1) + j.pickup_lng) / existing.count;
        clusters.set(key, existing);
      }

      // Normalize intensity
      const maxCount = Math.max(...Array.from(clusters.values()).map(c => c.count), 1);

      const demandZones: DemandZone[] = Array.from(clusters.entries()).map(([key, c]) => ({
        id: key,
        lat: Math.round(c.lat * 10000) / 10000,
        lng: Math.round(c.lng * 10000) / 10000,
        count: c.count,
        intensity: c.count / maxCount,
        avgFee: c.fees.length ? Math.round(c.fees.reduce((a, b) => a + b, 0) / c.fees.length * 100) / 100 : 0,
        currency: c.currency,
        recentJobs: c.recentCount,
      }));

      demandZones.sort((a, b) => b.intensity - a.intensity);

      // Compute stats
      const pendingCount = jobs.filter(j => j.status === "pending").length;
      const hotCount = demandZones.filter(z => z.intensity >= 0.6).length;
      const allFees = jobs.filter(j => j.delivery_fee).map(j => j.delivery_fee!);
      const avgFee = allFees.length ? Math.round(allFees.reduce((a, b) => a + b, 0) / allFees.length * 100) / 100 : 0;

      // Peak hour
      const hourCounts: Record<number, number> = {};
      for (const j of jobs) {
        const h = new Date(j.created_at).getHours();
        hourCounts[h] = (hourCounts[h] || 0) + 1;
      }
      const peakH = Object.entries(hourCounts).sort(([, a], [, b]) => b - a)[0];
      const peakHour = peakH ? `${peakH[0].padStart(2, "0")}:00` : "--";

      setZones(demandZones);
      setStats({ totalPending: pendingCount, hotZones: hotCount, avgDeliveryFee: avgFee, peakHour });
    } catch (err) {
      console.error("[heatmap] Error:", err);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => { refresh(); }, [refresh]);

  return { zones, stats, loading, refresh };
}
