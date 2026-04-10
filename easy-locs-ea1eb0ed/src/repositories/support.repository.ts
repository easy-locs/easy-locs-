/**
 * Support Repository — Canonical DB access for support/SAV tables.
 * All support_tickets + support_ticket_messages writes route here.
 */
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export const supportRepo = {
  tickets: {
    insert(payload: Record<string, unknown>) {
      return db("support_tickets").insert(payload).select("*").single();
    },
    update(id: string, payload: Record<string, unknown>) {
      return db("support_tickets").update(payload).eq("id", id);
    },
    listOpen(limit = 200) {
      return db("support_tickets")
        .select("id, sla_deadline, status, priority")
        .in("status", ["open", "in_progress"])
        .not("sla_deadline", "is", null)
        .limit(limit);
    },
  },
  messages: {
    insert(payload: Record<string, unknown>) {
      return db("support_ticket_messages").insert(payload);
    },
  },
};

export const storefrontSupportRepo = {
  tickets: {
    list(shopId: string, customerId?: string) {
      const q = db("storefront_support_tickets")
        .select("*").eq("shop_id", shopId).order("created_at", { ascending: false });
      if (customerId) q.eq("customer_id", customerId);
      return q;
    },
    insert(payload: Record<string, unknown>) {
      return db("storefront_support_tickets").insert(payload).select("*").single();
    },
    update(id: string, payload: Record<string, unknown>) {
      return db("storefront_support_tickets").update(payload).eq("id", id);
    },
  },
  messages: {
    list(ticketId: string) {
      return db("storefront_ticket_messages")
        .select("*").eq("ticket_id", ticketId).order("created_at", { ascending: true });
    },
    insert(payload: Record<string, unknown>) {
      return db("storefront_ticket_messages").insert(payload);
    },
  },
  faq: {
    list(shopId: string) {
      return db("storefront_faq")
        .select("*").eq("shop_id", shopId).order("sort_order", { ascending: true });
    },
    insert(payload: Record<string, unknown>) {
      return db("storefront_faq").insert(payload).select("*").single();
    },
    update(id: string, payload: Record<string, unknown>) {
      return db("storefront_faq").update(payload).eq("id", id);
    },
  },
};
