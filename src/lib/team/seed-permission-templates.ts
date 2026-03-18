/**
 * Seed permission templates for team workspaces.
 */
import { supabase } from "@/integrations/supabase/client";

export async function seedPermissionTemplates() {
  const rows = [
    {
      template_key: "agency_admin",
      label: "Agency Admin",
      permissions: ["properties.view", "properties.edit", "leads.view", "leads.assign", "team.manage", "wallet.view"],
    },
    {
      template_key: "support_agent",
      label: "Support Agent",
      permissions: ["tickets.view", "tickets.reply", "refunds.request", "orbit.view"],
    },
    {
      template_key: "finance_manager",
      label: "Finance Manager",
      permissions: ["wallet.view", "payouts.process", "refunds.approve", "reports.view"],
    },
    {
      template_key: "property_manager",
      label: "Property Manager",
      permissions: ["leases.view", "leases.edit", "rent.view", "documents.view", "maintenance.manage"],
    },
  ];

  const { error } = await supabase
    .from("permission_templates" as any)
    .upsert(rows as any, { onConflict: "template_key" } as any);

  if (error) throw error;
  return { ok: true };
}
