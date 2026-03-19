/**
 * DINO V20 — Global Support & Dispute Hub
 * Unified ticket center, dispute flow, evidence store, resolution engine.
 */
import { supabase } from "@/integrations/supabase/client";

export type TicketCategory =
  | "order_issue"
  | "payment_dispute"
  | "delivery_problem"
  | "property_complaint"
  | "service_quality"
  | "account_issue"
  | "safety_concern"
  | "other";

export type TicketPriority = "critical" | "high" | "medium" | "low";

export interface CreateTicketParams {
  userId: string;
  category: TicketCategory;
  subject: string;
  description: string;
  serviceVertical?: string;
  referenceId?: string;
  referenceType?: string;
  priority?: TicketPriority;
  evidenceUrls?: string[];
}

/** Create a unified support ticket */
export async function createSupportTicket(params: CreateTicketParams) {
  const priority = params.priority ?? inferPriority(params.category);

  const { data, error } = await (supabase as any)
    .from("support_tickets")
    .insert({
      user_id: params.userId,
      ticket_type: params.category.includes("dispute") ? "dispute" : "support",
      category: params.category,
      subject: params.subject,
      description: params.description,
      priority,
      status: "open",
      service_vertical: params.serviceVertical ?? null,
      reference_id: params.referenceId ?? null,
      reference_type: params.referenceType ?? null,
      metadata_json: {
        evidence_urls: params.evidenceUrls ?? [],
      },
    })
    .select("*")
    .single();

  if (error) throw error;

  // Auto-alert for critical/high priority
  if (priority === "critical" || priority === "high") {
    await (supabase as any).from("admin_alerts").insert({
      alert_type: "support_ticket_urgent",
      severity: priority,
      status: "open",
      title: `Urgent ticket: ${params.subject}`,
      entity_id: data.id,
      entity_type: "support_ticket",
    });
  }

  return data;
}

/** Resolve a ticket and optionally apply reputation impact */
export async function resolveTicket(params: {
  ticketId: string;
  resolution: string;
  resolutionType: "resolved" | "refunded" | "dismissed" | "escalated";
  reputationImpactUserId?: string;
  reputationDelta?: number;
}) {
  const { data, error } = await (supabase as any)
    .from("support_tickets")
    .update({
      status: params.resolutionType === "escalated" ? "escalated" : "resolved",
      resolution: params.resolution,
      resolved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.ticketId)
    .select("*")
    .single();

  if (error) throw error;

  // If dispute resolved against a user, impact their reputation
  if (params.reputationImpactUserId && params.reputationDelta) {
    await (supabase as any).from("dino_learning_events").insert({
      event_type: "dispute_reputation_impact",
      entity_id: params.reputationImpactUserId,
      entity_type: "user",
      metric: "reputation_delta",
      new_value: params.reputationDelta,
      previous_value: 0,
    });
  }

  return data;
}

/** Get all tickets for a user across all services */
export async function getUserTickets(userId: string) {
  const { data } = await (supabase as any)
    .from("support_tickets")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  return data ?? [];
}

/** Auto-route ticket to correct team based on category */
export function inferPriority(category: TicketCategory): TicketPriority {
  const priorityMap: Record<TicketCategory, TicketPriority> = {
    safety_concern: "critical",
    payment_dispute: "high",
    delivery_problem: "high",
    order_issue: "medium",
    property_complaint: "medium",
    service_quality: "medium",
    account_issue: "low",
    other: "low",
  };
  return priorityMap[category] ?? "medium";
}

/** Add evidence (photo/doc URL) to an existing ticket */
export async function addTicketEvidence(ticketId: string, evidenceUrl: string) {
  const { data: ticket } = await (supabase as any)
    .from("support_tickets")
    .select("metadata_json")
    .eq("id", ticketId)
    .single();

  const existing = (ticket?.metadata_json as any)?.evidence_urls ?? [];
  existing.push(evidenceUrl);

  await (supabase as any)
    .from("support_tickets")
    .update({
      metadata_json: { ...(ticket?.metadata_json ?? {}), evidence_urls: existing },
      updated_at: new Date().toISOString(),
    })
    .eq("id", ticketId);
}
