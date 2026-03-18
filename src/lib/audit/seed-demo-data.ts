/**
 * Demo seed for the System Audit — inserts minimal data so the audit
 * can show realistic PASS/WARN states instead of empty-table failures.
 *
 * Run from the Audit page via a "Seed demo data" button, or call directly.
 */
import { supabase } from "@/integrations/supabase/client";

export async function seedAuditDemoData(workspaceId?: string) {
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id;
  if (!userId) throw new Error("Must be authenticated to seed demo data");

  const ws = workspaceId ?? null;
  const now = new Date().toISOString();

  // 1. User profile (upsert — may already exist)
  await (supabase as any)
    .from("user_profiles")
    .upsert({ id: userId, full_name: "Demo User", updated_at: now }, { onConflict: "id" });

  // 2. Merchant profile
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
  const { data: order } = await (supabase as any)
    .from("orders")
    .insert({
      workspace_id: ws,
      customer_user_id: userId,
      status: "paid",
      total_amount: 2500,
      currency: "EUR",
      payment_method: "card",
    })
    .select("id")
    .single();

  // 5. Order items
  if (order?.id) {
    await (supabase as any)
      .from("order_items")
      .insert([
        { order_id: order.id, item_name: "Burger Classic", quantity: 2, unit_price: 850 },
        { order_id: order.id, item_name: "Frites", quantity: 1, unit_price: 400 },
        { order_id: order.id, item_name: "Coca-Cola", quantity: 1, unit_price: 400 },
      ]);
  }

  // 6. Payment intent
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
  await (supabase as any)
    .from("dispatch_jobs")
    .insert({
      workspace_id: ws,
      order_id: order?.id ?? null,
      assigned_driver_id: driver?.id ?? null,
      status: "assigned",
      pickup_address: "12 Rue Demo, Paris",
      delivery_address: "45 Avenue Test, Paris",
    });

  // 8. Tracking session
  const { data: trackingSession } = await (supabase as any)
    .from("live_tracking_sessions")
    .insert({
      workspace_id: ws,
      order_id: order?.id ?? null,
      driver_id: driver?.id ?? null,
      status: "active",
    })
    .select("id")
    .single();

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
