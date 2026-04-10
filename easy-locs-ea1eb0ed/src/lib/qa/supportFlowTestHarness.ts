import { supabase } from "@/integrations/supabase/client";

export async function runSupportFlowSmokeTest() {
  const report: Array<{ step: string; ok: boolean; message: string }> = [];

  try {
    const { data: tickets, error } = await supabase
      .from("support_tickets")
      .select("id,status,ticket_type")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) throw error;

    const open = (tickets ?? []).filter((t: any) => String(t.status) === "open").length;

    report.push({
      step: "ticket-read",
      ok: true,
      message: `${tickets?.length ?? 0} tickets loaded`,
    });

    report.push({
      step: "ticket-open-count",
      ok: true,
      message: `${open} open tickets`,
    });
  } catch (e: any) {
    report.push({ step: "fatal", ok: false, message: e.message || "Support smoke test failed" });
  }

  return report;
}
