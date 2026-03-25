/**
 * Global Support / SAV Engine
 * Multi-party dispute resolution with auto-detection, proof, SLA, and smart routing.
 */
import { supabase } from "@/integrations/supabase/client";
import { eventBus } from "@/lib/core/event-bus";
import { sendNotification } from "@/lib/engines/notification-engine";

// ── Types ──
export type TicketParty = "client" | "merchant" | "driver" | "platform";
export type TicketStatus = "open" | "in_progress" | "waiting_client" | "waiting_merchant" | "waiting_driver" | "escalated" | "resolved" | "closed";
export type IssueSeverity = "low" | "medium" | "high" | "critical";
export type IssueType =
  | "late_delivery" | "missing_item" | "wrong_item" | "cold_food"
  | "driver_no_show" | "merchant_no_response" | "payment_failed"
  | "cancellation" | "quality_issue" | "other";

export interface DisputeTicket {
  id: string;
  order_id: string;
  issue_type: IssueType;
  severity: IssueSeverity;
  status: TicketStatus;
  parties: TicketParty[];
  assigned_to?: TicketParty;
  sla_deadline_at?: string;
  created_at: string;
}

// ── SLA Rules (minutes) ──
const SLA_RULES: Record<IssueSeverity, number> = {
  critical: 15,
  high: 60,
  medium: 240,
  low: 1440,
};

// ── Auto-Detection Rules ──
const ISSUE_DETECTION_RULES: Array<{
  condition: (ctx: OrderContext) => boolean;
  issue: IssueType;
  severity: IssueSeverity;
  autoMessage: string;
}> = [
  {
    condition: (ctx) => ctx.delivery_delay_min > 30,
    issue: "late_delivery",
    severity: "high",
    autoMessage: "We detected your order is significantly delayed. Our team is looking into it.",
  },
  {
    condition: (ctx) => ctx.delivery_delay_min > 15 && ctx.delivery_delay_min <= 30,
    issue: "late_delivery",
    severity: "medium",
    autoMessage: "Your order is running a bit late. We're monitoring it closely.",
  },
  {
    condition: (ctx) => ctx.merchant_response_time_min > 10 && ctx.status === "pending",
    issue: "merchant_no_response",
    severity: "high",
    autoMessage: "The restaurant hasn't confirmed your order yet. We're contacting them.",
  },
  {
    condition: (ctx) => ctx.driver_idle_min > 15,
    issue: "driver_no_show",
    severity: "critical",
    autoMessage: "Your driver appears inactive. We're reassigning your delivery.",
  },
];

interface OrderContext {
  order_id: string;
  status: string;
  delivery_delay_min: number;
  merchant_response_time_min: number;
  driver_idle_min: number;
  customer_user_id: string;
  merchant_user_id?: string;
  driver_user_id?: string;
}

// ── Core Functions ──

export async function createDisputeTicket(params: {
  orderId: string;
  issueType: IssueType;
  reportedBy: TicketParty;
  reporterUserId: string;
  description: string;
  severity?: IssueSeverity;
}) {
  const severity = params.severity ?? detectSeverity(params.issueType);
  const slaMinutes = SLA_RULES[severity];
  const slaDeadline = new Date(Date.now() + slaMinutes * 60_000).toISOString();
  const assignedTo = routeTicket(params.issueType);

  const { data: ticket, error } = await (supabase as any)
    .from("support_tickets")
    .insert({
      context_id: params.orderId,
      context_type: "order",
      ticket_type: params.issueType,
      priority: severity,
      subject: `${params.issueType.replace(/_/g, " ")} — Order ${params.orderId.slice(0, 8)}`,
      status: "open",
      requester_user_id: params.reporterUserId,
      reporter_user_id: params.reporterUserId,
      sla_deadline: slaDeadline,
    })
    .select("*")
    .single();

  if (error) throw error;

  // Add first message
  await (supabase as any).from("support_ticket_messages").insert({
    ticket_id: ticket.id,
    sender_user_id: params.reporterUserId,
    sender_role: params.reportedBy,
    body: params.description,
  });

  // Emit event
  await eventBus.emit("support.ticket_created", {
    ticketId: ticket.id,
    orderId: params.orderId,
    issueType: params.issueType,
    severity,
    assignedTo,
  });

  // Notify reporter
  sendNotification({
    user_id: params.reporterUserId,
    event_type: "support_reply",
    entity_id: ticket.id,
    entity_type: "support_ticket",
    variables: { title: "Support Ticket Created", body: `Your issue "${params.issueType.replace(/_/g, " ")}" has been received. We're on it.` },
  }).catch(console.error);

  return ticket;
}

export async function addProofToTicket(params: {
  ticketId: string;
  uploadedBy: TicketParty;
  uploaderUserId: string;
  proofType: "photo" | "screenshot" | "receipt";
  fileUrl: string;
  description?: string;
}) {
  // Store proof as a message with metadata
  const { error } = await (supabase as any)
    .from("support_ticket_messages")
    .insert({
      ticket_id: params.ticketId,
      sender_user_id: params.uploaderUserId,
      sender_role: params.uploadedBy,
      body: params.description || `${params.proofType} proof uploaded`,
      metadata: {
        proof_type: params.proofType,
        file_url: params.fileUrl,
        uploaded_at: new Date().toISOString(),
      },
    });

  if (error) throw error;
}

export async function escalateTicket(ticketId: string, reason: string) {
  const { error } = await (supabase as any)
    .from("support_tickets")
    .update({
      status: "escalated",
      priority: "critical",
      escalated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", ticketId);

  if (error) throw error;

  await (supabase as any).from("support_ticket_messages").insert({
    ticket_id: ticketId,
    sender_role: "system",
    body: `⚠️ Ticket escalated: ${reason}`,
    metadata: { internal: true },
  });

  await eventBus.emit("support.ticket_escalated", { ticketId, reason });
}

export async function autoDetectIssues(ctx: OrderContext) {
  const detected: Array<{ issue: IssueType; severity: IssueSeverity; message: string }> = [];

  for (const rule of ISSUE_DETECTION_RULES) {
    if (rule.condition(ctx)) {
      detected.push({ issue: rule.issue, severity: rule.severity, message: rule.autoMessage });
    }
  }

  for (const d of detected) {
    await createDisputeTicket({
      orderId: ctx.order_id,
      issueType: d.issue,
      reportedBy: "platform",
      reporterUserId: "system",
      description: d.message,
      severity: d.severity,
    });
  }

  return detected;
}

export async function checkSlaBreaches() {
  const { data: openTickets } = await (supabase as any)
    .from("support_tickets")
    .select("id, sla_deadline, status, priority")
    .in("status", ["open", "in_progress"])
    .not("sla_deadline", "is", null)
    .limit(200);

  let breached = 0;
  for (const t of openTickets ?? []) {
    if (t.sla_deadline && new Date(t.sla_deadline) < new Date()) {
      await escalateTicket(t.id, "SLA breach — response time exceeded");
      breached++;
    }
  }
  return { checked: openTickets?.length ?? 0, breached };
}

// ── Helpers ──

function detectSeverity(issue: IssueType): IssueSeverity {
  const map: Record<IssueType, IssueSeverity> = {
    late_delivery: "medium",
    missing_item: "high",
    wrong_item: "high",
    cold_food: "medium",
    driver_no_show: "critical",
    merchant_no_response: "high",
    payment_failed: "critical",
    cancellation: "medium",
    quality_issue: "low",
    other: "low",
  };
  return map[issue] ?? "medium";
}

function routeTicket(issue: IssueType): TicketParty {
  if (["driver_no_show", "late_delivery"].includes(issue)) return "driver";
  if (["missing_item", "wrong_item", "cold_food", "merchant_no_response"].includes(issue)) return "merchant";
  return "platform";
}
