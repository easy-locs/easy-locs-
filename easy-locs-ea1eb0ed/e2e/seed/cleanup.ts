import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import { SEEDED_STATE_PATH, type SeededState } from "./test-data";

function readSeededState(): SeededState | null {
  const fullPath = path.resolve(process.cwd(), SEEDED_STATE_PATH);
  if (!fs.existsSync(fullPath)) return null;
  return JSON.parse(fs.readFileSync(fullPath, "utf-8"));
}

export default async function globalTeardown() {
  console.log("\n[e2e-cleanup] ── Global Teardown: Cleaning test data ──\n");

  const state = readSeededState();
  if (!state) {
    console.log("[e2e-cleanup] No seeded state file found — nothing to clean");
    return;
  }

  const url = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!url || (!serviceKey && !anonKey)) {
    console.warn("[e2e-cleanup] Missing Supabase credentials — skipping cleanup");
    return;
  }

  const supabase = createClient(url, serviceKey || anonKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  if (!serviceKey) {
    const email = process.env.E2E_TEST_EMAIL;
    const password = process.env.E2E_TEST_PASSWORD;
    if (email && password) {
      await supabase.auth.signInWithPassword({ email, password });
    }
  }

  if (state.walletSeeded && state.userId) {
    if (state.walletSnapshot) {
      const { error } = await supabase
        .from("wallet_accounts")
        .update({
          balance: state.walletSnapshot.balance,
          currency: state.walletSnapshot.currency,
        })
        .eq("user_id", state.userId);

      if (error) {
        console.warn("[e2e-cleanup] wallet restore:", error.message);
      } else {
        console.log(
          `[e2e-cleanup] Restored wallet to pre-seed state: ${state.walletSnapshot.balance} ${state.walletSnapshot.currency}`
        );
      }
    } else {
      const { error } = await supabase
        .from("wallet_accounts")
        .delete()
        .eq("user_id", state.userId);

      if (error) {
        console.warn("[e2e-cleanup] wallet delete:", error.message);
      } else {
        console.log("[e2e-cleanup] Deleted seeded wallet account (none existed before)");
      }
    }
  }

  if (state.listingIds.length > 0) {
    const { error: detErr } = await supabase
      .from("listing_details")
      .delete()
      .in("listing_id", state.listingIds);

    if (detErr) {
      console.warn("[e2e-cleanup] listing_details cleanup:", detErr.message);
    }

    const { error: listErr } = await supabase
      .from("listings")
      .delete()
      .in("id", state.listingIds);

    if (listErr) {
      console.warn("[e2e-cleanup] listings cleanup:", listErr.message);
    } else {
      console.log(
        `[e2e-cleanup] Removed ${state.listingIds.length} seeded listings`
      );
    }
  }

  const stateFile = path.resolve(process.cwd(), SEEDED_STATE_PATH);
  if (fs.existsSync(stateFile)) {
    fs.unlinkSync(stateFile);
    console.log("[e2e-cleanup] Removed seeded state file");
  }

  console.log("\n[e2e-cleanup] ── Cleanup complete ──\n");
}
