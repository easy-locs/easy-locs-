/**
 * Orbit Ride Notifications — System messages injected into threads at each lifecycle stage.
 */
import { supabase } from "@/integrations/supabase/client";

async function insertSystemMessage(params: {
  threadId: string;
  rideRequestId: string;
  content: string;
  actions?: Array<{ label: string; route: string; type: string }>;
}) {
  await supabase.from("messages" as any).insert({
    thread_id: params.threadId,
    message_type: "system",
    category: "ride",
    context_type: "ride",
    context_id: params.rideRequestId,
    content: params.content,
    metadata_json: {
      actions: params.actions ?? [],
    },
  } as any);
}

export async function orbitRideArrived(threadId: string, rideRequestId: string) {
  await insertSystemMessage({
    threadId,
    rideRequestId,
    content: "Driver has arrived at pickup",
    actions: [
      { label: "📍 Open tracking", route: `/track/${rideRequestId}`, type: "track" },
      { label: "📞 Call driver", route: `/call/${threadId}`, type: "call" },
    ],
  });
}

export async function orbitRideStarted(threadId: string, rideRequestId: string) {
  await insertSystemMessage({
    threadId,
    rideRequestId,
    content: "Trip started",
    actions: [
      { label: "📍 Track live", route: `/track/${rideRequestId}`, type: "track" },
    ],
  });
}

export async function orbitRideCompleted(
  threadId: string,
  rideRequestId: string,
  amount: number,
) {
  await insertSystemMessage({
    threadId,
    rideRequestId,
    content: `Trip completed · ${amount.toFixed(2)} AED`,
    actions: [
      { label: "💳 Pay ride", route: `/wallet/pay/${threadId}`, type: "pay" },
      { label: "🧾 View receipt", route: `/ride/receipt/${rideRequestId}`, type: "receipt" },
      { label: "⭐ Rate trip", route: `/ride/complete/${rideRequestId}`, type: "rate" },
    ],
  });
}
