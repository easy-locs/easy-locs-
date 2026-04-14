import { platformBus, type PlatformEventType } from "@/lib/shared/platform-bus";
import { queryClient } from "@/lib/query-client";
import { installModuleIntelligence } from "@/engines/core/module-intelligence";
import { installNetworkOptimizer } from "@/engines/core/network-optimizer";
import { installSelfPilot } from "@/engines/core/self-pilot";
import { moduleRegistry, installModuleLifecycle } from "@/lib/core/module-registry";
import { runtimePipeline } from "@/lib/platform/runtime-pipeline";
import { moduleHealthSystem } from "@/lib/platform/module-health-system";
import { triggerGlobalRefresh } from "@/lib/shared/global-refresh-orchestrator";

export interface TransferCompletedPayload {
  senderId: string;
  receiverId: string;
  amount: number;
  currency: string;
  description?: string;
  senderName?: string;
  receiverName?: string;
}

export function emitTransferCompleted(payload: TransferCompletedPayload) {
  platformBus.emit("wallet:transfer_completed", payload, "wallet");
  platformBus.emit("wallet:balance_updated", { amount: payload.amount, currency: payload.currency }, "wallet");
  platformBus.emit("dashboard:counters_refresh", {}, "wallet");
}

export function emitOrderCreated(payload: { orderId: string; type: string; total: number; currency: string }) {
  platformBus.emit("storefront:order_placed", payload, "marketplace");
  platformBus.emit("dashboard:counters_refresh", {}, "marketplace");
}

export function emitBookingConfirmed(payload: { bookingId: string; type: string; date: string }) {
  platformBus.emit("marketplace:booking_confirmed", payload, "marketplace");
  platformBus.emit("dashboard:counters_refresh", {}, "marketplace");
}

export function emitPaymentFailed(payload: { reason: string; amount?: number; currency?: string }) {
  platformBus.emit("wallet:payment_failed", payload, "wallet");
}

export function emitMessageSent(payload: { threadId: string; recipientId: string; type?: string }) {
  platformBus.emit("orbit:message_sent", payload, "orbit");
}

export function emitBookingCreated(payload: { bookingId: string; providerId: string; type: string; amount: number; currency: string }) {
  platformBus.emit("marketplace:booking_created", payload, "marketplace");
  platformBus.emit("dashboard:counters_refresh", {}, "marketplace");
}

export function emitDeliveryStatusChanged(payload: { orderId: string; status: string; driverId?: string }) {
  const statusMap: Record<string, PlatformEventType> = {
    dispatched: "delivery:dispatched",
    pickup_arrived: "delivery:pickup_arrived",
    picked_up: "delivery:picked_up",
    in_progress: "delivery:in_progress",
    delivered: "delivery:delivered",
    completed: "delivery:completed",
    failed: "delivery:failed",
    validated: "delivery:validated",
  };
  const eventType = statusMap[payload.status] || "delivery:in_progress";
  platformBus.emit(eventType, payload, "tracking");
  platformBus.emit("dashboard:counters_refresh", {}, "tracking");
}

export function emitPropertyEvent(payload: { unitId?: string; leaseId?: string; action: string }) {
  const actionMap: Record<string, PlatformEventType> = {
    lease_created: "pm:lease_created",
    lease_activated: "pm:lease_activated",
    payment_received: "pm:payment_received",
    receipt_generated: "pm:receipt_generated",
    intervention_created: "pm:intervention_created",
    document_shared: "pm:document_shared",
    unit_created: "property:unit_created",
    rent_call_created: "pm:rent_call_created",
  };
  const eventType = actionMap[payload.action] || "pm:lease_created";
  platformBus.emit(eventType, payload, "pm");
  platformBus.emit("dashboard:counters_refresh", {}, "pm");
}

export function emitModuleEvent(
  type: PlatformEventType,
  payload: Record<string, unknown>,
  source: "wallet" | "orbit" | "marketplace" | "pm" | "system" | "tracking"
) {
  platformBus.emit(type, payload, source);
}

export interface BridgeContactProviderPayload {
  providerId: string;
  providerName: string;
  contextType: string;
  contextId: string;
  userId: string;
  initialMessage?: string;
}

export interface BridgePayNowPayload {
  payerId: string;
  payeeId: string;
  amount: number;
  currency: string;
  contextType: "order" | "booking" | "subscription" | "transfer" | "invoice" | "ride" | "delivery";
  contextId: string;
  method?: "wallet" | "card" | "apple_pay" | "google_pay" | "qr" | "link" | "cash";
}

export interface BridgeBookNowPayload {
  userId: string;
  providerId: string;
  providerName: string;
  type: string;
  amount: number;
  currency: string;
  scheduledAt: string;
  metadata?: Record<string, unknown>;
}

export interface BridgeRequestDeliveryPayload {
  orderId: string;
  pickupAddress: Record<string, unknown>;
  deliveryAddress: Record<string, unknown>;
  userId: string;
  estimatedFee?: number;
  currency?: string;
}

export interface BridgeOpenSupportPayload {
  userId: string;
  subject: string;
  category: string;
  contextType?: string;
  contextId?: string;
  priority?: string;
}

export interface BridgeShareListingPayload {
  listingId: string;
  title: string;
  imageUrl?: string;
  price?: number;
  currency?: string;
  shareMethod: "link" | "qr" | "chat" | "social";
  userId: string;
}

export interface BridgeLaunchRoutePayload {
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  mode: "driving" | "walking" | "transit";
  contextType?: string;
  contextId?: string;
}

export interface BridgeCreateConversationPayload {
  initiatorId: string;
  participantId: string;
  contextType?: string;
  contextId?: string;
  contextLabel?: string;
  initialMessage?: string;
}

export interface BridgeAttachPaymentContextPayload {
  threadId: string;
  paymentIntentId: string;
  amount: number;
  currency: string;
  status: string;
}

export interface BridgeAttachOrderContextPayload {
  threadId: string;
  orderId: string;
  orderType: string;
  status: string;
  total?: number;
  currency?: string;
}

export interface BridgeAttachLiveLocationPayload {
  userId: string;
  contextType: string;
  contextId: string;
  position: { lat: number; lng: number };
  durationMinutes?: number;
}

export async function bridgeContactProvider(payload: BridgeContactProviderPayload): Promise<void> {
  let threadId: string | null = null;

  try {
    const { db } = await import("@/services/db");
    const { data: thread, error } = await db
      .from("conversations")
      .insert({
        participants: [payload.userId, payload.providerId],
        context_type: payload.contextType,
        context_id: payload.contextId,
        created_by: payload.userId,
      })
      .select("id")
      .single();

    if (error) {
      if (import.meta.env.DEV) console.warn("[bridge] bridgeContactProvider: DB persist failed, aborting emit", error);
      return;
    }
    threadId = thread.id;
  } catch (e) {
    if (import.meta.env.DEV) console.warn("[bridge] bridgeContactProvider: DB unavailable, aborting emit", e);
    return;
  }

  platformBus.emit("orbit:thread_created", {
    threadId,
    participantIds: [payload.userId, payload.providerId],
    providerName: payload.providerName,
    context: { type: payload.contextType, entityId: payload.contextId },
  }, "orbit");

  if (payload.initialMessage) {
    platformBus.emit("orbit:message_sent", {
      threadId: threadId ?? `${payload.userId}_${payload.providerId}`,
      recipientId: payload.providerId,
      body: payload.initialMessage,
      type: "text",
    }, "orbit");
  }
  platformBus.emit("dashboard:counters_refresh", {}, "orbit");
}

export async function bridgePayNow(payload: BridgePayNowPayload): Promise<void> {
  let transactionId: string | null = null;

  try {
    const { db } = await import("@/services/db");
    const refCode = `PAY-${Date.now().toString(36).toUpperCase()}`;
    const { data: tx, error } = await db
      .from("wallet_transactions")
      .insert({
        sender_id: payload.payerId,
        recipient_id: payload.payeeId,
        amount: payload.amount,
        currency: payload.currency,
        status: "pending",
        context_type: payload.contextType,
        context_id: payload.contextId,
        title: `Payment via ${payload.method ?? "wallet"}`,
        reference_code: refCode,
      })
      .select("id")
      .single();

    if (error) {
      if (import.meta.env.DEV) console.warn("[bridge] bridgePayNow: DB persist failed, aborting emit", error);
      return;
    }
    transactionId = tx.id;
  } catch (e) {
    if (import.meta.env.DEV) console.warn("[bridge] bridgePayNow: DB unavailable, aborting emit", e);
    return;
  }

  platformBus.emit("payment:intent_created", {
    transactionId,
    payerId: payload.payerId,
    payeeId: payload.payeeId,
    amount: payload.amount,
    currency: payload.currency,
    contextType: payload.contextType,
    contextId: payload.contextId,
    method: payload.method ?? "wallet",
  }, "wallet");
  platformBus.emit("wallet:payment_requested", {
    transactionId,
    amount: payload.amount,
    currency: payload.currency,
    referenceType: payload.contextType,
    referenceId: payload.contextId,
  }, "wallet");
  platformBus.emit("dashboard:counters_refresh", {}, "wallet");
}

export async function bridgeBookNow(payload: BridgeBookNowPayload): Promise<void> {
  let bookingId: string | null = null;

  try {
    const { db } = await import("@/services/db");
    const { data: booking, error } = await db
      .from("bookings")
      .insert({
        user_id: payload.userId,
        provider_id: payload.providerId,
        type: payload.type,
        amount: payload.amount,
        currency: payload.currency,
        scheduled_at: payload.scheduledAt,
        status: "pending",
        metadata: payload.metadata ?? {},
      })
      .select("id")
      .single();

    if (error) {
      if (import.meta.env.DEV) console.warn("[bridge] bridgeBookNow: DB persist failed, aborting emit", error);
      return;
    }
    bookingId = booking.id;
  } catch (e) {
    if (import.meta.env.DEV) console.warn("[bridge] bridgeBookNow: DB unavailable, aborting emit", e);
    return;
  }

  platformBus.emit("marketplace:booking_created", {
    bookingId,
    id: bookingId,
    userId: payload.userId,
    providerId: payload.providerId,
    providerName: payload.providerName,
    type: payload.type,
    amount: payload.amount,
    currency: payload.currency,
    scheduledAt: payload.scheduledAt,
    metadata: payload.metadata ?? {},
  }, "marketplace");
  platformBus.emit("dashboard:counters_refresh", {}, "marketplace");
}

export function bridgeRequestDelivery(payload: BridgeRequestDeliveryPayload): void {
  platformBus.emit("dispatch:job_created", {
    orderId: payload.orderId,
    pickupAddress: payload.pickupAddress,
    deliveryAddress: payload.deliveryAddress,
    userId: payload.userId,
    estimatedFee: payload.estimatedFee,
    currency: payload.currency,
  }, "tracking");
  platformBus.emit("dashboard:counters_refresh", {}, "tracking");
}

export function bridgeOpenSupport(payload: BridgeOpenSupportPayload): void {
  platformBus.emit("orbit:thread_created", {
    participantIds: [payload.userId, "support-agent"],
    context: {
      type: "support_case",
      entityId: payload.contextId,
      entityLabel: payload.subject,
    },
    category: payload.category,
    priority: payload.priority ?? "medium",
  }, "orbit");
  platformBus.emit("dashboard:counters_refresh", {}, "orbit");
}

export function bridgeShareListing(payload: BridgeShareListingPayload): void {
  platformBus.emit("marketplace:listing_shared", {
    listingId: payload.listingId,
    title: payload.title,
    imageUrl: payload.imageUrl,
    price: payload.price,
    currency: payload.currency,
    shareMethod: payload.shareMethod,
    sharedBy: payload.userId,
  }, "marketplace");
}

export function bridgeLaunchRoute(payload: BridgeLaunchRoutePayload): void {
  platformBus.emit("radar:location_shared", {
    origin: payload.origin,
    destination: payload.destination,
    mode: payload.mode,
    contextType: payload.contextType,
    contextId: payload.contextId,
  }, "tracking");
}

export function bridgeCreateConversation(payload: BridgeCreateConversationPayload): void {
  platformBus.emit("orbit:thread_created", {
    participantIds: [payload.initiatorId, payload.participantId],
    context: payload.contextType ? {
      type: payload.contextType,
      entityId: payload.contextId,
      entityLabel: payload.contextLabel,
    } : undefined,
  }, "orbit");
  if (payload.initialMessage) {
    platformBus.emit("orbit:message_sent", {
      threadId: `${payload.initiatorId}_${payload.participantId}`,
      recipientId: payload.participantId,
      body: payload.initialMessage,
      type: "text",
    }, "orbit");
  }
}

export function bridgeAttachPaymentContext(payload: BridgeAttachPaymentContextPayload): void {
  platformBus.emit("orbit:message_sent", {
    threadId: payload.threadId,
    type: "payment_receipt",
    body: null,
    metadata: {
      paymentIntentId: payload.paymentIntentId,
      amount: payload.amount,
      currency: payload.currency,
      status: payload.status,
    },
  }, "orbit");
}

export function bridgeAttachOrderContext(payload: BridgeAttachOrderContextPayload): void {
  platformBus.emit("orbit:message_sent", {
    threadId: payload.threadId,
    type: "booking_card",
    body: null,
    metadata: {
      orderId: payload.orderId,
      orderType: payload.orderType,
      status: payload.status,
      total: payload.total,
      currency: payload.currency,
    },
  }, "orbit");
}

export function bridgeAttachLiveLocation(payload: BridgeAttachLiveLocationPayload): void {
  platformBus.emit("radar:location_shared", {
    userId: payload.userId,
    position: payload.position,
    contextType: payload.contextType,
    contextId: payload.contextId,
    durationMinutes: payload.durationMinutes ?? 30,
    live: true,
  }, "tracking");
  platformBus.emit("tracking:started", {
    userId: payload.userId,
    contextType: payload.contextType,
    contextId: payload.contextId,
    position: payload.position,
  }, "tracking");
}

let _bridgeInstalled = false;

export function installSuperAppBridge() {
  if (_bridgeInstalled) return;
  _bridgeInstalled = true;

  installModuleIntelligence();
  installNetworkOptimizer();
  installSelfPilot();
  installModuleLifecycle();
  runtimePipeline.install();
  moduleHealthSystem.install();

  const invalidate = (...keys: string[]) => {
    for (const key of keys) {
      queryClient.invalidateQueries({ queryKey: [key] });
    }
  };

  platformBus.on("wallet:transfer_completed", () => {
    invalidate("wallet-balance", "wallet-transactions", "dashboard-live-stats", "threads");
    moduleRegistry.activateModule("wallet-transfers");
  });

  platformBus.on("wallet:balance_updated", () => {
    invalidate("wallet-balance");
  });

  platformBus.on("wallet:payment_completed", () => {
    invalidate("wallet-balance", "wallet-transactions", "dashboard-live-stats");
    moduleRegistry.activateModule("wallet-core");
  });

  platformBus.on("wallet:payment_failed", () => {
    invalidate("wallet-balance", "wallet-transactions");
  });

  platformBus.on("wallet:top_up", () => {
    invalidate("wallet-balance", "wallet-transactions");
  });

  platformBus.on("wallet:transaction_created", () => {
    invalidate("wallet-transactions", "dashboard-live-stats");
  });

  platformBus.on("wallet:payment_requested", (event) => {
    invalidate("wallet-transactions", "threads");
    const p = event.payload as Record<string, unknown>;
    const correlationId = event.correlationId;
    const amount = (p?.amount as number) ?? 0;
    const currency = (p?.currency as string) ?? "AED";
    const referenceType = (p?.referenceType as string) ?? (p?.context as string) ?? "payment";
    const referenceId = (p?.referenceId as string) ?? (p?.threadId as string) ?? "";

    (async () => {
      try {
        const { useWalletStore } = await import("@/stores/walletStore");
        const store = useWalletStore.getState();

        const wallet = store.wallet;
        if (!wallet) {
          platformBus.emit("wallet:payment_failed", {
            reason: "No wallet loaded — please load wallet before paying",
            amount, currency, referenceType, referenceId, correlationId,
          }, "wallet", { correlationId: correlationId ?? undefined });
          return;
        }

        if (wallet.availableBalance !== undefined && wallet.availableBalance < amount) {
          platformBus.emit("wallet:payment_failed", {
            reason: "Insufficient wallet balance",
            amount, currency, referenceType, referenceId, correlationId,
            availableBalance: wallet.availableBalance,
          }, "wallet", { correlationId: correlationId ?? undefined });
          return;
        }

        // If bridgePayNow already persisted a transaction, re-use that ID
        // instead of creating a duplicate record in wallet_transactions.
        const prePersistedId = p?.transactionId as string | undefined;
        const tx = prePersistedId
          ? { id: prePersistedId }
          : await store.createTransaction({
              type: "payment",
              amount: -Math.abs(amount),
              currency: currency as import("@/lib/types/domain").CurrencyCode,
              reference: `${referenceType}:${referenceId}`,
              status: "pending",
            });

        try {
          const { createLedgerEntry } = await import("@/lib/wallet/ledger");
          await createLedgerEntry({
            walletAccountId: wallet.walletId,
            direction: "out",
            amount: Math.abs(amount),
            currency,
            entryType: "payment",
            referenceId: tx.id,
            referenceType,
            note: `Payment for ${referenceType}:${referenceId}`,
          });
        } catch {
          // Ledger posting is best-effort in client context (requires auth);
          // walletStore transaction is the primary record for UI flows
        }

        store.markTransactionSuccess(tx.id);

        platformBus.emit("wallet:payment_success", {
          transactionId: tx.id,
          amount,
          currency,
          referenceType,
          referenceId,
          correlationId,
        }, "wallet", { correlationId: correlationId ?? undefined });
      } catch (err) {
        const reason = err instanceof Error ? err.message : "Payment processing failed";
        platformBus.emit("wallet:payment_failed", {
          reason,
          amount, currency, referenceType, referenceId, correlationId,
        }, "wallet", { correlationId: correlationId ?? undefined });
      }
    })();
  });

  platformBus.on("orbit:message_sent", () => {
    invalidate("threads", "dashboard-live-stats");
    moduleRegistry.activateModule("orbit-chat");
  });

  platformBus.on("orbit:message_received", () => {
    invalidate("threads", "dashboard-live-stats", "unread-counts");
  });

  platformBus.on("orbit:call_started", () => {
    invalidate("dashboard-live-stats");
  });

  platformBus.on("marketplace:booking_created", () => {
    invalidate("my-bookings", "dashboard-live-stats");
    moduleRegistry.activateModule("radar-booking");
    moduleRegistry.activateModule("marketplace-core");
  });

  platformBus.on("marketplace:booking_confirmed", () => {
    invalidate("my-bookings", "dashboard-live-stats");
  });

  platformBus.on("marketplace:booking_completed", () => {
    invalidate("my-bookings", "wallet-balance", "wallet-transactions", "dashboard-live-stats");
  });

  platformBus.on("marketplace:booking_cancelled", () => {
    invalidate("my-bookings", "wallet-balance", "dashboard-live-stats");
  });

  platformBus.on("marketplace:review_submitted", () => {
    invalidate("my-bookings", "storefront-reviews");
  });

  platformBus.onPrefix("storefront:", () => {
    invalidate("my-orders", "dashboard-live-stats");
  });

  platformBus.on("storefront:order_placed", () => {
    invalidate("my-orders", "wallet-balance", "wallet-transactions", "dashboard-live-stats");
    moduleRegistry.activateModule("marketplace-core");
  });

  platformBus.on("storefront:order_completed", () => {
    invalidate("my-orders", "wallet-balance", "wallet-transactions");
  });

  platformBus.on("storefront:cart_updated", () => {
    invalidate("cart");
  });

  platformBus.onPrefix("commerce:", () => {
    invalidate("wallet-balance", "wallet-transactions");
    moduleRegistry.activateModule("payments-core");
  });

  platformBus.onPrefix("delivery:", () => {
    invalidate("my-orders", "dashboard-live-stats", "active-delivery");
    moduleRegistry.activateModule("delivery-core");
  });

  platformBus.on("delivery:delivered", () => {
    invalidate("my-orders", "wallet-balance", "dashboard-live-stats");
  });

  platformBus.onPrefix("dispatch:", () => {
    invalidate("active-delivery", "my-orders", "dashboard-live-stats");
    moduleRegistry.activateModule("delivery-core");
  });

  platformBus.onPrefix("pm:", () => {
    invalidate("properties", "leases", "dashboard-live-stats");
    moduleRegistry.activateModule("property-core");
  });

  platformBus.on("pm:payment_received", () => {
    invalidate("properties", "leases", "wallet-balance", "wallet-transactions", "dashboard-live-stats");
  });

  platformBus.onPrefix("tracking:", () => {
    invalidate("active-delivery");
    moduleRegistry.activateModule("taxi-core");
  });

  platformBus.on("tracking:completed", () => {
    invalidate("active-delivery", "my-orders", "dashboard-live-stats");
  });

  platformBus.onPrefix("deal:", () => {
    invalidate("deals", "dashboard-live-stats");
  });

  platformBus.on("system:currency_changed", () => {
    invalidate("wallet-balance", "wallet-transactions", "my-orders", "my-bookings", "dashboard-live-stats");
    window.dispatchEvent(new CustomEvent("currency:changed"));
  });

  platformBus.on("radar:entity_selected", () => {
    moduleRegistry.activateModule("radar-core");
  });

  platformBus.on("dashboard:refresh", () => {
    invalidate("dashboard-live-stats", "dashboard-activity");
  });

  platformBus.on("payment:intent_created", () => {
    invalidate("wallet-balance", "wallet-transactions");
    moduleRegistry.activateModule("payments-core");
  });

  platformBus.on("marketplace:vente_completed", () => {
    invalidate("wallet-balance", "wallet-transactions", "my-orders", "dashboard-live-stats");
    moduleRegistry.activateModule("marketplace-core");
    moduleRegistry.activateModule("wallet-core");
  });

  platformBus.on("marketplace:stock_updated", () => {
    invalidate("dashboard-live-stats");
  });

  platformBus.on("marketplace:reservation_created", () => {
    invalidate("my-bookings", "dashboard-live-stats");
    moduleRegistry.activateModule("marketplace-core");
  });

  platformBus.on("marketplace:availability_updated", () => {
    invalidate("dashboard-live-stats");
  });

  platformBus.on("wallet:receipt_generated", () => {
    invalidate("wallet-transactions");
  });

  platformBus.on("wallet:commission_split", () => {
    invalidate("wallet-balance", "wallet-transactions", "dashboard-live-stats");
  });

  platformBus.on("orbit:presence_changed", () => {
    invalidate("contacts");
  });

  platformBus.on("property:published_to_marketplace", () => {
    invalidate("properties", "dashboard-live-stats");
    moduleRegistry.activateModule("property-core");
    moduleRegistry.activateModule("marketplace-core");
  });

  platformBus.on("onboarding:completed", () => {
    invalidate("dashboard-live-stats");
  });

  platformBus.on("import:completed", () => {
    invalidate("dashboard-live-stats", "marketplace-listings");
  });

  platformBus.on("transaction:created", () => {
    invalidate("wallet-balance", "wallet-transactions", "my-orders", "dashboard-live-stats");
  });

  platformBus.on("transaction:completed", () => {
    invalidate("wallet-balance", "wallet-transactions", "my-orders", "dashboard-live-stats");
  });

  platformBus.on("admin:audit_logged", () => {
    invalidate("dashboard-live-stats");
  });

  platformBus.on("admin:user_action", () => {
    invalidate("dashboard-live-stats");
  });

  platformBus.on("support:ticket_created", () => {
    invalidate("dashboard-live-stats");
  });

  platformBus.on("support:ticket_escalated", () => {
    invalidate("dashboard-live-stats");
  });

  platformBus.on("kyc:status_changed", () => {
    invalidate("dashboard-live-stats");
  });

  platformBus.on("compliance:aml_alert", () => {
    invalidate("dashboard-live-stats");
  });

  platformBus.on("moderation:action_taken", () => {
    invalidate("dashboard-live-stats");
  });

  platformBus.on("moderation:content_flagged", () => {
    invalidate("dashboard-live-stats");
  });

  platformBus.on("sla:warning", () => {
    invalidate("dashboard-live-stats");
  });

  platformBus.on("sla:breached", () => {
    invalidate("dashboard-live-stats");
  });

  platformBus.on("sla:escalated", () => {
    invalidate("dashboard-live-stats");
  });

  platformBus.on("automation:workflow_started", () => {
    invalidate("dashboard-live-stats");
  });

  platformBus.on("automation:workflow_completed", () => {
    invalidate("dashboard-live-stats");
  });

  platformBus.on("automation:workflow_failed", () => {
    invalidate("dashboard-live-stats");
  });

  platformBus.on("tenant:created", () => {
    invalidate("dashboard-live-stats");
  });

  platformBus.on("tenant:plan_upgraded", () => {
    invalidate("dashboard-live-stats");
  });

  platformBus.on("tenant:member_invited", () => {
    invalidate("dashboard-live-stats");
  });

  platformBus.on("tenant:quota_warning", () => {
    invalidate("dashboard-live-stats");
  });

  platformBus.on("api:request_completed", () => {
    invalidate("dashboard-live-stats");
  });

  platformBus.on("api:rate_limit_hit", () => {
    invalidate("dashboard-live-stats");
  });

  platformBus.on("api:webhook_delivered", () => {
    invalidate("dashboard-live-stats");
  });

  platformBus.on("property:device_state_changed", () => {
    invalidate("properties", "dashboard-live-stats");
  });

  platformBus.on("property:access_granted", () => {
    invalidate("properties");
  });

  platformBus.on("property:automation_triggered", () => {
    invalidate("properties");
  });

  platformBus.on("storefront:loyalty_earned", () => {
    invalidate("dashboard-live-stats");
  });

  platformBus.on("storefront:growth_milestone", () => {
    invalidate("dashboard-live-stats");
  });

  platformBus.on("listing:viewed", () => {
    invalidate("dashboard-live-stats");
  });

  platformBus.on("orbit:session_restored", () => {
    invalidate("threads", "contacts", "unread-counts");
    moduleRegistry.activateModule("orbit-chat");
  });

  platformBus.on("orbit:media_attached", () => {
    invalidate("threads");
  });

  platformBus.on("ui:interaction_performed", () => {
    /* analytics only — no cache invalidation needed */
  });

  platformBus.on("ui:gesture_detected", () => {
    /* analytics only — no cache invalidation needed */
  });

  platformBus.on("storefront:order_paid", () => {
    invalidate("my-orders", "wallet-balance", "wallet-transactions", "dashboard-live-stats");
  });

  platformBus.on("storefront:order_shipped", () => {
    invalidate("my-orders", "dashboard-live-stats");
  });

  platformBus.on("storefront:order_cancelled", () => {
    invalidate("my-orders", "wallet-balance", "dashboard-live-stats");
  });

  platformBus.on("delivery:dispatched", () => {
    invalidate("my-orders", "dashboard-live-stats");
  });

  platformBus.on("delivery:validated", () => {
    invalidate("my-orders", "wallet-balance", "wallet-transactions", "dashboard-live-stats");
  });

  platformBus.on("notification:created", () => {
    invalidate("notifications", "unread-counts");
  });

  platformBus.on("dashboard:counters_refresh", () => {
    invalidate("dashboard-live-stats");
  });

  platformBus.on("orbit:profile_loaded", () => {
    invalidate("contacts");
  });

  platformBus.on("system:online_recovered", () => {
    invalidate("wallet-balance", "threads", "contacts", "dashboard-live-stats");
  });

  platformBus.on("tracking:position_updated", () => {
    invalidate("my-orders");
  });

  platformBus.on("location:live_update", () => {
    invalidate("threads");
  });

  platformBus.on("location:live_stopped", () => {
    invalidate("threads");
  });

  platformBus.on("orbit:message_edited_optimistic", () => {
    invalidate("threads");
  });

  platformBus.on("orbit:message_deleted", () => {
    invalidate("threads", "unread-counts");
  });

  platformBus.on("orbit:group_updated", () => {
    invalidate("threads", "contacts");
  });

  platformBus.on("orbit:group_created", () => {
    invalidate("threads", "contacts");
  });

  platformBus.on("orbit:contacts_updated", () => {
    invalidate("contacts");
  });

  platformBus.on("orbit:identity_updated", () => {
    invalidate("contacts");
  });

  platformBus.on("orbit:ephemeral_timer_changed", () => {
    invalidate("threads");
  });

  platformBus.on("media:viewer_open", () => {
    /* UI-only — no cache invalidation */
  });

  platformBus.on("media:viewer_close", () => {
    /* UI-only — no cache invalidation */
  });

  platformBus.on("orbit:profile_updated", () => {
    invalidate("contacts", "threads");
  });

  platformBus.on("system:module_status_changed", () => {
    invalidate("dashboard-live-stats");
  });

  platformBus.on("system:sync_completed", () => {
    invalidate("wallet-balance", "my-orders", "threads", "contacts", "dashboard-live-stats");
    triggerGlobalRefresh("system:sync_completed");
  });

  platformBus.on("ui:panel_changed", () => {
    /* UI navigation — no cache invalidation */
  });

  platformBus.on("USER_SEARCH" as PlatformEventType, () => {
    /* legacy uppercase event — analytics tracking only */
  });

  // ── Radar → Orbit cross-pillar invalidations ──
  platformBus.on("orbit:thread_created", () => {
    invalidate("threads", "contacts", "radar-listings", "dashboard-live-stats");
    moduleRegistry.activateModule("orbit-core");
  });

  // ── Wallet payment success → refresh bookings/orders across pillars ──
  platformBus.on("wallet:payment_success", () => {
    invalidate("wallet-balance", "wallet-transactions", "my-bookings", "my-orders", "marketplace-listings", "dashboard-live-stats");
    moduleRegistry.activateModule("wallet-core");
  });

  // ── booking:created (canonical) → same as marketplace:booking_created ──
  platformBus.on("booking:created", () => {
    invalidate("my-bookings", "radar-listings", "dashboard-live-stats");
    moduleRegistry.activateModule("radar-booking");
  });

  // ── booking:completed (canonical) → refresh wallet + bookings ──
  platformBus.on("booking:completed", () => {
    invalidate("my-bookings", "wallet-balance", "wallet-transactions", "dashboard-live-stats");
  });

  console.info("[super-app-bridge] Cross-section bridge + module lifecycle + runtime pipeline + health system installed");
}
