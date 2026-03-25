import { supabase } from "@/integrations/supabase/client";

export async function listTicketMessages(ticketId: string) {
  const { data, error } = await (supabase as any)
    .from("support_ticket_messages")
    .select("id, ticket_id, sender_role, body, metadata, created_at")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function sendTicketMessage(params: {
  ticketId: string;
  senderUserId?: string | null;
  senderRole: "client" | "admin" | "merchant" | "driver" | "system";
  body: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await (supabase as any)
    .from("support_ticket_messages")
    .insert({
      ticket_id: params.ticketId,
      sender_user_id: params.senderUserId ?? null,
      sender_role: params.senderRole,
      body: params.body,
      metadata: params.metadata ?? {},
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateTicketAdminState(params: {
  ticketId: string;
  status?: string;
  priority?: string;
  assigneeUserId?: string | null;
}) {
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (params.status) patch.status = params.status;
  if (params.priority) patch.priority = params.priority;
  if (params.assigneeUserId !== undefined) patch.assignee_user_id = params.assigneeUserId;

  const { data, error } = await (supabase as any)
    .from("support_tickets")
    .update(patch)
    .eq("id", params.ticketId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
