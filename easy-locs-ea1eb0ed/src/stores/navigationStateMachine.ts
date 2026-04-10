import { create } from "zustand";
import type { Pillar, NavigationContext } from "@/lib/navigation/navigation-intent";

export type PillarState =
  | "DASHBOARD_IDLE"
  | "DASHBOARD_PREVIEW"
  | "DASHBOARD_INTERACTION"
  | "RADAR_IDLE"
  | "RADAR_SEARCHING"
  | "RADAR_RESULTS"
  | "RADAR_DETAIL_PREVIEW"
  | "ORBIT_IDLE"
  | "ORBIT_ACTIVE"
  | "ORBIT_CONVERSATION"
  | "WALLET_IDLE"
  | "WALLET_PAYMENT"
  | "WALLET_CONFIRMATION"
  | "ME_IDLE"
  | "ME_EDIT"
  | "ME_ANALYTICS";

export type TransitionType = "soft" | "overlay" | "hard";

export interface PillarContext {
  lastQuery?: string;
  lastFilters?: Record<string, unknown>;
  lastPosition?: { lat: number; lng: number; zoom?: number };
  lastScroll?: number;
  lastEntity?: { id: string; name: string; type?: string };
  lastRoute?: string;
}

export interface TransitionRecord {
  from: PillarState;
  to: PillarState;
  type: TransitionType;
  action: string;
  timestamp: number;
}

interface NavigationStateMachine {
  currentState: PillarState;
  previousState: PillarState | null;
  activePillar: Pillar;
  previousPillar: Pillar | null;

  pillarContexts: Record<Pillar, PillarContext>;

  overlayPillar: Pillar | null;
  overlayState: PillarState | null;
  overlayContext: NavigationContext | null;

  transitionHistory: TransitionRecord[];
  locked: boolean;

  transition: (to: PillarState, type: TransitionType, action: string) => boolean;
  forceSync: (pillar: Pillar) => void;
  openOverlay: (pillar: Pillar, state: PillarState, context?: NavigationContext) => boolean;
  closeOverlay: () => void;
  upgradeOverlay: () => Pillar | null;
  updatePillarContext: (pillar: Pillar, ctx: Partial<PillarContext>) => void;
  getPillarContext: (pillar: Pillar) => PillarContext;
  canTransition: (from: PillarState, to: PillarState) => boolean;
  setPillarSubState: (state: PillarState) => void;
  reset: () => void;
}

const STATE_TO_PILLAR: Record<PillarState, Pillar> = {
  DASHBOARD_IDLE: "dashboard",
  DASHBOARD_PREVIEW: "dashboard",
  DASHBOARD_INTERACTION: "dashboard",
  RADAR_IDLE: "radar",
  RADAR_SEARCHING: "radar",
  RADAR_RESULTS: "radar",
  RADAR_DETAIL_PREVIEW: "radar",
  ORBIT_IDLE: "orbit",
  ORBIT_ACTIVE: "orbit",
  ORBIT_CONVERSATION: "orbit",
  WALLET_IDLE: "wallet",
  WALLET_PAYMENT: "wallet",
  WALLET_CONFIRMATION: "wallet",
  ME_IDLE: "me",
  ME_EDIT: "me",
  ME_ANALYTICS: "me",
};

const PILLAR_IDLE_STATE: Record<Pillar, PillarState> = {
  dashboard: "DASHBOARD_IDLE",
  radar: "RADAR_IDLE",
  orbit: "ORBIT_IDLE",
  wallet: "WALLET_IDLE",
  me: "ME_IDLE",
};

const ALLOWED_TRANSITIONS: Record<PillarState, PillarState[]> = {
  DASHBOARD_IDLE: [
    "DASHBOARD_PREVIEW",
    "DASHBOARD_INTERACTION",
    "RADAR_IDLE",
    "RADAR_SEARCHING",
    "ORBIT_IDLE",
    "ORBIT_ACTIVE",
    "ORBIT_CONVERSATION",
    "WALLET_IDLE",
    "WALLET_PAYMENT",
    "ME_IDLE",
  ],
  DASHBOARD_PREVIEW: [
    "DASHBOARD_IDLE",
    "DASHBOARD_INTERACTION",
    "RADAR_IDLE",
    "RADAR_RESULTS",
    "ORBIT_IDLE",
    "ORBIT_ACTIVE",
    "WALLET_IDLE",
    "ME_IDLE",
  ],
  DASHBOARD_INTERACTION: [
    "DASHBOARD_IDLE",
    "DASHBOARD_PREVIEW",
    "RADAR_IDLE",
    "ORBIT_IDLE",
    "ORBIT_ACTIVE",
    "WALLET_IDLE",
    "WALLET_PAYMENT",
    "ME_IDLE",
  ],

  RADAR_IDLE: [
    "RADAR_SEARCHING",
    "RADAR_RESULTS",
    "RADAR_DETAIL_PREVIEW",
    "DASHBOARD_IDLE",
    "ORBIT_IDLE",
    "ORBIT_ACTIVE",
    "ORBIT_CONVERSATION",
    "WALLET_IDLE",
    "WALLET_PAYMENT",
    "ME_IDLE",
  ],
  RADAR_SEARCHING: [
    "RADAR_IDLE",
    "RADAR_RESULTS",
    "DASHBOARD_IDLE",
    "ORBIT_IDLE",
    "WALLET_IDLE",
    "ME_IDLE",
  ],
  RADAR_RESULTS: [
    "RADAR_IDLE",
    "RADAR_SEARCHING",
    "RADAR_DETAIL_PREVIEW",
    "DASHBOARD_IDLE",
    "ORBIT_ACTIVE",
    "ORBIT_CONVERSATION",
    "WALLET_IDLE",
    "WALLET_PAYMENT",
    "ME_IDLE",
  ],
  RADAR_DETAIL_PREVIEW: [
    "RADAR_IDLE",
    "RADAR_RESULTS",
    "RADAR_SEARCHING",
    "DASHBOARD_IDLE",
    "ORBIT_IDLE",
    "ORBIT_ACTIVE",
    "ORBIT_CONVERSATION",
    "WALLET_IDLE",
    "WALLET_PAYMENT",
    "ME_IDLE",
  ],

  ORBIT_IDLE: [
    "ORBIT_ACTIVE",
    "ORBIT_CONVERSATION",
    "DASHBOARD_IDLE",
    "RADAR_IDLE",
    "WALLET_IDLE",
    "ME_IDLE",
  ],
  ORBIT_ACTIVE: [
    "ORBIT_IDLE",
    "ORBIT_CONVERSATION",
    "DASHBOARD_IDLE",
    "RADAR_IDLE",
    "WALLET_IDLE",
    "WALLET_PAYMENT",
    "ME_IDLE",
  ],
  ORBIT_CONVERSATION: [
    "ORBIT_IDLE",
    "ORBIT_ACTIVE",
    "DASHBOARD_IDLE",
    "RADAR_IDLE",
    "RADAR_DETAIL_PREVIEW",
    "WALLET_IDLE",
    "WALLET_PAYMENT",
  ],

  WALLET_IDLE: [
    "WALLET_PAYMENT",
    "WALLET_CONFIRMATION",
    "DASHBOARD_IDLE",
    "RADAR_IDLE",
    "ORBIT_ACTIVE",
    "ME_IDLE",
  ],
  WALLET_PAYMENT: [
    "WALLET_IDLE",
    "WALLET_CONFIRMATION",
  ],
  WALLET_CONFIRMATION: [
    "WALLET_IDLE",
    "DASHBOARD_IDLE",
    "RADAR_IDLE",
    "RADAR_RESULTS",
    "ORBIT_ACTIVE",
  ],

  ME_IDLE: [
    "ME_EDIT",
    "ME_ANALYTICS",
    "DASHBOARD_IDLE",
    "RADAR_IDLE",
    "ORBIT_ACTIVE",
    "WALLET_IDLE",
  ],
  ME_EDIT: [
    "ME_IDLE",
    "ME_ANALYTICS",
  ],
  ME_ANALYTICS: [
    "ME_IDLE",
    "ME_EDIT",
    "DASHBOARD_IDLE",
  ],
};

const TRANSITION_TYPE_MAP: Record<string, TransitionType> = {
  DASHBOARD_IDLE_DASHBOARD_PREVIEW: "soft",
  DASHBOARD_PREVIEW_DASHBOARD_IDLE: "soft",
  DASHBOARD_IDLE_DASHBOARD_INTERACTION: "soft",
  DASHBOARD_INTERACTION_DASHBOARD_IDLE: "soft",
  DASHBOARD_PREVIEW_DASHBOARD_INTERACTION: "soft",
  DASHBOARD_INTERACTION_DASHBOARD_PREVIEW: "soft",

  RADAR_IDLE_RADAR_SEARCHING: "soft",
  RADAR_SEARCHING_RADAR_IDLE: "soft",
  RADAR_IDLE_RADAR_RESULTS: "soft",
  RADAR_RESULTS_RADAR_IDLE: "soft",
  RADAR_SEARCHING_RADAR_RESULTS: "soft",
  RADAR_RESULTS_RADAR_SEARCHING: "soft",
  RADAR_IDLE_RADAR_DETAIL_PREVIEW: "overlay",
  RADAR_RESULTS_RADAR_DETAIL_PREVIEW: "overlay",
  RADAR_DETAIL_PREVIEW_RADAR_RESULTS: "soft",
  RADAR_DETAIL_PREVIEW_RADAR_IDLE: "soft",

  ORBIT_IDLE_ORBIT_ACTIVE: "soft",
  ORBIT_ACTIVE_ORBIT_IDLE: "soft",
  ORBIT_ACTIVE_ORBIT_CONVERSATION: "soft",
  ORBIT_CONVERSATION_ORBIT_ACTIVE: "soft",
  ORBIT_IDLE_ORBIT_CONVERSATION: "soft",
  ORBIT_CONVERSATION_ORBIT_IDLE: "soft",

  WALLET_IDLE_WALLET_PAYMENT: "soft",
  WALLET_PAYMENT_WALLET_IDLE: "soft",
  WALLET_PAYMENT_WALLET_CONFIRMATION: "soft",
  WALLET_IDLE_WALLET_CONFIRMATION: "soft",
  WALLET_CONFIRMATION_WALLET_IDLE: "soft",

  ME_IDLE_ME_EDIT: "soft",
  ME_EDIT_ME_IDLE: "soft",
  ME_IDLE_ME_ANALYTICS: "soft",
  ME_ANALYTICS_ME_IDLE: "soft",
  ME_EDIT_ME_ANALYTICS: "soft",
  ME_ANALYTICS_ME_EDIT: "soft",
};

function resolveTransitionType(from: PillarState, to: PillarState): TransitionType {
  const key = `${from}_${to}`;
  if (TRANSITION_TYPE_MAP[key]) return TRANSITION_TYPE_MAP[key];

  const fromPillar = STATE_TO_PILLAR[from];
  const toPillar = STATE_TO_PILLAR[to];
  if (fromPillar === toPillar) return "soft";

  return "hard";
}

const MAX_HISTORY = 50;

const EMPTY_CONTEXTS: Record<Pillar, PillarContext> = {
  dashboard: {},
  radar: {},
  orbit: {},
  wallet: {},
  me: {},
};

export const useNavigationStateMachine = create<NavigationStateMachine>((set, get) => ({
  currentState: "DASHBOARD_IDLE",
  previousState: null,
  activePillar: "dashboard",
  previousPillar: null,

  pillarContexts: { ...EMPTY_CONTEXTS },

  overlayPillar: null,
  overlayState: null,
  overlayContext: null,

  transitionHistory: [],
  locked: false,

  canTransition: (from: PillarState, to: PillarState) => {
    const allowed = ALLOWED_TRANSITIONS[from];
    return allowed ? allowed.includes(to) : false;
  },

  transition: (to: PillarState, type: TransitionType, action: string) => {
    const state = get();
    if (state.locked) return false;

    const from = state.currentState;
    if (from === to) return true;

    if (!state.canTransition(from, to)) {
      if (process.env.NODE_ENV === "development") {
        console.warn(`[NavFSM] Blocked transition: ${from} → ${to} (action: ${action})`);
      }
      return false;
    }

    const resolvedType = type || resolveTransitionType(from, to);
    const fromPillar = STATE_TO_PILLAR[from];
    const toPillar = STATE_TO_PILLAR[to];

    const record: TransitionRecord = {
      from,
      to,
      type: resolvedType,
      action,
      timestamp: Date.now(),
    };

    set((s) => ({
      previousState: from,
      currentState: to,
      previousPillar: fromPillar !== toPillar ? fromPillar : s.previousPillar,
      activePillar: toPillar,
      transitionHistory: [...s.transitionHistory.slice(-(MAX_HISTORY - 1)), record],
    }));

    return true;
  },

  forceSync: (pillar: Pillar) => {
    const targetState = PILLAR_IDLE_STATE[pillar];
    const s = get();
    if (s.activePillar === pillar && s.currentState === targetState) return;

    const from = s.currentState;
    const fromPillar = STATE_TO_PILLAR[from];

    set((prev) => ({
      previousState: from,
      currentState: targetState,
      previousPillar: fromPillar !== pillar ? fromPillar : prev.previousPillar,
      activePillar: pillar,
      transitionHistory: [
        ...prev.transitionHistory.slice(-(MAX_HISTORY - 1)),
        {
          from,
          to: targetState,
          type: "hard" as TransitionType,
          action: "force_sync",
          timestamp: Date.now(),
        },
      ],
    }));
  },

  openOverlay: (pillar: Pillar, state: PillarState, context?: NavigationContext) => {
    const s = get();
    if (s.locked) return false;
    if (s.overlayPillar !== null) return false;

    set({
      overlayPillar: pillar,
      overlayState: state,
      overlayContext: context || null,
    });
    return true;
  },

  closeOverlay: () => {
    set({
      overlayPillar: null,
      overlayState: null,
      overlayContext: null,
    });
  },

  upgradeOverlay: () => {
    const s = get();
    const pillar = s.overlayPillar;
    if (!pillar) return null;

    const targetState = PILLAR_IDLE_STATE[pillar];
    s.closeOverlay();

    const fromPillar = s.activePillar;

    set((prev) => ({
      previousState: prev.currentState,
      currentState: targetState,
      previousPillar: fromPillar,
      activePillar: pillar,
      transitionHistory: [
        ...prev.transitionHistory.slice(-(MAX_HISTORY - 1)),
        {
          from: prev.currentState,
          to: targetState,
          type: "hard" as TransitionType,
          action: "upgrade_overlay",
          timestamp: Date.now(),
        },
      ],
    }));

    return pillar;
  },

  updatePillarContext: (pillar: Pillar, ctx: Partial<PillarContext>) => {
    set((s) => ({
      pillarContexts: {
        ...s.pillarContexts,
        [pillar]: { ...s.pillarContexts[pillar], ...ctx },
      },
    }));
  },

  getPillarContext: (pillar: Pillar) => {
    return get().pillarContexts[pillar];
  },

  setPillarSubState: (state: PillarState) => {
    const s = get();
    const targetPillar = STATE_TO_PILLAR[state];
    if (targetPillar !== s.activePillar) return;

    if (s.currentState === state) return;

    set((prev) => ({
      previousState: prev.currentState,
      currentState: state,
      transitionHistory: [
        ...prev.transitionHistory.slice(-(MAX_HISTORY - 1)),
        {
          from: prev.currentState,
          to: state,
          type: "soft" as TransitionType,
          action: "sub_state_change",
          timestamp: Date.now(),
        },
      ],
    }));
  },

  reset: () => {
    set({
      currentState: "DASHBOARD_IDLE",
      previousState: null,
      activePillar: "dashboard",
      previousPillar: null,
      pillarContexts: { ...EMPTY_CONTEXTS },
      overlayPillar: null,
      overlayState: null,
      overlayContext: null,
      transitionHistory: [],
      locked: false,
    });
  },
}));

export { STATE_TO_PILLAR, PILLAR_IDLE_STATE };
