import { supabase } from "@/integrations/supabase/client";

export async function sendPushToUser(params: {
  userId: string;
  title: string;
  body?: string;
  data?: Record<string, any>;
}) {
  const { data: tokens, error } = await (supabase as any)
    .from("push_device_tokens")
    .select("device_token")
    .eq("user_id", params.userId)
    .eq("is_active", true);

  if (error) throw error;

  const rawTokens = (tokens ?? []).map((t: any) => t.device_token).filter(Boolean);
  if (!rawTokens.length) return { success: false, reason: "no_tokens" };

  const { data, error: fnError } = await supabase.functions.invoke("send-push", {
    body: {
      tokens: rawTokens,
      title: params.title,
      body: params.body ?? "",
      data: params.data ?? {},
    },
  });

  if (fnError) throw fnError;
  return data;
}
