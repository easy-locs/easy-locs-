import { supabase } from "@/integrations/supabase/client";

export async function loadWorkspaceKpis(workspaceId: string) {
  const [merchants, menuItems, ticketsOpen, dispatchOpen, reconMismatch] = await Promise.all([
    supabase.from("merchant_onboarding_profiles").select("*", { count: "exact", head: true }).eq("workspace_id", workspaceId),
    supabase.from("menu_items" as any).select("*", { count: "exact", head: true }).eq("workspace_id", workspaceId),
    supabase.from("support_tickets" as any).select("*", { count: "exact", head: true }).eq("workspace_id", workspaceId).in("status", ["open", "in_progress", "waiting_user"]),
    supabase.from("dispatch_jobs" as any).select("*", { count: "exact", head: true }).eq("workspace_id", workspaceId).in("status", ["open", "broadcast", "assigned", "picked_up"]),
    supabase.from("financial_reconciliation" as any).select("*", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("status", "mismatch"),
  ]);

  return {
    merchants: merchants.count ?? 0,
    menuItems: menuItems.count ?? 0,
    ticketsOpen: ticketsOpen.count ?? 0,
    dispatchOpen: dispatchOpen.count ?? 0,
    reconMismatch: reconMismatch.count ?? 0,
  };
}
