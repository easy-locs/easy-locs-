/**
 * Dashboard Actions — Canonical write-side actions for dashboard widgets.
 * All side effects (DB calls, status toggles, dismiss) go through here.
 * Components NEVER perform writes directly.
 */
import { setDriverLiveStatus } from "@/lib/driver/driverLive";

// ── Driver status actions ──

export async function toggleDriverOnline(userId: string, currentOnline: boolean) {
  await setDriverLiveStatus({
    userId,
    isOnline: !currentOnline,
    currentStatus: !currentOnline ? "online" : "offline",
  });
}

export async function toggleDriverAvailability(userId: string, currentAvailable: boolean) {
  await setDriverLiveStatus({
    userId,
    isAvailable: !currentAvailable,
    currentStatus: !currentAvailable ? "available" : "busy",
  });
}

// ── Onboarding checklist actions ──

export function dismissChecklist(userId: string) {
  localStorage.setItem(`easylocs_checklist_dismissed_${userId}`, "true");
}

export function isChecklistDismissed(userId: string): boolean {
  return localStorage.getItem(`easylocs_checklist_dismissed_${userId}`) === "true";
}
