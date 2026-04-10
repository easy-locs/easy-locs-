/**
 * dispatch-delivery — Edge function for delivery job dispatch.
 * CANONICAL: reads/writes mobility_jobs + rider_presence + mobility_job_offers.
 * Zero legacy table references (delivery_jobs, driver_sessions deleted).
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
      const {
        org_id, pickup_address, pickup_lat, pickup_lng,
        dropoff_address, dropoff_lat, dropoff_lng,
        package_description, weight_kg, priority, delivery_fee, currency,
        scheduled_at, notes, order_id, job_type, booking_mode, scheduled_for,
      } = body;

      const confirmationCode = String(Math.floor(100000 + Math.random() * 900000));
      const effectiveJobType = job_type || "parcel_delivery";
      const effectiveBookingMode = booking_mode || (scheduled_at ? "scheduled" : "now");
      const effectiveScheduledFor = scheduled_for || scheduled_at || null;

      const jobData: Record<string, any> = {
        customer_user_id: userId,
        job_type: effectiveJobType,
        service_level: priority || "standard",
        booking_mode: effectiveBookingMode,
        status: effectiveBookingMode === "scheduled" ? "scheduled" : "searching",
        pickup_address: pickup_address || "",
        pickup_lat, pickup_lng,
        dropoff_address: dropoff_address || "",
        dropoff_lat, dropoff_lng,
        current_price: delivery_fee || 0,
        currency: currency || "EUR",
        notes: notes || "",
        order_id: order_id || null,
        merchant_id: org_id || null,
        confirmation_code: confirmationCode,
      };

      if (effectiveBookingMode === "scheduled" && effectiveScheduledFor) {
        jobData.scheduled_for = effectiveScheduledFor;
        const scheduledDate = new Date(effectiveScheduledFor);
        jobData.dispatch_window_start = new Date(scheduledDate.getTime() - 15 * 60000).toISOString();
        jobData.dispatch_window_end = new Date(scheduledDate.getTime() + 15 * 60000).toISOString();
      }

      const { data: job, error } = await supabaseAdmin
        .from("mobility_jobs")
        .insert(jobData)
        .select()
        .single();

      if (error) throw new Error(`Create job failed: ${error.message}`);

      return json({ success: true, job, confirmation_code: confirmationCode });
    }

    // ─── FIND NEARBY RIDERS ──────────────────────────────────
    if (action === "find_drivers") {
      const { job_id, max_distance_km, ranked } = body;
      if (!job_id) throw new Error("job_id required");

      const { data: job } = await supabaseAdmin.from("mobility_jobs").select("*").eq("id", job_id).single();
      if (!job) throw new Error("Job not found");
      await assertJobAuthority(supabaseAdmin, userId, job);

      const { data: riders } = await supabaseAdmin
        .from("rider_presence")
        .select("*")
        .eq("is_online", true)
        .eq("is_available", true)
        .not("current_lat", "is", null)
        .not("current_lng", "is", null);

      if (!riders || riders.length === 0) {
        return json({ success: true, drivers: [], message: "No riders available" });
      }

      const maxDist = max_distance_km || 15;

      if (ranked) {
        const rankedRiders = rankAndScoreRiders(riders, job, maxDist);
        return json({ success: true, drivers: rankedRiders, total: rankedRiders.length, ranked: true });
      }

      const nearby = riders
        .map((r: any) => {
          const dist = haversine(r.current_lat, r.current_lng, job.pickup_lat, job.pickup_lng);
          return { ...r, distance_km: Math.round(dist * 100) / 100 };
        })
        .filter((r: any) => r.distance_km <= maxDist)
        .sort((a: any, b: any) => a.distance_km - b.distance_km);

      return json({ success: true, drivers: nearby, total: nearby.length });
    }

    // ─── AUTO DISPATCH ───────────────────────────────────────
    if (action === "auto_dispatch") {
      const { job_id, max_distance_km } = body;
      if (!job_id) throw new Error("job_id required");

      const { data: job } = await supabaseAdmin.from("mobility_jobs").select("*").eq("id", job_id).single();
      if (!job) throw new Error("Job not found");
      await assertJobAuthority(supabaseAdmin, userId, job);
      if (!["searching", "pending"].includes(job.status)) throw new Error(`Cannot auto-dispatch in status: ${job.status}`);

      const { data: riders } = await supabaseAdmin
        .from("rider_presence")
        .select("*")
        .eq("is_online", true)
        .eq("is_available", true)
        .not("current_lat", "is", null)
        .not("current_lng", "is", null);

      if (!riders || riders.length === 0) {
        return json({ success: false, error: "No riders available", drivers: [] });
      }

      const maxDist = max_distance_km || 15;
      const rankedRiders = rankAndScoreRiders(riders, job, maxDist);

      if (rankedRiders.length === 0) {
        return json({ success: false, error: "No eligible riders in range", drivers: [] });
      }

      const best = rankedRiders[0];

      // Assign rider to job
      const { error: assignErr } = await supabaseAdmin.from("mobility_jobs")
        .update({
          rider_user_id: best.user_id,
          status: "accepted",
          updated_at: new Date().toISOString(),
        })
        .eq("id", job_id);

      if (assignErr) throw new Error(`Auto-assign failed: ${assignErr.message}`);

      // Create offer record
      await supabaseAdmin.from("mobility_job_offers").insert({
        job_id,
        rider_user_id: best.user_id,
        status: "accepted",
        offered_at: new Date().toISOString(),
        responded_at: new Date().toISOString(),
      }).catch(() => {});

      // Mark rider busy
      await supabaseAdmin.from("rider_presence")
        .update({ is_available: false, updated_at: new Date().toISOString() })
        .eq("user_id", best.user_id);

      return json({
        success: true,
        job_id,
        assigned_driver: best,
        alternates: rankedRiders.slice(1, 4),
        total_candidates: rankedRiders.length,
      });
    }

    // ─── ASSIGN DRIVER ───────────────────────────────────────
    if (action === "assign_driver") {
      const { job_id, driver_id } = body;
      if (!job_id || !driver_id) throw new Error("job_id and driver_id required");

      const { data: job } = await supabaseAdmin.from("mobility_jobs").select("*").eq("id", job_id).single();
      if (!job) throw new Error("Job not found");
      await assertJobAuthority(supabaseAdmin, userId, job);

      const { data: rider } = await supabaseAdmin
        .from("rider_presence")
        .select("*")
        .eq("user_id", driver_id)
        .eq("is_online", true)
        .eq("is_available", true)
        .maybeSingle();

      if (!rider) throw new Error("Rider not available");

      const { error } = await supabaseAdmin.from("mobility_jobs")
        .update({ rider_user_id: driver_id, status: "accepted", updated_at: new Date().toISOString() })
        .eq("id", job_id);

      if (error) throw new Error(`Assign failed: ${error.message}`);

      await supabaseAdmin.from("rider_presence")
        .update({ is_available: false, updated_at: new Date().toISOString() })
        .eq("user_id", driver_id);

      return json({ success: true, job_id, driver_id });
    }

    // ─── ACCEPT JOB (by rider) ───────────────────────────────
    if (action === "accept_job") {
      const { job_id } = body;
      if (!job_id) throw new Error("job_id required");

      const { data: job } = await supabaseAdmin.from("mobility_jobs")
        .select("*").eq("id", job_id).single();
      if (!job) throw new Error("Job not found");

      // Verify rider has an offer or is assigned
      if (job.rider_user_id && job.rider_user_id !== userId) {
        throw new Error("Job not assigned to you");
      }

      const { error } = await supabaseAdmin.from("mobility_jobs")
        .update({
          rider_user_id: userId,
          status: "accepted",
          updated_at: new Date().toISOString(),
        })
        .eq("id", job_id);

      if (error) throw new Error(`Accept failed: ${error.message}`);

      await supabaseAdmin.from("rider_presence")
        .update({ is_available: false, updated_at: new Date().toISOString() })
        .eq("user_id", userId);

      return json({ success: true, job_id });
    }

    // ─── UPDATE STATUS ───────────────────────────────────────
    if (action === "update_status") {
      const { job_id, status, cancellation_reason } = body;
      if (!job_id || !status) throw new Error("job_id and status required");

      const { data: job } = await supabaseAdmin.from("mobility_jobs")
        .select("*").eq("id", job_id).single();
      if (!job) throw new Error("Job not found");
      await assertJobAuthority(supabaseAdmin, userId, job);

      const updates: Record<string, any> = { status, updated_at: new Date().toISOString() };

      if (status === "in_progress") updates.started_at = new Date().toISOString();
      if (status === "completed") updates.completed_at = new Date().toISOString();
      if (status === "cancelled") {
        updates.cancelled_at = new Date().toISOString();
        updates.cancellation_reason = cancellation_reason || null;
      }

      const { error } = await supabaseAdmin.from("mobility_jobs").update(updates).eq("id", job_id);
      if (error) throw new Error(`Update failed: ${error.message}`);

      // If completed/cancelled, free rider
      if (["completed", "cancelled"].includes(status) && job.rider_user_id) {
        await supabaseAdmin.from("rider_presence")
          .update({ is_available: true, updated_at: new Date().toISOString() })
          .eq("user_id", job.rider_user_id);
      }

      return json({ success: true, job_id, status });
    }

    // ─── CONFIRM DELIVERY ────────────────────────────────────
    if (action === "confirm_delivery") {
      const { job_id, confirmation_code, photo_proof_url } = body;
      if (!job_id || !confirmation_code) throw new Error("job_id and confirmation_code required");

      const { data: job } = await supabaseAdmin.from("mobility_jobs").select("*").eq("id", job_id).single();
      if (!job) throw new Error("Job not found");
      if (!["in_progress", "accepted"].includes(job.status)) throw new Error("Job not in delivery");

      const expected = job.confirmation_code || "";
      if (confirmation_code.length !== expected.length || confirmation_code !== expected) {
        return json({ success: false, error: "Invalid confirmation code" }, 400);
      }

      const updates: Record<string, any> = {
        status: "completed",
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (photo_proof_url) updates.photo_proof_url = photo_proof_url;

      const { error } = await supabaseAdmin.from("mobility_jobs").update(updates).eq("id", job_id);
      if (error) throw new Error(`Confirm failed: ${error.message}`);

      if (job.rider_user_id) {
        await supabaseAdmin.from("rider_presence")
          .update({ is_available: true, updated_at: new Date().toISOString() })
          .eq("user_id", job.rider_user_id);
      }

      return json({ success: true, job_id, delivered_at: updates.completed_at });
    }

    // ─── ESCROW: HOLD FUNDS ─────────────────────────────────
    if (action === "escrow_hold") {
      const { job_id } = body;
      if (!job_id) throw new Error("job_id required");

      const { data: job } = await supabaseAdmin.from("mobility_jobs").select("*").eq("id", job_id).single();
      if (!job) throw new Error("Job not found");

      const { data: existing } = await supabaseAdmin.from("escrow_payments")
        .select("id").eq("job_id", job_id).in("status", ["held", "pending"]).maybeSingle();
      if (existing) throw new Error("Escrow already exists for this job");

      const { data: escrow, error } = await supabaseAdmin.from("escrow_payments").insert({
        job_id, org_id: job.merchant_id || userId,
        payer_id: userId,
        payee_id: job.rider_user_id || null,
        amount: job.current_price || 0,
        currency: job.currency || "EUR",
        status: "held",
        held_at: new Date().toISOString(),
        metadata_json: { job_type: job.job_type, pickup: job.pickup_address, dropoff: job.dropoff_address },
      }).select().single();

      if (error) throw new Error(`Escrow hold failed: ${error.message}`);
      return json({ success: true, escrow });
    }

    // ─── ESCROW: RELEASE FUNDS ───────────────────────────────
    if (action === "escrow_release") {
      const { job_id, reason } = body;
      if (!job_id) throw new Error("job_id required");

      const { data: escrow } = await supabaseAdmin.from("escrow_payments")
        .select("*").eq("job_id", job_id).eq("status", "held").maybeSingle();
      if (!escrow) throw new Error("No held escrow found");
      await assertEscrowAuthority(supabaseAdmin, userId, escrow);

      const { error } = await supabaseAdmin.from("escrow_payments").update({
        status: "released", released_at: new Date().toISOString(),
        release_reason: reason || "delivery_confirmed", updated_at: new Date().toISOString(),
      }).eq("id", escrow.id);

      if (error) throw new Error(`Escrow release failed: ${error.message}`);

      await supabaseAdmin.from("audit_logs").insert({
        user_id: userId, action: "escrow_released",
        metadata_json: { escrow_id: escrow.id, job_id, amount: escrow.amount, currency: escrow.currency },
      });

      return json({ success: true, escrow_id: escrow.id, amount: escrow.amount });
    }

    // ─── ESCROW: REFUND ──────────────────────────────────────
    if (action === "escrow_refund") {
      const { job_id, reason } = body;
      if (!job_id) throw new Error("job_id required");

      const { data: escrow } = await supabaseAdmin.from("escrow_payments")
        .select("*").eq("job_id", job_id).eq("status", "held").maybeSingle();
      if (!escrow) throw new Error("No held escrow found");
      await assertEscrowAuthority(supabaseAdmin, userId, escrow);

      const { error } = await supabaseAdmin.from("escrow_payments").update({
        status: "refunded", refunded_at: new Date().toISOString(),
        refund_reason: reason || "job_cancelled", updated_at: new Date().toISOString(),
      }).eq("id", escrow.id);

      if (error) throw new Error(`Escrow refund failed: ${error.message}`);

      return json({ success: true, escrow_id: escrow.id, amount: escrow.amount });
    }

    // ─── ESCROW: STATUS ──────────────────────────────────────
    if (action === "escrow_status") {
      const { job_id } = body;
      if (!job_id) throw new Error("job_id required");

      const { data: job } = await supabaseAdmin.from("mobility_jobs").select("*").eq("id", job_id).single();
      if (!job) throw new Error("Job not found");
      await assertJobAuthority(supabaseAdmin, userId, job);

      const { data: escrow } = await supabaseAdmin.from("escrow_payments")
        .select("*").eq("job_id", job_id).order("created_at", { ascending: false }).limit(1).maybeSingle();

      return json({ success: true, escrow: escrow || null });
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

async function assertJobAuthority(supabaseAdmin: any, userId: string, job: any) {
  if (userId === job.customer_user_id || userId === job.rider_user_id) return;
  if (job.merchant_id) {
    const { data: orgRole } = await supabaseAdmin
      .from("org_members")
      .select("role")
      .eq("user_id", userId)
      .eq("org_id", job.merchant_id)
      .in("role", ["owner", "admin"])
      .maybeSingle();
    if (orgRole) return;
  }
  throw new Error("Forbidden: not authorized for this job");
}

async function assertEscrowAuthority(supabaseAdmin: any, userId: string, escrow: any) {
  if (userId === escrow.payer_id) return;
  if (escrow.org_id) {
    const { data: orgRole } = await supabaseAdmin
      .from("org_members")
      .select("role")
      .eq("user_id", userId)
      .eq("org_id", escrow.org_id)
      .in("role", ["owner", "admin"])
      .maybeSingle();
    if (orgRole) return;
  }
  throw new Error("Forbidden: not authorized for this escrow");
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
  bicycle: 15, moto: 30, car: 40, van: 35, car_premium: 40, car_xl: 35,
};

const RANKING_WEIGHTS = {
  distance: 0.35, eta: 0.25, availability: 0.20, rating: 0.20,
};

function rankAndScoreRiders(riders: any[], job: any, maxDistKm: number) {
  const results: any[] = [];

  for (const r of riders) {
    const lat = r.current_lat ?? r.lat;
    const lng = r.current_lng ?? r.lng;
    if (!lat || !lng) continue;

    const dist = haversine(lat, lng, job.pickup_lat ?? 0, job.pickup_lng ?? 0);
    if (dist > maxDistKm) continue;

    // Self-acceptance prevention
    if (r.user_id === job.customer_user_id) continue;

    const speed = VEHICLE_SPEEDS[r.vehicle_type] ?? 30;
    const etaMin = Math.round((dist / speed) * 60);

    const distScore = dist >= maxDistKm ? 0 : Math.round((1 - dist / maxDistKm) * 100);
    const etaScore = etaMin >= 45 ? 0 : Math.round((1 - etaMin / 45) * 100);
    const availScore = r.is_available ? 100 : 0;
    const ratingScore = Math.round(((r.avg_rating ?? 3) / 5) * 100);

    const score = Math.round(
      distScore * RANKING_WEIGHTS.distance +
      etaScore * RANKING_WEIGHTS.eta +
      availScore * RANKING_WEIGHTS.availability +
      ratingScore * RANKING_WEIGHTS.rating
    );

    results.push({
      user_id: r.user_id,
      score,
      distance_km: Math.round(dist * 100) / 100,
      eta_minutes: etaMin,
      vehicle_type: r.vehicle_type || "car",
      avg_rating: r.avg_rating,
    });
  }

  results.sort((a, b) => b.score - a.score);
  return results;
}
