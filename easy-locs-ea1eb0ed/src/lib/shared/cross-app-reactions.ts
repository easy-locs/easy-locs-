/**
 * Cross-App Reactions — Canonical listeners for super-app integration.
 *
 * FIXED: Now listens on COLON notation (what actual emitters use)
 * instead of DOT notation (which real UI code never emits).
 *
 * Wallet → Orbit (payment confirmation in chat)
 * Booking → Orbit (booking created system message)
 * Radar → Orbit (location shared message)
 * Marketplace → Orbit (contact opened)
 * All critical events → Dashboard refresh + Notification
 */
import { platformBus } from "@/lib/shared/platform-bus";
import { APP_EVENTS } from "@/lib/platform/events";
import { supabase } from "@/integrations/supabase/client";
import { createAppNotification } from "@/lib/notifications/app-notification-service";

async function getCurrentUser() {
  const { data } = await supabase.auth.getUser();
  return data?.user ?? null;
}

export function installCrossAppReactions(): () => void {
  const unsubs: (() => void)[] = [];

  // ── Wallet payment completed → notification ──
  // Covers merchant payments, QR payments, checkout flows
  const handleWalletPayment = async (event: any) => {
    const p = event.payload as any;

    const user = await getCurrentUser();
    if (!user) return;

    // Notification (system message is already created by orbit-payment-bridge)
    try {
      await createAppNotification({
        userId: user.id,
        scope: "wallet",
        title: "Payment completed",
        body: `${p.amount ?? ""} ${p.currency ?? ""}`.trim(),
        route: "/wallet",
        severity: "success",
      });
    } catch (e) {
      console.error("[cross-app] wallet notification failed", e);
    }

  };

  unsubs.push(
    platformBus.on("wallet:payment_completed", handleWalletPayment),
  );

  // ── Wallet payment_success → notification ──
  // Covers flows that emit APP_EVENTS.WALLET_PAYMENT_SUCCESS ("wallet:payment_success")
  // e.g. wallet-flow-bridge smartWalletTransfer
  unsubs.push(
    platformBus.on(APP_EVENTS.WALLET_PAYMENT_SUCCESS, handleWalletPayment),
  );

  // ── P2P Transfer completed → notification ──
  // wallet-transfer.ts and wallet-flow-bridge.ts emit wallet:transfer_completed.
  // Without this listener, P2P transfers produce no user-facing notification.
  unsubs.push(
    platformBus.on(APP_EVENTS.WALLET_TRANSFER_COMPLETED, async (event: any) => {
      const p = event.payload as any;
      const user = await getCurrentUser();
      if (!user) return;

      try {
        await createAppNotification({
          userId: user.id,
          scope: "wallet",
          title: "Transfer completed",
          body: p.amount && p.currency
            ? `${p.amount} ${p.currency} sent successfully`
            : "Your transfer was sent successfully",
          route: "/wallet",
          severity: "success",
        });
      } catch (e) {
        console.error("[cross-app] P2P transfer notification failed", e);
      }
    }),
  );

  // ── Booking created → inject system message in Orbit chat ──
  const handleBookingCreated = async (event: any) => {
    const p = event.payload as any;
    if (!p?.conversationId) return;

    const user = await getCurrentUser();
    if (!user) return;

    try {
      const { insertMessage } = await import("@/repositories/communication.repository");
      await insertMessage({
        conversationId: p.conversationId,
        senderUserId: user.id,
        senderOrbitId: p.senderOrbitId ?? null,
        type: "system",
        body: `📘 Booking created · ${p.reference ?? p.bookingId ?? ""}`,
        metadata: { schemaVersion: 1, booking_id: p.bookingId, source: "booking" },
      });

      await createAppNotification({
        userId: user.id,
        scope: "booking",
        title: "Booking created",
        body: p.reference ?? "New booking",
        route: "/travel",
        severity: "info",
      });
    } catch (e) {
      console.error("[cross-app] booking→orbit message failed", e);
    }

  };

  unsubs.push(
    platformBus.on("marketplace:booking_created", handleBookingCreated),
  );

  // ── Radar location shared → inject location message in Orbit chat ──
  unsubs.push(
    platformBus.on("radar:location_shared", async (event) => {
      const p = event.payload as any;
      if (!p?.conversationId) return;

      const user = await getCurrentUser();
      if (!user) return;

      try {
        const { insertMessage } = await import("@/repositories/communication.repository");
        await insertMessage({
          conversationId: p.conversationId,
          senderUserId: user.id,
          senderOrbitId: p.senderOrbitId ?? null,
          type: "location_static",
          body: `📍 Location shared`,
          metadata: { schemaVersion: 1, lat: p.lat, lng: p.lng, source: "radar" },
        });
      } catch (e) {
        console.error("[cross-app] radar→orbit message failed", e);
      }
    })
  );

  unsubs.push(
    platformBus.on("marketplace:listing_published", async (event) => {
      const p = event.payload as any;

      const user = await getCurrentUser();
      if (!user || !p?.merchantId) return;

      try {
        await createAppNotification({
          userId: user.id,
          scope: "dashboard",
          category: "marketplace_listing",
          title: "Listing published",
          body: `Listing published for merchant ${p.merchantId}`,
          severity: "info",
          entityType: "merchant",
          entityId: p.merchantId,
        });
      } catch (e) {
        console.error("[cross-app] marketplace notification failed", e);
      }
    })
  );

  unsubs.push(
    platformBus.on("marketplace:contact_opened", async (event) => {
      const p = event.payload as any;

      const user = await getCurrentUser();
      if (!user || !p?.merchantId) return;

      try {
        await createAppNotification({
          userId: user.id,
          scope: "dashboard",
          category: "marketplace_lead",
          title: "New marketplace contact",
          body: `Lead from merchant ${p.merchantId}`,
          severity: "info",
          entityType: "merchant",
          entityId: p.merchantId,
        });
      } catch (e) {
        console.error("[cross-app] contact notification failed", e);
      }
    })
  );

  // ── Booking confirmed → notification + dashboard ──
  unsubs.push(
    platformBus.on("marketplace:booking_confirmed", async (event) => {
      const p = event.payload as any;
      const user = await getCurrentUser();
      if (!user) return;

      try {
        await createAppNotification({
          userId: user.id,
          scope: "booking",
          title: "Booking confirmed",
          body: p.reference ?? "Your booking is confirmed",
          route: "/travel",
          severity: "success",
        });
      } catch (e) {
        console.error("[cross-app] booking confirmed notification failed", e);
      }
    })
  );


  unsubs.push(
    platformBus.on("orbit:unread_corrected", (event) => {
      if (import.meta.env.DEV) console.log("[cross-app] orbit:unread_corrected consumed", event.payload);
    })
  );

  // ── wallet:payment_requested → open Wallet POS via bus ──
  unsubs.push(
    platformBus.on(APP_EVENTS.WALLET_PAYMENT_REQUESTED, (event) => {
      const p = event.payload as any;
      platformBus.emit(APP_EVENTS.WALLET_POS_UPDATED, {
        action: "open",
        transactionId: p?.transactionId,
        amount: p?.amount,
        currency: p?.currency,
        conversationId: p?.conversationId,
      }, "wallet");
    })
  );

  // ── radar:scan_completed → notify Dashboard to update contextual suggestions ──
  unsubs.push(
    platformBus.on(APP_EVENTS.RADAR_SCAN_COMPLETED, (event) => {
      platformBus.emit(APP_EVENTS.DASHBOARD_REFRESH, { source: "radar_scan", ...(event.payload as object) }, "system");
    })
  );

  // ── wallet:integrity_alert → security notification ──
  unsubs.push(
    platformBus.on(APP_EVENTS.WALLET_INTEGRITY_ALERT, async (event) => {
      const p = event.payload as any;
      const user = await getCurrentUser();
      if (!user) return;

      try {
        await createAppNotification({
          userId: user.id,
          scope: "wallet",
          title: "Security alert",
          body: p?.message ?? "A wallet integrity issue was detected. Please review your account.",
          route: "/wallet",
          severity: "warning",
        });
      } catch (e) {
        console.error("[cross-app] wallet integrity alert notification failed", e);
      }
    })
  );

  // ── wallet:balance_updated → refresh Dashboard KPI totalRevenue in real-time ──
  unsubs.push(
    platformBus.on(APP_EVENTS.WALLET_BALANCE_UPDATED, () => {
      platformBus.emit(APP_EVENTS.DASHBOARD_COUNTERS_REFRESH, { source: "wallet_balance_updated" }, "wallet");
    })
  );

  return () => unsubs.forEach((fn) => fn());
}
