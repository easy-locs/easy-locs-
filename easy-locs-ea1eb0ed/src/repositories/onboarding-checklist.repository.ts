/**
 * onboarding-checklist.repository — DB counts for OnboardingChecklist widget.
 */
import { supabase } from "@/integrations/supabase/client";
import { db } from "@/services/db";

export async function fetchChecklistCounts(orgId: string) {
  const [props, tenants, docs, owner, payments, messages] = await Promise.all([
    db("properties").select("id", { count: "exact", head: true }).eq("org_id", orgId),
    db("tenants").select("id", { count: "exact", head: true }).eq("org_id", orgId),
    db("documents").select("id", { count: "exact", head: true }).eq("org_id", orgId),
    db("owner_profiles").select("id").eq("org_id", orgId).limit(1).maybeSingle(),
    db("rent_calls").select("id", { count: "exact", head: true }).eq("org_id", orgId),
    db("chat_messages_v2").select("id", { count: "exact", head: true }),
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
