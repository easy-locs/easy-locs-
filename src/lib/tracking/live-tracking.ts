import { supabase } from "@/integrations/supabase/client";

export async function getOrCreateTrackingSession(params: {
  workspaceId?: string;
  contextType: "order" | "dispatch_job" | "taxi_ride";
  contextId: string;
  driverId?: string;
  customerUserId?: string;
  merchantProfileId?: string;
}) {
  const { data: existing } = await (supabase as any)
    .from("live_tracking_sessions")
    .select("*")
    .eq("context_type", params.contextType)
    .eq("context_id", params.contextId)
    .eq("status", "active")
    .maybeSingle();

  if (existing) return existing;

  const { data, error } = await (supabase as any)
    .from("live_tracking_sessions")
    .insert({
      workspace_id: params.workspaceId ?? null,
      context_type: params.contextType,
      context_id: params.contextId,
      driver_id: params.driverId ?? null,
      customer_user_id: params.customerUserId ?? null,
      merchant_profile_id: params.merchantProfileId ?? null,
      status: "active",
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function pushTrackingPoint(params: {
  sessionId: string;
  lat: number;
  lng: number;
  accuracyM?: number;
  heading?: number;
  speedKmh?: number;
  source?: "device" | "inferred" | "system";
}) {
  const { data, error } = await (supabase as any)
    .from("live_tracking_points")
    .insert({
      session_id: params.sessionId,
      lat: params.lat,
      lng: params.lng,
      accuracy_m: params.accuracyM ?? null,
      heading: params.heading ?? null,
      speed_kmh: params.speedKmh ?? null,
      source: params.source ?? "device",
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export function subscribeTrackingPoints(sessionId: string, onPoint: (point: any) => void) {
  return supabase
    .channel(`tracking:${sessionId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "live_tracking_points",
        filter: `session_id=eq.${sessionId}`,
      },
      (payload) => onPoint(payload.new)
    )
    .subscribe();
}

export async function completeTrackingSession(sessionId: string) {
  const { data, error } = await (supabase as any)
    .from("live_tracking_sessions")
    .update({ status: "completed", ended_at: new Date().toISOString() } as any)
    .eq("id", sessionId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
