import { platformBus } from "@/lib/shared/platform-bus";
import { DeviceHaptics } from "@/families/device";

export type HapticType = "light" | "medium" | "heavy" | "success" | "warning" | "error" | "selection";
export type GestureType = "swipe_left" | "swipe_right" | "swipe_up" | "swipe_down" | "pinch" | "long_press" | "double_tap" | "force_touch";
export type MicroInteraction = "like_bounce" | "add_to_cart_fly" | "payment_confetti" | "send_message_whoosh" | "pull_refresh_spring" | "tab_switch_morph" | "star_rating_fill" | "quantity_tick";

export interface TransitionConfig {
  name: string;
  duration: number;
  easing: string;
  delay: number;
  direction: "in" | "out" | "in-out";
}

export interface GestureConfig {
  type: GestureType;
  threshold: number;
  direction: string | null;
  action: string;
  haptic: HapticType | null;
}

export interface AnimationPreset {
  name: string;
  keyframes: Record<string, Record<string, string | number>>;
  duration: number;
  easing: string;
  iterations: number;
  fillMode: "forwards" | "backwards" | "both" | "none";
}

export interface SkeletonShimmerConfig {
  baseColor: string;
  highlightColor: string;
  duration: number;
  direction: "ltr" | "rtl";
}

export const PAGE_TRANSITIONS: Record<string, TransitionConfig> = {
  fade: { name: "fade", duration: 200, easing: "ease-out", delay: 0, direction: "in-out" },
  slide_left: { name: "slide_left", duration: 300, easing: "cubic-bezier(0.4, 0, 0.2, 1)", delay: 0, direction: "in" },
  slide_up: { name: "slide_up", duration: 350, easing: "cubic-bezier(0.4, 0, 0.2, 1)", delay: 0, direction: "in" },
  modal_present: { name: "modal_present", duration: 400, easing: "cubic-bezier(0.34, 1.56, 0.64, 1)", delay: 0, direction: "in" },
  sheet_present: { name: "sheet_present", duration: 350, easing: "cubic-bezier(0, 0, 0.2, 1)", delay: 0, direction: "in" },
  hero_expand: { name: "hero_expand", duration: 500, easing: "cubic-bezier(0.4, 0, 0.2, 1)", delay: 0, direction: "in-out" },
};

export const MICRO_INTERACTIONS: Record<MicroInteraction, AnimationPreset> = {
  like_bounce: { name: "like_bounce", keyframes: { "0%": { transform: "scale(1)" }, "50%": { transform: "scale(1.3)" }, "100%": { transform: "scale(1)" } }, duration: 400, easing: "cubic-bezier(0.68, -0.55, 0.265, 1.55)", iterations: 1, fillMode: "both" },
  add_to_cart_fly: { name: "add_to_cart_fly", keyframes: { "0%": { transform: "scale(1)", opacity: 1 }, "100%": { transform: "scale(0.2) translateY(-200px)", opacity: 0 } }, duration: 600, easing: "cubic-bezier(0.4, 0, 0.2, 1)", iterations: 1, fillMode: "forwards" },
  payment_confetti: { name: "payment_confetti", keyframes: { "0%": { transform: "translateY(0) scale(0)" }, "50%": { transform: "translateY(-100px) scale(1)" }, "100%": { transform: "translateY(200px) scale(0.5)", opacity: 0 } }, duration: 1500, easing: "cubic-bezier(0.4, 0, 0.2, 1)", iterations: 1, fillMode: "forwards" },
  send_message_whoosh: { name: "send_message_whoosh", keyframes: { "0%": { transform: "translateX(0)", opacity: 1 }, "100%": { transform: "translateX(100px)", opacity: 0 } }, duration: 300, easing: "ease-in", iterations: 1, fillMode: "forwards" },
  pull_refresh_spring: { name: "pull_refresh_spring", keyframes: { "0%": { transform: "translateY(-40px)" }, "60%": { transform: "translateY(5px)" }, "100%": { transform: "translateY(0)" } }, duration: 500, easing: "cubic-bezier(0.34, 1.56, 0.64, 1)", iterations: 1, fillMode: "both" },
  tab_switch_morph: { name: "tab_switch_morph", keyframes: { "0%": { transform: "scaleX(0.8)", opacity: 0.5 }, "100%": { transform: "scaleX(1)", opacity: 1 } }, duration: 200, easing: "ease-out", iterations: 1, fillMode: "both" },
  star_rating_fill: { name: "star_rating_fill", keyframes: { "0%": { transform: "scale(0)", opacity: 0 }, "50%": { transform: "scale(1.2)" }, "100%": { transform: "scale(1)", opacity: 1 } }, duration: 300, easing: "cubic-bezier(0.34, 1.56, 0.64, 1)", iterations: 1, fillMode: "forwards" },
  quantity_tick: { name: "quantity_tick", keyframes: { "0%": { transform: "scale(1)" }, "50%": { transform: "scale(1.1)" }, "100%": { transform: "scale(1)" } }, duration: 150, easing: "ease-out", iterations: 1, fillMode: "both" },
};

export const GESTURE_CONFIGS: GestureConfig[] = [
  { type: "swipe_left", threshold: 50, direction: "horizontal", action: "navigate_back", haptic: "light" },
  { type: "swipe_right", threshold: 50, direction: "horizontal", action: "navigate_forward", haptic: "light" },
  { type: "swipe_down", threshold: 80, direction: "vertical", action: "pull_to_refresh", haptic: "medium" },
  { type: "long_press", threshold: 500, direction: null, action: "context_menu", haptic: "heavy" },
  { type: "double_tap", threshold: 300, direction: null, action: "quick_action", haptic: "light" },
  { type: "pinch", threshold: 0.5, direction: null, action: "zoom", haptic: null },
  { type: "force_touch", threshold: 0.6, direction: null, action: "peek", haptic: "medium" },
];

export const SKELETON_SHIMMER: SkeletonShimmerConfig = {
  baseColor: "hsl(var(--muted))",
  highlightColor: "hsl(var(--muted-foreground) / 0.1)",
  duration: 1500,
  direction: "ltr",
};

export function getTransition(name: string): TransitionConfig {
  return PAGE_TRANSITIONS[name] ?? PAGE_TRANSITIONS.fade;
}

export function getMicroInteraction(name: MicroInteraction): AnimationPreset {
  return MICRO_INTERACTIONS[name];
}

export function getGestureConfig(type: GestureType): GestureConfig | undefined {
  return GESTURE_CONFIGS.find((g) => g.type === type);
}

export function triggerHaptic(type: HapticType): void {
  DeviceHaptics.trigger(type);
}

export function emitInteractionPerformed(interaction: MicroInteraction, context: string): void {
  platformBus.emit("ui:interaction_performed", {
    interaction, context, timestamp: Date.now(),
  }, "premium-ux");
}

export function emitGestureDetected(gesture: GestureType, action: string): void {
  platformBus.emit("ui:gesture_detected", {
    gesture, action, timestamp: Date.now(),
  }, "premium-ux");
}
