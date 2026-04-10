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

  // ── Wallet payment completed → inject system message in Orbit chat ──
  // Listens on BOTH notations to catch events from any source
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

    platformBus.emit("dashboard:refresh" as any, { source: "wallet" }, "wallet");
  };

  unsubs.push(
    platformBus.on("wallet:payment_completed", handleWalletPayment),
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

    platformBus.emit("dashboard:refresh" as any, { source: "booking" }, "system");
  };

  unsubs.push(
    platformBus.on("marketplace:booking_created", handleBookingCreated),
  );

  // ── Radar location shared → inject location message in Orbit chat ──
  unsubs.push(
    platformBus.on("radar:location_shared" as any, async (event) => {
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

  // ── Marketplace contact opened → notify + dashboard refresh ──
  unsubs.push(
    platformBus.on("marketplace:listing_published", async (event) => {
      const p = event.payload as any;
      platformBus.emit("dashboard:refresh" as any, { source: "marketplace" }, "marketplace");

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
        console.error("[cross-app] marketplace notification failed", e);
      }
    })
  );

  // ── Booking confirmed → notification + dashboard ──
  unsubs.push(
    platformBus.on("marketplace:booking_confirmed", async (event) => {
      const p = event.payload as any;
      platformBus.emit("dashboard:refresh" as any, { source: "booking" }, "system");

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

  // ── Radar entity selected → dashboard context update ──
  unsubs.push(
    platformBus.on("radar:entity_selected" as any, (event) => {
      platformBus.emit("dashboard:refresh" as any, { source: "radar", entity: (event.payload as any)?.entityId }, "system");
    })
  );

  // ── Radar geo updated → invalidate nearby caches ──
  unsubs.push(
    platformBus.on("radar:geo_updated" as any, () => {
      platformBus.emit("dashboard:counters_refresh" as any, { source: "radar" }, "system");
    })
  );

  return () => unsubs.forEach((fn) => fn());
}
