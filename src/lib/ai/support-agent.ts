import { supabase } from "@/integrations/supabase/client";

export async function generateSupportReply(params: {
  role: "customer" | "merchant" | "driver";
  message: string;
  context?: Record<string, any>;
}) {
  const { data, error } = await supabase.functions.invoke("ops-ai-chat", {
    body: {
      messages: [
        {
          role: "system",
          content: `You are a support agent for a ${params.role}. Give concise, practical help.`,
        },
        { role: "user", content: params.message },
      ],
    },
  });

  if (error) throw error;
  return data?.answer ?? "";
}
