import { supabase } from "@/integrations/supabase/client";
import { db } from "@/services/db";

export async function loadWorkspaceKpis(workspaceId: string) {
  const [merchants, menuItems, ticketsOpen, dispatchOpen, reconMismatch] = await Promise.all([
    db("merchant_onboarding_profiles").select("*", { count: "exact", head: true }).eq("workspace_id", workspaceId),
    db("menu_items" as any).select("*", { count: "exact", head: true }).eq("workspace_id", workspaceId),
    db("support_tickets" as any).select("*", { count: "exact", head: true }).eq("workspace_id", workspaceId).in("status", ["open", "in_progress", "waiting_user"]),
    db("mobility_jobs").select("*", { count: "exact", head: true }).in("status", ["searching", "offered", "accepted", "in_progress"]),
    db("financial_reconciliation" as any).select("*", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("status", "mismatch"),
  ]);

  return {
    merchants: merchants.count ?? 0,
    menuItems: menuItems.count ?? 0,
    ticketsOpen: ticketsOpen.count ?? 0,
    dispatchOpen: dispatchOpen.count ?? 0,
    reconMismatch: reconMismatch.count ?? 0,
  };
}
