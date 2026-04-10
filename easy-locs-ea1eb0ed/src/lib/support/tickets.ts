import { supabase } from "@/integrations/supabase/client";

export async function createSupportTicket(params: {
  workspaceId?: string;
  requesterUserId?: string;
  ticketType: "customer" | "merchant" | "driver" | "finance" | "tech";
  priority?: "low" | "medium" | "high" | "critical";
  subject: string;
  contextType?: string;
  contextId?: string;
  firstMessage?: string;
}) {
  const { data: ticket, error: ticketError } = await supabase
    .from("support_tickets" as any)
    .insert({
      workspace_id: params.workspaceId ?? null,
      requester_user_id: params.requesterUserId ?? null,
      ticket_type: params.ticketType,
      priority: params.priority ?? "medium",
      subject: params.subject,
      context_type: params.contextType ?? null,
      context_id: params.contextId ?? null,
      status: "open",
    } as any)
    .select("*")
    .single();

  if (ticketError) throw ticketError;

  if (params.firstMessage?.trim()) {
    await supabase
      .from("support_ticket_messages" as any)
      .insert({
        ticket_id: (ticket as any).id,
        sender_user_id: params.requesterUserId ?? null,
        sender_role: "client",
        body: params.firstMessage.trim(),
      } as any);
  }

  return ticket as any;
}

export async function addSupportTicketMessage(params: {
  ticketId: string;
  senderUserId?: string;
  senderRole?: "client" | "support" | "ai" | "system";
  body: string;
  metadata?: Record<string, any>;
}) {
  const { data, error } = await supabase
    .from("support_ticket_messages" as any)
    .insert({
      ticket_id: params.ticketId,
      sender_user_id: params.senderUserId ?? null,
      sender_role: params.senderRole ?? "client",
      body: params.body,
      metadata: params.metadata ?? {},
    } as any)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function assignSupportTicket(params: {
  ticketId: string;
  assignedTo: string;
}) {
  const { data, error } = await supabase
    .from("support_tickets" as any)
    .update({ assigned_to: params.assignedTo, status: "in_progress" } as any)
    .eq("id", params.ticketId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function resolveSupportTicket(ticketId: string) {
  const { data, error } = await supabase
    .from("support_tickets" as any)
    .update({ status: "resolved", resolved_at: new Date().toISOString() } as any)
    .eq("id", ticketId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
