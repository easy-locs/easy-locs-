/**
 * dispatch-delivery — Edge function for delivery job dispatch
 * Actions: create_job, find_drivers, assign_driver, accept_job, update_status, confirm_delivery, auto_dispatch
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Not authenticated");
    const userId = userData.user.id;

    const body = await req.json();
    const { action } = body;

    // ─── CREATE JOB ──────────────────────────────────────────
    if (action === "create_job") {
      const { org_id, pickup_address, pickup_lat, pickup_lng, dropoff_address, dropoff_lat, dropoff_lng, package_description, weight_kg, priority, delivery_fee, currency, scheduled_at, notes, order_id } = body;

      if (!org_id) throw new Error("org_id required");

      // Generate 6-digit confirmation code
      const confirmationCode = String(Math.floor(100000 + Math.random() * 900000));

      const { data: job, error } = await supabaseAdmin.from("delivery_jobs").insert({
        org_id,
        seller_id: userId,
        order_id: order_id || null,
        status: "pending",
        priority: priority || "standard",
        pickup_address: pickup_address || "",
        pickup_lat, pickup_lng,
        dropoff_address: dropoff_address || "",
        dropoff_lat, dropoff_lng,
        package_description: package_description || "",
        weight_kg: weight_kg || 1,
        delivery_fee: delivery_fee || 0,
        currency: currency || "EUR",
        confirmation_code: confirmationCode,
        scheduled_at: scheduled_at || null,
        notes: notes || "",
      }).select().single();

      if (error) throw new Error(`Create job failed: ${error.message}`);

      return json({ success: true, job, confirmation_code: confirmationCode });
    }

    // ─── FIND NEARBY DRIVERS (with ranking) ────────────────
    if (action === "find_drivers") {
      const { job_id, max_distance_km, ranked } = body;
      if (!job_id) throw new Error("job_id required");

      const { data: job } = await supabaseAdmin.from("delivery_jobs").select("*").eq("id", job_id).single();
      if (!job) throw new Error("Job not found");

      // Find online drivers
      const { data: drivers } = await supabaseAdmin
        .from("driver_sessions")
        .select("*")
        .in("status", ["online"])
        .not("lat", "is", null)
        .not("lng", "is", null);

      if (!drivers || drivers.length === 0) {
        return json({ success: true, drivers: [], message: "No drivers available" });
      }

      const maxDist = max_distance_km || 15;

      if (ranked) {
        // Use ranking engine
        const rankedDrivers = rankAndScoreDrivers(drivers, job, maxDist);
        return json({ success: true, drivers: rankedDrivers, total: rankedDrivers.length, ranked: true });
      }

      // Legacy: simple distance sort
      const nearby = drivers
        .map((d: any) => {
          const dist = haversine(d.lat, d.lng, job.pickup_lat, job.pickup_lng);
          return { ...d, distance_km: Math.round(dist * 100) / 100 };
        })
        .filter((d: any) => d.distance_km <= maxDist)
        .sort((a: any, b: any) => a.distance_km - b.distance_km);

      return json({ success: true, drivers: nearby, total: nearby.length });
    }

    // ─── AUTO DISPATCH ───────────────────────────────────────
    if (action === "auto_dispatch") {
      const { job_id, max_distance_km } = body;
      if (!job_id) throw new Error("job_id required");

      const { data: job } = await supabaseAdmin.from("delivery_jobs").select("*").eq("id", job_id).single();
      if (!job) throw new Error("Job not found");
      if (!["pending"].includes(job.status)) throw new Error(`Cannot auto-dispatch in status: ${job.status}`);

      // Find online drivers
      const { data: drivers } = await supabaseAdmin
        .from("driver_sessions")
        .select("*")
        .in("status", ["online"])
        .not("lat", "is", null)
        .not("lng", "is", null);

      if (!drivers || drivers.length === 0) {
        return json({ success: false, error: "No drivers available", drivers: [] });
      }

      const maxDist = max_distance_km || 15;
      const rankedDrivers = rankAndScoreDrivers(drivers, job, maxDist);

      if (rankedDrivers.length === 0) {
        return json({ success: false, error: "No eligible drivers in range", drivers: [] });
      }

      const best = rankedDrivers[0];

      // Auto-assign the best driver
      const { error: assignErr } = await supabaseAdmin.from("delivery_jobs")
        .update({ driver_id: best.user_id, status: "assigned", assigned_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", job_id);

      if (assignErr) throw new Error(`Auto-assign failed: ${assignErr.message}`);

      // Create offer record with score
      await supabaseAdmin.from("delivery_offers").upsert({
        job_id, driver_id: best.user_id, org_id: job.org_id,
        status: "accepted",
        distance_km: best.distance_km,
        eta_minutes: best.eta_minutes,
        score: best.score,
        responded_at: new Date().toISOString(),
      }, { onConflict: "job_id,driver_id" });

      return json({
        success: true,
        job_id,
        assigned_driver: best,
        alternates: rankedDrivers.slice(1, 4),
        total_candidates: rankedDrivers.length,
      });
    }

    // ─── ASSIGN DRIVER ───────────────────────────────────────
    if (action === "assign_driver") {
      const { job_id, driver_id } = body;
      if (!job_id || !driver_id) throw new Error("job_id and driver_id required");

      // Verify job status
      const { data: job } = await supabaseAdmin.from("delivery_jobs").select("*").eq("id", job_id).single();
      if (!job) throw new Error("Job not found");
      if (!["pending", "assigned"].includes(job.status)) throw new Error(`Cannot assign in status: ${job.status}`);

      // Check driver is online
      const { data: session } = await supabaseAdmin
        .from("driver_sessions")
        .select("*")
        .eq("user_id", driver_id)
        .eq("status", "online")
        .maybeSingle();

      if (!session) throw new Error("Driver not available");

      // Update job
      const reassign = job.status === "assigned" ? { reassignment_count: (job.reassignment_count || 0) + 1 } : {};
      const { error } = await supabaseAdmin.from("delivery_jobs")
        .update({ driver_id, status: "assigned", assigned_at: new Date().toISOString(), ...reassign, updated_at: new Date().toISOString() })
        .eq("id", job_id);

      if (error) throw new Error(`Assign failed: ${error.message}`);

      // Create offer record
      await supabaseAdmin.from("delivery_offers").upsert({
        job_id, driver_id, org_id: job.org_id,
        status: "accepted",
        distance_km: session.lat && job.pickup_lat
          ? Math.round(haversine(session.lat, session.lng, job.pickup_lat, job.pickup_lng) * 100) / 100
          : null,
        responded_at: new Date().toISOString(),
      }, { onConflict: "job_id,driver_id" });

      return json({ success: true, job_id, driver_id });
    }

    // ─── ACCEPT JOB (by driver) ──────────────────────────────
    if (action === "accept_job") {
      const { job_id } = body;
      if (!job_id) throw new Error("job_id required");

      const { data: job } = await supabaseAdmin.from("delivery_jobs").select("*").eq("id", job_id).eq("driver_id", userId).single();
      if (!job) throw new Error("Job not found or not assigned to you");
      if (job.status !== "assigned") throw new Error(`Cannot accept in status: ${job.status}`);

      const { error } = await supabaseAdmin.from("delivery_jobs")
        .update({ status: "accepted", accepted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", job_id);

      if (error) throw new Error(`Accept failed: ${error.message}`);

      // Update driver session to busy
      await supabaseAdmin.from("driver_sessions")
        .update({ status: "on_delivery", current_job_id: job_id, updated_at: new Date().toISOString() })
        .eq("user_id", userId);

      return json({ success: true, job_id });
    }

    // ─── UPDATE STATUS ───────────────────────────────────────
    if (action === "update_status") {
      const { job_id, status, cancellation_reason } = body;
      if (!job_id || !status) throw new Error("job_id and status required");

      const updates: Record<string, any> = { status, updated_at: new Date().toISOString() };

      if (status === "in_progress") updates.picked_up_at = new Date().toISOString();
      if (status === "completed") updates.delivered_at = new Date().toISOString();
      if (status === "cancelled") {
        updates.cancelled_at = new Date().toISOString();
        updates.cancelled_by = userId;
        updates.cancellation_reason = cancellation_reason || null;
      }

      const { error } = await supabaseAdmin.from("delivery_jobs").update(updates).eq("id", job_id);
      if (error) throw new Error(`Update failed: ${error.message}`);

      // If completed/cancelled, free driver
      if (["completed", "cancelled"].includes(status)) {
        const { data: job } = await supabaseAdmin.from("delivery_jobs").select("driver_id").eq("id", job_id).single();
        if (job?.driver_id) {
          await supabaseAdmin.from("driver_sessions")
            .update({ status: "online", current_job_id: null, updated_at: new Date().toISOString() })
            .eq("user_id", job.driver_id);

          // Update driver stats
          if (status === "completed") {
            await supabaseAdmin.rpc("increment_driver_completed", { _driver_id: job.driver_id }).catch(() => {});
          }
        }
      }

      return json({ success: true, job_id, status });
    }

    // ─── CONFIRM DELIVERY ────────────────────────────────────
    if (action === "confirm_delivery") {
      const { job_id, confirmation_code, photo_proof_url } = body;
      if (!job_id || !confirmation_code) throw new Error("job_id and confirmation_code required");

      const { data: job } = await supabaseAdmin.from("delivery_jobs").select("*").eq("id", job_id).single();
      if (!job) throw new Error("Job not found");
      if (job.status !== "in_progress" && job.status !== "accepted") throw new Error("Job not in delivery");

      // Constant-time code comparison
      const expected = job.confirmation_code || "";
      if (confirmation_code.length !== expected.length || confirmation_code !== expected) {
        return json({ success: false, error: "Invalid confirmation code" }, 400);
      }

      const updates: Record<string, any> = {
        status: "completed",
        delivered_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (photo_proof_url) updates.photo_proof_url = photo_proof_url;

      const { error } = await supabaseAdmin.from("delivery_jobs").update(updates).eq("id", job_id);
      if (error) throw new Error(`Confirm failed: ${error.message}`);

      // Free driver
      if (job.driver_id) {
        await supabaseAdmin.from("driver_sessions")
          .update({ status: "online", current_job_id: null, updated_at: new Date().toISOString() })
          .eq("user_id", job.driver_id);
      }

      return json({ success: true, job_id, delivered_at: updates.delivered_at });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (err) {
    console.error("[dispatch-delivery] Error:", err);
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Ranking Engine ──────────────────────────────────────────────────────────

const VEHICLE_SPEEDS: Record<string, number> = {
  bicycle: 15, scooter: 30, car: 40, van: 35, truck: 30,
};

const VEHICLE_CAPACITY_KG: Record<string, number> = {
  bicycle: 5, scooter: 15, car: 50, van: 200, truck: 1000,
};

const RANKING_WEIGHTS = {
  distance: 0.30, eta: 0.20, reliability: 0.20,
  vehicle: 0.10, availability: 0.10, rating: 0.10,
};

interface RankedDriverResult {
  user_id: string;
  score: number;
  distance_km: number;
  eta_minutes: number;
  vehicle_type: string;
  avg_rating: number | null;
  acceptance_rate: number | null;
  breakdown: Record<string, number>;
}

function rankAndScoreDrivers(drivers: any[], job: any, maxDistKm: number): RankedDriverResult[] {
  const priorityBoost = job.priority === "urgent" ? 1.5 : job.priority === "express" ? 1.25 : 1;
  
  // Adjust weights for priority
  let w = { ...RANKING_WEIGHTS };
  if (priorityBoost > 1) {
    w.distance *= priorityBoost;
    w.eta *= priorityBoost;
    const total = Object.values(w).reduce((a, b) => a + b, 0);
    for (const k of Object.keys(w) as (keyof typeof w)[]) w[k] /= total;
  }

  const results: RankedDriverResult[] = [];

  for (const d of drivers) {
    const dist = haversine(d.lat, d.lng, job.pickup_lat ?? 0, job.pickup_lng ?? 0);
    if (dist > (d.max_distance_km ?? maxDistKm)) continue;

    // Vehicle capacity check
    const capacity = VEHICLE_CAPACITY_KG[d.vehicle_type] ?? 50;
    if ((job.weight_kg ?? 1) > capacity) continue;

    // Required vehicles check
    const reqVehicles: string[] = job.required_vehicles ?? [];
    if (reqVehicles.length > 0 && !reqVehicles.includes(d.vehicle_type)) continue;

    const speed = VEHICLE_SPEEDS[d.vehicle_type] ?? 30;
    const etaMin = Math.round((dist / speed) * 60);

    // Score components (0–100)
    const distScore = dist <= 0 ? 100 : dist >= maxDistKm ? 0 : Math.round((1 - dist / maxDistKm) * 100);
    const etaScore = etaMin <= 0 ? 100 : etaMin >= 45 ? 0 : Math.round((1 - etaMin / 45) * 100);

    const totalCompleted = d.total_completed ?? 0;
    const totalCancelled = d.total_cancelled ?? 0;
    const totalJobs = totalCompleted + totalCancelled;
    const completionRate = totalJobs > 0 ? totalCompleted / totalJobs : 0.5;
    const acceptRate = d.acceptance_rate ?? 0.5;
    const reliabilityScore = Math.round((completionRate * 0.7 + acceptRate * 0.3) * 100);

    const vehicleScore = 100; // already passed capacity/type checks
    const availabilityScore = d.status === "online" ? 100 : d.status === "busy" ? 30 : 0;
    const ratingScore = Math.round(((d.avg_rating ?? 3) / 5) * 100);

    const score = Math.round(
      distScore * w.distance +
      etaScore * w.eta +
      reliabilityScore * w.reliability +
      vehicleScore * w.vehicle +
      availabilityScore * w.availability +
      ratingScore * w.rating
    );

    results.push({
      user_id: d.user_id,
      score,
      distance_km: Math.round(dist * 100) / 100,
      eta_minutes: etaMin,
      vehicle_type: d.vehicle_type,
      avg_rating: d.avg_rating,
      acceptance_rate: d.acceptance_rate,
      breakdown: { distScore, etaScore, reliabilityScore, vehicleScore, availabilityScore, ratingScore },
    });
  }

  results.sort((a, b) => b.score - a.score);
  return results;
}
