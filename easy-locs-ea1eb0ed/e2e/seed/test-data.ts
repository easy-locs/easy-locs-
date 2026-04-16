export const E2E_PREFIX = "e2e_seed_";
export const E2E_TAG = "e2e-test-data";

export const SEED_LISTING = {
  id: `${E2E_PREFIX}listing_001`,
  title: "E2E Test Villa – Douala Bonanjo",
  description:
    "Spacious 3-bedroom villa in the heart of Douala. Perfect for families. This listing was created by the e2e seed script and will be cleaned up automatically.",
  listing_type: "property",
  price: 75000,
  currency: "XOF",
  city: "Douala",
  country: "CM",
  status: "active",
  tags: [E2E_TAG],
};

export const SEED_LISTING_DETAIL = {
  listing_id: SEED_LISTING.id,
  bedrooms: 3,
  bathrooms: 2,
  surface_area_m2: 120,
  amenities: ["wifi", "parking", "pool"],
  images: [
    "https://placehold.co/800x600?text=E2E+Property+1",
    "https://placehold.co/800x600?text=E2E+Property+2",
  ],
};

export const SEED_LISTING_2 = {
  id: `${E2E_PREFIX}listing_002`,
  title: "E2E Test Studio – Yaoundé Bastos",
  description:
    "Modern studio apartment near embassies. Seed data for e2e tests.",
  listing_type: "property",
  price: 35000,
  currency: "XOF",
  city: "Yaoundé",
  country: "CM",
  status: "active",
  tags: [E2E_TAG],
};

export const SEED_LISTING_DETAIL_2 = {
  listing_id: SEED_LISTING_2.id,
  bedrooms: 1,
  bathrooms: 1,
  surface_area_m2: 45,
  amenities: ["wifi", "security"],
  images: ["https://placehold.co/800x600?text=E2E+Studio"],
};

export const SEED_WALLET = {
  balance: 10000,
  currency: "XOF",
};

export const SEEDED_STATE_PATH = "e2e/seed/.seeded-state.json";

export interface SeededState {
  listingIds: string[];
  walletSeeded: boolean;
  walletSnapshot: { balance: number; currency: string } | null;
  userId: string | null;
  timestamp: string;
}
