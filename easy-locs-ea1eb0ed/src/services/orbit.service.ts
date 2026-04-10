import { db } from "./db";


export interface OrbitStatusRow {
  id: string;
  user_id: string;
  text: string;
  emoji: string | null;
  media_url: string | null;
  media_type: string | null;
  visibility: string;
  expires_at: string | null;
  created_at: string;
}

export interface SupportTicketRow {
  id: string;
  user_id: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  category: string | null;
  created_at: string;
  updated_at: string | null;
}

export const orbitService = {
  async postStatus(userId: string, status: Omit<OrbitStatusRow, "id" | "created_at">) {
    const { data, error } = await db("orbit_statuses")
      .insert({ ...status, user_id: userId })
      .select()
      .single() as { data: OrbitStatusRow | null; error: unknown };
    if (error) throw error;
    return data;
  },

  async fetchStatuses(userId: string, limit = 20) {
    const { data, error } = await db("orbit_statuses")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit) as { data: OrbitStatusRow[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async deleteStatus(statusId: string, userId: string) {
    const { error } = await db("orbit_statuses")
      .delete()
      .eq("id", statusId)
      .eq("user_id", userId);
    if (error) throw error;
  },
};

export const supportService = {
  async fetchTickets(userId: string) {
    const { data, error } = await db("support_tickets")
      .select("*")
      .eq("requester_user_id", userId)
      .order("created_at", { ascending: false }) as { data: SupportTicketRow[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async fetchTicketById(ticketId: string, userId: string) {
    const { data, error } = await db("support_tickets")
      .select("*")
      .eq("id", ticketId)
      .eq("requester_user_id", userId)
      .maybeSingle() as { data: SupportTicketRow | null; error: unknown };
    if (error) throw error;
    return data;
  },

  async createTicket(ticket: Omit<SupportTicketRow, "id" | "created_at" | "updated_at">) {
    const { data, error } = await db("support_tickets")
      .insert(ticket)
      .select()
      .single() as { data: SupportTicketRow | null; error: unknown };
    if (error) throw error;
    return data;
  },

  async updateTicket(ticketId: string, userId: string, updates: Partial<SupportTicketRow>) {
    const { error } = await db("support_tickets")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", ticketId)
      .eq("requester_user_id", userId);
    if (error) throw error;
  },
};
