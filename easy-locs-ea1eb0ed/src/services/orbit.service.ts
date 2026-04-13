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

  async fetchAllActiveStatuses(limit = 100) {
    const now = new Date().toISOString();
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await db("orbit_statuses")
      .select("*")
      .gte("expires_at", now)
      .gte("created_at", cutoff)
      .order("created_at", { ascending: false })
      .limit(limit) as { data: unknown[] | null; error: { code?: string; message?: string } | null };
    if (error) throw error;
    return data ?? [];
  },

  async publishStatus(payload: {
    user_id: string;
    content: string;
    media_url: string | null;
    media_type: "text" | "image" | "video";
    background_color: string;
    expires_at: string;
    view_count: number;
    user_name: string;
    user_avatar: string;
  }) {
    const { error } = await db("orbit_statuses").insert(payload as any);
    if (error) throw error;
  },

  async deleteStatus(statusId: string, userId: string) {
    const { error } = await db("orbit_statuses")
      .delete()
      .eq("id", statusId)
      .eq("user_id", userId);
    if (error) throw error;
  },

  async updateScheduledCallStatus(id: string, status: "completed" | "missed" | "cancelled") {
    await db("scheduled_calls").update({ status }).eq("id", id);
  },

  async uploadStatusMedia(userId: string, file: File): Promise<string> {
    const ext = file.name.split(".").pop() || "bin";
    const path = `statuses/${userId}/${Date.now()}_${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}.${ext}`;
    const { error: uploadErr } = await db.storage
      .from("chat-media")
      .upload(path, file, { contentType: file.type });
    if (uploadErr) throw uploadErr;
    const { data: urlData } = db.storage.from("chat-media").getPublicUrl(path);
    return urlData?.publicUrl ?? "";
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
