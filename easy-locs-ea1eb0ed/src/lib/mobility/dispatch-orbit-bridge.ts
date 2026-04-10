import { supabase } from "@/integrations/supabase/client";
import { eventBus } from "@/lib/core/event-bus";

export async function bridgeOrbitOnAssign(jobId: string, riderId: string) {
  try {
    const { data: job } = await supabase
      .from("mobility_jobs")
      .select("customer_user_id, job_type, pickup_label, dropoff_label")
      .eq("id", jobId)
      .maybeSingle();

    if (!job || !(job as any).customer_user_id) return;

    const customerId = (job as any).customer_user_id;
    const jobType = (job as any).job_type ?? "ride";

    const threadId = `ride_${jobId}`;

    const { data: existing } = await supabase
      .from("orbit_threads")
      .select("id")
      .eq("thread_id", threadId)
      .maybeSingle();

    if (existing) return;

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

    const pickup = (job as any).pickup_label ?? "Pickup";
    const dropoff = (job as any).dropoff_label ?? "Destination";

    await supabase.from("orbit_threads").insert({
      thread_id: threadId,
      thread_type: "ride_chat",
      title: `${label}: ${pickup} → ${dropoff}`,
      participants: [customerId, riderId],
      created_by: customerId,
      metadata: {
        job_id: jobId,
        job_type: jobType,
        auto_created: true,
        rider_id: riderId,
      },
      created_at: new Date().toISOString(),
    } as any);

    await supabase.from("orbit_messages").insert({
      thread_id: threadId,
      sender_id: "system",
      message_type: "system",
      content: `Your rider has been assigned. You can chat here for your ${label.toLowerCase()}.`,
      metadata: { auto_message: true, job_id: jobId },
      created_at: new Date().toISOString(),
    } as any);

    void eventBus.emit("orbit.ride_chat_created", {
      jobId,
      threadId,
      customerId,
      riderId,
    });
  } catch {
  }
}

export async function sendRiderStatusMessage(
  jobId: string,
  status: string,
) {
  const threadId = `ride_${jobId}`;

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

  await supabase.from("orbit_messages").insert({
    thread_id: threadId,
    sender_id: "system",
    message_type: "system",
    content: message,
    metadata: { auto_message: true, job_id: jobId, status },
    created_at: new Date().toISOString(),
  } as any);
}

export async function getRideChatThreadId(jobId: string): Promise<string | null> {
  const threadId = `ride_${jobId}`;

  const { data } = await supabase
    .from("orbit_threads")
    .select("id")
    .eq("thread_id", threadId)
    .maybeSingle();

  return data ? threadId : null;
}
