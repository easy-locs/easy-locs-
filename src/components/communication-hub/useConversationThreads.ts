/**
 * useConversationThreads — Data hook for loading all conversation threads.
 * Aggregates tenants, bookings, leads, guest sessions, and direct threads
 * into a unified ConversationThread[] with unread counts and last messages.
 */
import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { ConversationThread, ConversationType, SourceModule } from "./types";

export function useConversationThreads() {
  const { user, orgId } = useAuth();
  const [threads, setThreads] = useState<ConversationThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ unread: 0, pending_docs: 0, overdue: 0, maintenance: 0 });

  const loadThreads = useCallback(async () => {
    if (!orgId) return;
    const threadMap = new Map<string, ConversationThread>();

    // ── 1. Tenant-based (property management) ──
    const { data: tenants } = await supabase
      .from("tenants")
      .select("id, name, email, tenant_user_id, property_id, lease_type")
      .eq("org_id", orgId)
      .order("name");

    if (tenants) {
      const propertyIds = tenants.filter(t => t.property_id).map(t => t.property_id!);
      let propertyMap: Record<string, { label: string; country: string }> = {};
      if (propertyIds.length > 0) {
        const { data: props } = await supabase.from("properties").select("id, label, country").in("id", propertyIds);
        if (props) propertyMap = Object.fromEntries(props.map(p => [p.id, { label: p.label, country: p.country || "FR" }]));
      }
      for (const t of tenants) {
        threadMap.set(`tenant-${t.id}`, {
          id: `tenant-${t.id}`,
          conversationType: "property",
          sourceModule: "long_term",
          contextType: "tenant",
          contextId: t.id,
          name: t.name,
          email: t.email,
          tenantId: t.id,
          propertyLabel: t.property_id ? propertyMap[t.property_id]?.label : undefined,
          propertyCountry: t.property_id ? propertyMap[t.property_id]?.country : undefined,
          propertyId: t.property_id || undefined,
          unreadCount: 0,
        });
      }
    }

    // ── 2. Marketplace bookings ──
    const { data: mBookings } = await supabase
      .from("marketplace_bookings")
      .select("id, booker_name, booker_email, booker_phone, status, total_price, currency, service_id, service_date")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (mBookings?.length) {
      const svcIds = [...new Set(mBookings.map(b => b.service_id).filter(Boolean))];
      let svcMap: Record<string, { title: string; country: string }> = {};
      if (svcIds.length > 0) {
        const { data: svcs } = await supabase.from("marketplace_services").select("id, title, country").in("id", svcIds);
        if (svcs) svcMap = Object.fromEntries(svcs.map(s => [s.id, { title: s.title, country: s.country || "" }]));
      }
      for (const b of mBookings) {
        threadMap.set(`booking-${b.id}`, {
          id: `booking-${b.id}`,
          conversationType: "booking",
          sourceModule: "marketplace",
          contextType: "marketplace_booking",
          contextId: b.id,
          name: b.booker_name || "Client",
          email: b.booker_email || null,
          phone: b.booker_phone,
          bookingId: b.id,
          bookingType: "marketplace",
          bookingStatus: b.status,
          serviceTitle: b.service_id ? svcMap[b.service_id]?.title : undefined,
          propertyCountry: b.service_id ? svcMap[b.service_id]?.country : undefined,
          totalPrice: b.total_price,
          currency: b.currency,
          unreadCount: 0,
        });
      }
    }

    // ── 3. Concierge bookings ──
    const { data: cOrders } = await supabase
      .from("concierge_orders")
      .select("id, guest_name, guest_email, guest_phone, status, total_price, currency, service_id, service_date, property_label")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (cOrders?.length) {
      const svcIds = [...new Set(cOrders.map(o => o.service_id).filter(Boolean))];
      let svcMap: Record<string, { title: string; country: string }> = {};
      if (svcIds.length > 0) {
        const { data: svcs } = await supabase.from("concierge_services").select("id, title, country").in("id", svcIds);
        if (svcs) svcMap = Object.fromEntries(svcs.map(s => [s.id, { title: s.title, country: s.country || "" }]));
      }
      for (const o of cOrders) {
        threadMap.set(`booking-${o.id}`, {
          id: `booking-${o.id}`,
          conversationType: "booking",
          sourceModule: "concierge",
          contextType: "concierge_booking",
          contextId: o.id,
          name: o.guest_name || "Client",
          email: o.guest_email || null,
          phone: o.guest_phone,
          bookingId: o.id,
          bookingType: "concierge",
          bookingStatus: o.status,
          serviceTitle: o.service_id ? svcMap[o.service_id]?.title : undefined,
          propertyLabel: o.property_label || undefined,
          totalPrice: o.total_price,
          currency: o.currency,
          unreadCount: 0,
        });
      }
    }

    // ── 4. Seasonal bookings ──
    const { data: sBookings } = await supabase
      .from("booking_requests")
      .select("id, guest_name, guest_email, guest_phone, status, check_in, check_out, property_id")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (sBookings?.length) {
      const propIds = [...new Set(sBookings.map(b => b.property_id).filter(Boolean))];
      let propMap: Record<string, { label: string; country: string }> = {};
      if (propIds.length > 0) {
        const { data: props } = await supabase.from("properties").select("id, label, country").in("id", propIds);
        if (props) propMap = Object.fromEntries(props.map(p => [p.id, { label: p.label, country: p.country || "" }]));
      }
      for (const b of sBookings) {
        threadMap.set(`booking-${b.id}`, {
          id: `booking-${b.id}`,
          conversationType: "booking",
          sourceModule: "seasonal",
          contextType: "seasonal_booking",
          contextId: b.id,
          name: b.guest_name || "Guest",
          email: b.guest_email || null,
          phone: b.guest_phone,
          bookingId: b.id,
          bookingType: "seasonal",
          bookingStatus: b.status,
          propertyLabel: b.property_id ? propMap[b.property_id]?.label : undefined,
          propertyCountry: b.property_id ? propMap[b.property_id]?.country : undefined,
          propertyId: b.property_id || undefined,
          unreadCount: 0,
        });
      }
    }

    // ── 5. Real estate leads (listing conversations) ──
    const { data: reLeads } = await supabase
      .from("real_estate_leads")
      .select("id, name, email, phone, status, message, listing_id, created_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (reLeads?.length) {
      const listingIds = [...new Set(reLeads.map(l => l.listing_id).filter(Boolean))];
      let listingMap: Record<string, { title: string; listing_type: string; country: string }> = {};
      if (listingIds.length > 0) {
        const { data: listings } = await supabase.from("real_estate_listings").select("id, title, listing_type, country").in("id", listingIds);
        if (listings) listingMap = Object.fromEntries(listings.map(l => [l.id, { title: l.title, listing_type: l.listing_type, country: l.country || "" }]));
      }
      for (const lead of reLeads) {
        const listing = lead.listing_id ? listingMap[lead.listing_id] : null;
        threadMap.set(`lead-${lead.id}`, {
          id: `lead-${lead.id}`,
          conversationType: "listing",
          sourceModule: "real_estate",
          contextType: "real_estate_lead",
          contextId: lead.id,
          name: lead.name || "Visitor",
          email: lead.email || null,
          phone: lead.phone,
          leadId: lead.id,
          listingTitle: listing?.title,
          listingType: listing?.listing_type,
          propertyCountry: listing?.country,
          bookingStatus: lead.status,
          unreadCount: 0,
          lastMessage: lead.message || undefined,
          lastMessageTime: lead.created_at,
        });
      }
    }

    // ── 6. Guest sessions ──
    const { data: guestSessions } = await supabase
      .from("guest_sessions" as any)
      .select("id, display_name, email, context_type, context_id, created_at, expires_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (guestSessions?.length) {
      for (const gs of guestSessions as any[]) {
        threadMap.set(`guest-${gs.id}`, {
          id: `guest-${gs.id}`,
          conversationType: "business",
          sourceModule: "marketplace",
          contextType: "guest_session",
          contextId: gs.id,
          name: gs.display_name || "Guest",
          email: gs.email || null,
          listingTitle: gs.context_type !== "general" ? gs.context_type : undefined,
          unreadCount: 0,
          lastMessageTime: gs.created_at,
        });
      }
    }

    // ── 7. Direct conversation threads ──
    const { data: directThreads } = await supabase
      .from("conversation_threads")
      .select("*")
      .eq("org_id", orgId)
      .eq("context_type", "direct")
      .order("last_message_at", { ascending: false })
      .limit(50);

    if (directThreads?.length) {
      for (const dt of directThreads) {
        threadMap.set(`direct-${dt.id}`, {
          id: `direct-${dt.id}`,
          conversationType: "direct",
          sourceModule: "direct",
          contextType: "direct",
          contextId: dt.context_id || dt.id,
          name: dt.provider_name || "Contact",
          email: null,
          threadId: dt.id,
          unreadCount: 0,
          lastMessageTime: dt.last_message_at || dt.updated_at,
        });
      }
    }

    // ── 8. Deal rooms as conversation threads ──
    const { data: deals } = await supabase
      .from("deal_rooms")
      .select("*")
      .eq("org_id", orgId)
      .neq("status", "cancelled" as any)
      .order("updated_at", { ascending: false })
      .limit(50);

    if (deals?.length) {
      for (const deal of deals as any[]) {
        const dealKey = `deal-${deal.id}`;
        // Only add if not already represented by a booking thread
        if (!threadMap.has(`booking-${deal.booking_id}`) || !deal.booking_id) {
          threadMap.set(dealKey, {
            id: dealKey,
            conversationType: "deal",
            sourceModule: "marketplace",
            contextType: deal.context_type || "deal",
            contextId: deal.context_id || deal.id,
            name: deal.context_title || "Deal",
            email: null,
            dealId: deal.id,
            bookingStatus: deal.status,
            totalPrice: deal.current_offer_amount || deal.accepted_amount,
            currency: deal.current_offer_currency || "EUR",
            threadId: deal.thread_id,
            unreadCount: 0,
            lastMessageTime: deal.updated_at,
          });
        }
        // Attach deal to existing booking thread
        const bookingThread = deal.booking_id ? threadMap.get(`booking-${deal.booking_id}`) : null;
        if (bookingThread) {
          bookingThread.dealId = deal.id;
        }
      }
    }

    // ── Load unread counts & last messages ──
    const { data: allMsgs } = await supabase
      .from("messages")
      .select("tenant_id, booking_id, content, created_at, read, sender_id, context_type, context_id")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(1000);

    if (allMsgs) {
      for (const m of allMsgs) {
        const ctxKey = (m as any).context_type && (m as any).context_id
          ? `${(m as any).context_type === "real_estate_lead" ? "lead" : (m as any).context_type === "tenant" ? "tenant" : (m as any).context_type === "direct" ? "direct" : "booking"}-${(m as any).context_id}`
          : null;
        const legacyKey = m.booking_id ? `booking-${m.booking_id}` : m.tenant_id ? `tenant-${m.tenant_id}` : null;
        const key = ctxKey || legacyKey;
        if (!key) continue;
        const thread = threadMap.get(key);
        if (!thread) continue;
        if (!thread.lastMessage) {
          thread.lastMessage = m.content;
          thread.lastMessageTime = m.created_at;
        }
        if (!m.read && m.sender_id !== user?.id) {
          thread.unreadCount++;
        }
      }
    }

    const sorted = Array.from(threadMap.values()).sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      if (a.unreadCount !== b.unreadCount) return b.unreadCount - a.unreadCount;
      const at = a.lastMessageTime || "";
      const bt = b.lastMessageTime || "";
      return bt.localeCompare(at);
    });

    setThreads(sorted);
    setStats(s => ({ ...s, unread: sorted.reduce((acc, t) => acc + t.unreadCount, 0) }));
    setLoading(false);
  }, [orgId, user]);

  const loadStats = useCallback(async () => {
    if (!orgId) return;
    const [docRes, overdueRes, maintRes] = await Promise.all([
      supabase.from("document_requests").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("status", "pending"),
      supabase.from("rent_calls").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("paid", false),
      supabase.from("interventions").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("status", "pending"),
    ]);
    setStats(s => ({
      ...s,
      pending_docs: docRes.count || 0,
      overdue: overdueRes.count || 0,
      maintenance: maintRes.count || 0,
    }));
  }, [orgId]);

  useEffect(() => { loadThreads(); loadStats(); }, [loadThreads, loadStats]);

  const updateThreadLocally = useCallback((threadId: string, updates: Partial<ConversationThread>) => {
    setThreads(prev => prev.map(t => t.id === threadId ? { ...t, ...updates } : t));
  }, []);

  return {
    threads,
    setThreads,
    loading,
    stats,
    loadThreads,
    updateThreadLocally,
  };
}
