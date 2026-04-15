import { db } from "@/services/db";
import { platformBus } from "@/lib/shared/platform-bus";

interface MobilityJobRow {
  customer_user_id: string | null;
  job_type: string;
  pickup_label: string | null;
  dropoff_label: string | null;
}

export async function bridgeOrbitOnAssign(jobId: string, riderId: string) {
  try {
    const { data: job } = await db("mobility_jobs")
      .select("customer_user_id, job_type, pickup_label, dropoff_label")
      .eq("id", jobId)
      .maybeSingle();

    const row = job as MobilityJobRow | null;
    if (!row || !row.customer_user_id) return;

    const customerId = row.customer_user_id;
    const jobType = row.job_type ?? "ride";

    const label =
      jobType === "taxi"
        ? "Taxi Ride"
        : jobType === "food_delivery"
        ? "Food Delivery"
        : jobType === "grocery_delivery"
        ? "Grocery Delivery"
        : jobType === "parcel"
        ? "Parcel Delivery"
        : "Ride";

    const pickup = row.pickup_label ?? "Pickup";
    const dropoff = row.dropoff_label ?? "Destination";
    const now = new Date().toISOString();

    const { data: existing } = await db("conversations_v2")
      .select("id")
      .eq("type", "ride_chat")
      .contains("metadata", { job_id: jobId })
      .maybeSingle();

    if (existing) return;

    const { data: conversation, error: convError } = await db("conversations_v2").insert({
      id: crypto.randomUUID(),
      type: "ride_chat",
      title: `${label}: ${pickup} → ${dropoff}`,
      participants: [customerId, riderId],
      created_by_orbit_id: customerId,
      metadata: {
        job_id: jobId,
        job_type: jobType,
        auto_created: true,
        rider_id: riderId,
      },
      created_at: now,
    } as any).select("id").single();

    if (convError || !conversation) {
      console.error("[dispatch-orbit-bridge] Failed to create conversation:", convError?.message);
      return;
    }

    const { error: msgError } = await db("chat_messages_v2").insert({
      id: crypto.randomUUID(),
      conversation_id: conversation.id,
      sender_orbit_id: "system",
      sender_user_id: "system",
      type: "system",
      body: `Your rider has been assigned. You can chat here for your ${label.toLowerCase()}.`,
      metadata: { auto_message: true, job_id: jobId },
      created_at: now,
    } as any);

    if (msgError) {
      console.error("[dispatch-orbit-bridge] Failed to create system message:", msgError.message);
    }

    platformBus.emit("orbit:ride_chat_created", {
      jobId,
      conversationId: conversation.id,
      customerId,
      riderId,
    }, "orbit");
  } catch (err) {
    console.error("[dispatch-orbit-bridge] bridgeOrbitOnAssign error:", err);
  }
}

export async function sendRiderStatusMessage(
  jobId: string,
  status: string,
) {
  const statusMessages: Record<string, string> = {
    rider_arriving_pickup: "Your rider is on the way to pick you up.",
    rider_arrived_pickup: "Your rider has arrived at the pickup location.",
    picked_up: "You've been picked up. Enjoy your ride!",
    in_progress: "Your ride is in progress.",
    rider_arriving_dropoff: "Almost there! Arriving at your destination soon.",
    completed: "You've arrived! Thank you for riding with Easy-Locs.",
    cancelled: "This ride has been cancelled.",
  };

  const message = statusMessages[status];
  if (!message) return;

  const { data: conversation } = await db("conversations_v2")
    .select("id")
    .eq("type", "ride_chat")
    .contains("metadata", { job_id: jobId })
    .maybeSingle();

  if (!conversation) return;

  const { error } = await db("chat_messages_v2").insert({
    id: crypto.randomUUID(),
    conversation_id: conversation.id,
    sender_orbit_id: "system",
    sender_user_id: "system",
    type: "system",
    body: message,
    metadata: { auto_message: true, job_id: jobId, status },
    created_at: new Date().toISOString(),
  } as any);

  if (error) {
    console.error("[dispatch-orbit-bridge] sendRiderStatusMessage error:", error.message);
  }
}

export async function getRideChatThreadId(jobId: string): Promise<string | null> {
  const { data } = await db("conversations_v2")
    .select("id")
    .eq("type", "ride_chat")
    .contains("metadata", { job_id: jobId })
    .maybeSingle();

  return data?.id ?? null;
}
