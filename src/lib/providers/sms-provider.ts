import { supabase } from "@/integrations/supabase/client";

export async function sendSmsMessage(params: {
  provider: "mock" | "twilio";
  to: string;
  body: string;
}) {
  if (params.provider === "mock") {
    console.log("[SMS MOCK]", params.to, params.body);
    return { success: true };
  }

  if (params.provider === "twilio") {
    const { data, error } = await supabase.functions.invoke("send-otp", {
      body: { phone: params.to, otp: params.body },
    });
    if (error) throw error;
    return data;
  }

  return { success: false };
}
