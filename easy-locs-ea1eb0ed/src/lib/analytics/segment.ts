import { isCategoryAllowed } from "@/lib/consent/cookie-consent";

interface SegmentAnalytics {
  identify(userId: string, traits?: Record<string, unknown>): Promise<unknown>;
  track(event: string, properties?: Record<string, unknown>): Promise<unknown>;
  page(category?: string, name?: string, properties?: Record<string, unknown>): Promise<unknown>;
  group(groupId: string, traits?: Record<string, unknown>): Promise<unknown>;
  reset(): Promise<unknown>;
}

let analytics: SegmentAnalytics | null = null;
let initialized = false;
let initPromise: Promise<SegmentAnalytics | null> | null = null;

export function initSegment(): SegmentAnalytics | null {
  if (initialized) return analytics;
  if (!isCategoryAllowed("analytics")) return null;

  const writeKey = import.meta.env.VITE_SEGMENT_WRITE_KEY as string | undefined;
  if (!writeKey) return null;

  initialized = true;

  if (!initPromise) {
    const pkg = "@segment/analytics-next";
    initPromise = import(/* @vite-ignore */ pkg)
      .then(({ AnalyticsBrowser }: { AnalyticsBrowser: { load: (...args: unknown[]) => SegmentAnalytics } }) => {
        analytics = AnalyticsBrowser.load(
          { writeKey },
          {
            integrations: {
              "Segment.io": { apiHost: "api.segment.io/v1" },
            },
          },
        );
        return analytics;
      })
      .catch(() => {
        initialized = false;
        initPromise = null;
        analytics = null;
        return null;
      });
  }

  return analytics;
}

export function segmentIdentify(
  userId: string,
  traits?: Record<string, unknown>,
): void {
  if (!analytics) return;
  analytics.identify(userId, traits).catch(() => {});
}

export function segmentTrack(
  event: string,
  properties?: Record<string, unknown>,
): void {
  if (!analytics) return;
  analytics.track(event, properties).catch(() => {});
}

export function segmentPage(
  name?: string,
  properties?: Record<string, unknown>,
): void {
  if (!analytics) return;
  analytics.page(undefined, name, properties).catch(() => {});
}

export function segmentGroup(
  groupId: string,
  traits?: Record<string, unknown>,
): void {
  if (!analytics) return;
  analytics.group(groupId, traits).catch(() => {});
}

export function segmentReset(): void {
  if (!analytics) return;
  analytics.reset().catch(() => {});
}

export function getSegmentInstance(): SegmentAnalytics | null {
  return analytics;
}

export function segmentTrackWithContext(
  event: string,
  properties?: Record<string, unknown>,
): void {
  if (!analytics) return;

  const enriched = {
    ...properties,
    app_version: (window as Record<string, unknown>).__EASYLOCS_BUILD_ID__ ?? "unknown",
    platform: "web",
    viewport_width: window.innerWidth,
    viewport_height: window.innerHeight,
    page_path: window.location.pathname,
    timestamp: Date.now(),
  };

  analytics.track(event, enriched).catch(() => {});
}
