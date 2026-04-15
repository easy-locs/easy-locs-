import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackAnalyticsEvent } from "@/lib/analytics/analyticsEngine";

const TRACKED_KEY = "easylocs_ref_tracked";

export function useReferralAttribution(userId?: string | null) {
  const { search, pathname } = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(search);
    const ref = params.get("ref");
    if (!ref) return;

    const dedupKey = `${pathname}:${ref}`;
    try {
      const tracked = sessionStorage.getItem(TRACKED_KEY);
      if (tracked === dedupKey) return;
      sessionStorage.setItem(TRACKED_KEY, dedupKey);
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
