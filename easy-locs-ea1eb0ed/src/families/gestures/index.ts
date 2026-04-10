/**
 * FAMILY: GESTURES — Canonical gesture handling for Orbit messages.
 */

// Policy
export { GESTURE_POLICY, resolveGesture } from "@/stores/orbit/gesture.policy";
export type { GestureType } from "@/stores/orbit/gesture.policy";

// Hook
export { useOrbitMessageGestures } from "@/hooks/orbit/useOrbitMessageGestures";

// Wrapper component
export { default as OrbitMessageInteractiveWrapper } from "@/components/orbit/OrbitMessageInteractiveWrapper";
