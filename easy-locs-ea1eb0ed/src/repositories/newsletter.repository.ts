/**
 * newsletter.repository — Newsletter subscription.
 */
import { supabase } from "@/integrations/supabase/client";

export async function subscribe(email: string) {
  const { error } = await supabase.from("newsletter_subscribers" as any).insert({ email } as any);
  if (error && error.code === "23505") return "already_subscribed";
  if (error) throw error;
  return "ok";
}
