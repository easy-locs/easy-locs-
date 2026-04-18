import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  reportWebVital,
  __resetBeaconQueueForTests,
} from "../web-vitals-reporter";

vi.mock("@/lib/analytics/posthog", () => ({
  captureEvent: vi.fn(),
}));
vi.mock("@/lib/monitoring", () => ({
  pushEvent: vi.fn(),
}));

const ENDPOINT = "https://collect.example.com/v1/web-vitals";

function makeMetric(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    name: "LCP",
    value: 1234,
    rating: "good",
    id: `m-${Math.random().toString(36).slice(2)}`,
    delta: 0,
    entries: [],
    navigationType: "navigate",
    ...overrides,
  } as never;
}

describe("web-vitals-reporter beacon batching", () => {
  let sendBeaconSpy: ReturnType<typeof vi.fn>;
  let originalSendBeacon: typeof navigator.sendBeacon | undefined;

  beforeEach(() => {
    vi.useFakeTimers();
    __resetBeaconQueueForTests();
    import.meta.env.VITE_WEB_VITALS_ENDPOINT = ENDPOINT;

    sendBeaconSpy = vi.fn().mockReturnValue(true);
    originalSendBeacon = navigator.sendBeacon;
    Object.defineProperty(navigator, "sendBeacon", {
      configurable: true,
      writable: true,
      value: sendBeaconSpy,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    delete (import.meta.env as Record<string, unknown>).VITE_WEB_VITALS_ENDPOINT;
    if (originalSendBeacon) {
      Object.defineProperty(navigator, "sendBeacon", {
        configurable: true,
        writable: true,
        value: originalSendBeacon,
      });
    }
  });

  it("does not flush before the timer or batch threshold", () => {
    reportWebVital(makeMetric());
    reportWebVital(makeMetric({ name: "CLS", value: 0.01, rating: "good" }));

    expect(sendBeaconSpy).not.toHaveBeenCalled();
  });

  it("flushes the batch when the flush timer fires", () => {
    reportWebVital(makeMetric());
    reportWebVital(makeMetric({ name: "INP", value: 80, rating: "good" }));

    vi.advanceTimersByTime(5000);

    expect(sendBeaconSpy).toHaveBeenCalledTimes(1);
    const [endpoint, blob] = sendBeaconSpy.mock.calls[0];
    expect(endpoint).toBe(ENDPOINT);
    expect(blob).toBeInstanceOf(Blob);
  });

  it("flushes immediately when the batch reaches the max size", () => {
    for (let i = 0; i < 10; i++) {
      reportWebVital(makeMetric({ id: `m-${i}` }));
    }

    expect(sendBeaconSpy).toHaveBeenCalledTimes(1);
  });

  it("is a no-op when the endpoint env var is unset", () => {
    delete (import.meta.env as Record<string, unknown>).VITE_WEB_VITALS_ENDPOINT;

    reportWebVital(makeMetric());
    vi.advanceTimersByTime(10_000);

    expect(sendBeaconSpy).not.toHaveBeenCalled();
  });
});
