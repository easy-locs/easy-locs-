/**
 * onboarding-checklist.repository — DB counts for OnboardingChecklist widget.
 */
import { supabase } from "@/integrations/supabase/client";

export async function fetchChecklistCounts(orgId: string) {
  const [props, tenants, docs, owner, payments, messages] = await Promise.all([
    supabase.from("properties").select("id", { count: "exact", head: true }).eq("org_id", orgId),
    supabase.from("tenants").select("id", { count: "exact", head: true }).eq("org_id", orgId),
    supabase.from("documents").select("id", { count: "exact", head: true }).eq("org_id", orgId),
    supabase.from("owner_profiles").select("id").eq("org_id", orgId).limit(1).maybeSingle(),
    supabase.from("rent_calls").select("id", { count: "exact", head: true }).eq("org_id", orgId),
    (supabase as any).from("chat_messages_v2").select("id", { count: "exact", head: true }),
  ]);
  return {
    properties: props.count ?? 0,
    tenants: tenants.count ?? 0,
    documents: docs.count ?? 0,
    ownerProfile: !!owner.data,
    payments: payments.count ?? 0,
    messages: messages.count ?? 0,
  };
}
