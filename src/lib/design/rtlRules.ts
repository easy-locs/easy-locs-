/**
 * RTL Layout Rules — Automatic RTL/LTR adaptation.
 * Provides utilities for mirroring layout, icons, and spacing.
 */

import { isRtlLanguage } from "./marketProfiles";

/**
 * Returns CSS logical properties for direction-aware layouts.
 * Use these instead of physical left/right.
 */
export const LOGICAL_PROPERTIES = {
  marginStart: "margin-inline-start",
  marginEnd: "margin-inline-end",
  paddingStart: "padding-inline-start",
  paddingEnd: "padding-inline-end",
  borderStart: "border-inline-start",
  borderEnd: "border-inline-end",
  insetStart: "inset-inline-start",
  insetEnd: "inset-inline-end",
  textAlign: "text-align: start",
} as const;

/**
 * Icons that should be mirrored in RTL (directional icons).
 */
const MIRROR_ICONS = new Set([
  "ArrowLeft", "ArrowRight", "ChevronLeft", "ChevronRight",
  "ArrowBigLeft", "ArrowBigRight", "Undo", "Redo",
  "SkipBack", "SkipForward", "ChevronsLeft", "ChevronsRight",
]);

export function shouldMirrorIcon(iconName: string): boolean {
  return MIRROR_ICONS.has(iconName);
}

/**
 * Returns Tailwind classes for RTL-aware flex/grid layout.
 */
export function rtlFlexClasses(lang: string): string {
  return isRtlLanguage(lang) ? "flex-row-reverse" : "flex-row";
}

/**
 * Returns the correct "back" icon name based on direction.
 */
export function backIconName(lang: string): "ArrowRight" | "ArrowLeft" {
  return isRtlLanguage(lang) ? "ArrowRight" : "ArrowLeft";
}

/**
 * Returns the correct "forward" icon name based on direction.
 */
export function forwardIconName(lang: string): "ArrowLeft" | "ArrowRight" {
  return isRtlLanguage(lang) ? "ArrowLeft" : "ArrowRight";
}

/**
 * Applies dir attribute to the document root.
 */
export function applyDocumentDirection(lang: string): void {
  const dir = isRtlLanguage(lang) ? "rtl" : "ltr";
  document.documentElement.setAttribute("dir", dir);
  document.documentElement.setAttribute("lang", lang.split("-")[0]);
}

/**
 * Tailwind utility: returns 'rtl:' prefixed class for RTL-specific overrides.
 */
export function rtlClass(rtlValue: string, ltrValue: string, lang: string): string {
  return isRtlLanguage(lang) ? rtlValue : ltrValue;
}
