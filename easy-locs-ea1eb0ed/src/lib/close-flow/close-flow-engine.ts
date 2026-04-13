/**
 * Smart Close Flow Engine — Unified post-completion orchestrator.
 * 
 * Handles the canonical close sequence for ALL domains:
 *   1. Payment settlement (if applicable)
 *   2. Rating/review prompt (delayed)
 *   3. Auto-navigation back to origin
 *   4. State cleanup
 * 
 * Brain owner: Experience Brain
 * No other module may implement close/postflow logic.
 */
import { eventBus } from "@/lib/core/event-bus";
import { platformBus } from "@/lib/shared/platform-bus";
import { create } from "zustand";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type CloseFlowDomain = "ride" | "order" | "delivery" | "booking" | "orbit";

export interface CloseFlowState {
  /** Currently active close flow (null = idle) */
  active: {
    domain: CloseFlowDomain;
    entityId: string;
    step: "payment" | "rating" | "summary" | "done";
    returnTo: string;
    metadata: Record<string, unknown>;
  } | null;
  /** Start a close flow */
  start: (params: {
    domain: CloseFlowDomain;
    entityId: string;
    returnTo: string;
    skipPayment?: boolean;
    metadata?: Record<string, unknown>;
  }) => void;
  /** Advance to next step */
  advance: () => void;
  /** Complete and reset */
  complete: () => void;
  /** Dismiss without completing (user skipped) */
  dismiss: () => void;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STORE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const STEP_SEQUENCE: CloseFlowState["active"]["step"][] = ["payment", "rating", "summary", "done"];

export const useCloseFlowStore = create<CloseFlowState>((set, get) => ({
  active: null,

  start: ({ domain, entityId, returnTo, skipPayment, metadata }) => {
    const firstStep = skipPayment ? "rating" : "payment";
    set({
      active: {
        domain,
        entityId,
        step: firstStep,
        returnTo,
        metadata: metadata ?? {},
      },
    });
    if (import.meta.env.DEV) console.log(`[close-flow] Started: ${domain}/${entityId} → ${firstStep}`);
  },

  advance: () => {
    const { active } = get();
    if (!active) return;
    const idx = STEP_SEQUENCE.indexOf(active.step);
    const next = STEP_SEQUENCE[idx + 1];
    if (!next || next === "done") {
      get().complete();
      return;
    }
    set({ active: { ...active, step: next } });
  },

  complete: () => {
    const { active } = get();
    if (!active) return;
    if (import.meta.env.DEV) console.log(`[close-flow] Completed: ${active.domain}/${active.entityId}`);
    platformBus.emit(`${active.domain}:flow_closed`, { entityId: active.entityId }, "system");
    set({ active: null });
  },

  dismiss: () => {
    const { active } = get();
    if (active && import.meta.env.DEV) console.log(`[close-flow] Dismissed: ${active.domain}/${active.entityId}`);
    set({ active: null });
  },
}));

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DOMAIN RETURN ROUTES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const DOMAIN_RETURN: Record<CloseFlowDomain, string> = {
  ride: "/mobility/taxi",
  order: "/my-orders",
  delivery: "/mobility/delivery",
  booking: "/my-orders",
  orbit: "/orbit",
};

export function getReturnRoute(domain: CloseFlowDomain): string {
  return DOMAIN_RETURN[domain] ?? "/dashboard";
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EVENT LISTENERS — canonical triggers
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

let _initialized = false;

export function initCloseFlowEngine() {
  if (_initialized) return;
  _initialized = true;

  // ── RIDE COMPLETED ──
  eventBus.on("ride.completed", (payload: any) => {
    const { jobId, customerUserId, riderUserId, currentPrice, currency } = payload;

    // 1. Emit payment via platformBus (triggers wallet:payment_requested handler in super-app-bridge)
    platformBus.emit("wallet:payment_requested", {
      referenceType: "mobility_ride",
      referenceId: jobId,
      userId: customerUserId,
      amount: currentPrice ?? 0,
      currency: currency ?? "AED",
      metadata: { rider_user_id: riderUserId },
    }, "wallet");

    // 2. Start close flow on next animation frame (let payment process first)
    requestAnimationFrame(() => {
      useCloseFlowStore.getState().start({
        domain: "ride",
        entityId: jobId,
        returnTo: getReturnRoute("ride"),
        skipPayment: true,
        metadata: { customerUserId, riderUserId, amount: currentPrice, currency },
      });
    });
  });

  // ── ORDER COMPLETED ──
  eventBus.on("order.completed", (payload: any) => {
    const { orderId, shopId } = payload;
    if (!orderId) return;

    requestAnimationFrame(() => {
      useCloseFlowStore.getState().start({
        domain: "order",
        entityId: orderId,
        returnTo: getReturnRoute("order"),
        skipPayment: true,
        metadata: { shopId },
      });
    });
  });

  // ── DELIVERY COMPLETED ──
  eventBus.on("delivery.completed", (payload: any) => {
    const { jobId, orderId } = payload;
    const entityId = jobId || orderId;
    if (!entityId) return;

    requestAnimationFrame(() => {
      useCloseFlowStore.getState().start({
        domain: "delivery",
        entityId,
        returnTo: getReturnRoute("delivery"),
        skipPayment: true,
        metadata: payload,
      });
    });
  });

  // ── BOOKING COMPLETED ──
  // Two canonical platformBus events can signal booking completion:
  //   - marketplace:booking_completed  (from notation-bridge: booking.completed → marketplace:booking_completed)
  //   - booking:completed              (emitted directly by store / service layer)
  // Both are handled identically with deduplication on entityId.
  const handleBookingCompleted = (bookingId: string, payload: Record<string, unknown>) => {
    const alreadyActive = useCloseFlowStore.getState().active?.entityId === bookingId;
    if (alreadyActive) return;
    requestAnimationFrame(() => {
      useCloseFlowStore.getState().start({
        domain: "booking",
        entityId: bookingId,
        returnTo: getReturnRoute("booking"),
        skipPayment: true,
        metadata: payload,
      });
    });
  };

  platformBus.on("marketplace:booking_completed", (event) => {
    const payload = event.payload as Record<string, unknown>;
    const bookingId = payload?.bookingId as string | undefined;
    if (bookingId) handleBookingCompleted(bookingId, payload);
  });

  platformBus.on("booking:completed", (event) => {
    const payload = event.payload as Record<string, unknown>;
    const bookingId = (payload?.bookingId ?? payload?.id) as string | undefined;
    if (bookingId) handleBookingCompleted(bookingId, payload);
  });

  if (import.meta.env.DEV) console.log("[close-flow] Engine initialized — all domains active");
}
