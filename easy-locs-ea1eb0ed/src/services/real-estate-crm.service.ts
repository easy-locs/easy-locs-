import { db } from "./db";
import type { Lead, CrmTask, ViewingRecord, ConversionMetrics, AgentPerformance, LeadSource } from "@/domains/real-estate/crm-types";
import type { LeadStatus } from "@/domains/real-estate/canonical-types";
import type { CurrencyCode } from "@/domains/shared/canonical-types";

type Row = Record<string, unknown>;

function s(r: Row, key: string): string { return (r[key] as string) ?? ""; }
function sOpt(r: Row, key: string): string | undefined { return (r[key] as string) ?? undefined; }
function n(r: Row, key: string): number { return (r[key] as number) ?? 0; }
function arr(r: Row, key: string): string[] { return Array.isArray(r[key]) ? (r[key] as string[]) : []; }

function mapLeadRow(r: Row): Lead {
  return {
    id: s(r, "id"),
    profileId: s(r, "profile_id"),
    name: s(r, "name"),
    email: sOpt(r, "email"),
    phone: sOpt(r, "phone"),
    source: (r.source as LeadSource) ?? "other",
    status: (r.status as LeadStatus) ?? "new",
    assignedAgentId: sOpt(r, "assigned_agent_id"),
    propertyIds: arr(r, "property_ids"),
    budget: r.budget_min != null && r.budget_max != null ? {
      min: n(r, "budget_min"),
      max: n(r, "budget_max"),
      currency: (r.budget_currency as CurrencyCode) ?? "USD",
    } : undefined,
    preferences: r.preferences ? (r.preferences as Lead["preferences"]) : undefined,
    score: n(r, "score"),
    notes: arr(r, "notes"),
    lastContactAt: sOpt(r, "last_contact_at"),
    nextFollowUpAt: sOpt(r, "next_follow_up_at"),
    convertedAt: sOpt(r, "converted_at"),
    createdAt: s(r, "created_at"),
    updatedAt: s(r, "updated_at"),
  };
}

function mapTaskRow(r: Row): CrmTask {
  return {
    id: s(r, "id"),
    leadId: sOpt(r, "lead_id"),
    propertyId: sOpt(r, "property_id"),
    assignedTo: s(r, "assigned_to"),
    type: (r.type as CrmTask["type"]) ?? "other",
    title: s(r, "title"),
    description: sOpt(r, "description"),
    dueDate: s(r, "due_date"),
    priority: (r.priority as CrmTask["priority"]) ?? "medium",
    status: (r.status as CrmTask["status"]) ?? "pending",
    createdAt: s(r, "created_at"),
    completedAt: sOpt(r, "completed_at"),
  };
}

function mapViewingRow(r: Row): ViewingRecord {
  return {
    id: s(r, "id"),
    leadId: s(r, "lead_id"),
    propertyId: s(r, "property_id"),
    agentId: sOpt(r, "agent_id"),
    dateTime: s(r, "date_time"),
    duration: r.duration != null ? (r.duration as number) : undefined,
    status: (r.status as ViewingRecord["status"]) ?? "requested",
    feedback: sOpt(r, "feedback"),
    rating: r.rating != null ? (r.rating as number) : undefined,
    leadInterestLevel: (r.lead_interest_level as ViewingRecord["leadInterestLevel"]) ?? undefined,
    nextAction: sOpt(r, "next_action"),
    createdAt: s(r, "created_at"),
  };
}

export const leadService = {
  async fetchByAgent(agentId: string): Promise<Lead[]> {
    const { data, error } = await db("re_leads")
      .select("*")
      .eq("assigned_agent_id", agentId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(r => mapLeadRow(r as Row));
  },

  async fetchByOrg(orgId: string): Promise<Lead[]> {
    const { data, error } = await db("re_leads")
      .select("*")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(r => mapLeadRow(r as Row));
  },

  async fetchById(leadId: string): Promise<Lead | null> {
    const { data, error } = await db("re_leads")
      .select("*")
      .eq("id", leadId)
      .maybeSingle();
    if (error) throw error;
    return data ? mapLeadRow(data as Row) : null;
  },

  async updateStatus(leadId: string, status: LeadStatus) {
    const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
    if (status === "converted") updates.converted_at = new Date().toISOString();
    const { error } = await db("re_leads")
      .update(updates)
      .eq("id", leadId);
    if (error) throw error;
  },

  async updateScore(leadId: string, score: number) {
    const { error } = await db("re_leads")
      .update({ score, updated_at: new Date().toISOString() })
      .eq("id", leadId);
    if (error) throw error;
  },

  async create(lead: Omit<Lead, "id" | "createdAt" | "updatedAt" | "score">): Promise<Lead | null> {
    const { data, error } = await db("re_leads")
      .insert({
        profile_id: lead.profileId,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        source: lead.source,
        status: lead.status,
        assigned_agent_id: lead.assignedAgentId,
        property_ids: lead.propertyIds,
        budget_min: lead.budget?.min,
        budget_max: lead.budget?.max,
        budget_currency: lead.budget?.currency,
        preferences: lead.preferences,
        notes: lead.notes,
        score: 0,
      })
      .select()
      .single();
    if (error) throw error;
    return data ? mapLeadRow(data as Row) : null;
  },
};

export const crmTaskService = {
  async fetchByAgent(agentId: string): Promise<CrmTask[]> {
    const { data, error } = await db("re_crm_tasks")
      .select("*")
      .eq("assigned_to", agentId)
      .order("due_date", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(r => mapTaskRow(r as Row));
  },

  async fetchByLead(leadId: string): Promise<CrmTask[]> {
    const { data, error } = await db("re_crm_tasks")
      .select("*")
      .eq("lead_id", leadId)
      .order("due_date", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(r => mapTaskRow(r as Row));
  },

  async fetchPending(agentId: string): Promise<CrmTask[]> {
    const { data, error } = await db("re_crm_tasks")
      .select("*")
      .eq("assigned_to", agentId)
      .in("status", ["pending", "in_progress"])
      .order("due_date", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(r => mapTaskRow(r as Row));
  },

  async updateStatus(taskId: string, status: CrmTask["status"]) {
    const updates: Record<string, unknown> = { status };
    if (status === "completed") updates.completed_at = new Date().toISOString();
    const { error } = await db("re_crm_tasks")
      .update(updates)
      .eq("id", taskId);
    if (error) throw error;
  },

  async create(task: Omit<CrmTask, "id" | "createdAt">): Promise<CrmTask | null> {
    const { data, error } = await db("re_crm_tasks")
      .insert({
        lead_id: task.leadId,
        property_id: task.propertyId,
        assigned_to: task.assignedTo,
        type: task.type,
        title: task.title,
        description: task.description,
        due_date: task.dueDate,
        priority: task.priority,
        status: task.status,
      })
      .select()
      .single();
    if (error) throw error;
    return data ? mapTaskRow(data as Row) : null;
  },
};

export const crmViewingService = {
  async fetchByLead(leadId: string): Promise<ViewingRecord[]> {
    const { data, error } = await db("re_viewings")
      .select("*")
      .eq("lead_id", leadId)
      .order("date_time", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(r => mapViewingRow(r as Row));
  },

  async fetchUpcoming(agentId: string): Promise<ViewingRecord[]> {
    const { data, error } = await db("re_viewings")
      .select("*")
      .eq("agent_id", agentId)
      .gte("date_time", new Date().toISOString())
      .in("status", ["requested", "confirmed"])
      .order("date_time", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(r => mapViewingRow(r as Row));
  },
};

export const crmAnalyticsService = {
  async getConversionMetrics(orgId: string): Promise<ConversionMetrics> {
    const { data: leads } = await db("re_leads")
      .select("status, source, created_at, converted_at, last_contact_at")
      .eq("org_id", orgId);

    const allLeads = leads ?? [];
    const totalLeads = allLeads.length;
    const qualified = allLeads.filter((l: Record<string, unknown>) =>
      !["new"].includes(l.status as string)).length;
    const conversions = allLeads.filter((l: Record<string, unknown>) =>
      l.status === "converted").length;

    const leadsBySource: Record<LeadSource, number> = {} as Record<LeadSource, number>;
    const leadsByStage: Record<string, number> = {};

    for (const l of allLeads) {
      const row = l as Record<string, unknown>;
      const src = (row.source as LeadSource) ?? "other";
      leadsBySource[src] = (leadsBySource[src] ?? 0) + 1;
      const stage = (row.status as string) ?? "new";
      leadsByStage[stage] = (leadsByStage[stage] ?? 0) + 1;
    }

    const { count: viewingCount } = await db("re_viewings")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId);

    const { count: completedViewings } = await db("re_viewings")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("status", "completed");

    return {
      totalLeads,
      qualifiedLeads: qualified,
      viewingsScheduled: viewingCount ?? 0,
      viewingsCompleted: completedViewings ?? 0,
      conversions,
      conversionRate: totalLeads > 0 ? Math.round((conversions / totalLeads) * 100) : 0,
      avgResponseTimeHours: 0,
      avgDaysToConvert: 0,
      leadsBySource,
      leadsByStage,
    };
  },

  async getAgentPerformance(agentId: string): Promise<AgentPerformance> {
    const { data: leads } = await db("re_leads")
      .select("status")
      .eq("assigned_agent_id", agentId);

    const allLeads = leads ?? [];
    const conversions = allLeads.filter((l: Record<string, unknown>) =>
      l.status === "converted").length;
    const active = allLeads.filter((l: Record<string, unknown>) =>
      !["converted", "lost"].includes(l.status as string)).length;

    return {
      agentId,
      name: "",
      totalLeads: allLeads.length,
      activeLeads: active,
      conversions,
      conversionRate: allLeads.length > 0 ? Math.round((conversions / allLeads.length) * 100) : 0,
      avgResponseTimeHours: 0,
      viewingsCompleted: 0,
      rating: 0,
      revenue: 0,
      currency: "USD" as CurrencyCode,
    };
  },
};
