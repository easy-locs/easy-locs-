import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackAnalyticsEvent } from "@/lib/analytics/analyticsEngine";
import { REFERRAL_TRACKED_KEY, PENDING_REF_KEY } from "@/lib/referral-cache";

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
    try {
      const tracked = sessionStorage.getItem(REFERRAL_TRACKED_KEY);
      if (tracked === dedupKey) return;
      sessionStorage.setItem(REFERRAL_TRACKED_KEY, dedupKey);
    } catch {}

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
