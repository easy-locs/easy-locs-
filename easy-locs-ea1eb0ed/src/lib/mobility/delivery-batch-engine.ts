import { db } from "@/services/db";
import { platformBus } from "@/lib/shared/platform-bus";
import type { MobilityContext } from "./unified-mobility.types";

export interface BatchResult {
  batchId: string | null;
  batchedJobIds: string[];
  routeOptimized: boolean;
  estimatedSavingsPercent: number;
}

interface DeliveryPoint {
  jobId: string;
  pickup: { lat: number; lng: number };
  dropoff: { lat: number; lng: number };
  createdAt: string;
}

const MAX_BATCH_SIZE = 4;
const BATCH_RADIUS_KM = 2.5;
const BATCH_WINDOW_MS = 5 * 60 * 1000;
const DROPOFF_CLUSTER_KM = 3;

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function optimizeRoute(points: DeliveryPoint[]): DeliveryPoint[] {
  if (points.length <= 2) return points;

  const result: DeliveryPoint[] = [points[0]];
  const remaining = [...points.slice(1)];

  while (remaining.length > 0) {
    const last = result[result.length - 1];
    let bestIdx = 0;
    let bestDist = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const dist = haversineKm(
        last.dropoff.lat,
        last.dropoff.lng,
        remaining[i].pickup.lat,
        remaining[i].pickup.lng,
      );
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }

    result.push(remaining.splice(bestIdx, 1)[0]);
  }

  return result;
}

function computeRouteSavings(original: DeliveryPoint[], optimized: DeliveryPoint[]): number {
  const totalDist = (pts: DeliveryPoint[]) =>
    pts.reduce((sum, p, i) => {
      if (i === 0) return sum;
      const prev = pts[i - 1];
      return (
        sum +
        haversineKm(prev.dropoff.lat, prev.dropoff.lng, p.pickup.lat, p.pickup.lng) +
        haversineKm(p.pickup.lat, p.pickup.lng, p.dropoff.lat, p.dropoff.lng)
      );
    }, 0);

  const origDist = totalDist(original);
  const optDist = totalDist(optimized);

  if (origDist === 0) return 0;
  return Math.round(((origDist - optDist) / origDist) * 100);
}

export async function batchDeliveryJobs(
  newJobId: string,
  pickup: { lat: number; lng: number },
  dropoff: { lat: number; lng: number },
  context: MobilityContext,
): Promise<BatchResult> {
  const noBatch: BatchResult = {
    batchId: null,
    batchedJobIds: [newJobId],
    routeOptimized: false,
    estimatedSavingsPercent: 0,
  };

  if (!["food_delivery", "grocery_delivery", "parcel"].includes(context)) {
    return noBatch;
  }

  const since = new Date(Date.now() - BATCH_WINDOW_MS).toISOString();

  const { data: nearbyJobs } = await db("mobility_jobs")
    .select("id, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, created_at, status, rider_user_id")
    .eq("job_type", context)
    .in("status", ["searching", "offered"])
    .gte("created_at", since)
    .neq("id", newJobId)
    .limit(20);

  if (!nearbyJobs?.length) return noBatch;

  const batchable = (nearbyJobs as any[]).filter((j) => {
    if (!j.pickup_lat || !j.pickup_lng) return false;
    const pickupDist = haversineKm(pickup.lat, pickup.lng, j.pickup_lat, j.pickup_lng);
    const dropoffDist = haversineKm(dropoff.lat, dropoff.lng, j.dropoff_lat ?? 0, j.dropoff_lng ?? 0);
    return pickupDist <= BATCH_RADIUS_KM && dropoffDist <= DROPOFF_CLUSTER_KM;
  });

  if (batchable.length === 0) return noBatch;

  const batchJobs = batchable.slice(0, MAX_BATCH_SIZE - 1);
  const allPoints: DeliveryPoint[] = [
    { jobId: newJobId, pickup, dropoff, createdAt: new Date().toISOString() },
    ...batchJobs.map((j: any) => ({
      jobId: j.id,
      pickup: { lat: j.pickup_lat, lng: j.pickup_lng },
      dropoff: { lat: j.dropoff_lat ?? 0, lng: j.dropoff_lng ?? 0 },
      createdAt: j.created_at,
    })),
  ];

  const optimized = optimizeRoute(allPoints);
  const savings = computeRouteSavings(allPoints, optimized);

  if (savings < 5) return noBatch;

  const batchId = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const batchedJobIds = optimized.map((p) => p.jobId);

  await db("mobility_delivery_batches").insert({
    batch_id: batchId,
    job_ids: batchedJobIds,
    context,
    total_jobs: batchedJobIds.length,
    estimated_savings_percent: savings,
    route_order: optimized.map((p, i) => ({ order: i + 1, job_id: p.jobId })),
    status: "pending",
    created_at: new Date().toISOString(),
  });

  for (let i = 0; i < batchedJobIds.length; i++) {
    await db("mobility_jobs")
      .update({
        metadata: {
          batch_id: batchId,
          batch_order: i + 1,
          batch_total: batchedJobIds.length,
        },
      })
      .eq("id", batchedJobIds[i]);
  }

  platformBus.emit("dispatch:batch_created", {
    batchId,
    jobCount: batchedJobIds.length,
    savings,
    context,
  }, "system");

  return {
    batchId,
    batchedJobIds,
    routeOptimized: true,
    estimatedSavingsPercent: savings,
  };
}

export async function getBatchStatus(batchId: string) {
  const { data } = await db("mobility_delivery_batches")
    .select("*")
    .eq("batch_id", batchId)
    .maybeSingle();

  return data;
}
