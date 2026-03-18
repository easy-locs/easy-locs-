import { supabase } from "@/integrations/supabase/client";

export async function sendPushMessage(params: {
  provider: "mock" | "fcm" | "apns";
  tokens: string[];
  title: string;
  body: string;
  data?: Record<string, any>;
}) {
  if (params.provider === "mock") {
    console.log("[PUSH MOCK]", params.tokens.length, params.title, params.body, params.data);
    return { success: true };
  }

  const { data, error } = await supabase.functions.invoke("send-push", {
    body: {
      tokens: params.tokens,
      title: params.title,
      body: params.body,
      data: params.data ?? {},
      provider: params.provider,
    },
  });

  if (error) throw error;
  return data;
}
