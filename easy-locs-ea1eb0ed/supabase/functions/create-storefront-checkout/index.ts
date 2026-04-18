import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
/**
 * create-storefront-checkout — Backend-validated storefront order + Stripe checkout session.
 * 1. Validates shop, items, prices against catalog_items
 * 2. Creates order ATOMICALLY via RPC (order + items + status history)
 * 3. Creates Stripe checkout session linked to order
 * 4. Returns checkout URL
 */
import Stripe from "npm:stripe@17.7.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { checkServerRateLimit, rateLimitResponse } from "../_shared/server-rate-limiter.ts";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

const log = (step: string, d?: any) =>
  console.log(`[STOREFRONT-CHECKOUT] ${step}${d ? ` — ${JSON.stringify(d)}` : ""}`);

Deno.serve(async (req) => {
  const __qsCheck = rejectQuerySecrets(req); if (__qsCheck.rejected) return __qsCheck.response!;
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  try {
    const rlResult = await checkServerRateLimit(req, "create-storefront-checkout");
    if (!rlResult.allowed) return rateLimitResponse(rlResult);

    // ── Auth ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: authErr } = await admin.auth.getUser(token);
    if (authErr || !claims.user) throw new Error("Authentication failed");
    const user = claims.user;
    log("Authenticated", { uid: user.id });

    // ── Parse request ──
    const body = await req.json();
    const {
      shopId,
      items, // { itemId, quantity, notes? }[]
      fulfillmentType = "pickup",
      deliveryAddress,
      deliveryLat,
      deliveryLng,
      notes,
      idempotencyKey,
      tableCode,
    } = body;

    if (!shopId) throw new Error("shopId required");
    if (!items?.length) throw new Error("items required");

    // ── Idempotency ──
    if (idempotencyKey) {
      const { data: existing } = await admin
        .from("storefront_orders")
        .select("id, status")
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();

      if (existing) {
        log("Idempotent hit", { orderId: existing.id });
        return new Response(JSON.stringify({ orderId: existing.id, alreadyExists: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ── Validate shop ──
    const { data: shop, error: shopErr } = await admin
      .from("storefront_pages")
      .select("id, user_id, name, slug, currency, active")
      .eq("id", shopId)
      .single();

    if (shopErr || !shop) throw new Error("Shop not found");
    if (!shop.active) throw new Error("Shop is not active");
    log("Shop validated", { shopId: shop.id, name: shop.name });

    const currency = shop.currency || "EUR";

    // ── Validate items against catalog ──
    const itemIds = items.map((i: any) => i.itemId);
    const { data: catalogItems, error: catErr } = await admin
      .from("catalog_items")
      .select("id, title, price, currency, available, shop_id")
      .in("id", itemIds);

    if (catErr) throw new Error("Failed to validate catalog items");

    const catalogMap = new Map((catalogItems || []).map((ci: any) => [ci.id, ci]));

    // Build validated item rows + compute totals server-side
    let subtotal = 0;
    const validatedItems: any[] = [];

    for (const reqItem of items) {
      const ci = catalogMap.get(reqItem.itemId);
      if (!ci) throw new Error(`Item ${reqItem.itemId} not found in catalog`);
      if (ci.shop_id !== shopId) throw new Error(`Item ${ci.title} does not belong to this shop`);
      if (ci.available === false) throw new Error(`Item ${ci.title} is currently unavailable`);

      const qty = Math.max(1, Math.round(reqItem.quantity || 1));
      const unitPrice = Number(ci.price || 0);
      const totalPrice = Number((unitPrice * qty).toFixed(2));
      subtotal += totalPrice;

      validatedItems.push({
        item_id: ci.id,
        title: ci.title,
        unit_price: unitPrice,
        quantity: qty,
        total_price: totalPrice,
        notes: reqItem.notes || null,
      });
    }

    subtotal = Number(subtotal.toFixed(2));
    const deliveryFee = fulfillmentType === "delivery" ? 0 : 0; // extend later
    const total = Number((subtotal + deliveryFee).toFixed(2));

    if (total <= 0) throw new Error("Order total must be positive");

    log("Items validated", { count: validatedItems.length, subtotal, total, currency });

    // ── Create order ATOMICALLY via RPC ──
    const orderPayload = {
      shop_id: shop.id,
      seller_id: shop.user_id,
      buyer_id: user.id,
      buyer_email: user.email || null,
      payment_method: "card",
      subtotal,
      delivery_fee: deliveryFee,
      shipping_fee: deliveryFee,
      total,
      currency,
      notes: notes || null,
      delivery_address: deliveryAddress || null,
      delivery_lat: deliveryLat || null,
      delivery_lng: deliveryLng || null,
      requires_delivery: fulfillmentType === "delivery",
      idempotency_key: idempotencyKey || null,
      table_code: tableCode || null,
      fulfillment_type: fulfillmentType,
    };

    const { data: rpcResult, error: rpcErr } = await admin.rpc("create_storefront_order_atomic", {
      p_order: orderPayload,
      p_items: validatedItems,
    });

    if (rpcErr) throw new Error(`Atomic order creation failed: ${rpcErr.message}`);
    const orderId = rpcResult?.order_id;
    if (!orderId) throw new Error("Order creation returned no ID");
    log("Order created atomically", { orderId });

    // ── Create Stripe checkout session ──
    const stripeKey = (Deno.env.get("STRIPE_SECRET_KEY") || "").replace(/[^\x20-\x7E]/g, "").trim();
    if (!stripeKey) {
      // No Stripe configured — return order only (for wallet/cash flows)
      return new Response(JSON.stringify({ orderId, checkoutUrl: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-12-18.acacia" });

    const origin = req.headers.get("origin") || "https://www.easy-locs.com";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: user.email || undefined,
      line_items: validatedItems.map((vi) => ({
        price_data: {
          currency: currency.toLowerCase(),
          product_data: { name: vi.title },
          unit_amount: Math.round(vi.unit_price * 100),
        },
        quantity: vi.quantity,
      })),
      metadata: {
        type: "storefront_order",
        order_id: orderId,
        shop_id: shop.id,
        buyer_id: user.id,
        seller_id: shop.user_id,
      },
      success_url: `${origin}/order/${orderId}?payment=success`,
      cancel_url: `${origin}/order/${orderId}?payment=cancelled`,
    });

    // Store stripe session on order
    await admin
      .from("storefront_orders")
      .update({ stripe_session_id: session.id })
      .eq("id", orderId);

    log("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(
      JSON.stringify({ orderId, checkoutUrl: session.url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    log("ERROR", { message: e.message });
    return new Response(
      JSON.stringify({ error: e.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
    );
  }
});
