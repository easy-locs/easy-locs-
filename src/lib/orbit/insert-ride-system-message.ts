/**
 * Insert Ride System Message — Posts a system message into the conversation thread on driver assignment.
 */
import { supabase } from "@/integrations/supabase/client";

export async function insertRideSystemMessage(params: {
  threadId: string;
  rideRequestId: string;
  driverId: string;
  etaMin?: number | null;
}) {
  const { threadId, rideRequestId, driverId, etaMin } = params;

  await supabase.from("messages" as any).insert({
    thread_id: threadId,
    message_type: "system",
    category: "ride",
    context_type: "ride",
    context_id: rideRequestId,
    content: etaMin != null
      ? `Driver assigned · arriving in about ${etaMin} min`
      : "Driver assigned",
    metadata_json: {
      ride_request_id: rideRequestId,
      driver_id: driverId,
      actions: [
        { label: "📍 Track driver", route: `/track/${threadId}`, type: "track" },
        { label: "📞 Call driver", route: `/call/${threadId}`, type: "call" },
        { label: "💳 Pay ride", route: `/wallet/pay/${threadId}`, type: "pay" },
      ],
    },
  } as any);
}
