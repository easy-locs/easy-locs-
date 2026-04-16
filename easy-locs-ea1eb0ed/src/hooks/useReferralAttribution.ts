import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackAnalyticsEvent } from "@/lib/analytics/analyticsEngine";
import { startRequestAttribution } from "@/lib/analytics/request-attribution";
import { REFERRAL_TRACKED_KEY, PENDING_REF_KEY } from "@/lib/referral-cache";

const _trackedInMemory = new Set<string>();

export function _resetInMemoryDedup() {
  _trackedInMemory.clear();
}

export function _syncInMemoryToSession(): void {
  if (_trackedInMemory.size === 0) return;
  try {
    const last = [..._trackedInMemory].pop();
    if (last) {
      sessionStorage.setItem(REFERRAL_TRACKED_KEY, last);
    }
  } catch {}
}

function detectReferralChannel(search: string): string {
  const params = new URLSearchParams(search);
  const utmSource = params.get("utm_source")?.toLowerCase();
  const utmMedium = params.get("utm_medium")?.toLowerCase();
  const channel = params.get("channel")?.toLowerCase();

  if (channel) return channel;
  if (utmSource === "whatsapp" || utmMedium === "whatsapp") return "whatsapp";
  if (utmSource === "linkedin" || utmMedium === "linkedin") return "linkedin";
  if (utmSource === "twitter" || utmSource === "x" || utmMedium === "twitter") return "twitter";
  if (utmSource === "facebook" || utmMedium === "facebook") return "facebook";
  if (utmSource === "telegram" || utmMedium === "telegram") return "telegram";
  if (utmSource === "email" || utmMedium === "email") return "email";
  if (utmSource === "sms" || utmMedium === "sms") return "sms";
  if (utmSource === "copy" || utmMedium === "clipboard") return "copy";
  return "direct";
}

export function useReferralAttribution(userId?: string | null) {
  const { search, pathname } = useLocation();

  useEffect(() => {
    if (_trackedInMemory.size > 0) {
      try {
        sessionStorage.getItem(REFERRAL_TRACKED_KEY);
        _syncInMemoryToSession();
      } catch {}
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(search);
    const ref = params.get("ref");
    if (!ref) return;

    try {
      sessionStorage.setItem(PENDING_REF_KEY, ref.toUpperCase().trim());
    } catch {}

    const dedupKey = `${pathname}:${ref}`;

    let alreadyTracked = false;
    try {
      const tracked = sessionStorage.getItem(REFERRAL_TRACKED_KEY);
      if (tracked === dedupKey) {
        alreadyTracked = true;
      } else {
        sessionStorage.setItem(REFERRAL_TRACKED_KEY, dedupKey);
      }
    } catch {
      if (_trackedInMemory.has(dedupKey)) {
        alreadyTracked = true;
      } else {
        _trackedInMemory.add(dedupKey);
      }
    }

    if (alreadyTracked) return;

    const channel = detectReferralChannel(search);

    startRequestAttribution("referral", pathname, {
      channel,
      referralCode: ref,
      metadata: { landing_url: `${pathname}${search}` },
    });

    trackAnalyticsEvent({
      eventType: "link_clicked",
      userId: userId ?? null,
      metadata: {
        referral_code: ref,
        landing_path: pathname,
        landing_url: `${pathname}${search}`,
        channel,
      },
    }).catch(() => {});
  }, [search, pathname, userId]);
}
