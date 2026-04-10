/**
 * developer.repository — All DB operations for DeveloperPortal page.
 */
import { supabase } from "@/integrations/supabase/client";

export async function fetchOrgForUser(userId: string) {
  const { data } = await supabase.from("org_members").select("org_id").eq("user_id", userId).limit(1).single();
  if (!data) return null;
  const { data: o } = await supabase.from("orgs").select("*").eq("id", data.org_id).single();
  return o;
}

export async function fetchApiKeys(orgId: string) {
  const { data } = await supabase.from("api_keys" as any).select("*").eq("org_id", orgId).order("created_at", { ascending: false });
  return (data || []) as unknown as Array<{
    id: string; name: string; key_prefix: string; scopes: string[];
    active: boolean; last_used_at: string | null; created_at: string;
  }>;
}

export async function fetchWebhooks(orgId: string) {
  const { data } = await supabase.from("webhooks" as any).select("*").eq("org_id", orgId).order("created_at", { ascending: false });
  return (data || []) as unknown as Array<{
    id: string; url: string; secret: string; events: string[];
    active: boolean; failure_count: number; last_triggered_at: string | null; created_at: string;
  }>;
}

export async function fetchWebhookDeliveries() {
  const { data } = await supabase.from("webhook_deliveries" as any).select("*").order("delivered_at", { ascending: false }).limit(50);
  return (data || []) as unknown as Array<{
    id: string; webhook_id: string; event_type: string; response_status: number | null;
    success: boolean; delivered_at: string;
  }>;
}

export async function createApiKey(orgId: string, name: string) {
  const { data, error } = await supabase.rpc("create_api_key", {
    _org_id: orgId, _name: name, _scopes: ["read", "write"],
  });
  if (error) throw error;
  const result = data as any;
  if (!result.success) throw new Error(result.error);
  return result.key as string;
}

export async function deleteApiKey(id: string) {
  const { error } = await supabase.from("api_keys" as any).delete().eq("id", id);
  if (error) throw error;
}

export async function createWebhook(orgId: string, userId: string, url: string, events: string[]) {
  const { error } = await supabase.from("webhooks" as any).insert({
    org_id: orgId, user_id: userId, url, events,
  });
  if (error) throw error;
}

export async function deleteWebhook(id: string) {
  const { error } = await supabase.from("webhooks" as any).delete().eq("id", id);
  if (error) throw error;
}

export async function toggleWebhook(id: string, active: boolean) {
  const { error } = await supabase.from("webhooks" as any).update({ active }).eq("id", id);
  if (error) throw error;
}
