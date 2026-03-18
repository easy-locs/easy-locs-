/**
 * Demo seed for the System Audit — inserts minimal data so the audit
 * can show realistic PASS/WARN states instead of empty-table failures.
 *
 * All table names and columns match the REAL Supabase schema.
 */
import { supabase } from "@/integrations/supabase/client";

export async function seedAuditDemoData(workspaceId?: string) {
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id;
  if (!userId) throw new Error("Must be authenticated to seed demo data");

  const ws = workspaceId ?? null;
  const now = new Date().toISOString();

  // 1. User profile (upsert — may already exist)
  // Schema: user_profiles(id, full_name, phone, avatar_url, locale, timezone, ...)
  await (supabase as any)
    .from("user_profiles")
    .upsert({ id: userId, full_name: "Demo User", updated_at: now }, { onConflict: "id" });

  // 2. Merchant profile
  // Schema: merchant_onboarding_profiles(id, workspace_id, merchant_name, contact_name, email, phone, city, cuisine_type, onboarding_status, ...)
  const { data: merchant } = await (supabase as any)
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
    .single();

  // 3. Driver profile
  // Schema: driver_profiles(id, user_id, workspace_id, service_mode, vehicle_type, plate_number, is_online, is_available, is_verified, current_status, ...)
  const { data: driver } = await (supabase as any)
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
    .single();

  // 4. Order
  // Schema: orders(id, workspace_id, customer_user_id, order_type, service_mode, status, currency, total_amount, ...)
  const { data: order } = await (supabase as any)
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
    .single();

  // 5. Order items
  // Schema: order_items(id, order_id, item_name, quantity, unit_price, total_price, ...)
  if (order?.id) {
    await (supabase as any)
      .from("order_items")
      .insert([
        { order_id: order.id, item_name: "Burger Classic", quantity: 2, unit_price: 850, total_price: 1700 },
        { order_id: order.id, item_name: "Frites", quantity: 1, unit_price: 400, total_price: 400 },
        { order_id: order.id, item_name: "Coca-Cola", quantity: 1, unit_price: 400, total_price: 400 },
      ]);
  }

  // 6. Payment intent
  // Schema: payment_intents(id, workspace_id, order_id, amount, currency, status, provider, ...)
  await (supabase as any)
    .from("payment_intents")
    .insert({
      workspace_id: ws,
      order_id: order?.id ?? null,
      amount: 2500,
      currency: "EUR",
      status: "paid",
      provider: "demo",
    });

  // 7. Dispatch job
  // Schema: dispatch_jobs(id, workspace_id, order_id, assigned_driver_id, status, pickup_label, dropoff_label, ...)
  await (supabase as any)
    .from("dispatch_jobs")
    .insert({
      workspace_id: ws,
      order_id: order?.id ?? null,
      assigned_driver_id: driver?.id ?? null,
      status: "assigned",
      pickup_label: "12 Rue Demo, Paris",
      dropoff_label: "45 Avenue Test, Paris",
    });

  // 8. Tracking session
  // Schema: live_tracking_sessions(id, workspace_id, context_type, context_id, driver_id, status, ...)
  const { data: trackingSession } = await (supabase as any)
    .from("live_tracking_sessions")
    .insert({
      workspace_id: ws,
      context_type: "order",
      context_id: order?.id ?? "00000000-0000-0000-0000-000000000000",
      driver_id: driver?.id ?? null,
      status: "active",
    })
    .select("id")
    .single();

  // 9. Tracking points (5 sample GPS points)
  // Schema: live_tracking_points(id, session_id, lat, lng, recorded_at, ...)
  if (trackingSession?.id) {
    const baseLatParis = 48.8566;
    const baseLngParis = 2.3522;
    const points = Array.from({ length: 5 }, (_, i) => ({
      session_id: trackingSession.id,
      lat: baseLatParis + i * 0.001,
      lng: baseLngParis + i * 0.0015,
      recorded_at: new Date(Date.now() - (5 - i) * 60_000).toISOString(),
    }));
    await (supabase as any).from("live_tracking_points").insert(points);
  }

  return {
    userId,
    merchantId: merchant?.id ?? null,
    driverId: driver?.id ?? null,
    orderId: order?.id ?? null,
    trackingSessionId: trackingSession?.id ?? null,
  };
}
