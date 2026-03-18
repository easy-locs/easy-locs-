/**
 * Demo seed for the System Audit — inserts minimal data so the audit
 * can show realistic PASS/WARN states instead of empty-table failures.
 *
 * All table names and columns match the REAL Supabase schema.
 * All rows set user-scoped columns (user_id, customer_user_id, buyer_id)
 * to auth.uid() so RLS policies allow the current user to read them.
 */
import { supabase } from "@/integrations/supabase/client";

export async function seedAuditDemoData(workspaceId?: string) {
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id;
  if (!userId) throw new Error("Must be authenticated to seed demo data");

  const ws = workspaceId ?? null;
  const now = new Date().toISOString();
  const errors: string[] = [];

  // 1. User profile (upsert — may already exist)
  const { error: profileErr } = await (supabase as any)
    .from("user_profiles")
    .upsert({ id: userId, full_name: "Demo User", updated_at: now }, { onConflict: "id" });
  if (profileErr) errors.push(`user_profiles: ${profileErr.message}`);

  // 2. Merchant profile
  const { data: merchant, error: merchantErr } = await (supabase as any)
    .from("merchant_onboarding_profiles")
    .insert({
      workspace_id: ws,
      merchant_name: "Demo Restaurant",
      contact_name: "Ali Demo",
      email: "demo@easy-locs.com",
      phone: "+33600000000",
      city: "Paris",
      cuisine_type: "Fast Food",
      onboarding_status: "approved",
    })
    .select("id")
    .maybeSingle();
  if (merchantErr) errors.push(`merchant_onboarding_profiles: ${merchantErr.message}`);

  // 3. Driver profile (user_id = auth.uid() required by RLS)
  const { data: driver, error: driverErr } = await (supabase as any)
    .from("driver_profiles")
    .insert({
      workspace_id: ws,
      user_id: userId,
      vehicle_type: "scooter",
      plate_number: "DEMO-001",
      is_online: true,
      is_available: true,
      is_verified: true,
      service_mode: "delivery",
      current_status: "idle",
    })
    .select("id")
    .maybeSingle();
  if (driverErr) errors.push(`driver_profiles: ${driverErr.message}`);

  // 4. Order (customer_user_id = auth.uid() required by RLS)
  const { data: order, error: orderErr } = await (supabase as any)
    .from("orders")
    .insert({
      workspace_id: ws,
      customer_user_id: userId,
      order_type: "delivery",
      service_mode: "delivery",
      status: "paid",
      total_amount: 2500,
      currency: "EUR",
    })
    .select("id")
    .maybeSingle();
  if (orderErr) errors.push(`orders: ${orderErr.message}`);

  // 5. Order items
  if (order?.id) {
    const { error: itemsErr } = await (supabase as any)
      .from("order_items")
      .insert([
        { order_id: order.id, item_name: "Burger Classic", quantity: 2, unit_price: 850, total_price: 1700 },
        { order_id: order.id, item_name: "Frites", quantity: 1, unit_price: 400, total_price: 400 },
        { order_id: order.id, item_name: "Coca-Cola", quantity: 1, unit_price: 400, total_price: 400 },
      ]);
    if (itemsErr) errors.push(`order_items: ${itemsErr.message}`);
  }

  // 6. Payment intent (user_id = auth.uid() required by RLS)
  const { error: piErr } = await (supabase as any)
    .from("payment_intents")
    .insert({
      workspace_id: ws,
      order_id: order?.id ?? null,
      user_id: userId,
      amount: 2500,
      currency: "EUR",
      status: "paid",
      provider: "demo",
    });
  if (piErr) errors.push(`payment_intents: ${piErr.message}`);

  // 7. Dispatch job (buyer_id = auth.uid() required by RLS insert policy)
  const { error: dispatchErr } = await (supabase as any)
    .from("dispatch_jobs")
    .insert({
      workspace_id: ws,
      order_id: order?.id ?? null,
      buyer_id: userId,
      assigned_driver_id: driver?.id ?? null,
      status: "assigned",
      pickup_label: "12 Rue Demo, Paris",
      dropoff_label: "45 Avenue Test, Paris",
    });
  if (dispatchErr) errors.push(`dispatch_jobs: ${dispatchErr.message}`);

  // 8. Tracking session (customer_user_id = auth.uid() required by RLS)
  const { data: trackingSession, error: tsErr } = await (supabase as any)
    .from("live_tracking_sessions")
    .insert({
      workspace_id: ws,
      context_type: "order",
      context_id: order?.id ?? "00000000-0000-0000-0000-000000000000",
      driver_id: driver?.id ?? null,
      customer_user_id: userId,
      status: "active",
    })
    .select("id")
    .maybeSingle();
  if (tsErr) errors.push(`live_tracking_sessions: ${tsErr.message}`);

  // 9. Tracking points (5 sample GPS points)
  if (trackingSession?.id) {
    const baseLatParis = 48.8566;
    const baseLngParis = 2.3522;
    const points = Array.from({ length: 5 }, (_, i) => ({
      session_id: trackingSession.id,
      lat: baseLatParis + i * 0.001,
      lng: baseLngParis + i * 0.0015,
      recorded_at: new Date(Date.now() - (5 - i) * 60_000).toISOString(),
    }));
    const { error: ptErr } = await (supabase as any).from("live_tracking_points").insert(points);
    if (ptErr) errors.push(`live_tracking_points: ${ptErr.message}`);
  }

  if (errors.length > 0) {
    console.warn("[seed-demo] partial failures:", errors);
  }

  return {
    userId,
    merchantId: merchant?.id ?? null,
    driverId: driver?.id ?? null,
    orderId: order?.id ?? null,
    trackingSessionId: trackingSession?.id ?? null,
    errors,
  };
}
