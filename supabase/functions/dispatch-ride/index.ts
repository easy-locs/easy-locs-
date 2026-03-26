/**
 * dispatch-ride — Actor-validated ride dispatch with offer-based flow.
 * Actions: create_ride, cancel_ride, accept_offer, reject_offer, advance_status, dispatch_offers
 *
 * SECURITY:
 * - Self-acceptance prevention (customer cannot accept own ride)
 * - Offer ownership validation (rider can only respond to own offers)
 * - Job status gating (no action on completed/cancelled jobs)
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

    // ─── CREATE RIDE (Customer only) ─────────────────────────
    if (action === "create_ride") {
      const {
        pickup_address, pickup_lat, pickup_lng,
        dropoff_address, dropoff_lat, dropoff_lng,
        fare_amount, currency, notes, scheduled_at, org_id,
      } = body;

      const confirmationCode = String(Math.floor(100000 + Math.random() * 900000));

      const { data: job, error } = await supabaseAdmin.from("delivery_jobs").insert({
        customer_user_id: userId,
        seller_id: userId,
        org_id: org_id || userId,
        status: "searching",
        dispatch_status: "dispatching",
        pickup_address: pickup_address || "",
        pickup_lat, pickup_lng,
        dropoff_address: dropoff_address || "",
        dropoff_lat, dropoff_lng,
        fare_amount: fare_amount || null,
        delivery_fee: fare_amount || 0,
        currency: currency || "AED",
        confirmation_code: confirmationCode,
        scheduled_at: scheduled_at || null,
        notes: notes || "",
        search_radius_km: 2.0,
        dispatch_attempt_count: 0,
      }).select().single();

      if (error) throw new Error(`Create ride failed: ${error.message}`);

      // Auto-dispatch: find nearby riders and create offers
      await dispatchOffers(supabaseAdmin, job, 2.0);

      return json({ success: true, job, confirmation_code: confirmationCode });
    }

    // ─── CANCEL RIDE (Customer only) ─────────────────────────
    if (action === "cancel_ride") {
      const { job_id, reason } = body;
      if (!job_id) throw new Error("job_id required");

      const { data: job } = await supabaseAdmin.from("delivery_jobs").select("*").eq("id", job_id).single();
      if (!job) throw new Error("Job not found");

      // Only customer can cancel
      if (job.customer_user_id !== userId && job.seller_id !== userId) {
        throw new Error("Only the customer can cancel this ride");
      }
      if (["completed", "cancelled"].includes(job.status)) {
        throw new Error("Job already finalized");
      }

      await supabaseAdmin.from("delivery_jobs").update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancelled_by: userId,
        cancellation_reason: reason || null,
        updated_at: new Date().toISOString(),
      }).eq("id", job_id);

      // Expire all pending offers
      await supabaseAdmin.from("delivery_job_offers")
        .update({ status: "expired", responded_at: new Date().toISOString() })
        .eq("job_id", job_id)
        .eq("status", "pending");

      return json({ success: true, job_id, status: "cancelled" });
    }

    // ─── ACCEPT OFFER (Rider only) ───────────────────────────
    if (action === "accept_offer") {
      const { offer_id } = body;
      if (!offer_id) throw new Error("offer_id required");

      const { data: offer } = await supabaseAdmin
        .from("delivery_job_offers").select("*").eq("id", offer_id).single();
      if (!offer) throw new Error("Offer not found");

      // Ownership check
      if (offer.rider_user_id !== userId) {
        throw new Error("Offer does not belong to this rider");
      }
      if (offer.status !== "pending") {
        throw new Error("Offer is no longer available");
      }

      // Fetch job and validate
      const { data: job } = await supabaseAdmin
        .from("delivery_jobs").select("*").eq("id", offer.job_id).single();
      if (!job) throw new Error("Job not found");

      // CRITICAL: Self-acceptance prevention
      if (job.customer_user_id === userId) {
        throw new Error("You cannot accept your own ride");
      }
      if (!["searching", "pending"].includes(job.status)) {
        throw new Error("Job is no longer available");
      }

      // Accept: assign rider to job
      const now = new Date().toISOString();
      await supabaseAdmin.from("delivery_jobs").update({
        driver_id: userId,
        status: "accepted",
        accepted_at: now,
        dispatch_status: "assigned",
        updated_at: now,
      }).eq("id", offer.job_id);

      // Mark this offer accepted
      await supabaseAdmin.from("delivery_job_offers").update({
        status: "accepted",
        responded_at: now,
      }).eq("id", offer_id);

      // Expire all other pending offers for this job
      await supabaseAdmin.from("delivery_job_offers")
        .update({ status: "expired", responded_at: now })
        .eq("job_id", offer.job_id)
        .eq("status", "pending")
        .neq("id", offer_id);

      // Update rider presence
      await supabaseAdmin.from("rider_presence").update({
        is_available: false,
        updated_at: now,
      }).eq("rider_user_id", userId);

      return json({ success: true, job_id: offer.job_id, offer_id });
    }

    // ─── REJECT OFFER (Rider only) ───────────────────────────
    if (action === "reject_offer") {
      const { offer_id } = body;
      if (!offer_id) throw new Error("offer_id required");

      const { data: offer } = await supabaseAdmin
        .from("delivery_job_offers").select("*").eq("id", offer_id).single();
      if (!offer) throw new Error("Offer not found");

      if (offer.rider_user_id !== userId) {
        throw new Error("Offer does not belong to this rider");
      }

      await supabaseAdmin.from("delivery_job_offers").update({
        status: "rejected",
        responded_at: new Date().toISOString(),
      }).eq("id", offer_id);

      return json({ success: true, offer_id });
    }

    // ─── ADVANCE STATUS (Rider only, for assigned job) ───────
    if (action === "advance_status") {
      const { job_id, status } = body;
      if (!job_id || !status) throw new Error("job_id and status required");

      const validTransitions: Record<string, string[]> = {
        accepted: ["rider_arriving"],
        rider_arriving: ["rider_arrived"],
        rider_arrived: ["in_progress"],
        in_progress: ["completed"],
      };

      const { data: job } = await supabaseAdmin
        .from("delivery_jobs").select("*").eq("id", job_id).single();
      if (!job) throw new Error("Job not found");

      // Only assigned rider can advance
      if (job.driver_id !== userId) {
        throw new Error("You are not the assigned rider for this job");
      }

      const allowed = validTransitions[job.status] ?? [];
      if (!allowed.includes(status)) {
        throw new Error(`Cannot transition from ${job.status} to ${status}`);
      }

      const updates: Record<string, unknown> = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (status === "in_progress") updates.picked_up_at = new Date().toISOString();
      if (status === "completed") {
        updates.delivered_at = new Date().toISOString();
        updates.dispatch_status = "completed";
      }

      await supabaseAdmin.from("delivery_jobs").update(updates).eq("id", job_id);

      // Free rider on completion
      if (status === "completed") {
        await supabaseAdmin.from("rider_presence").update({
          is_available: true,
          updated_at: new Date().toISOString(),
        }).eq("rider_user_id", userId);
      }

      return json({ success: true, job_id, status });
    }

    // ─── DISPATCH OFFERS (System/Admin) ──────────────────────
    if (action === "dispatch_offers") {
      const { job_id, radius_km } = body;
      if (!job_id) throw new Error("job_id required");

      const { data: job } = await supabaseAdmin
        .from("delivery_jobs").select("*").eq("id", job_id).single();
      if (!job) throw new Error("Job not found");

      const result = await dispatchOffers(supabaseAdmin, job, radius_km || 2.0);
      return json({ success: true, ...result });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (err) {
    console.error("[dispatch-ride] Error:", err);
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});

// ─── Dispatch engine ─────────────────────────────────────────
async function dispatchOffers(supabaseAdmin: any, job: any, radiusKm: number) {
  if (!job.pickup_lat || !job.pickup_lng) return { offered: 0 };

  // Find available riders within radius
  const { data: riders } = await supabaseAdmin
    .from("rider_presence")
    .select("*")
    .eq("is_online", true)
    .eq("is_available", true)
    .not("current_lat", "is", null)
    .not("current_lng", "is", null);

  if (!riders?.length) return { offered: 0, message: "No riders available" };

  const eligible = riders
    .map((r: any) => ({
      ...r,
      distance_km: haversine(r.current_lat, r.current_lng, job.pickup_lat, job.pickup_lng),
    }))
    .filter((r: any) => r.distance_km <= radiusKm)
    // CRITICAL: exclude the customer themselves
    .filter((r: any) => r.rider_user_id !== job.customer_user_id)
    .sort((a: any, b: any) => a.distance_km - b.distance_km);

  if (!eligible.length) return { offered: 0, message: "No riders in range" };

  // Create offers
  const offers = eligible.slice(0, 10).map((r: any) => ({
    job_id: job.id,
    rider_user_id: r.rider_user_id,
    status: "pending",
    distance_km: Math.round(r.distance_km * 100) / 100,
    eta_minutes: Math.round((r.distance_km / 30) * 60),
    offered_at: new Date().toISOString(),
  }));

  const { error } = await supabaseAdmin
    .from("delivery_job_offers")
    .upsert(offers, { onConflict: "job_id,rider_user_id" });

  // Log dispatch attempt
  await supabaseAdmin.from("delivery_dispatch_attempts").insert({
    job_id: job.id,
    radius_km: radiusKm,
    offered_count: offers.length,
    accepted_count: 0,
    attempted_at: new Date().toISOString(),
  });

  // Update dispatch state on job
  await supabaseAdmin.from("delivery_jobs").update({
    dispatch_attempt_count: (job.dispatch_attempt_count || 0) + 1,
    last_dispatch_at: new Date().toISOString(),
    search_radius_km: radiusKm,
    updated_at: new Date().toISOString(),
  }).eq("id", job.id);

  return { offered: offers.length, radius_km: radiusKm };
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
