import { supabase } from "@/integrations/supabase/client";

export async function createLogExportJob(params: {
  exportType: "audit_logs" | "alerts" | "incidents" | "settlements";
  filters?: Record<string, any>;
}) {
  const { data: userData } = await supabase.auth.getUser();

  const { data, error } = await (supabase as any)
    .from("log_export_jobs")
    .insert({
      export_type: params.exportType,
      status: "queued",
      filters: params.filters ?? {},
      created_by: userData.user?.id ?? null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function completeLogExportJob(params: {
  jobId: string;
  outputUrl: string;
}) {
  const { data, error } = await (supabase as any)
    .from("log_export_jobs")
    .update({
      status: "completed",
      output_url: params.outputUrl,
      completed_at: new Date().toISOString(),
    })
    .eq("id", params.jobId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function listLogExportJobs() {
  const { data, error } = await (supabase as any)
    .from("log_export_jobs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw error;
  return data ?? [];
}
