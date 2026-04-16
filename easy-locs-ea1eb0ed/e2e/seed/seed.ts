import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import {
  SEED_LISTING,
  SEED_LISTING_2,
  SEED_LISTING_DETAIL,
  SEED_LISTING_DETAIL_2,
  SEED_WALLET,
  SEEDED_STATE_PATH,
  type SeededState,
} from "./test-data";

function getEnv(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing env var: ${name}`);
  return val;
}

function getOptionalEnv(name: string): string | undefined {
  return process.env[name] || undefined;
}

function createAdminClient(): { client: SupabaseClient; hasServiceRole: boolean } {
  const url = getEnv("VITE_SUPABASE_URL");
  const serviceKey = getOptionalEnv("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = getOptionalEnv("VITE_SUPABASE_PUBLISHABLE_KEY");

  if (serviceKey) {
    console.log("[e2e-seed] Using service role key for admin access");
    return {
      client: createClient(url, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      }),
      hasServiceRole: true,
    };
  }

  if (!anonKey) {
    throw new Error(
      "[e2e-seed] Either SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_PUBLISHABLE_KEY must be set"
    );
  }

  console.log("[e2e-seed] No service role key found, using anon key + test user auth");
  return {
    client: createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    }),
    hasServiceRole: false,
  };
}

async function authenticateTestUser(
  supabase: SupabaseClient
): Promise<string | null> {
  const email = process.env.E2E_TEST_EMAIL;
  const password = process.env.E2E_TEST_PASSWORD;

  if (!email || !password) {
    return null;
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(`[e2e-seed] Auth failed: ${error.message}`);
  }

  const userId = data.user?.id;
  if (!userId) {
    throw new Error("[e2e-seed] Auth succeeded but no user ID returned");
  }

  console.log(`[e2e-seed] Authenticated as ${data.user?.email} (${userId})`);
  return userId;
}

async function snapshotWalletBalance(
  supabase: SupabaseClient,
  userId: string
): Promise<{ balance: number; currency: string } | null> {
  const { data, error } = await supabase
    .from("wallet_accounts")
    .select("balance, currency")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return { balance: data.balance, currency: data.currency };
}

async function seedListings(supabase: SupabaseClient, userId: string | null) {
  const listingRows = [SEED_LISTING, SEED_LISTING_2].map((l) => ({
    ...l,
    ...(userId ? { user_id: userId } : {}),
  }));

  const { error: listErr } = await supabase
    .from("listings")
    .upsert(listingRows, { onConflict: "id" });

  if (listErr) {
    throw new Error(`[e2e-seed] Failed to seed listings: ${listErr.message}`);
  }
  console.log(`[e2e-seed] Seeded ${listingRows.length} listings`);

  const detailRows = [SEED_LISTING_DETAIL, SEED_LISTING_DETAIL_2];
  const { error: detErr } = await supabase
    .from("listing_details")
    .upsert(detailRows, { onConflict: "listing_id" });

  if (detErr) {
    throw new Error(
      `[e2e-seed] Failed to seed listing_details: ${detErr.message}`
    );
  }
  console.log(`[e2e-seed] Seeded ${detailRows.length} listing details`);
}

async function seedWallet(supabase: SupabaseClient, userId: string) {
  const { error } = await supabase.from("wallet_accounts").upsert(
    {
      user_id: userId,
      balance: SEED_WALLET.balance,
      currency: SEED_WALLET.currency,
    },
    { onConflict: "user_id" }
  );

  if (error) {
    throw new Error(
      `[e2e-seed] Failed to seed wallet_accounts: ${error.message}`
    );
  }
  console.log(
    `[e2e-seed] Seeded wallet: ${SEED_WALLET.balance} ${SEED_WALLET.currency}`
  );
}

function writeSeededState(state: SeededState) {
  const fullPath = path.resolve(process.cwd(), SEEDED_STATE_PATH);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, JSON.stringify(state, null, 2));
  console.log(`[e2e-seed] State written to ${SEEDED_STATE_PATH}`);
}

async function verifySeededListings(supabase: SupabaseClient, ids: string[]) {
  const { data, error } = await supabase
    .from("listings")
    .select("id")
    .in("id", ids);

  if (error) {
    throw new Error(`[e2e-seed] Verification query failed: ${error.message}`);
  }

  if (!data || data.length !== ids.length) {
    const found = data?.map((r) => r.id) ?? [];
    const missing = ids.filter((id) => !found.includes(id));
    throw new Error(
      `[e2e-seed] Verification failed: expected ${ids.length} seeded listings, found ${data?.length ?? 0}. Missing: ${missing.join(", ")}`
    );
  }

  console.log(`[e2e-seed] Verified ${data.length} seeded listings exist`);
}

export default async function globalSetup() {
  console.log("\n[e2e-seed] ── Global Setup: Seeding test data ──\n");

  const { client: supabase, hasServiceRole } = createAdminClient();
  const userId = await authenticateTestUser(supabase);

  if (!hasServiceRole && !userId) {
    throw new Error(
      "[e2e-seed] Either SUPABASE_SERVICE_ROLE_KEY or E2E_TEST_EMAIL/E2E_TEST_PASSWORD must be set for seeding"
    );
  }

  let walletSnapshot: { balance: number; currency: string } | null = null;
  let walletSeeded = false;

  if (userId) {
    walletSnapshot = await snapshotWalletBalance(supabase, userId);
    console.log(
      walletSnapshot
        ? `[e2e-seed] Pre-seed wallet snapshot: ${walletSnapshot.balance} ${walletSnapshot.currency}`
        : "[e2e-seed] No existing wallet account found — will create new"
    );
  }

  await seedListings(supabase, userId);

  const listingIds = [SEED_LISTING.id, SEED_LISTING_2.id];
  await verifySeededListings(supabase, listingIds);

  if (userId) {
    await seedWallet(supabase, userId);
    walletSeeded = true;
  } else {
    console.log("[e2e-seed] No test user — skipping wallet seeding (service-role-only mode)");
  }

  writeSeededState({
    listingIds,
    walletSeeded,
    walletSnapshot,
    userId,
    timestamp: new Date().toISOString(),
  });

  console.log("\n[e2e-seed] ── Seeding complete ──\n");
}
