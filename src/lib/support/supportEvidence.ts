import { supabase } from "@/integrations/supabase/client";

/**
 * Add proof/evidence to a support ticket as a message with metadata.
 */
export async function addSupportEvidenceMeta(params: {
  ticketId: string;
  fileName: string;
  fileUrl: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
  uploadedByUserId?: string | null;
}) {
  const { data, error } = await supabase
    .from("support_ticket_messages" as any)
    .insert({
      ticket_id: params.ticketId,
      sender_user_id: params.uploadedByUserId ?? null,
      sender_role: "user",
      body: `Evidence uploaded: ${params.fileName}`,
      metadata: {
        evidence: true,
        fileName: params.fileName,
        fileUrl: params.fileUrl,
        mimeType: params.mimeType ?? null,
        sizeBytes: params.sizeBytes ?? null,
        uploadedAt: new Date().toISOString(),
      },
    } as any)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function listSupportEvidence(ticketId: string) {
  const { data, error } = await supabase
    .from("support_ticket_messages" as any)
    .select("*")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return ((data as any[]) ?? []).filter(
    (m: any) => m.metadata?.evidence === true
  );
}
