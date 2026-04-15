/**
 * thread-mapper — Atomic unit: map raw DB rows into ConversationThread objects.
 * Single responsibility: structural transformation only, no DB calls.
 * 
 * CANONICAL NAMING:
 * - entityType/entityId = business entity (listing, booking, etc.)
 * - conversationId = UUID from conversations_v2
 * - contextType/contextId/v2ConversationId/threadId kept as deprecated compat
 */
import type { ConversationThread } from "@/components/communication-hub/types";
import type { ThreadRawSources } from "./thread-fetcher";

function normalizeOrbitId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return value.startsWith("orbit_") ? value : null;
}

function normalizeUuid(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value : null;
}

/** Helper: create canonical + deprecated fields in one place */
function withCanonicalIds(entityType: string, entityId: string, conversationId?: string) {
  return {
    entityType,
    entityId,
    contextType: entityType,
    contextId: entityId,
    ...(conversationId ? { conversationId, v2ConversationId: conversationId } : {}),
  };
}

export function mapOrgSourcesToThreads(
  sources: ThreadRawSources,
  threadMap: Map<string, ConversationThread>
): void {
  const { tenants, mBookings, cOrders, sBookings, reLeads, guestSessions, propertyMap, mSvcMap, cSvcMap, sPropMap, listingMap } = sources;

  for (const t of tenants) {
    threadMap.set(`tenant-${t.id}`, {
      id: `tenant-${t.id}`, conversationType: "property", sourceModule: "long_term",
      ...withCanonicalIds("tenant", t.id),
      name: t.name, email: t.email,
      tenantId: t.id, propertyLabel: t.property_id ? propertyMap[t.property_id]?.label : undefined,
      propertyCountry: t.property_id ? propertyMap[t.property_id]?.country : undefined,
      propertyId: t.property_id || undefined, unreadCount: 0,
    });
  }

  for (const b of mBookings) {
    threadMap.set(`marketplace-booking-${b.id}`, {
      id: `marketplace-booking-${b.id}`, conversationType: "booking", sourceModule: "marketplace",
      ...withCanonicalIds("marketplace_booking", b.id),
      name: b.booker_name || "Client",
      email: b.booker_email || null, phone: b.booker_phone, bookingId: b.id,
      bookingType: "marketplace", bookingStatus: b.status,
      serviceTitle: b.service_id ? mSvcMap[b.service_id]?.title : undefined,
      propertyCountry: b.service_id ? mSvcMap[b.service_id]?.country : undefined,
      totalPrice: b.total_price, currency: b.currency, unreadCount: 0,
    });
  }

  for (const o of cOrders) {
    threadMap.set(`concierge-booking-${o.id}`, {
      id: `concierge-booking-${o.id}`, conversationType: "booking", sourceModule: "marketplace",
      ...withCanonicalIds("concierge_booking", o.id),
      name: o.guest_name || "Client",
      email: o.guest_email || null, phone: o.guest_phone, bookingId: o.id,
      bookingType: "concierge", bookingStatus: o.status,
      serviceTitle: o.service_id ? cSvcMap[o.service_id]?.title : undefined,
      propertyLabel: o.property_label || undefined, propertyId: o.property_id || undefined,
      totalPrice: o.total_price, currency: o.currency, unreadCount: 0,
    });
  }

  for (const b of sBookings) {
    threadMap.set(`seasonal-booking-${b.id}`, {
      id: `seasonal-booking-${b.id}`, conversationType: "booking", sourceModule: "seasonal",
      ...withCanonicalIds("seasonal_booking", b.id),
      name: b.guest_name || "Guest",
      email: b.guest_email || null, phone: b.guest_phone, bookingId: b.id,
      bookingType: "seasonal", bookingStatus: b.status,
      propertyLabel: b.property_id ? sPropMap[b.property_id]?.label : undefined,
      propertyCountry: b.property_id ? sPropMap[b.property_id]?.country : undefined,
      propertyId: b.property_id || undefined, unreadCount: 0,
    });
  }

  for (const lead of reLeads) {
    const listing = lead.listing_id ? listingMap[lead.listing_id] : null;
    threadMap.set(`lead-${lead.id}`, {
      id: `lead-${lead.id}`, conversationType: "listing", sourceModule: "real_estate",
      ...withCanonicalIds("real_estate_lead", lead.id),
      name: lead.name || "Visitor",
      email: lead.email || null, phone: lead.phone, leadId: lead.id,
      listingTitle: listing?.title, listingType: listing?.listing_type,
      propertyCountry: listing?.country, bookingStatus: lead.status,
      unreadCount: 0, lastMessage: lead.message || undefined, lastMessageTime: lead.created_at,
    });
  }

  for (const gs of guestSessions) {
    threadMap.set(`guest-${gs.id}`, {
      id: `guest-${gs.id}`, conversationType: "business", sourceModule: "marketplace",
      ...withCanonicalIds("guest_session", gs.id),
      name: gs.display_name || "Guest",
      email: gs.email || null,
      listingTitle: gs.context_type !== "general" ? gs.context_type : undefined,
      unreadCount: 0, lastMessageTime: gs.created_at,
    });
  }
}

function findExistingLegacyThread(
  threadMap: Map<string, ConversationThread>,
  contextId: string | undefined,
  convId: string
): [string, ConversationThread] | null {
  if (!contextId) return null;
  const legacyPrefixes = ["marketplace-booking-", "concierge-booking-", "seasonal-booking-", "booking-", "tenant-", "lead-", "guest-"];
  for (const [key, thread] of threadMap) {
    if (!legacyPrefixes.some(p => key.startsWith(p))) continue;
    if (
      thread.entityId === contextId ||
      thread.contextId === contextId ||
      thread.bookingId === contextId ||
      thread.tenantId === contextId ||
      thread.leadId === contextId
    ) {
      return [key, thread];
    }
  }
  return null;
}

function findExistingThreadByNameAndType(
  threadMap: Map<string, ConversationThread>,
  name: string,
  conversationType: string
): [string, ConversationThread] | null {
  const normalizedName = (name || "").trim().toLowerCase();
  if (!normalizedName || normalizedName === "contact" || normalizedName === "client" || normalizedName === "guest") {
    return null;
  }
  for (const [key, thread] of threadMap) {
    if (
      thread.conversationType === conversationType &&
      (thread.name || "").trim().toLowerCase() === normalizedName
    ) {
      return [key, thread];
    }
  }
  return null;
}

function findExistingDirectThread(
  threadMap: Map<string, ConversationThread>,
  peerUserId: string
): [string, ConversationThread] | null {
  for (const [key, thread] of threadMap) {
    if (thread.conversationType === "direct" && thread.peerUserId === peerUserId) {
      return [key, thread];
    }
  }
  return null;
}

export function mapV2ConversationsToThreads(
  allConvs: any[],
  userId: string,
  threadMap: Map<string, ConversationThread>,
  allPeerIds: Set<string>
): void {
  for (const ct of allConvs) {
    if (ct.type === "direct") continue;
    const ctxType = ct.context_type || ct.type || "business";
    let convType: "direct" | "business" | "listing" | "team" = "business";
    let srcModule: "direct" | "marketplace" | "team" | "concierge" | "real_estate" = "marketplace";

    if (ctxType === "team") { convType = "team"; srcModule = "team"; }
    else if (ctxType === "listing" || ctxType === "marketplace_service") { convType = "listing"; srcModule = "marketplace"; }
    else if (ctxType === "concierge_service") { convType = "listing"; srcModule = "marketplace"; }
    else if (ctxType === "business" || ctxType === "service") { convType = "business"; srcModule = "marketplace"; }

    const participantsJsonb = Array.isArray(ct.participants)
      ? ct.participants.map((p: any) => p?.userId || p?.user_id || p?.id).filter(Boolean) : [];
    const participantUserIds = Array.isArray(ct.participant_ids)
      ? ct.participant_ids.filter((id: unknown): id is string => typeof id === "string" && id.length > 0) : [];
    const metadataDirectIds = Array.isArray(ct.metadata?.direct_user_ids)
      ? ct.metadata.direct_user_ids.filter((id: unknown): id is string => typeof id === "string" && id.length > 0) : [];
    const mergedParticipantIds = [...new Set([...participantUserIds, ...participantsJsonb, ...metadataDirectIds])];
    const peerUserId = mergedParticipantIds.find((id) => id !== userId) ?? null;
    if (peerUserId) allPeerIds.add(peerUserId);

    const existing = findExistingLegacyThread(threadMap, ct.context_id, ct.id);
    if (existing) {
      const [, legacyThread] = existing;
      legacyThread.conversationId = ct.id;
      legacyThread.v2ConversationId = ct.id;
      legacyThread.threadId = ct.id;
      legacyThread.isV2 = true;
      if (peerUserId) legacyThread.peerUserId = peerUserId;
      legacyThread.participantUserIds = mergedParticipantIds;
      if (ct.last_message_at) {
        legacyThread.lastMessageTime = legacyThread.lastMessageTime && legacyThread.lastMessageTime > ct.last_message_at
          ? legacyThread.lastMessageTime : ct.last_message_at;
      }
      if (ct.last_message_preview && !legacyThread.lastMessage) {
        legacyThread.lastMessage = ct.last_message_preview;
      }
      continue;
    }

    const incomingName = ct.title || ct.last_message_preview || "Contact";
    const nameMatch = ct.title ? findExistingThreadByNameAndType(threadMap, ct.title, convType) : null;
    if (nameMatch) {
      const [, matchedThread] = nameMatch;
      if (!matchedThread.conversationId) {
        matchedThread.conversationId = ct.id;
        matchedThread.v2ConversationId = ct.id;
        matchedThread.threadId = ct.id;
      } else {
        const merged = new Set<string>(matchedThread.mergedConversationIds || []);
        if (matchedThread.conversationId) merged.add(matchedThread.conversationId);
        merged.add(ct.id);
        matchedThread.mergedConversationIds = Array.from(merged);
      }
      matchedThread.isV2 = true;
      if (peerUserId && !matchedThread.peerUserId) matchedThread.peerUserId = peerUserId;
      if (mergedParticipantIds.length > 0) matchedThread.participantUserIds = mergedParticipantIds;
      if (ct.last_message_at) {
        matchedThread.lastMessageTime = matchedThread.lastMessageTime && matchedThread.lastMessageTime > ct.last_message_at
          ? matchedThread.lastMessageTime : ct.last_message_at;
      }
      if (ct.last_message_preview && !matchedThread.lastMessage) {
        matchedThread.lastMessage = ct.last_message_preview;
      }
      continue;
    }

    const key = `${convType}-${ct.id}`;
    if (!threadMap.has(key)) {
      threadMap.set(key, {
        id: key, conversationType: convType, sourceModule: srcModule as any,
        ...withCanonicalIds(ctxType, ct.context_id || ct.id, ct.id),
        name: incomingName, email: null,
        threadId: ct.id, listingTitle: ct.title || undefined,
        isV2: true, peerUserId,
        participantUserIds: mergedParticipantIds, unreadCount: 0,
        lastMessageTime: ct.last_message_at || ct.updated_at,
      });
    }
  }

  // Direct conversations
  for (const conv of allConvs) {
    if (conv.type !== "direct") continue;
    const participants = conv.participants as any[];
    if (!Array.isArray(participants) || participants.length === 0) {
      const candidateIds = Array.isArray(conv.participant_ids) && conv.participant_ids.length >= 2
        ? conv.participant_ids
        : Array.isArray(conv.metadata?.direct_user_ids) && conv.metadata.direct_user_ids.length >= 2
          ? conv.metadata.direct_user_ids
          : null;

      if (candidateIds) {
        const peerUserId = candidateIds.find((id: string) => id !== userId);
        if (peerUserId) {
          allPeerIds.add(peerUserId);
          const existingDirect = findExistingDirectThread(threadMap, peerUserId);
          if (existingDirect) {
            const [, existing] = existingDirect;
            existing.isV2 = true;
            const incomingTime = conv.last_message_at || conv.created_at;
            if (incomingTime && (!existing.lastMessageTime || incomingTime > existing.lastMessageTime)) {
              existing.conversationId = conv.id;
              existing.v2ConversationId = conv.id;
              existing.threadId = conv.id;
              existing.lastMessageTime = incomingTime;
            }
            if (conv.last_message_preview && !existing.lastMessage) {
              existing.lastMessage = conv.last_message_preview;
            }
          } else {
            const v2Key = `v2-direct-${conv.id}`;
            if (!threadMap.has(v2Key)) {
              threadMap.set(v2Key, {
                id: v2Key, conversationType: "direct", sourceModule: "direct",
                ...withCanonicalIds("direct", conv.id, conv.id),
                name: conv.title || "Contact", email: null,
                avatarUrl: null, threadId: conv.id,
                isV2: true, peerUserId,
                peerOrbitId: null, participantUserIds: candidateIds,
                unreadCount: 0, lastMessage: conv.last_message_preview || undefined,
                lastMessageTime: conv.last_message_at || conv.created_at,
              });
            }
          }
        }
      }
      continue;
    }
    const normalized = participants
      .map((p: any) => ({
        userId: normalizeUuid(p?.userId) || normalizeUuid(p?.user_id) || normalizeUuid(p?.id) || normalizeUuid(p),
        orbitId: normalizeOrbitId(p?.orbitId) || normalizeOrbitId(p?.orbit_id),
        displayName: typeof p?.displayName === "string" ? p.displayName : typeof p?.display_name === "string" ? p.display_name : typeof p?.name === "string" ? p.name : null,
        email: typeof p?.email === "string" ? p.email : null,
        avatarUrl: typeof p?.avatarUrl === "string" ? p.avatarUrl : typeof p?.avatar_url === "string" ? p.avatar_url : null,
      }))
      .filter((p) => p.userId || p.orbitId);

    const currentParticipant = normalized.find((p) => p.userId === userId);
    if (!currentParticipant) continue;
    const uniquePeerCandidates = normalized.filter((p) => p.userId !== userId);
    if (uniquePeerCandidates.length !== 1) continue;
    const peer = uniquePeerCandidates[0];
    if (!peer.userId || peer.userId === userId) continue;

    allPeerIds.add(peer.userId);
    const existingDirect = findExistingDirectThread(threadMap, peer.userId);
    if (existingDirect) {
      const [, existing] = existingDirect;
      existing.isV2 = true;
      if (peer.displayName && existing.name === "Contact") existing.name = peer.displayName;
      if (peer.email && !existing.email) existing.email = peer.email;
      if (peer.avatarUrl && !existing.avatarUrl) existing.avatarUrl = peer.avatarUrl;
      if (peer.orbitId && !existing.peerOrbitId) existing.peerOrbitId = peer.orbitId;
      existing.participantUserIds = normalized.map((p) => p.userId).filter(Boolean) as string[];
      const incomingTime = conv.last_message_at || conv.created_at;
      if (incomingTime && (!existing.lastMessageTime || incomingTime > existing.lastMessageTime)) {
        existing.conversationId = conv.id;
        existing.v2ConversationId = conv.id;
        existing.threadId = conv.id;
        existing.lastMessageTime = incomingTime;
      }
    } else {
      const v2Key = `v2-direct-${conv.id}`;
      if (!threadMap.has(v2Key)) {
        threadMap.set(v2Key, {
          id: v2Key, conversationType: "direct", sourceModule: "direct",
          ...withCanonicalIds("direct", conv.id, conv.id),
          name: peer.displayName || "Contact", email: peer.email || null,
          avatarUrl: peer.avatarUrl || null, threadId: conv.id,
          isV2: true, peerUserId: peer.userId,
          peerOrbitId: peer.orbitId, participantUserIds: normalized.map((p) => p.userId).filter(Boolean) as string[],
          unreadCount: 0, lastMessage: conv.title || undefined,
          lastMessageTime: conv.last_message_at || conv.created_at,
        });
      }
    }
  }
}

export function mapDealsToThreads(
  deals: any[],
  threadMap: Map<string, ConversationThread>
): void {
  for (const deal of deals) {
    if (deal.status === "cancelled") continue;
    const dealKey = `deal-${deal.id}`;

    if (deal.booking_id) {
      const bookingThread =
        threadMap.get(`marketplace-booking-${deal.booking_id}`) ||
        threadMap.get(`concierge-booking-${deal.booking_id}`) ||
        threadMap.get(`seasonal-booking-${deal.booking_id}`) ||
        threadMap.get(`booking-${deal.booking_id}`);
      if (bookingThread) { bookingThread.dealId = deal.id; continue; }
    }

    if (deal.thread_id || deal.context_id) {
      let attached = false;
      for (const [, t] of threadMap) {
        if (
          (deal.thread_id && t.threadId === deal.thread_id) ||
          (deal.thread_id && t.conversationId === deal.thread_id) ||
          (deal.context_id && t.entityId === deal.context_id) ||
          (deal.context_id && t.contextId === deal.context_id)
        ) {
          t.dealId = deal.id;
          attached = true;
          break;
        }
      }
      if (attached) continue;
    }

    if (!threadMap.has(dealKey)) {
      threadMap.set(dealKey, {
        id: dealKey, conversationType: "deal", sourceModule: "marketplace",
        ...withCanonicalIds(deal.context_type || "deal", deal.context_id || deal.id),
        name: deal.context_title || "Deal", email: null, dealId: deal.id,
        bookingStatus: deal.status, totalPrice: deal.current_offer_amount || deal.accepted_amount || undefined,
        currency: deal.current_offer_currency || "EUR", threadId: deal.thread_id || undefined,
        unreadCount: 0, lastMessageTime: deal.updated_at,
      });
    }
  }
}

export function deduplicateByPeerUserId(
  threadMap: Map<string, ConversationThread>
): void {
  const peerIndex = new Map<string, string>();
  const removals: string[] = [];

  for (const [key, thread] of threadMap) {
    if (!thread.peerUserId) continue;
    const existing = peerIndex.get(thread.peerUserId);
    if (!existing) {
      peerIndex.set(thread.peerUserId, key);
      continue;
    }
    const existingThread = threadMap.get(existing)!;
    const existingTime = existingThread.lastMessageTime || "";
    const currentTime = thread.lastMessageTime || "";
    const [winner, loser] = currentTime > existingTime ? [thread, existingThread] : [existingThread, thread];

    existingThread.lastMessageTime = winner.lastMessageTime;
    existingThread.lastMessage = winner.lastMessage || loser.lastMessage;
    existingThread.lastMessagePreview = winner.lastMessagePreview || loser.lastMessagePreview;

    if (!existingThread.conversationId && (winner.conversationId || loser.conversationId)) {
      existingThread.conversationId = winner.conversationId || loser.conversationId;
      existingThread.v2ConversationId = existingThread.conversationId;
      existingThread.threadId = existingThread.conversationId;
    }

    const bestName = [winner.name, loser.name].find(n => n && n !== "Contact");
    if (bestName) existingThread.name = bestName;
    existingThread.avatarUrl = winner.avatarUrl || loser.avatarUrl || existingThread.avatarUrl;
    existingThread.email = winner.email || loser.email || existingThread.email;
    existingThread.phone = winner.phone || loser.phone || existingThread.phone;
    existingThread.isV2 = existingThread.isV2 || thread.isV2;
    existingThread.unreadCount = Math.max(existingThread.unreadCount || 0, thread.unreadCount || 0);

    const merged = new Set<string>(existingThread.mergedConversationIds || []);
    if (thread.conversationId) merged.add(thread.conversationId);
    if (existingThread.conversationId && existingThread.conversationId !== thread.conversationId) merged.add(existingThread.conversationId);
    if (thread.mergedConversationIds) thread.mergedConversationIds.forEach(id => merged.add(id));
    if (merged.size > 0) existingThread.mergedConversationIds = Array.from(merged);
    removals.push(key);
  }

  const nameIndex = new Map<string, string>();
  for (const [key, thread] of threadMap) {
    if (thread.peerUserId) continue;
    if (thread.conversationType !== "direct") continue;
    const norm = (thread.name || "").trim().toLowerCase();
    if (!norm || norm === "contact") continue;
    const emailNorm = thread.email ? thread.email.toLowerCase().trim() : "";
    const phoneNorm = thread.phone ? thread.phone.replace(/\D/g, "") : "";
    if (!emailNorm && !phoneNorm) continue;
    const contactSig = emailNorm || phoneNorm;
    const nameKey = `name::${norm}::${contactSig}`;
    const existing = nameIndex.get(nameKey);
    if (!existing) {
      nameIndex.set(nameKey, key);
      continue;
    }
    const existingThread = threadMap.get(existing)!;
    const existingTime = existingThread.lastMessageTime || "";
    const currentTime = thread.lastMessageTime || "";
    const [winner, loser] = currentTime > existingTime ? [thread, existingThread] : [existingThread, thread];
    existingThread.lastMessageTime = winner.lastMessageTime;
    existingThread.lastMessage = winner.lastMessage || loser.lastMessage;
    existingThread.lastMessagePreview = winner.lastMessagePreview || loser.lastMessagePreview;
    existingThread.avatarUrl = winner.avatarUrl || loser.avatarUrl || existingThread.avatarUrl;
    existingThread.email = winner.email || loser.email || existingThread.email;
    existingThread.phone = winner.phone || loser.phone || existingThread.phone;
    existingThread.isV2 = existingThread.isV2 || thread.isV2;
    existingThread.unreadCount = Math.max(existingThread.unreadCount || 0, thread.unreadCount || 0);
    if (!existingThread.conversationId && thread.conversationId) {
      existingThread.conversationId = thread.conversationId;
      existingThread.v2ConversationId = thread.conversationId;
      existingThread.threadId = thread.conversationId;
    }
    const merged = new Set<string>(existingThread.mergedConversationIds || []);
    if (thread.conversationId) merged.add(thread.conversationId);
    if (thread.mergedConversationIds) thread.mergedConversationIds.forEach(id => merged.add(id));
    if (merged.size > 0) existingThread.mergedConversationIds = Array.from(merged);
    removals.push(key);
  }

  if (removals.length > 0) {
    console.log(`[thread-mapper] Cross-type dedup removed ${removals.length} duplicate(s)`);
    for (const key of removals) threadMap.delete(key);
  }
}
