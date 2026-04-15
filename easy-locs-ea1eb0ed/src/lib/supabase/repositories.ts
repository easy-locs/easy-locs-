import { domainDb, db } from "@/services/db";
import type {
  OrbitProfile,
  WalletStateModel,
  WalletTransaction,
  PropertyListingV2,
  BookingRecordV2,
  ConversationRecord,
  ChatMessageRecord,
  PropertyUnitManagement,
  LeaseRecord,
  RentPaymentRecord,
} from "@/domains/shared/canonical-types";

interface ProfileRow {
  id: string;
  orbit_id: string | null;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  city: string | null;
  bio: string | null;
  language: string | null;
  currency: string | null;
  created_at: string;
  updated_at: string;
}

function mapProfileRowToOrbit(row: ProfileRow): OrbitProfile {
  return {
    userId: row.id,
    orbitId: row.orbit_id ?? row.id,
    displayName: row.name ?? [row.first_name, row.last_name].filter(Boolean).join(" ") ?? "",
    avatarUrl: row.avatar_url ?? null,
    email: row.email ?? null,
    phone: row.phone ?? null,
    country: row.country ?? null,
    city: row.city ?? null,
    bio: row.bio ?? null,
    language: row.language ?? "en",
    currency: row.currency ?? "USD",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  } as OrbitProfile;
}

function mapOrbitToProfileRow(profile: OrbitProfile): Record<string, unknown> {
  return {
    id: profile.userId,
    orbit_id: profile.orbitId,
    name: profile.displayName,
    avatar_url: profile.avatarUrl,
    email: profile.email,
    phone: profile.phone,
    country: profile.country,
    city: profile.city,
    bio: profile.bio,
    language: profile.language,
    currency: profile.currency,
  };
}

export const orbitRepo = {
  async getByOrbitId(orbitId: string): Promise<OrbitProfile | null> {
    const { data, error } = await domainDb.identity
      .from("profiles")
      .select("*")
      .eq("orbit_id", orbitId)
      .maybeSingle();
    if (error) {
      console.warn("[orbitRepo] getByOrbitId error:", error.message);
      return null;
    }
    if (!data) return null;
    return mapProfileRowToOrbit(data as ProfileRow);
  },

  async upsert(profile: OrbitProfile): Promise<OrbitProfile> {
    const { data, error } = await domainDb.identity
      .from("profiles")
      .upsert(mapOrbitToProfileRow(profile), { onConflict: "id" })
      .select()
      .single();
    if (error) throw error;
    return mapProfileRowToOrbit(data as ProfileRow);
  },
};

export const walletRepo = {
  async getByOwnerOrbitId(ownerOrbitId: string): Promise<WalletStateModel | null> {
    const { data, error } = await domainDb.wallet
      .from("wallet_accounts")
      .select("*")
      .eq("owner_user_id", ownerOrbitId)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();
    if (error) {
      console.warn("[walletRepo] getByOwnerOrbitId query failed, returning null", error.message);
      return null;
    }
    if (!data) return null;
    return {
      walletId: data.id,
      ownerOrbitId: data.owner_user_id,
      currency: data.currency || "AED",
      availableBalance: data.available_balance ?? data.balance ?? 0,
      lockedBalance: data.balance_locked ?? 0,
      pendingBalance: data.pending_balance ?? 0,
      lastUpdatedAt: data.updated_at || data.created_at,
    } as WalletStateModel;
  },

  async upsert(wallet: WalletStateModel): Promise<WalletStateModel> {
    const existing = await walletRepo.getByOwnerOrbitId(wallet.ownerOrbitId);
    if (existing) return existing;
    return wallet;
  },

  async createTransaction(tx: WalletTransaction): Promise<WalletTransaction> {
    const { data: authData } = await db.auth.getUser();
    const userId = authData?.user?.id;

    const { data, error } = await domainDb.wallet
      .from("wallet_transactions")
      .insert({
        sender_id: userId || null,
        amount: tx.amount,
        currency: tx.currency || "AED",
        context_type: tx.type,
        title: tx.type,
        subtitle: tx.reference || null,
        status: tx.status || "pending",
        metadata: { reference: tx.reference, source: "wallet_store" },
      })
      .select()
      .single();
    if (error) throw error;
    return {
      id: data.id,
      type: data.context_type || tx.type,
      status: data.status || "pending",
      amount: data.amount,
      currency: data.currency || "AED",
      reference: data.subtitle || tx.reference,
      createdAt: data.created_at,
    } as WalletTransaction;
  },
};

export const listingRepo = {
  async listPublished(): Promise<PropertyListingV2[]> {
    const { data, error } = await domainDb.marketplace
      .from("listings")
      .select("*")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return (data ?? []) as PropertyListingV2[];
  },

  async getById(id: string): Promise<PropertyListingV2 | null> {
    const { data, error } = await domainDb.marketplace
      .from("listings")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data as PropertyListingV2 | null;
  },

  async create(listing: PropertyListingV2): Promise<PropertyListingV2> {
    const { data, error } = await domainDb.marketplace
      .from("listings")
      .insert(listing as Record<string, unknown>)
      .select()
      .single();
    if (error) throw error;
    return data as PropertyListingV2;
  },

  async update(id: string, patch: Partial<PropertyListingV2>): Promise<PropertyListingV2> {
    const { data, error } = await domainDb.marketplace
      .from("listings")
      .update(patch as Record<string, unknown>)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as PropertyListingV2;
  },
};

export const bookingRepo = {
  async create(booking: BookingRecordV2): Promise<BookingRecordV2> {
    const { data, error } = await domainDb.commerce
      .from("bookings")
      .insert(booking as Record<string, unknown>)
      .select()
      .single();
    if (error) throw error;
    return data as BookingRecordV2;
  },

  async update(id: string, patch: Partial<BookingRecordV2>): Promise<BookingRecordV2> {
    const { data, error } = await domainDb.commerce
      .from("bookings")
      .update(patch as Record<string, unknown>)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as BookingRecordV2;
  },

  async listByListing(listingId: string): Promise<BookingRecordV2[]> {
    const { data, error } = await domainDb.commerce
      .from("bookings")
      .select("*")
      .eq("listing_id", listingId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return (data ?? []) as BookingRecordV2[];
  },
};

interface ChatMessageDbRow {
  id: string;
  conversation_id: string;
  sender_orbit_id: string | null;
  sender_user_id: string;
  type: string;
  body: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export const chatRepo = {
  async createConversation(conversation: ConversationRecord): Promise<ConversationRecord> {
    const { data: authData } = await db.auth.getUser();
    const userId = authData?.user?.id;
    if (!userId) throw new Error("Not authenticated");

    const orbitId = `orbit_${userId.replace(/-/g, "").substring(0, 8)}`;

    const { data, error } = await domainDb.orbit
      .from("conversations_v2")
      .insert({
        id: conversation.id,
        type: conversation.type || "direct",
        title: conversation.title || null,
        participants: conversation.participants || [],
        listing_id: conversation.listingId || null,
        booking_id: conversation.bookingId || null,
        lease_id: conversation.leaseId || null,
        last_message_at: conversation.lastMessageAt || null,
        created_at: conversation.createdAt,
        updated_at: conversation.updatedAt,
        created_by_orbit_id: orbitId,
      })
      .select()
      .single();
    if (error) throw error;
    return {
      ...conversation,
      id: data.id,
    };
  },

  async createMessage(message: ChatMessageRecord): Promise<ChatMessageRecord> {
    const { data: authData } = await db.auth.getUser();
    const userId = authData?.user?.id;
    if (!userId) throw new Error("Not authenticated");

    const { data, error } = await domainDb.orbit
      .from("chat_messages_v2")
      .insert({
        conversation_id: message.conversationId,
        sender_orbit_id: message.senderOrbitId,
        sender_user_id: userId,
        type: message.type || "text",
        body: message.body,
        metadata: message.metadata || null,
      })
      .select()
      .single();
    if (error) throw error;

    try {
      const { notifyNewMessage } = await import("@/lib/engines/notification-event-dispatcher");
      const convData = await domainDb.orbit
        .from("conversations_v2")
        .select("participants")
        .eq("id", message.conversationId)
        .maybeSingle();
      const participants = (convData?.data?.participants as string[]) ?? [];
      for (const p of participants) {
        const recipientId = typeof p === "string" ? p : (p as Record<string, string>)?.orbitId ?? (p as Record<string, string>)?.userId;
        if (recipientId && recipientId !== userId) {
          notifyNewMessage(recipientId, "Contact", (message.body || "").slice(0, 80), message.conversationId).catch(() => {});
        }
      }
    } catch { /* fire-and-forget */ }

    return {
      ...message,
      id: data.id,
      createdAt: data.created_at,
    };
  },

  async getMessages(conversationId: string): Promise<ChatMessageRecord[]> {
    const { data, error } = await domainDb.orbit
      .from("chat_messages_v2")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(100);
    if (error) throw error;
    return (data ?? []).map((row: ChatMessageDbRow) => ({
      id: row.id,
      conversationId: row.conversation_id,
      senderOrbitId: row.sender_orbit_id ?? "",
      body: row.body,
      type: row.type || "text",
      metadata: row.metadata ?? undefined,
      createdAt: row.created_at,
    })) as ChatMessageRecord[];
  },
};

export const propertyManagementRepo = {
  async createUnit(unit: PropertyUnitManagement): Promise<PropertyUnitManagement> {
    const { data, error } = await domainDb.property
      .from("units")
      .insert(unit as Record<string, unknown>)
      .select()
      .single();
    if (error) throw error;
    return data as PropertyUnitManagement;
  },

  async createLease(lease: LeaseRecord): Promise<LeaseRecord> {
    const { data, error } = await domainDb.property
      .from("leases")
      .insert(lease as Record<string, unknown>)
      .select()
      .single();
    if (error) throw error;
    return data as LeaseRecord;
  },

  async createRentPayment(payment: RentPaymentRecord): Promise<RentPaymentRecord> {
    const { data, error } = await db
      .from("rent_payments")
      .insert(payment as Record<string, unknown>)
      .select()
      .single();
    if (error) throw error;
    return data as RentPaymentRecord;
  },

  async updateRentPayment(id: string, patch: Partial<RentPaymentRecord>): Promise<RentPaymentRecord> {
    const { data, error } = await db
      .from("rent_payments")
      .update(patch as Record<string, unknown>)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as RentPaymentRecord;
  },
};
