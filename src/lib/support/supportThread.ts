import { supabase } from "@/integrations/supabase/client";

export async function listTicketMessages(ticketId: string) {
  const { data, error } = await (supabase as any)
    .from("support_ticket_messages")
    .select("*")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function sendTicketMessage(params: {
  ticketId: string;
  authorUserId?: string | null;
  authorRole: "user" | "admin" | "merchant" | "driver" | "system";
  message: string;
  isInternal?: boolean;
}) {
  const { data, error } = await (supabase as any)
    .from("support_ticket_messages")
    .insert({
      ticket_id: params.ticketId,
      author_user_id: params.authorUserId ?? null,
      author_role: params.authorRole,
      message: params.message,
      is_internal: params.isInternal ?? false,
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
