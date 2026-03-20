import { supabase } from "@/integrations/supabase/client";

export async function addSupportEvidenceMeta(params: {
  ticketId: string;
  fileName: string;
  fileUrl: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
  uploadedByUserId?: string | null;
}) {
  const { data: ticket, error: findErr } = await supabase
    .from("support_tickets")
    .select("metadata_json")
    .eq("id", params.ticketId)
    .maybeSingle();

  if (findErr) throw findErr;

  const current = ((ticket as any)?.metadata_json ?? {}) as Record<string, any>;
  const evidence = Array.isArray(current.evidence) ? current.evidence : [];

  evidence.push({
    id: crypto.randomUUID(),
    fileName: params.fileName,
    fileUrl: params.fileUrl,
    mimeType: params.mimeType ?? null,
    sizeBytes: params.sizeBytes ?? null,
    uploadedByUserId: params.uploadedByUserId ?? null,
    uploadedAt: new Date().toISOString(),
  });

  const { data, error } = await supabase
    .from("support_tickets")
    .update({
      metadata_json: { ...current, evidence },
      updated_at: new Date().toISOString(),
    } as any)
    .eq("id", params.ticketId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function listSupportEvidence(ticketId: string) {
  const { data, error } = await supabase
    .from("support_tickets")
    .select("metadata_json")
    .eq("id", ticketId)
    .maybeSingle();

  if (error) throw error;
  const current = ((data as any)?.metadata_json ?? {}) as Record<string, any>;
  return Array.isArray(current.evidence) ? current.evidence : [];
}
