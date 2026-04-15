import { domainDb } from "@/services/db";
import type { WalletStateModel, WalletTransaction, PropertyListing } from "@/domains/shared/canonical-types";

export const walletRepo = {
  async getByOwnerOrbitId(ownerOrbitId: string): Promise<WalletStateModel | null> {
    const { data } = await domainDb.wallet
      .from("wallet_accounts")
      .select("*")
      .eq("owner_orbit_id", ownerOrbitId)
      .maybeSingle();

    if (!data) return null;

    return {
      walletId: data.id,
      ownerOrbitId: data.owner_orbit_id,
      balance: data.balance ?? 0,
      currency: data.currency ?? "USD",
      status: data.status ?? "active",
    } as WalletStateModel;
  },

  async createTransaction(tx: WalletTransaction): Promise<WalletTransaction> {
    const { data, error } = await domainDb.wallet
      .from("wallet_transactions")
      .insert({
        id: tx.id,
        type: tx.type,
        status: tx.status,
        amount: tx.amount,
        currency: tx.currency,
        reference: tx.reference,
        created_at: tx.createdAt,
      })
      .select()
      .single();

    if (error || !data) {
      console.warn("[walletRepo.createTransaction] error:", error?.message);
      return tx;
    }

    return {
      ...tx,
      id: data.id,
    };
  },
};

interface ListingRow {
  id: string;
  owner_orbit_id: string;
  status: string;
  title: string;
  description: string;
  category: string;
  service_modes: string[] | null;
  flow_mode: string | null;
  location: Record<string, unknown>;
  pricing: Record<string, unknown>;
  capacity: Record<string, unknown>;
  media: unknown[];
  tags: string[];
  wallet_linked: boolean;
  booking_enabled: boolean;
  orbit_linked: boolean;
  service_config: Record<string, unknown>;
  availability: unknown[];
  created_at: string;
  updated_at: string;
}

export const listingRepo = {
  async listPublished(): Promise<PropertyListing[]> {
    const { data } = await domainDb.marketplace
      .from("listings")
      .select("*")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(100);

    return (data ?? []).map(mapListingRow);
  },

  async create(listing: PropertyListing): Promise<PropertyListing> {
    const { data, error } = await domainDb.marketplace
      .from("listings")
      .insert({
        id: listing.id,
        owner_orbit_id: listing.ownerOrbitId,
        status: listing.status,
        title: listing.title,
        description: listing.description,
        category: listing.category,
        location: listing.location,
        pricing: listing.pricing,
        capacity: listing.capacity,
        media: listing.media,
        tags: listing.tags,
        service_config: listing.serviceConfig,
        availability: listing.availability,
        flow_mode: listing.flowMode,
      })
      .select()
      .single();

    if (error || !data) {
      console.warn("[listingRepo.create] error:", error?.message);
      return listing;
    }

    return mapListingRow(data);
  },
};

function mapListingRow(row: ListingRow): PropertyListing {
  return {
    id: row.id,
    ownerOrbitId: row.owner_orbit_id,
    status: row.status,
    title: row.title,
    description: row.description,
    category: row.category,
    serviceModes: row.service_modes ?? ["direct_booking"],
    flowMode: row.flow_mode ?? "instant_book",
    location: row.location ?? {},
    pricing: row.pricing ?? {},
    capacity: row.capacity ?? {},
    media: (row.media ?? []) as PropertyListing["media"],
    tags: row.tags ?? [],
    walletLinked: row.wallet_linked ?? false,
    bookingEnabled: row.booking_enabled ?? false,
    orbitLinked: row.orbit_linked ?? false,
    serviceConfig: row.service_config ?? {},
    availability: row.availability ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
