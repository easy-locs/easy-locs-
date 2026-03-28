/**
 * useConversationThreads — Central data engine for the Communication Hub.
 * Aggregates ALL conversation sources into a unified ConversationThread[].
 * OPTIMIZED: conversations_v2 + deals + preferences fetched in parallel.
 */
import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { ConversationThread } from "./types";

function normalizeOrbitId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (value.startsWith("orbit_")) return value;
  return null;
}

function normalizeUuid(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null;
}

export function useConversationThreads() {
  const { user, orgId } = useAuth();
  const [threads, setThreads] = useState<ConversationThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ unread: 0, pending_docs: 0, overdue: 0, maintenance: 0 });
  const loadingRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadThreads = useCallback(async () => {
    if (!user?.id || loadingRef.current) {
      setThreads([]);
      setStats({ unread: 0, pending_docs: 0, overdue: 0, maintenance: 0 });
      setLoading(false);
      return;
    }
    loadingRef.current = true;
    setLoading(true);
    const threadMap = new Map<string, ConversationThread>();

    try {
      // ── Parallel fetch: sections 1-6 fire concurrently (only if orgId exists) ──
      const hasOrg = !!orgId;
      const emptyResult = { data: null, error: null, count: null, status: 200, statusText: "OK" };
      const [tenantRes, mBookingRes, cOrderRes, sBookingRes, reLeadRes, guestRes] = await Promise.all([
        hasOrg ? supabase.from("tenants").select("id, name, email, tenant_user_id, property_id, lease_type").eq("org_id", orgId).order("name") : emptyResult,
        hasOrg ? supabase.from("marketplace_bookings").select("id, booker_name, booker_email, booker_phone, status, total_price, currency, service_id, service_date, provider_id").eq("org_id", orgId).order("created_at", { ascending: false }).limit(200) : emptyResult,
        hasOrg ? supabase.from("concierge_orders").select("id, guest_name, guest_email, guest_phone, status, total_price, currency, service_id, service_date, property_label, property_id").eq("org_id", orgId).order("created_at", { ascending: false }).limit(200) : emptyResult,
        hasOrg ? supabase.from("booking_requests").select("id, guest_name, guest_email, guest_phone, status, check_in, check_out, property_id").eq("org_id", orgId).order("created_at", { ascending: false }).limit(200) : emptyResult,
        hasOrg ? supabase.from("real_estate_leads").select("id, name, email, phone, status, message, listing_id, created_at").eq("org_id", orgId).order("created_at", { ascending: false }).limit(200) : emptyResult,
        hasOrg ? supabase.from("guest_sessions").select("id, display_name, email, context_type, context_id, created_at, expires_at").eq("org_id", orgId).order("created_at", { ascending: false }).limit(50).then(r => r, () => emptyResult) : emptyResult,
      ]);

      const tenants = tenantRes.data;
      const mBookings = mBookingRes.data;
      const cOrders = cOrderRes.data;
      const sBookings = sBookingRes.data;
      const reLeads = reLeadRes.data;
      const guestSessions = (guestRes as any).data;

      // ── Parallel sub-lookups for related entities ──
      const propertyIds = (tenants || []).filter(t => t.property_id).map(t => t.property_id!);
      const mSvcIds = [...new Set((mBookings || []).map(b => b.service_id).filter(Boolean))] as string[];
      const cSvcIds = [...new Set((cOrders || []).map(o => o.service_id).filter(Boolean))] as string[];
      const sPropIds = [...new Set((sBookings || []).map(b => b.property_id).filter(Boolean))] as string[];
      const listingIds = [...new Set((reLeads || []).map(l => l.listing_id).filter(Boolean))] as string[];

      const [propRes, mSvcRes, cSvcRes, sPropRes, listingRes] = await Promise.all([
        propertyIds.length > 0 ? supabase.from("properties").select("id, label, country").in("id", propertyIds) : { data: [] },
        mSvcIds.length > 0 ? supabase.from("marketplace_services").select("id, title, country").in("id", mSvcIds) : { data: [] },
        cSvcIds.length > 0 ? supabase.from("concierge_services").select("id, title, country").in("id", cSvcIds) : { data: [] },
        sPropIds.length > 0 ? supabase.from("properties").select("id, label, country").in("id", sPropIds) : { data: [] },
        listingIds.length > 0 ? supabase.from("real_estate_listings").select("id, title, listing_type, country").in("id", listingIds) : { data: [] },
      ]);

      const propertyMap: Record<string, { label: string; country: string }> = Object.fromEntries((propRes.data || []).map(p => [p.id, { label: p.label, country: p.country || "FR" }]));
      const mSvcMap: Record<string, { title: string; country: string }> = Object.fromEntries((mSvcRes.data || []).map(s => [s.id, { title: s.title, country: s.country || "" }]));
      const cSvcMap: Record<string, { title: string; country: string }> = Object.fromEntries((cSvcRes.data || []).map(s => [s.id, { title: s.title, country: s.country || "" }]));
      const sPropMap: Record<string, { label: string; country: string }> = Object.fromEntries((sPropRes.data || []).map(p => [p.id, { label: p.label, country: p.country || "" }]));
      const listingMap: Record<string, { title: string; listing_type: string; country: string }> = Object.fromEntries((listingRes.data || []).map(l => [l.id, { title: l.title, listing_type: l.listing_type, country: l.country || "" }]));

      // ── 1. Tenants ──
      if (tenants) {
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
      if (mBookings?.length) {
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
            serviceTitle: b.service_id ? mSvcMap[b.service_id]?.title : undefined,
            propertyCountry: b.service_id ? mSvcMap[b.service_id]?.country : undefined,
            totalPrice: b.total_price,
            currency: b.currency,
            unreadCount: 0,
          });
        }
      }

      // ── 3. Concierge bookings ──
      if (cOrders?.length) {
        for (const o of cOrders) {
          threadMap.set(`booking-${o.id}`, {
            id: `booking-${o.id}`,
            conversationType: "booking",
            sourceModule: "marketplace",
            contextType: "concierge_booking",
            contextId: o.id,
            name: o.guest_name || "Client",
            email: o.guest_email || null,
            phone: o.guest_phone,
            bookingId: o.id,
            bookingType: "concierge",
            bookingStatus: o.status,
            serviceTitle: o.service_id ? cSvcMap[o.service_id]?.title : undefined,
            propertyLabel: o.property_label || undefined,
            propertyId: o.property_id || undefined,
            totalPrice: o.total_price,
            currency: o.currency,
            unreadCount: 0,
          });
        }
      }

      // ── 4. Seasonal bookings ──
      if (sBookings?.length) {
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
            propertyLabel: b.property_id ? sPropMap[b.property_id]?.label : undefined,
            propertyCountry: b.property_id ? sPropMap[b.property_id]?.country : undefined,
            propertyId: b.property_id || undefined,
            unreadCount: 0,
          });
        }
      }

      // ── 5. Real estate leads ──
      if (reLeads?.length) {
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

      // ── 7+11 MERGED: Fetch ALL conversations_v2 + deals + preferences in PARALLEL ──
      const convQueryBase = (supabase as any)
        .from("conversations_v2")
        .select("*")
        .order("last_message_at", { ascending: false })
        .limit(300);

      const convQueryFinal = hasOrg
        ? convQueryBase.or(`org_id.eq.${orgId},participant_ids.cs.{${user.id}}`)
        : convQueryBase.contains("participant_ids", [user.id]);

      const [convResult, dealResult, prefResult] = await Promise.all([
        convQueryFinal,
        hasOrg
          ? supabase.from("deal_rooms").select("*").eq("org_id", orgId).order("updated_at", { ascending: false }).limit(100)
          : { data: [] },
        user?.id
          ? supabase.from("conversation_preferences").select("context_id, archived, muted, favorited, cleared_at").eq("user_id", user.id)
          : { data: [] },
      ]);

      const allConvs = (convResult as any).data || [];
      const allPeerIds = new Set<string>();

      // ── Process non-direct conversations ──
      for (const ct of allConvs) {
        if (ct.type === "direct") continue;
        const ctxType = ct.context_type || ct.type || "business";
        let convType: "direct" | "business" | "listing" | "team" = "business";
        let srcModule: "direct" | "marketplace" | "team" | "concierge" | "real_estate" = "marketplace";

        if (ctxType === "team") { convType = "team"; srcModule = "team"; }
        else if (ctxType === "listing" || ctxType === "marketplace_service") { convType = "listing"; srcModule = "marketplace"; }
        else if (ctxType === "concierge_service") { convType = "listing"; srcModule = "marketplace"; }
        else if (ctxType === "business" || ctxType === "service") { convType = "business"; srcModule = "marketplace"; }

        const participantUserIds = Array.isArray(ct.participant_ids)
          ? ct.participant_ids.filter((id: unknown): id is string => typeof id === "string" && id.length > 0)
          : [];
        const peerUserId = participantUserIds.find((id) => id !== user?.id) ?? null;
        if (peerUserId) allPeerIds.add(peerUserId);

        const key = `${convType}-${ct.id}`;
        if (!threadMap.has(key)) {
          threadMap.set(key, {
            id: key,
            conversationType: convType,
            sourceModule: srcModule,
            contextType: ctxType,
            contextId: ct.context_id || ct.id,
            name: ct.title || ct.last_message_preview || "Contact",
            email: null,
            threadId: ct.id,
            listingTitle: ct.title || undefined,
            v2ConversationId: ct.id,
            isV2: true,
            peerUserId,
            participantUserIds,
            unreadCount: 0,
            lastMessageTime: ct.last_message_at || ct.updated_at,
          });
        }
      }

      // ── Process direct conversations ──
      for (const conv of allConvs) {
        if (conv.type !== "direct") continue;
        const participants = conv.participants as any[];
        if (!Array.isArray(participants)) continue;
        const normalized = participants
          .map((p: any) => ({
            userId: normalizeUuid(p?.userId) || normalizeUuid(p?.user_id) || normalizeUuid(p?.id) || normalizeUuid(p),
            orbitId: normalizeOrbitId(p?.orbitId) || normalizeOrbitId(p?.orbit_id),
            displayName: typeof p?.displayName === "string" ? p.displayName : typeof p?.display_name === "string" ? p.display_name : typeof p?.name === "string" ? p.name : null,
            email: typeof p?.email === "string" ? p.email : null,
            avatarUrl: typeof p?.avatarUrl === "string" ? p.avatarUrl : typeof p?.avatar_url === "string" ? p.avatar_url : null,
          }))
          .filter((p) => p.userId || p.orbitId);

        const currentParticipant = normalized.find((p) => p.userId === user.id);
        if (!currentParticipant) continue;
        const uniquePeerCandidates = normalized.filter((p) => p.userId !== user.id);
        if (uniquePeerCandidates.length !== 1) continue;
        const peer = uniquePeerCandidates[0];
        if (!peer.userId || peer.userId === user.id) continue;

        allPeerIds.add(peer.userId);
        const v2Key = `v2-direct-${conv.id}`;

        if (!threadMap.has(v2Key)) {
          threadMap.set(v2Key, {
            id: v2Key,
            conversationType: "direct",
            sourceModule: "direct",
            contextType: "direct",
            contextId: conv.id,
            name: peer.displayName || "Contact",
            email: peer.email || null,
            avatarUrl: peer.avatarUrl || null,
            threadId: conv.id,
            v2ConversationId: conv.id,
            isV2: true,
            peerUserId: peer.userId,
            peerOrbitId: peer.orbitId,
            participantUserIds: normalized.map((p) => p.userId).filter(Boolean) as string[],
            unreadCount: 0,
            lastMessage: conv.title || undefined,
            lastMessageTime: conv.last_message_at || conv.created_at,
          });
        }
      }

      // ── Resolve ALL peer profiles in one batch ──
      if (allPeerIds.size > 0) {
        const peerIdArr = Array.from(allPeerIds);
        const [{ data: peerProfiles }, { data: peerOrbitProfiles }] = await Promise.all([
          supabase.from("profiles").select("id, email, first_name, last_name, name").in("id", peerIdArr),
          (supabase as any).from("orbit_profiles_v2").select("id, orbit_id, display_name, avatar_url, email").in("id", peerIdArr),
        ]);

        const profileMap = new Map<string, any>((peerProfiles || []).map((p: any) => [p.id, p]));
        const orbitMap = new Map<string, any>((peerOrbitProfiles || []).map((p: any) => [p.id, p]));

        for (const thread of threadMap.values()) {
          if (!thread.isV2 || !thread.peerUserId) continue;
          const base: any = profileMap.get(thread.peerUserId);
          const orbit: any = orbitMap.get(thread.peerUserId);
          if (!base && !orbit) continue;
          const fullName = [base?.first_name, base?.last_name].filter(Boolean).join(" ").trim();
          thread.name = orbit?.display_name || fullName || base?.name || thread.name || "Contact";
          thread.email = orbit?.email || base?.email || thread.email || null;
          thread.avatarUrl = orbit?.avatar_url || thread.avatarUrl || null;
          thread.peerOrbitId = orbit?.orbit_id || thread.peerOrbitId || null;
        }
      }

      // ── Unread counts for V2 conversations ──
      const v2Ids = Array.from(threadMap.values())
        .filter(t => t.isV2 && t.v2ConversationId)
        .map(t => t.v2ConversationId!);
      
      if (v2Ids.length > 0) {
        const { data: v2Msgs } = await (supabase as any)
          .from("chat_messages_v2")
          .select("conversation_id, sender_user_id, read_at, body, created_at")
          .in("conversation_id", v2Ids)
          .is("read_at", null)
          .neq("sender_user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(500);

        if (v2Msgs?.length) {
          for (const msg of v2Msgs) {
            const key = `v2-direct-${msg.conversation_id}`;
            const thread = threadMap.get(key);
            if (thread) {
              thread.unreadCount++;
              if (!thread.lastMessage) {
                thread.lastMessage = msg.body;
                thread.lastMessageTime = msg.created_at;
              }
            }
          }
        }
      }

      // ── 8. Deal rooms (already fetched in parallel) ──
      const deals = (dealResult as any).data;
      if (deals?.length) {
        for (const deal of deals) {
          if (deal.status === "cancelled") continue;
          const dealKey = `deal-${deal.id}`;

          if (deal.booking_id) {
            const bookingThread = threadMap.get(`booking-${deal.booking_id}`);
            if (bookingThread) { bookingThread.dealId = deal.id; continue; }
          }
          if (deal.context_id && deal.thread_id) {
            let attached = false;
            for (const [, t] of threadMap) {
              if (t.threadId === deal.thread_id || t.contextId === deal.context_id) { t.dealId = deal.id; attached = true; break; }
            }
            if (attached) continue;
          }
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

      // ── Load last messages & unread counts (SCOPED — no global scan) ──
      const allConvIds = Array.from(threadMap.values())
        .filter(t => t.v2ConversationId || t.contextId)
        .map(t => t.v2ConversationId || t.contextId!)
        .filter(Boolean);

      const uniqueConvIds = [...new Set(allConvIds)];
      const allMsgs: any[] = [];

      if (uniqueConvIds.length > 0) {
        const CHUNK = 50;
        const chunks: string[][] = [];
        for (let i = 0; i < uniqueConvIds.length; i += CHUNK) {
          chunks.push(uniqueConvIds.slice(i, i + CHUNK));
        }

        const results = await Promise.all(
          chunks.map(ids =>
            (supabase as any)
              .from("chat_messages_v2")
              .select("conversation_id, body, created_at, sender_user_id, type, metadata, read_at")
              .in("conversation_id", ids)
              .order("created_at", { ascending: false })
              .limit(500)
          )
        );

        const seenKeys = new Set<string>();
        for (const res of results) {
          if (res.data) {
            for (const m of res.data) {
              const key = `${m.conversation_id}-${m.created_at}`;
              if (!seenKeys.has(key)) {
                seenKeys.add(key);
                allMsgs.push(m);
              }
            }
          }
        }
      }

      if (allMsgs.length > 0) {
        const msgByConv = new Map<string, any[]>();
        for (const m of allMsgs) {
          const cid = m.conversation_id;
          if (!cid) continue;
          if (!msgByConv.has(cid)) msgByConv.set(cid, []);
          msgByConv.get(cid)!.push(m);
        }

        for (const [, thread] of threadMap) {
          const convId = thread.v2ConversationId || thread.contextId;
          if (!convId) continue;
          const msgs = msgByConv.get(convId);
          if (!msgs?.length) continue;

          if (!thread.lastMessage) {
            thread.lastMessage = msgs[0].body;
            thread.lastMessageTime = msgs[0].created_at;
          }
          for (const m of msgs) {
            if (!m.read_at && m.sender_user_id !== user?.id) {
              thread.unreadCount++;
            }
          }
        }
      }

      // ── Apply preferences (already fetched in parallel) ──
      const prefs = (prefResult as any).data;
      if (prefs?.length) {
        const prefMap = new Map(prefs.map((p: any) => [p.context_id, p]));
        for (const [, thread] of threadMap) {
          const pref: any = prefMap.get(thread.contextId) || prefMap.get(thread.id);
          if (pref) {
            thread.archived = !!pref.archived;
            thread.muted = !!pref.muted;
            thread.pinned = !!pref.favorited;
            if (pref.cleared_at) {
              thread.clearedAt = pref.cleared_at;
              if (thread.lastMessageTime && thread.lastMessageTime < pref.cleared_at) {
                thread.lastMessage = undefined;
                thread.unreadCount = 0;
              }
            }
          }
        }
      }
    } catch (err) {
      console.error("[comm-threads] loadThreads error:", err);
    }

    // Normalize all thread names to strings — prevents React error #185
    const allThreads = Array.from(threadMap.values()).map(t => ({
      ...t,
      name: typeof t.name === "string" ? t.name : (t.name ? String(t.name) : "Contact"),
    }));

    const sorted = allThreads.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      if (a.unreadCount !== b.unreadCount) return b.unreadCount - a.unreadCount;
      const at = a.lastMessageTime || "";
      const bt = b.lastMessageTime || "";
      return bt.localeCompare(at);
    });

    setThreads(sorted);
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

  // Realtime: refresh threads on conversations/deals/bookings/calls/preferences changes
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel("hub-live");

    if (orgId) {
      channel
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "marketplace_bookings", filter: `org_id=eq.${orgId}` }, () => debouncedReload())
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "concierge_orders", filter: `org_id=eq.${orgId}` }, () => debouncedReload())
        .on("postgres_changes", { event: "*", schema: "public", table: "deal_rooms", filter: `org_id=eq.${orgId}` }, () => debouncedReload());
    }

    channel
      .on("postgres_changes", { event: "*", schema: "public", table: "call_logs" }, () => debouncedReload())
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations_v2" }, () => debouncedReload())
      .on("postgres_changes", { event: "*", schema: "public", table: "conversation_preferences", filter: `user_id=eq.${user.id}` }, () => debouncedReload())
      .subscribe();

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [orgId, user?.id, debouncedReload]);

  const updateThreadLocally = useCallback((threadId: string, updates: Partial<ConversationThread>) => {
    setThreads(prev => {
      const next = prev
        .map(t => t.id === threadId ? { ...t, ...updates } : t)
        .sort((a, b) => {
          if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
          if (a.unreadCount !== b.unreadCount) return b.unreadCount - a.unreadCount;
          const at = a.lastMessageTime || "";
          const bt = b.lastMessageTime || "";
          return bt.localeCompare(at);
        });
      setStats(s => ({ ...s, unread: next.filter(t => !t.archived).reduce((acc, t) => acc + t.unreadCount, 0) }));
      return next;
    });
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
