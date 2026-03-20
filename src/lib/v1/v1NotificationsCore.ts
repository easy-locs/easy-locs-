import { supabase } from "@/integrations/supabase/client";

export async function getV1Notifications(userId: string) {
  const { data, error } = await (supabase as any)
    .from("dino_notifications")
    .select("*")
    .or(`actor_id.eq.${userId},actor_id.is.null`)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw error;
  return (data ?? []) as any[];
}
