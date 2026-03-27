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
    platformBus.emit(`${active.domain}:flow_closed`, { entityId: active.entityId });
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
  orbit: "/dashboard/communication",
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

    // 1. Emit payment
    void eventBus.emit("wallet.payment.required", {
      context_type: "mobility_ride",
      context_id: jobId,
      user_id: customerUserId,
      amount: currentPrice ?? 0,
      currency: currency ?? "AED",
      metadata: { rider_user_id: riderUserId },
    });

    // 2. Start close flow after brief delay (let payment process)
    setTimeout(() => {
      useCloseFlowStore.getState().start({
        domain: "ride",
        entityId: jobId,
        returnTo: getReturnRoute("ride"),
        skipPayment: true, // payment already emitted above
        metadata: { customerUserId, riderUserId, amount: currentPrice, currency },
      });
    }, 2000);
  });

  // ── ORDER COMPLETED ──
  eventBus.on("order.completed", (payload: any) => {
    const { orderId, shopId } = payload;
    if (!orderId) return;

    setTimeout(() => {
      useCloseFlowStore.getState().start({
        domain: "order",
        entityId: orderId,
        returnTo: getReturnRoute("order"),
        skipPayment: true,
        metadata: { shopId },
      });
    }, 1500);
  });

  // ── DELIVERY COMPLETED ──
  eventBus.on("delivery.completed", (payload: any) => {
    const { jobId, orderId } = payload;
    const entityId = jobId || orderId;
    if (!entityId) return;

    setTimeout(() => {
      useCloseFlowStore.getState().start({
        domain: "delivery",
        entityId,
        returnTo: getReturnRoute("delivery"),
        skipPayment: true,
        metadata: payload,
      });
    }, 1500);
  });

  // ── BOOKING COMPLETED ──
  eventBus.on("marketplace:booking_completed", (payload: any) => {
    const { bookingId } = payload;
    if (!bookingId) return;

    setTimeout(() => {
      useCloseFlowStore.getState().start({
        domain: "booking",
        entityId: bookingId,
        returnTo: getReturnRoute("booking"),
        skipPayment: true,
        metadata: payload,
      });
    }, 1500);
  });

  if (import.meta.env.DEV) console.log("[close-flow] Engine initialized — all domains active");
}
