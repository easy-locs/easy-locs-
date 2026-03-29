/**
 * payments.repository — All DB ops for payment components and pages.
 */
import { supabase } from "@/integrations/supabase/client";

// ── Stripe intent ──
export async function createStripeIntent(body: Record<string, any>) {
  const { data, error } = await supabase.functions.invoke("create-stripe-intent", { body });
  if (error) throw error;
  return data;
}

// ── Rent payment ──
export async function createRentPayment(body: Record<string, any>) {
  const { data, error } = await supabase.functions.invoke("create-rent-payment", { body });
  if (error) throw error;
  return data;
}

// ── Stripe checkout ──
export async function createStripeCheckout(body: Record<string, any>) {
  const { data, error } = await supabase.functions.invoke("create-stripe-checkout" as any, { body });
  if (error) throw error;
  return data;
}

// ── Guest payment ──
export async function verifyGuestPayment(body: Record<string, any>) {
  const { data, error } = await supabase.functions.invoke("verify-guest-payment", { body });
  if (error) throw error;
  return data;
}

export async function createGuestCheckout(body: Record<string, any>) {
  const { data, error } = await supabase.functions.invoke("create-guest-checkout", { body });
  if (error) throw error;
  return data;
}

// ── Wallet ──
export async function createWalletTopup(body: Record<string, any>) {
  const { data, error } = await supabase.functions.invoke("create-wallet-topup", { body });
  if (error) throw error;
  return data;
}

export async function invokeWalletPin(body: Record<string, any>) {
  const { data, error } = await supabase.functions.invoke("wallet-pin", { body });
  if (error) throw error;
  return data;
}

// ── Orbit payment ──
export async function invokeOrbitPayment(body: Record<string, any>) {
  const { data, error } = await supabase.functions.invoke("orbit-payment", { body });
  if (error) throw error;
  return data;
}

// ── FX ──
export async function invokeFXRate(body: Record<string, any>) {
  const { data, error } = await supabase.functions.invoke("get-fx-rate" as any, { body });
  if (error) throw error;
  return data;
}

// ── Subscription ──
export async function fetchSubscription(orgId: string) {
  const { data } = await supabase.from("subscriptions" as any).select("*").eq("org_id", orgId).limit(1).maybeSingle();
  return data;
}

// ── Booking payment ──
export async function updateBookingPayment(table: string, id: string, updates: Record<string, any>) {
  const { error } = await (supabase as any).from(table).update(updates).eq("id", id);
  if (error) throw error;
}

// ── Payment requests ──
export async function fetchPaymentRequest(requestId: string) {
  const { data, error } = await (supabase as any)
    .from("payment_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// ── Wallet activity ──
export async function fetchWalletActivity(userId: string) {
  const { data: accounts, error: aErr } = await supabase
    .from("wallet_accounts")
    .select("id")
    .eq("owner_user_id", userId);
  if (aErr) throw aErr;
  const ids = (accounts ?? []).map((a: any) => a.id);
  if (!ids.length) return [];

  const { data, error } = await supabase
    .from("wallet_ledger_entries")
    .select("*")
    .in("wallet_account_id", ids)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as any[];
}

// ── Concierge payment ──
export async function createConciergePayment(body: Record<string, any>) {
  const { data, error } = await supabase.functions.invoke("create-concierge-payment", { body });
  if (error) throw error;
  return data;
}

// ── Booking payment ──
export async function createBookingPayment(body: Record<string, any>) {
  const { data, error } = await supabase.functions.invoke("create-booking-payment", { body });
  if (error) throw error;
  return data;
}
