/**
 * Motion Design System — Centralized animation tokens & presets.
 * Premium, Apple/Stripe-inspired motion language.
 * Supports prefers-reduced-motion out of the box.
 */
import { type Variants, type Transition } from "framer-motion";

// ── Core Tokens ──

export const MOTION_DURATION = {
  instant: 0.1,
  fast: 0.2,
  normal: 0.3,
  smooth: 0.45,
  slow: 0.6,
} as const;

export const MOTION_EASE = {
  /** Apple-style spring feel */
  premium: [0.25, 0.46, 0.45, 0.94] as const,
  /** Stripe-style smooth */
  smooth: [0.4, 0, 0.2, 1] as const,
  /** Snap for micro-interactions */
  snap: [0.68, -0.55, 0.27, 1.55] as const,
  /** Linear for progress */
  linear: [0, 0, 1, 1] as const,
  /** Decelerate for entries */
  decel: [0, 0, 0.2, 1] as const,
  /** Accelerate for exits */
  accel: [0.4, 0, 1, 1] as const,
} as const;

// ── Transition Presets ──

export const TRANSITIONS = {
  fast: { duration: MOTION_DURATION.fast, ease: MOTION_EASE.premium } satisfies Transition,
  normal: { duration: MOTION_DURATION.normal, ease: MOTION_EASE.smooth } satisfies Transition,
  smooth: { duration: MOTION_DURATION.smooth, ease: MOTION_EASE.premium } satisfies Transition,
  spring: { type: "spring", stiffness: 300, damping: 30 } satisfies Transition,
  springGentle: { type: "spring", stiffness: 200, damping: 25 } satisfies Transition,
} as const;

// ── Variant Presets ──

/** Fade + slide up — for section reveals */
export const fadeSlideUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: TRANSITIONS.smooth },
  exit: { opacity: 0, y: -8, transition: TRANSITIONS.fast },
};

/** Fade only — for tab content */
export const fadeOnly: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: TRANSITIONS.normal },
  exit: { opacity: 0, transition: TRANSITIONS.fast },
};

/** Scale + fade — for cards, modals */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: TRANSITIONS.smooth },
  exit: { opacity: 0, scale: 0.96, transition: TRANSITIONS.fast },
};

/** Slide from right — for drawers */
export const slideRight: Variants = {
  hidden: { x: "100%" },
  visible: { x: 0, transition: TRANSITIONS.smooth },
  exit: { x: "100%", transition: TRANSITIONS.normal },
};

/** Slide from bottom — for sheets */
export const slideUp: Variants = {
  hidden: { y: "100%" },
  visible: { y: 0, transition: TRANSITIONS.spring },
  exit: { y: "100%", transition: TRANSITIONS.normal },
};

/** Stagger children — for lists, grids */
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: TRANSITIONS.smooth },
};

/** Hero image reveal */
export const heroReveal: Variants = {
  hidden: { opacity: 0, scale: 1.05 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.7, ease: MOTION_EASE.premium } },
};

/** Card hover — for interactive cards */
export const cardHover = {
  scale: 1.02,
  y: -2,
  transition: TRANSITIONS.fast,
};

/** Button press */
export const buttonTap = {
  scale: 0.97,
};

/** Badge pulse */
export const badgePulse: Variants = {
  initial: { scale: 1 },
  pulse: {
    scale: [1, 1.1, 1],
    transition: { duration: 0.4, ease: MOTION_EASE.premium },
  },
};

// ── Page Transition Wrapper ──

export const pageTransition: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: MOTION_EASE.smooth } },
  exit: { opacity: 0, y: -4, transition: { duration: 0.15 } },
};

// ── Reduced Motion Helper ──

/** Check if user prefers reduced motion */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Get duration multiplier — 0 for reduced motion, 1 for normal */
export function motionMultiplier(): number {
  return prefersReducedMotion() ? 0 : 1;
}

/** Safe transition — returns instant if reduced motion */
export function safeTransition(t: Transition): Transition {
  if (prefersReducedMotion()) return { duration: 0 };
  return t;
}

/** Safe variants — strips animation if reduced motion */
export function safeVariants(v: Variants): Variants {
  if (prefersReducedMotion()) {
    return {
      hidden: { opacity: 1 },
      visible: { opacity: 1 },
      exit: { opacity: 1 },
    };
  }
  return v;
}
