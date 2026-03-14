/**
 * useConversationThreads — Central data engine for the Communication Hub.
 * Aggregates ALL conversation sources into a unified ConversationThread[]:
 * 1. Property management (tenants)
 * 2. Marketplace bookings
 * 3. Concierge bookings
 * 4. Seasonal bookings
 * 5. Real estate leads (listing inquiries)
 * 6. Guest sessions (anonymous visitors)
 * 7. Direct conversations (user ↔ user)
 * 8. Deal rooms
 * 9. Marketplace listing inquiries (conversation_threads)
 * 10. Business/service conversations (conversation_threads)
 *
 * Includes realtime subscription for live updates with debounce.
 */
import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { ConversationThread } from "./types";

export function useConversationThreads() {
  const { user, orgId } = useAuth();
  const [threads, setThreads] = useState<ConversationThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ unread: 0, pending_docs: 0, overdue: 0, maintenance: 0 });
  const loadingRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadThreads = useCallback(async () => {
    if (!orgId || loadingRef.current) { setLoading(false); return; }
    loadingRef.current = true;
    setLoading(true);
    const threadMap = new Map<string, ConversationThread>();

    try {
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
        .select("id, booker_name, booker_email, booker_phone, status, total_price, currency, service_id, service_date, provider_id")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(200);

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
        .select("id, guest_name, guest_email, guest_phone, status, total_price, currency, service_id, service_date, property_label, property_id")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(200);

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
            propertyId: o.property_id || undefined,
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
        .limit(200);

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
        .limit(200);

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
      try {
        const { data: guestSessions } = await supabase
          .from("guest_sessions")
          .select("id, display_name, email, context_type, context_id, created_at, expires_at")
          .eq("org_id", orgId)
          .order("created_at", { ascending: false })
          .limit(50);

        if (guestSessions?.length) {
          for (const gs of guestSessions) {
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
      } catch (e) {
        console.warn("[comm-threads] guest_sessions query failed:", e);
      }

      // ── 7. Conversation threads table (direct, listing, business, team) ──
      try {
        // Query threads owned by this org OR where current user is a participant (cross-org direct threads)
        const { data: convThreads } = await supabase
          .from("conversation_threads")
          .select("*")
          .or(`org_id.eq.${orgId}${user?.id ? `,participant_ids.cs.{${user.id}}` : ""}`)
          .order("last_message_at", { ascending: false })
          .limit(200);

        if (convThreads?.length) {
        for (const ct of convThreads) {
            const ctxType = ct.context_type || "direct";
            let convType: "direct" | "business" | "listing" | "team" = "direct";
            let srcModule: "direct" | "marketplace" | "team" | "concierge" | "real_estate" = "direct";

            if (ctxType === "direct") { convType = "direct"; srcModule = "direct"; }
            else if (ctxType === "team") { convType = "team"; srcModule = "team"; }
            else if (ctxType === "listing" || ctxType === "marketplace_service") { convType = "listing"; srcModule = "marketplace"; }
            else if (ctxType === "concierge_service") { convType = "listing"; srcModule = "concierge"; }
            else if (ctxType === "business" || ctxType === "service") { convType = "business"; srcModule = "marketplace"; }

            const key = `${convType}-${ct.id}`;
            if (!threadMap.has(key)) {
              threadMap.set(key, {
                id: key,
                conversationType: convType,
                sourceModule,
                contextType: ctxType,
                contextId: ct.context_id || ct.id,
                name: ct.provider_name || ct.listing_title || "Contact",
                email: null,
                threadId: ct.id,
                listingTitle: ct.listing_title || undefined,
                unreadCount: 0,
                lastMessageTime: ct.last_message_at || ct.updated_at,
              });
            }
          }
        }
      } catch (e) {
        console.warn("[comm-threads] conversation_threads query failed:", e);
      }

      // ── 8. Deal rooms ──
      try {
        const { data: deals } = await supabase
          .from("deal_rooms")
          .select("*")
          .eq("org_id", orgId)
          .order("updated_at", { ascending: false })
          .limit(100);

        if (deals?.length) {
          for (const deal of deals) {
            if (deal.status === "cancelled") continue;
            const dealKey = `deal-${deal.id}`;

            // Attach deal to existing booking thread if booking_id matches
            if (deal.booking_id) {
              const bookingThread = threadMap.get(`booking-${deal.booking_id}`);
              if (bookingThread) {
                bookingThread.dealId = deal.id;
                continue;
              }
            }

            // Attach deal to listing thread via context_id
            if (deal.context_id && deal.thread_id) {
              let attached = false;
              for (const [, t] of threadMap) {
                if (t.threadId === deal.thread_id || t.contextId === deal.context_id) {
                  t.dealId = deal.id;
                  attached = true;
                  break;
                }
              }
              if (attached) continue;
            }

            // Create standalone deal thread only if not already represented
            if (!threadMap.has(dealKey)) {
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
                totalPrice: deal.current_offer_amount || deal.accepted_amount || undefined,
                currency: deal.current_offer_currency || "EUR",
                threadId: deal.thread_id || undefined,
                unreadCount: 0,
                lastMessageTime: deal.updated_at,
              });
            }
          }
        }
      } catch (e) {
        console.warn("[comm-threads] deal_rooms query failed:", e);
      }

      // ── Load unread counts & last messages ──
      // Fetch org messages + direct messages where current user is sender/receiver
      const directContextIds = Array.from(threadMap.values())
        .filter(t => t.conversationType === "direct" && t.contextId)
        .map(t => t.contextId!);

      const msgQueries = [
        supabase
          .from("messages")
          .select("tenant_id, booking_id, content, created_at, read, sender_id, context_type, context_id, thread_id, guest_session_id")
          .eq("org_id", orgId)
          .order("created_at", { ascending: false })
          .limit(1000),
      ];

      // Also fetch direct messages that may be in a different org
      if (directContextIds.length > 0) {
        msgQueries.push(
          supabase
            .from("messages")
            .select("tenant_id, booking_id, content, created_at, read, sender_id, context_type, context_id, thread_id, guest_session_id")
            .eq("context_type", "direct")
            .in("context_id", directContextIds)
            .order("created_at", { ascending: false })
            .limit(500)
        );
      }

      const msgResults = await Promise.all(msgQueries);
      // Merge and deduplicate by combining both result sets
      const seenMsgIds = new Set<string>();
      const allMsgs: typeof msgResults[0]["data"] = [];
      for (const res of msgResults) {
        if (res.data) {
          for (const m of res.data) {
            const key = `${m.context_id}-${m.created_at}-${m.sender_id}`;
            if (!seenMsgIds.has(key)) {
              seenMsgIds.add(key);
              allMsgs.push(m);
            }
          }
        }
      }

      if (allMsgs.length > 0) {
        for (const m of allMsgs) {
          let key: string | null = null;

          if (m.context_type && m.context_id) {
            if (m.context_type === "real_estate_lead") key = `lead-${m.context_id}`;
            else if (m.context_type === "tenant") key = `tenant-${m.context_id}`;
            else if (m.context_type === "direct") {
              for (const [k, t] of threadMap) {
                if (t.conversationType === "direct" && (t.contextId === m.context_id || t.threadId === m.thread_id)) {
                  key = k; break;
                }
              }
            }
            else if (m.context_type === "guest_session") key = `guest-${m.context_id}`;
            else if (["marketplace_booking", "concierge_booking", "seasonal_booking", "booking"].includes(m.context_type)) key = `booking-${m.context_id}`;
          } else if (m.guest_session_id) {
            key = `guest-${m.guest_session_id}`;
          } else if (m.booking_id) {
            key = `booking-${m.booking_id}`;
          } else if (m.tenant_id) {
            key = `tenant-${m.tenant_id}`;
          }

          // Also try thread_id matching
          if (!key && m.thread_id) {
            for (const [k, t] of threadMap) {
              if (t.threadId === m.thread_id) {
                key = k; break;
              }
            }
          }

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
    } catch (err) {
      console.error("[comm-threads] loadThreads error:", err);
    }

    // ── Load user preferences (archive, mute) ──
    try {
      if (user?.id) {
        const { data: prefs } = await supabase
          .from("conversation_preferences")
          .select("context_id, archived, muted, favorited, cleared_at")
          .eq("user_id", user.id);

        if (prefs?.length) {
          const prefMap = new Map(prefs.map((p: any) => [p.context_id, p]));
          for (const [, thread] of threadMap) {
            const pref = prefMap.get(thread.contextId) || prefMap.get(thread.id);
            if (pref) {
              thread.archived = !!pref.archived;
              thread.muted = !!pref.muted;
              thread.pinned = !!pref.favorited;
              // Store cleared_at for chat panel filtering
              if (pref.cleared_at) {
                thread.clearedAt = pref.cleared_at;
                // Hide messages before cleared_at in thread list preview
                if (thread.lastMessageTime && thread.lastMessageTime < pref.cleared_at) {
                  thread.lastMessage = undefined;
                  thread.unreadCount = 0;
                }
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn("[comm-threads] preferences load failed:", e);
    }

    // Filter out deleted (archived + muted) threads from non-archived views
    const allThreads = Array.from(threadMap.values());

    const sorted = allThreads.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      if (a.unreadCount !== b.unreadCount) return b.unreadCount - a.unreadCount;
      const at = a.lastMessageTime || "";
      const bt = b.lastMessageTime || "";
      return bt.localeCompare(at);
    });

    setThreads(sorted);
    // Only count unread from non-archived threads
    setStats(s => ({ ...s, unread: sorted.filter(t => !t.archived).reduce((acc, t) => acc + t.unreadCount, 0) }));
    setLoading(false);
    loadingRef.current = false;
  }, [orgId, user]);

  const loadStats = useCallback(async () => {
    if (!orgId) return;
    try {
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
    } catch (e) {
      console.warn("[comm-threads] loadStats error:", e);
    }
  }, [orgId]);

  // Initial load
  useEffect(() => { loadThreads(); loadStats(); }, [loadThreads, loadStats]);

  // Debounced reload for realtime events
  const debouncedReload = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void Promise.all([loadThreads(), loadStats()]);
    }, 800);
  }, [loadThreads, loadStats]);

  // Realtime: refresh threads on messages/threads/deals/bookings/calls (+ caller + callee)
  useEffect(() => {
    if (!orgId || !user?.id) return;
    const channel = supabase
      .channel("hub-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `org_id=eq.${orgId}` }, () => {
        debouncedReload();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "marketplace_bookings", filter: `org_id=eq.${orgId}` }, () => {
        debouncedReload();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "concierge_orders", filter: `org_id=eq.${orgId}` }, () => {
        debouncedReload();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "deal_rooms", filter: `org_id=eq.${orgId}` }, () => {
        debouncedReload();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "call_logs", filter: `callee_org_id=eq.${orgId}` }, () => {
        debouncedReload();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "call_logs", filter: `caller_id=eq.${user.id}` }, () => {
        debouncedReload();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "conversation_threads", filter: `org_id=eq.${orgId}` }, () => {
        debouncedReload();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "conversation_preferences", filter: `user_id=eq.${user.id}` }, () => {
        debouncedReload();
      })
      .subscribe();

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [orgId, user?.id, debouncedReload]);

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
