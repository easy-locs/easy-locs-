/**
 * Ride Orbit Bridge — creates/reuses ride-linked conversation on driver assignment.
 * Ride Wallet Bridge — emits payment events on ride completion.
 *
 * Brain owner: Experience Brain (orchestration)
 * Listens to canonical ride lifecycle events.
 */
import { eventBus } from "@/lib/core/event-bus";
import { supabase } from "@/integrations/supabase/client";

// ── Orbit Bridge: Create ride chat on driver assignment ──
eventBus.on("ride.driver.assigned", async (payload) => {
  const { jobId, customerUserId, riderUserId } = payload as Record<string, string>;
  if (!jobId || !customerUserId || !riderUserId) return;

  try {
    // Check if ride conversation already exists
    const { data: existing } = await supabase
      .from("conversations_v2")
      .select("id")
      .eq("type", "ride")
      .contains("participants", [customerUserId, riderUserId])
      .limit(1)
      .maybeSingle();

    if (existing) {
      if (import.meta.env.DEV) console.log(`[ride-bridge] Reusing conversation ${existing.id} for job ${jobId}`);
      void eventBus.emit("ride.orbit.context.created", { jobId, conversationId: existing.id });
      return;
    }

    // Create new ride conversation
    const { data: conv, error } = await supabase
      .from("conversations_v2")
      .insert({
        type: "ride",
        title: "Ride Chat",
        participants: [customerUserId, riderUserId],
        created_by_orbit_id: customerUserId,
        metadata: { ride_job_id: jobId, context: "ride_tracking" },
      })
      .select("id")
      .single();

    if (error) {
      if (import.meta.env.DEV) console.warn("[ride-bridge] Orbit conv create error", error.message);
      return;
    }

    if (import.meta.env.DEV) console.log(`[ride-bridge] Created conversation ${conv.id} for job ${jobId}`);
    void eventBus.emit("ride.orbit.context.created", { jobId, conversationId: conv.id });
  } catch (e) {
    if (import.meta.env.DEV) console.warn("[ride-bridge] Orbit bridge error", e);
  }
});

// ── Wallet Bridge: Emit payment events on ride completion ──
eventBus.on("ride.completed", async (payload) => {
  const { jobId, customerUserId, currentPrice, currency } = payload as Record<string, unknown>;
  if (!jobId) return;

  try {
    // Check if payment already exists for this job
    const { data: existingPayment } = await supabase
      .from("unified_transactions")
      .select("id, status")
      .eq("entity_id", jobId as string)
      .eq("entity_type", "mobility_job")
      .maybeSingle();

    if (existingPayment?.status === "completed") {
      void eventBus.emit("ride.payment.completed", { jobId, transactionId: existingPayment.id });
      return;
    }

    // Emit payment required
    void eventBus.emit("ride.payment.required", {
      jobId,
      customerUserId,
      amount: currentPrice,
      currency,
    });

    if (import.meta.env.DEV) console.log(`[ride-bridge] Payment required for job ${jobId}: ${currentPrice} ${currency}`);
  } catch (e) {
    if (import.meta.env.DEV) console.warn("[ride-bridge] Wallet bridge error", e);
  }
});

// ── Rating request after completion ──
eventBus.on("ride.completed", (payload) => {
  const { jobId } = payload as Record<string, string>;
  // Slight delay for rating prompt
  setTimeout(() => {
    void eventBus.emit("ride.rating.requested", { jobId });
  }, 3000);
});

if (import.meta.env.DEV) {
  console.log("[ride-bridge] Orbit + Wallet ride bridges active");
}
