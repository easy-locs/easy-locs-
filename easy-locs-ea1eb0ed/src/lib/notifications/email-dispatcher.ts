/**
 * email-dispatcher — Transactional email dispatch via Supabase Edge Function.
 * Delegates to the `send-email` edge function which handles provider selection
 * (SendGrid, Postmark, etc.) based on the org's configuration.
 */
import { supabase } from "@/integrations/supabase/client";

interface TransactionalEmailParams {
  to: string;
  subject: string;
  body: string;
  category?: string;
  meta?: Record<string, unknown>;
}

export async function sendTransactionalEmail(params: TransactionalEmailParams): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke("send-email", {
      body: {
        to: params.to,
        subject: params.subject,
        body: params.body,
        category: params.category ?? "general",
        metadata: params.meta ?? {},
      },
    });

    if (error) {
      console.warn("[email-dispatcher] Edge function error:", error.message);
      return false;
    }

    return data?.sent === true;
  } catch {
    return false;
  }
}
