import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { requireAuthenticatedUser } from "../_shared/edge-auth.ts";
import { generateRoomToken, createRoom, getLiveKitWsUrl } from "../_shared/livekit-client.ts";
import { arcjetProtect, shieldMiddleware, arcjetDenyResponse } from "../_shared/arcjet-shield.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

function jsonResponse(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function verifyRoomMembership(
  db: ReturnType<typeof createClient>,
  roomName: string,
  userId: string
): Promise<boolean> {
  const { data: booking } = await db
    .from("orbit_calls")
    .select("id")
    .eq("room_name", roomName)
    .or(`caller_id.eq.${userId},callee_id.eq.${userId},host_id.eq.${userId}`)
    .limit(1)
    .maybeSingle();

  if (booking) return true;

  const { data: appointment } = await db
    .from("appointments")
    .select("id")
    .eq("video_room", roomName)
    .or(`client_id.eq.${userId},provider_id.eq.${userId}`)
    .limit(1)
    .maybeSingle();

  return !!appointment;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
  const shieldResult = await arcjetProtect(req, shieldMiddleware("sensitive"));
  if (shieldResult.decision === "deny") return arcjetDenyResponse(shieldResult);

  const authCheck = await requireAuthenticatedUser(req);
  if (!authCheck.authorized) return authCheck.response!;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const db = createClient(supabaseUrl, supabaseKey);

  try {
    const body = await req.json();
    const { action, roomName, participantName, maxParticipants } = body;

    if (!roomName) {
      return jsonResponse({ error: "roomName is required" }, 400);
    }

    const isMember = await verifyRoomMembership(db, roomName, authCheck.userId!);
    if (!isMember) {
      return jsonResponse({ error: "You are not authorized to access this room" }, 403);
    }

    if (action === "create_room") {
      const room = await createRoom(roomName, { maxParticipants: maxParticipants ?? 50 });

      const token = await generateRoomToken({
        roomName,
        participantIdentity: authCheck.userId!,
        participantName: participantName ?? authCheck.userId,
      });

      return jsonResponse({
        room,
        token,
        livekitUrl: getLiveKitWsUrl(),
      });
    }

    if (action === "join_room") {
      const token = await generateRoomToken({
        roomName,
        participantIdentity: authCheck.userId!,
        participantName: participantName ?? authCheck.userId,
      });

      return jsonResponse({
        token,
        livekitUrl: getLiveKitWsUrl(),
      });
    }

    if (action === "start_recording") {
      const recorderToken = await generateRoomToken({
        roomName,
        participantIdentity: `recorder-${authCheck.userId}`,
        participantName: "Recorder",
        isRecorder: true,
        canPublish: false,
        canSubscribe: true,
      });

      return jsonResponse({
        token: recorderToken,
        livekitUrl: getLiveKitWsUrl(),
        recording: true,
      });
    }

    if (action === "stop_recording") {
      return jsonResponse({ recording: false });
    }

    return jsonResponse({ error: "Unknown action. Use create_room, join_room, start_recording, or stop_recording." }, 400);
  } catch (err) {
    console.error("[livekit-room-token]", err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Unknown error" },
      500
    );
  }
});
