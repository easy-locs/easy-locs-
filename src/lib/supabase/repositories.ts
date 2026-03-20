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

export const orbitRepo = {
  async getByOrbitId(orbitId: string): Promise<OrbitProfile | null> {
    const { data, error } = await supabase.from("orbit_profiles").select("*").eq("orbitId", orbitId).maybeSingle();
    if (error) throw error;
    return data as OrbitProfile | null;
  },

  async upsert(profile: OrbitProfile): Promise<OrbitProfile> {
    const { data, error } = await supabase.from("orbit_profiles").upsert(profile).select().single();
    if (error) throw error;
    return data as OrbitProfile;
  },
};

export const walletRepo = {
  async getByOwnerOrbitId(ownerOrbitId: string): Promise<WalletStateModel | null> {
    const { data, error } = await supabase.from("wallets").select("*").eq("ownerOrbitId", ownerOrbitId).maybeSingle();
    if (error) throw error;
    return data as WalletStateModel | null;
  },

  async upsert(wallet: WalletStateModel): Promise<WalletStateModel> {
    const { data, error } = await supabase.from("wallets").upsert(wallet).select().single();
    if (error) throw error;
    return data as WalletStateModel;
  },

  async createTransaction(tx: WalletTransaction): Promise<WalletTransaction> {
    const { data, error } = await supabase.from("wallet_transactions").insert(tx).select().single();
    if (error) throw error;
    return data as WalletTransaction;
  },
};

export const listingRepo = {
  async listPublished(): Promise<PropertyListingV2[]> {
    const { data, error } = await supabase.from("property_listings").select("*").eq("status", "published").order("createdAt", { ascending: false });
    if (error) throw error;
    return (data ?? []) as PropertyListingV2[];
  },

  async getById(id: string): Promise<PropertyListingV2 | null> {
    const { data, error } = await supabase.from("property_listings").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data as PropertyListingV2 | null;
  },

  async create(listing: PropertyListingV2): Promise<PropertyListingV2> {
    const { data, error } = await supabase.from("property_listings").insert(listing).select().single();
    if (error) throw error;
    return data as PropertyListingV2;
  },

  async update(id: string, patch: Partial<PropertyListingV2>): Promise<PropertyListingV2> {
    const { data, error } = await supabase.from("property_listings").update(patch).eq("id", id).select().single();
    if (error) throw error;
    return data as PropertyListingV2;
  },
};

export const bookingRepo = {
  async create(booking: BookingRecordV2): Promise<BookingRecordV2> {
    const { data, error } = await supabase.from("bookings").insert(booking).select().single();
    if (error) throw error;
    return data as BookingRecordV2;
  },

  async update(id: string, patch: Partial<BookingRecordV2>): Promise<BookingRecordV2> {
    const { data, error } = await supabase.from("bookings").update(patch).eq("id", id).select().single();
    if (error) throw error;
    return data as BookingRecordV2;
  },

  async listByListing(listingId: string): Promise<BookingRecordV2[]> {
    const { data, error } = await supabase.from("bookings").select("*").eq("listingId", listingId);
    if (error) throw error;
    return (data ?? []) as BookingRecordV2[];
  },
};

export const chatRepo = {
  async createConversation(conversation: ConversationRecord): Promise<ConversationRecord> {
    const { data, error } = await supabase.from("conversations").insert(conversation).select().single();
    if (error) throw error;
    return data as ConversationRecord;
  },

  async createMessage(message: ChatMessageRecord): Promise<ChatMessageRecord> {
    const { data, error } = await supabase.from("chat_messages").insert(message).select().single();
    if (error) throw error;
    return data as ChatMessageRecord;
  },

  async getMessages(conversationId: string): Promise<ChatMessageRecord[]> {
    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("conversationId", conversationId)
      .order("createdAt", { ascending: true });
    if (error) throw error;
    return (data ?? []) as ChatMessageRecord[];
  },
};

export const propertyManagementRepo = {
  async createUnit(unit: PropertyUnitManagement): Promise<PropertyUnitManagement> {
    const { data, error } = await supabase.from("property_units").insert(unit).select().single();
    if (error) throw error;
    return data as PropertyUnitManagement;
  },

  async createLease(lease: LeaseRecord): Promise<LeaseRecord> {
    const { data, error } = await supabase.from("leases").insert(lease).select().single();
    if (error) throw error;
    return data as LeaseRecord;
  },

  async createRentPayment(payment: RentPaymentRecord): Promise<RentPaymentRecord> {
    const { data, error } = await supabase.from("rent_payments").insert(payment).select().single();
    if (error) throw error;
    return data as RentPaymentRecord;
  },

  async updateRentPayment(id: string, patch: Partial<RentPaymentRecord>): Promise<RentPaymentRecord> {
    const { data, error } = await supabase.from("rent_payments").update(patch).eq("id", id).select().single();
    if (error) throw error;
    return data as RentPaymentRecord;
  },
};
