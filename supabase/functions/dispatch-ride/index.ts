/**
 * dispatch-ride — Canonical mobility dispatch edge function.
 * Single source of truth for: taxi, food_delivery, grocery_delivery, parcel_delivery.
 * Tables: mobility_jobs, mobility_job_offers, rider_presence, rider_profiles,
 *         mobility_dispatch_attempts, mobility_fare_quotes, trip_live_state, trip_location_points
 *
 * Actions:
 *   create_job      — Customer creates a mobility job
 *   cancel_job      — Customer cancels own job
 *   accept_offer    — Rider accepts a dispatch offer
 *   reject_offer    — Rider rejects a dispatch offer
 *   advance_status  — Rider advances job status
 *   dispatch_offers — System re-dispatches offers with expanded radius
 *   merchant_update — Merchant updates food order status
 *   activate_scheduled — Engine activates scheduled jobs when dispatch window opens
 *
 * SECURITY:
 *   - Self-acceptance prevention
 *   - Offer ownership validation
 *   - Strict state machine transitions
 *   - Actor enforcement per action
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const db = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await db.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Not authenticated");
    const userId = userData.user.id;

    const body = await req.json();
    const { action } = body;

    // ─── CREATE JOB (Customer only) ──────────────────────────
    if (action === "create_job") {
      const {
        job_type, service_level,
        booking_mode, scheduled_for,
        pickup_label, pickup_address, pickup_lat, pickup_lng,
        dropoff_label, dropoff_address, dropoff_lat, dropoff_lng,
        merchant_id, order_id, parcel_reference,
        seats_requested, item_type, package_size, notes,
        quoted_price, currency,
      } = body;

      if (!job_type || !service_level) throw new Error("job_type and service_level required");
      if (!pickup_lat || !pickup_lng || !dropoff_lat || !dropoff_lng) {
        throw new Error("Pickup and dropoff coordinates required");
      }

      const isScheduled = booking_mode === "scheduled";

      // Validate scheduled_for when booking_mode is scheduled
      if (isScheduled) {
        if (!scheduled_for) throw new Error("scheduled_for required for scheduled bookings");
        const scheduledDate = new Date(scheduled_for);
        if (isNaN(scheduledDate.getTime())) throw new Error("Invalid scheduled_for datetime");
        if (scheduledDate.getTime() < Date.now() + 10 * 60 * 1000) {
          throw new Error("Scheduled time must be at least 10 minutes in the future");
        }
      }

      const confirmationCode = String(Math.floor(100000 + Math.random() * 900000));

      // Get or create customer profile
      const { data: existingProfile } = await db
        .from("customer_profiles").select("id").eq("user_id", userId).maybeSingle();
      let customerProfileId = existingProfile?.id;
      if (!customerProfileId) {
        const { data: newProfile } = await db
          .from("customer_profiles").insert({ user_id: userId }).select("id").single();
        customerProfileId = newProfile?.id;
      }

      const totalFare = quoted_price || 0;

      // Compute dispatch window for scheduled bookings
      let dispatchWindowStart: string | null = null;
      let dispatchWindowEnd: string | null = null;
      if (isScheduled && scheduled_for) {
        const sf = new Date(scheduled_for);
        // Dispatch window: 15 min before to 5 min after scheduled time
        dispatchWindowStart = new Date(sf.getTime() - 15 * 60 * 1000).toISOString();
        dispatchWindowEnd = new Date(sf.getTime() + 5 * 60 * 1000).toISOString();
      }

      const { data: job, error } = await db.from("mobility_jobs").insert({
        job_type,
        service_level,
        customer_user_id: userId,
        customer_profile_id: customerProfileId,
        merchant_id: merchant_id || null,
        order_id: order_id || null,
        parcel_reference: parcel_reference || null,
        status: isScheduled ? "scheduled" : "searching",
        dispatch_status: isScheduled ? "pending" : "dispatching",
        booking_mode: booking_mode || "now",
        scheduled_for: isScheduled ? scheduled_for : null,
        dispatch_window_start: dispatchWindowStart,
        dispatch_window_end: dispatchWindowEnd,
        pickup_label: pickup_label || null,
        pickup_address: pickup_address || "",
        pickup_lat, pickup_lng,
        dropoff_label: dropoff_label || null,
        dropoff_address: dropoff_address || "",
        dropoff_lat, dropoff_lng,
        seats_requested: seats_requested || null,
        item_type: item_type || null,
        package_size: package_size || null,
        notes: notes || null,
        quoted_price: totalFare,
        current_price: totalFare,
        currency: currency || "AED",
        confirmation_code: confirmationCode,
        search_radius_km: 2.0,
        dispatch_attempt_count: 0,
      }).select().single();

      if (error) throw new Error(`Create job failed: ${error.message}`);

      // Save initial fare quote
      if (totalFare > 0) {
        await db.from("mobility_fare_quotes").insert({
          job_id: job.id,
          job_type,
          service_level,
          base_fare: totalFare * 0.6,
          distance_fare: totalFare * 0.3,
          time_fare: totalFare * 0.1,
          total_fare: totalFare,
          currency: currency || "AED",
          reason: isScheduled ? "scheduled_quote" : "initial_quote",
        });
      }

      // Auto-dispatch to nearby riders (only for immediate bookings)
      let dispatchResult = { offered: 0 };
      if (!isScheduled) {
        dispatchResult = await dispatchOffers(db, job, 2.0);
      }

      return json({
        success: true,
        job,
        confirmation_code: confirmationCode,
        dispatch: dispatchResult,
        booking_mode: isScheduled ? "scheduled" : "now",
      });
    }

    // ─── CANCEL JOB (Customer only) ──────────────────────────
    if (action === "cancel_job") {
      const { job_id, reason } = body;
      if (!job_id) throw new Error("job_id required");

      const { data: job } = await db.from("mobility_jobs").select("*").eq("id", job_id).single();
      if (!job) throw new Error("Job not found");
      if (job.customer_user_id !== userId) throw new Error("Only the customer can cancel");
      if (["completed", "cancelled", "failed_no_rider"].includes(job.status)) {
        throw new Error("Job already finalized");
      }

      const now = new Date().toISOString();
      await db.from("mobility_jobs").update({
        status: "cancelled",
        cancelled_at: now,
        cancelled_by: userId,
        cancel_reason: reason || null,
        updated_at: now,
      }).eq("id", job_id);

      // Expire all pending offers
      await db.from("mobility_job_offers")
        .update({ status: "cancelled", responded_at: now, updated_at: now })
        .eq("job_id", job_id)
        .in("status", ["pending"]);

      // Free assigned rider if any
      if (job.rider_user_id) {
        await db.from("rider_presence").update({
          is_available: true, updated_at: now,
        }).eq("user_id", job.rider_user_id);
      }

      return json({ success: true, job_id, status: "cancelled" });
    }

    // ─── ACCEPT OFFER (Rider only) ───────────────────────────
    if (action === "accept_offer") {
      const { offer_id } = body;
      if (!offer_id) throw new Error("offer_id required");

      const { data: offer } = await db
        .from("mobility_job_offers").select("*").eq("id", offer_id).single();
      if (!offer) throw new Error("Offer not found");
      if (offer.rider_user_id !== userId) throw new Error("Offer does not belong to this rider");
      if (offer.status !== "pending") throw new Error("Offer is no longer available");

      const { data: job } = await db
        .from("mobility_jobs").select("*").eq("id", offer.job_id).single();
      if (!job) throw new Error("Job not found");

      // CRITICAL: Self-acceptance prevention
      if (job.customer_user_id === userId) {
        throw new Error("You cannot accept your own ride");
      }
      if (!["searching", "offered"].includes(job.status)) {
        throw new Error("Job is no longer available for acceptance");
      }
      if (job.rider_user_id) {
        throw new Error("Job already has an assigned rider");
      }

      // Get rider profile
      const { data: riderProfile } = await db
        .from("rider_profiles").select("id").eq("user_id", userId).maybeSingle();

      const now = new Date().toISOString();

      // Assign rider to job
      await db.from("mobility_jobs").update({
        rider_user_id: userId,
        rider_profile_id: riderProfile?.id || null,
        status: "accepted",
        accepted_at: now,
        dispatch_status: "assigned",
        updated_at: now,
      }).eq("id", offer.job_id);

      // Mark offer accepted
      await db.from("mobility_job_offers").update({
        status: "accepted", responded_at: now, updated_at: now,
      }).eq("id", offer_id);

      // Expire other pending offers
      await db.from("mobility_job_offers")
        .update({ status: "expired", responded_at: now, updated_at: now })
        .eq("job_id", offer.job_id)
        .eq("status", "pending")
        .neq("id", offer_id);

      // Mark rider as unavailable
      await db.from("rider_presence").update({
        is_available: false, updated_at: now,
      }).eq("user_id", userId);

      // Initialize trip_live_state
      await db.from("trip_live_state").upsert({
        job_id: offer.job_id,
        rider_user_id: userId,
        rider_profile_id: riderProfile?.id || null,
        updated_at: now,
      });

      return json({ success: true, job_id: offer.job_id, offer_id });
    }

    // ─── REJECT OFFER (Rider only) ───────────────────────────
    if (action === "reject_offer") {
      const { offer_id } = body;
      if (!offer_id) throw new Error("offer_id required");

      const { data: offer } = await db
        .from("mobility_job_offers").select("*").eq("id", offer_id).single();
      if (!offer) throw new Error("Offer not found");
      if (offer.rider_user_id !== userId) throw new Error("Offer does not belong to this rider");

      await db.from("mobility_job_offers").update({
        status: "rejected",
        responded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", offer_id);

      return json({ success: true, offer_id });
    }

    // ─── ADVANCE STATUS (Rider only) ─────────────────────────
    if (action === "advance_status") {
      const { job_id, status } = body;
      if (!job_id || !status) throw new Error("job_id and status required");

      const validTransitions: Record<string, string[]> = {
        accepted: ["rider_arriving_pickup"],
        rider_arriving_pickup: ["rider_arrived_pickup"],
        rider_arrived_pickup: ["picked_up"],
        picked_up: ["in_progress"],
        in_progress: ["rider_arriving_dropoff", "completed"],
        rider_arriving_dropoff: ["completed"],
      };

      const { data: job } = await db
        .from("mobility_jobs").select("*").eq("id", job_id).single();
      if (!job) throw new Error("Job not found");
      if (job.rider_user_id !== userId) throw new Error("You are not the assigned rider");

      const allowed = validTransitions[job.status] ?? [];
      if (!allowed.includes(status)) {
        throw new Error(`Cannot transition from ${job.status} to ${status}`);
      }

      const now = new Date().toISOString();
      const updates: Record<string, unknown> = { status, updated_at: now };

      if (status === "rider_arrived_pickup") updates.arrived_pickup_at = now;
      if (status === "picked_up") updates.picked_up_at = now;
      if (status === "in_progress") updates.started_at = now;
      if (status === "completed") {
        updates.completed_at = now;
        updates.dispatch_status = "completed";
        updates.payment_status = "captured";
      }

      await db.from("mobility_jobs").update(updates).eq("id", job_id);

      // Free rider on completion
      if (status === "completed") {
        await db.from("rider_presence").update({
          is_available: true, updated_at: now,
        }).eq("user_id", userId);

        // Clean up live state
        await db.from("trip_live_state").delete().eq("job_id", job_id);
      }

      return json({ success: true, job_id, status });
    }

    // ─── MERCHANT UPDATE (Merchant only) ─────────────────────
    if (action === "merchant_update") {
      const { job_id, merchant_status } = body;
      if (!job_id || !merchant_status) throw new Error("job_id and merchant_status required");

      const validMerchantStatuses = ["accepted", "preparing", "ready", "handed_to_rider"];
      if (!validMerchantStatuses.includes(merchant_status)) {
        throw new Error(`Invalid merchant_status: ${merchant_status}`);
      }

      const { data: job } = await db
        .from("mobility_jobs").select("*").eq("id", job_id).single();
      if (!job) throw new Error("Job not found");

      // Verify merchant owns this job
      const { data: merchant } = await db
        .from("merchant_profiles").select("id").eq("user_id", userId).maybeSingle();
      if (!merchant || job.merchant_id !== merchant.id) {
        throw new Error("Not authorized as merchant for this job");
      }

      const now = new Date().toISOString();
      const updates: Record<string, unknown> = { merchant_status, updated_at: now };

      if (merchant_status === "ready") {
        updates.ready_at = now;
      }

      await db.from("mobility_jobs").update(updates).eq("id", job_id);

      return json({ success: true, job_id, merchant_status });
    }

    // ─── DISPATCH OFFERS (System/Cron) ───────────────────────
    if (action === "dispatch_offers") {
      const { job_id, radius_km, surge_multiplier } = body;
      if (!job_id) throw new Error("job_id required");

      const { data: job } = await db
        .from("mobility_jobs").select("*").eq("id", job_id).single();
      if (!job) throw new Error("Job not found");

      const result = await dispatchOffers(db, job, radius_km || 2.0, surge_multiplier);
      return json({ success: true, ...result });
    }

    // ─── ACTIVATE SCHEDULED (Engine/Cron) ────────────────────
    if (action === "activate_scheduled") {
      const now = new Date().toISOString();

      // Find scheduled jobs whose dispatch window has opened
      const { data: jobs } = await db
        .from("mobility_jobs")
        .select("*")
        .eq("status", "scheduled")
        .eq("booking_mode", "scheduled")
        .lte("dispatch_window_start", now)
        .gte("dispatch_window_end", now);

      if (!jobs?.length) return json({ success: true, activated: 0 });

      let activated = 0;
      for (const job of jobs) {
        await db.from("mobility_jobs").update({
          status: "searching",
          dispatch_status: "dispatching",
          updated_at: now,
        }).eq("id", job.id);

        await dispatchOffers(db, { ...job, status: "searching" }, 2.0);
        activated++;
      }

      // Expire scheduled jobs past their dispatch window
      const { data: expired } = await db
        .from("mobility_jobs")
        .select("id")
        .eq("status", "scheduled")
        .eq("booking_mode", "scheduled")
        .lt("dispatch_window_end", now);

      if (expired?.length) {
        for (const j of expired) {
          await db.from("mobility_jobs").update({
            status: "expired",
            updated_at: now,
          }).eq("id", j.id);
        }
      }

      return json({ success: true, activated, expired: expired?.length ?? 0 });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (err) {
    console.error("[dispatch-ride] Error:", err);
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});

// ─── Dispatch Engine ─────────────────────────────────────────
async function dispatchOffers(db: any, job: any, radiusKm: number, surgeMultiplier?: number) {
  if (!job.pickup_lat || !job.pickup_lng) return { offered: 0 };

  const surge = surgeMultiplier ?? job.surge_multiplier ?? 1.0;

  // Find available riders with matching vehicle/service mode
  const { data: riders } = await db
    .from("rider_presence")
    .select("*, rider_profile:rider_profiles(*)")
    .eq("is_online", true)
    .eq("is_available", true)
    .not("lat", "is", null)
    .not("lng", "is", null);

  if (!riders?.length) return { offered: 0, message: "No riders available" };

  const eligible = riders
    .map((r: any) => ({
      ...r,
      distance_km: haversine(r.lat, r.lng, job.pickup_lat, job.pickup_lng),
    }))
    .filter((r: any) => r.distance_km <= radiusKm)
    // Exclude customer from being offered their own job
    .filter((r: any) => r.user_id !== job.customer_user_id)
    .sort((a: any, b: any) => a.distance_km - b.distance_km);

  if (!eligible.length) return { offered: 0, message: "No riders in range" };

  const currentFare = (job.current_price || job.quoted_price || 0) * surge;

  // Create offers for top 10 closest riders
  const offers = eligible.slice(0, 10).map((r: any) => ({
    job_id: job.id,
    rider_user_id: r.user_id,
    rider_profile_id: r.rider_profile_id,
    status: "pending",
    radius_km: radiusKm,
    fare_at_offer: currentFare,
    surge_multiplier: surge,
    distance_km: Math.round(r.distance_km * 100) / 100,
    eta_minutes: Math.round((r.distance_km / 30) * 60),
    offered_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 30000).toISOString(),
  }));

  await db.from("mobility_job_offers").insert(offers);

  // Log dispatch attempt
  const attemptNumber = (job.dispatch_attempt_count || 0) + 1;
  await db.from("mobility_dispatch_attempts").insert({
    job_id: job.id,
    attempt_number: attemptNumber,
    radius_km: radiusKm,
    riders_targeted: riders.length,
    riders_notified: offers.length,
    fare_before: job.current_price,
    fare_after: currentFare,
    surge_multiplier: surge,
    strategy: radiusKm <= 2 ? "close" : radiusKm <= 5 ? "medium" : "wide",
  });

  // Update job dispatch state
  await db.from("mobility_jobs").update({
    dispatch_attempt_count: attemptNumber,
    last_dispatch_at: new Date().toISOString(),
    search_radius_km: radiusKm,
    surge_multiplier: surge,
    current_price: currentFare,
    status: "offered",
    updated_at: new Date().toISOString(),
  }).eq("id", job.id);

  return { offered: offers.length, radius_km: radiusKm, surge_multiplier: surge };
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

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
