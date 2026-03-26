import { supabase } from "@/integrations/supabase/client";
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
} from "@/lib/types/domain";

// Use untyped client for V2 domain tables not yet in the auto-generated schema
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export const orbitRepo = {
  async getByOrbitId(orbitId: string): Promise<OrbitProfile | null> {
    const { data, error } = await db
      .from("orbit_profiles_v2")
      .select("*")
      .eq("orbit_id", orbitId)
      .maybeSingle();
    if (error) {
      console.warn("[orbitRepo] getByOrbitId error:", error.message);
      return null;
    }
    return data as OrbitProfile | null;
  },

  async upsert(profile: OrbitProfile): Promise<OrbitProfile> {
    const { data, error } = await db
      .from("orbit_profiles_v2")
      .upsert(profile, { onConflict: "id" })
      .select()
      .single();
    if (error) throw error;
    return data as OrbitProfile;
  },
};

export const walletRepo = {
  async getByOwnerOrbitId(ownerOrbitId: string): Promise<WalletStateModel | null> {
    const { data, error } = await db
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
    const { data, error } = await db.from("unified_wallet_transactions").insert(tx).select().single();
    if (error) throw error;
    return data as WalletTransaction;
  },
};

export const listingRepo = {
  async listPublished(): Promise<PropertyListingV2[]> {
    const { data, error } = await db.from("property_listings").select("*").eq("status", "published").order("createdAt", { ascending: false });
    if (error) throw error;
    return (data ?? []) as PropertyListingV2[];
  },

  async getById(id: string): Promise<PropertyListingV2 | null> {
    const { data, error } = await db.from("property_listings").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data as PropertyListingV2 | null;
  },

  async create(listing: PropertyListingV2): Promise<PropertyListingV2> {
    const { data, error } = await db.from("property_listings").insert(listing).select().single();
    if (error) throw error;
    return data as PropertyListingV2;
  },

  async update(id: string, patch: Partial<PropertyListingV2>): Promise<PropertyListingV2> {
    const { data, error } = await db.from("property_listings").update(patch).eq("id", id).select().single();
    if (error) throw error;
    return data as PropertyListingV2;
  },
};

export const bookingRepo = {
  async create(booking: BookingRecordV2): Promise<BookingRecordV2> {
    const { data, error } = await db.from("bookings").insert(booking).select().single();
    if (error) throw error;
    return data as BookingRecordV2;
  },

  async update(id: string, patch: Partial<BookingRecordV2>): Promise<BookingRecordV2> {
    const { data, error } = await db.from("bookings").update(patch).eq("id", id).select().single();
    if (error) throw error;
    return data as BookingRecordV2;
  },

  async listByListing(listingId: string): Promise<BookingRecordV2[]> {
    const { data, error } = await db.from("bookings").select("*").eq("listingId", listingId);
    if (error) throw error;
    return (data ?? []) as BookingRecordV2[];
  },
};

/**
 * chatRepo — uses real tables: conversations_v2 + chat_messages_v2.
 * For extended operations, use chatRepoExtended from ./chat-repo-extended.ts
 */
export const chatRepo = {
  async createConversation(conversation: ConversationRecord): Promise<ConversationRecord> {
    const { data, error } = await db
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
    // Get current user id for sender_user_id (required NOT NULL column)
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id;
    if (!userId) throw new Error("Not authenticated");

    const { data, error } = await db
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

    // Notify other participants (fire-and-forget)
    try {
      const { notifyNewMessage } = await import("@/lib/engines/notification-event-dispatcher");
      const convData = await db.from("conversations_v2").select("participants").eq("id", message.conversationId).maybeSingle();
      const participants = (convData?.data?.participants as string[]) ?? [];
      for (const p of participants) {
        const recipientId = typeof p === "string" ? p : (p as any)?.orbitId ?? (p as any)?.userId;
        if (recipientId && recipientId !== userId) {
          notifyNewMessage(recipientId, "Contact", (message.body || "").slice(0, 80), message.conversationId).catch(() => {});
        }
      }
    } catch {}

    return {
      ...message,
      id: data.id,
      createdAt: data.created_at,
    };
  },

  async getMessages(conversationId: string): Promise<ChatMessageRecord[]> {
    const { data, error } = await db
      .from("chat_messages_v2")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      id: row.id,
      conversationId: row.conversation_id,
      senderOrbitId: row.sender_orbit_id,
      body: row.body,
      type: row.type || "text",
      metadata: row.metadata,
      createdAt: row.created_at,
    })) as ChatMessageRecord[];
  },
};

export const propertyManagementRepo = {
  async createUnit(unit: PropertyUnitManagement): Promise<PropertyUnitManagement> {
    const { data, error } = await db.from("property_units").insert(unit).select().single();
    if (error) throw error;
    return data as PropertyUnitManagement;
  },

  async createLease(lease: LeaseRecord): Promise<LeaseRecord> {
    const { data, error } = await db.from("leases").insert(lease).select().single();
    if (error) throw error;
    return data as LeaseRecord;
  },

  async createRentPayment(payment: RentPaymentRecord): Promise<RentPaymentRecord> {
    const { data, error } = await db.from("rent_payments").insert(payment).select().single();
    if (error) throw error;
    return data as RentPaymentRecord;
  },

  async updateRentPayment(id: string, patch: Partial<RentPaymentRecord>): Promise<RentPaymentRecord> {
    const { data, error } = await db.from("rent_payments").update(patch).eq("id", id).select().single();
    if (error) throw error;
    return data as RentPaymentRecord;
  },
};
