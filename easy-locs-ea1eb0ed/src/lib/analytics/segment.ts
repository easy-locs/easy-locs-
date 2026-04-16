export interface SegmentConfig {
  writeKey: string;
  cdnUrl?: string;
}

interface SegmentAnalytics {
  track: (event: string, properties?: Record<string, unknown>) => void;
  identify: (userId: string, traits?: Record<string, unknown>) => void;
  page: (name?: string, properties?: Record<string, unknown>) => void;
  group: (groupId: string, traits?: Record<string, unknown>) => void;
  alias: (newId: string, previousId?: string) => void;
  reset: () => void;
  ready: (callback: () => void) => void;
  [key: string]: unknown;
}

declare global {
  interface Window {
    analytics?: SegmentAnalytics;
  }
}

let initialized = false;

export function initSegment(config?: SegmentConfig): void {
  if (initialized) return;

  const writeKey = config?.writeKey ?? import.meta.env.VITE_SEGMENT_WRITE_KEY;
  if (!writeKey) return;

  const analyticsStub: unknown[] = [];
  const analytics = (window.analytics = window.analytics || (analyticsStub as unknown as SegmentAnalytics));

  const methodNames = [
    "trackSubmit", "trackClick", "trackLink", "trackForm",
    "pageview", "identify", "reset", "group", "track",
    "ready", "alias", "debug", "page", "screen", "once", "off", "on", "addSourceMiddleware",
    "addIntegrationMiddleware", "setAnonymousId", "addDestinationMiddleware", "register",
  ];

  const isStub = Array.isArray(analyticsStub) && analyticsStub === (analytics as unknown);
  if (isStub) {
    const factory = (method: string) => {
      return function (...args: unknown[]) {
        const arr = Array.prototype.slice.call(args);
        arr.unshift(method);
        analyticsStub.push(arr);
        return analytics;
      };
    };

    for (const name of methodNames) {
      analytics[name] = factory(name);
    }
  }

  const cdnUrl = config?.cdnUrl ?? "https://cdn.segment.com/analytics.js/v1";
  const script = document.createElement("script");
  script.type = "text/javascript";
  script.async = true;
  script.src = `${cdnUrl}/${writeKey}/analytics.min.js`;

  const first = document.getElementsByTagName("script")[0];
  first?.parentNode?.insertBefore(script, first);

  initialized = true;
}

export function segmentTrack(event: string, properties?: Record<string, unknown>): void {
  window.analytics?.track(event, {
    ...properties,
    platform: "web",
    app: "easy-locs",
    timestamp: new Date().toISOString(),
  });
}

export function segmentIdentify(
  userId: string,
  traits?: Record<string, unknown>
): void {
  window.analytics?.identify(userId, {
    ...traits,
    app: "easy-locs",
  });
}

export function segmentPage(name?: string, properties?: Record<string, unknown>): void {
  window.analytics?.page(name, properties);
}

export function segmentGroup(groupId: string, traits?: Record<string, unknown>): void {
  window.analytics?.group(groupId, traits);
}

export function segmentReset(): void {
  window.analytics?.reset();
}

export function isSegmentAvailable(): boolean {
  return !!import.meta.env.VITE_SEGMENT_WRITE_KEY;
}
