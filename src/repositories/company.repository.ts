/**
 * company.repository — DB operations for Company page.
 */
import { supabase } from "@/integrations/supabase/client";

export async function fetchUserCountry() {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData?.user?.id) return null;
  const { data: p } = await supabase.from("profiles").select("country").eq("id", authData.user.id).single();
  return p?.country || null;
}

export async function createLegalNoticePayment(jalName: string) {
  const { data, error } = await supabase.functions.invoke("create-legal-notice-payment", {
    body: { jalName },
  });
  if (error) throw error;
  return data;
}
