import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackAnalyticsEvent } from "@/lib/analytics/analyticsEngine";
import { REFERRAL_TRACKED_KEY, PENDING_REF_KEY } from "@/lib/referral-cache";

const _trackedInMemory = new Set<string>();

export function _resetInMemoryDedup() {
  _trackedInMemory.clear();
}

export function useReferralAttribution(userId?: string | null) {
  const { search, pathname } = useLocation();

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

    trackAnalyticsEvent({
      eventType: "link_clicked",
      userId: userId ?? null,
      metadata: {
        referral_code: ref,
        landing_path: pathname,
        landing_url: `${pathname}${search}`,
      },
    }).catch(() => {});
  }, [search, pathname, userId]);
}
