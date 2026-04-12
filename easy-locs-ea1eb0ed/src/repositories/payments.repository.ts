/**
 * payments.repository — All DB ops for payment components and pages.
 */
import { db } from "@/services/db";

// ── Stripe intent ──
export async function createStripeIntent(body: Record<string, any>) {
  const { data, error } = await db.functions.invoke("create-stripe-intent", { body });
  if (error) throw error;
  return data;
}

// ── Rent payment ──
export async function createRentPayment(body: Record<string, any>) {
  const { data, error } = await db.functions.invoke("create-rent-payment", { body });
  if (error) throw error;
  return data;
}

// ── Stripe checkout ──
export async function createStripeCheckout(body: Record<string, any>) {
  const { data, error } = await db.functions.invoke("create-checkout", { body });
  if (error) throw error;
  return data;
}

// ── Guest payment ──
export async function verifyGuestPayment(body: Record<string, any>) {
  const { data, error } = await db.functions.invoke("verify-guest-payment", { body });
  if (error) throw error;
  return data;
}

export async function createGuestCheckout(body: Record<string, any>) {
  const { data, error } = await db.functions.invoke("create-guest-checkout", { body });
  if (error) throw error;
  return data;
}

// ── Wallet ──
export async function createWalletTopup(body: Record<string, any>) {
  const { data, error } = await db.functions.invoke("create-wallet-topup", { body });
  if (error) throw error;
  return data;
}

export async function invokeWalletPin(body: Record<string, any>) {
  const { data, error } = await db.functions.invoke("wallet-pin", { body });
  if (error) throw error;
  return data;
}

// ── Orbit payment (O5: graceful error handling) ──
export async function invokeOrbitPayment(body: Record<string, any>) {
  const { data, error } = await db.functions.invoke("orbit-payment", { body });
  if (error) {
    const message = typeof error === "object" && error !== null && "message" in error
      ? (error as any).message
      : String(error);
    throw new Error(`Orbit payment failed: ${message}`);
  }
  if (data?.error) {
    throw new Error(`Orbit payment rejected: ${data.error}`);
  }
  return data;
}

// ── FX ──
export async function invokeFXRate(body: Record<string, any>) {
  const { data, error } = await db.functions.invoke("fx-rates", { body });
  if (error) throw error;
  return data;
}

// ── Subscription ──
export async function fetchSubscription(orgId: string) {
  const { data } = await db("subscriptions" as any).select("*").eq("org_id", orgId).limit(1).maybeSingle();
  return data;
}

// ── Booking payment ──
export async function updateBookingPayment(table: string, id: string, updates: Record<string, any>) {
  const { error } = await db(table).update(updates).eq("id", id);
  if (error) throw error;
}

// ── Payment requests ──
export async function fetchPaymentRequest(requestId: string) {
  const { data, error } = await db
    .from("payment_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// ── Wallet activity ──
export async function fetchWalletActivity(userId: string) {
  const { data: accounts, error: aErr } = await db("wallet_accounts")
    .select("id")
    .eq("owner_user_id", userId);
  if (aErr) throw aErr;
  const ids = (accounts ?? []).map((a: any) => a.id);
  if (!ids.length) return [];

  const { data, error } = await db("wallet_ledger_entries")
    .select("*")
    .in("wallet_account_id", ids)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as any[];
}

// ── Concierge payment ──
export async function createConciergePayment(body: Record<string, any>) {
  const { data, error } = await db.functions.invoke("create-concierge-payment", { body });
  if (error) throw error;
  return data;
}

// ── Booking payment ──
export async function createBookingPayment(body: Record<string, any>) {
  const { data, error } = await db.functions.invoke("create-booking-payment", { body });
  if (error) throw error;
  return data;
}
