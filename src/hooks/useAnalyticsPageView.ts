import { useEffect } from "react";
import { trackAnalyticsEvent, AnalyticsEventType } from "@/lib/analytics/analyticsEngine";

export function useAnalyticsPageView(params: {
  eventType: AnalyticsEventType;
  userId?: string | null;
  merchantId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  useEffect(() => {
    trackAnalyticsEvent({
      eventType: params.eventType,
      userId: params.userId ?? null,
      merchantId: params.merchantId ?? null,
      metadata: params.metadata ?? {},
    }).catch(() => {});
  }, [params.eventType, params.userId, params.merchantId]);
}
