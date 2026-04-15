/**
 * Ride Orbit Bridge — creates/reuses ride-linked conversation on driver assignment.
 * Ride Wallet Bridge — emits payment events on ride completion.
 *
 * Brain owner: Experience Brain (orchestration)
 * Listens to canonical ride lifecycle events.
 */
import { platformBus } from "@/lib/shared/platform-bus";
import { db as supabase } from "@/services/db";

platformBus.on("ride:driver_assigned", async (event) => {
  const payload = event.payload as Record<string, any>;
  const { jobId, customerUserId, riderUserId } = payload as Record<string, string>;
  if (!jobId || !customerUserId || !riderUserId) return;

  try {
    const { data: existing } = await supabase
      .from("conversations_v2")
      .select("id")
      .eq("type", "ride")
      .contains("participants", [customerUserId, riderUserId])
      .limit(1)
      .maybeSingle();

    if (existing) {
      if (import.meta.env.DEV) console.log(`[ride-bridge] Reusing conversation ${existing.id} for job ${jobId}`);
      platformBus.emit("ride:orbit_context_created", { jobId, conversationId: existing.id }, "orbit");
      return;
    }

    const customerOrbitId = `orbit_${customerUserId.replace(/-/g, "").substring(0, 8)}`;
    const riderOrbitId = `orbit_${riderUserId.replace(/-/g, "").substring(0, 8)}`;

    const { data: conv, error } = await supabase
      .from("conversations_v2")
      .insert({
        type: "ride",
        title: "Ride Chat",
        participants: [
          { userId: customerUserId, orbitId: customerOrbitId },
          { userId: riderUserId, orbitId: riderOrbitId },
        ],
        created_by_orbit_id: customerOrbitId,
        metadata: { ride_job_id: jobId, context: "ride_tracking" },
      })
      .select("id")
      .single();

    if (error) {
      if (import.meta.env.DEV) console.warn("[ride-bridge] Orbit conv create error", error.message);
      return;
    }

    if (import.meta.env.DEV) console.log(`[ride-bridge] Created conversation ${conv.id} for job ${jobId}`);
    platformBus.emit("ride:orbit_context_created", { jobId, conversationId: conv.id }, "orbit");
  } catch (e) {
    if (import.meta.env.DEV) console.warn("[ride-bridge] Orbit bridge error", e);
  }
});

if (import.meta.env.DEV) {
  console.log("[ride-bridge] Orbit + Wallet ride bridges active");
}
