import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY");
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function countActiveWallets(userId, currency) {
  const { data, error } = await supabase
    .from("wallet_accounts")
    .select("id", { count: "exact" })
    .eq("owner_user_id", userId)
    .eq("currency", currency)
    .eq("status", "active");

  if (error) throw error;
  return { count: data?.length ?? 0, walletId: data?.[0]?.id ?? null };
}

async function ensureWallet(userId, currency) {
  const { data, error } = await supabase.rpc("ensure_wallet_account", {
    target_user_id: userId,
    target_currency: currency,
  });

  if (error) throw error;
  return data;
}

async function run() {
  const walletlessUserId = process.argv[2];
  const existingUserId = process.argv[3];
  const currency = process.argv[4] || "AED";

  if (!walletlessUserId || !existingUserId) {
    throw new Error("Usage: node scripts/runtime-proof-wallet.mjs <walletlessUserId> <existingUserId> [currency]");
  }

  const beforeWalletless = await countActiveWallets(walletlessUserId, currency);
  const createResult = await ensureWallet(walletlessUserId, currency);
  const afterWalletless = await countActiveWallets(walletlessUserId, currency);

  const beforeExisting = await countActiveWallets(existingUserId, currency);
  const existingResult = await ensureWallet(existingUserId, currency);
  const afterExisting = await countActiveWallets(existingUserId, currency);

  const repeat1 = await ensureWallet(existingUserId, currency);
  const repeat2 = await ensureWallet(existingUserId, currency);
  const afterRepeat = await countActiveWallets(existingUserId, currency);

  console.log(JSON.stringify({
    walletlessUser: {
      userId: walletlessUserId,
      before: beforeWalletless,
      rpc: createResult,
      after: afterWalletless,
    },
    existingUser: {
      userId: existingUserId,
      before: beforeExisting,
      rpc: existingResult,
      after: afterExisting,
    },
    repeatedCalls: {
      userId: existingUserId,
      first: repeat1,
      second: repeat2,
      after: afterRepeat,
    },
  }, null, 2));
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});