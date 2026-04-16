import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { computeBackoffDelay, bulkPinSurahs } from "../quran-cache";

describe("computeBackoffDelay", () => {
  it("returns 300ms for attempt 0", () => {
    expect(computeBackoffDelay(0)).toBe(300);
  });

  it("returns 600ms for attempt 1", () => {
    expect(computeBackoffDelay(1)).toBe(600);
  });

  it("returns 1200ms for attempt 2", () => {
    expect(computeBackoffDelay(2)).toBe(1200);
  });

  it("returns 2400ms for attempt 3", () => {
    expect(computeBackoffDelay(3)).toBe(2400);
  });

  it("returns 4800ms for attempt 4", () => {
    expect(computeBackoffDelay(4)).toBe(4800);
  });

  it("caps at 5000ms for attempt 5", () => {
    expect(computeBackoffDelay(5)).toBe(5000);
  });

  it("caps at 5000ms for large attempt numbers", () => {
    expect(computeBackoffDelay(10)).toBe(5000);
    expect(computeBackoffDelay(20)).toBe(5000);
    expect(computeBackoffDelay(100)).toBe(5000);
  });

  it("follows exponential progression 300 * 2^attempt before cap", () => {
    for (let attempt = 0; attempt < 5; attempt++) {
      const expected = 300 * Math.pow(2, attempt);
      expect(computeBackoffDelay(attempt)).toBe(expected);
    }
  });

  it("never exceeds MAX_DELAY_MS of 5000", () => {
    for (let attempt = 0; attempt <= 50; attempt++) {
      expect(computeBackoffDelay(attempt)).toBeLessThanOrEqual(5000);
    }
  });

  it("always returns a positive number", () => {
    for (let attempt = 0; attempt <= 20; attempt++) {
      expect(computeBackoffDelay(attempt)).toBeGreaterThan(0);
    }
  });
});

function makeSuccessResponse(surahNum: number) {
  return new Response(JSON.stringify({
    code: 200,
    data: { ayahs: [{ numberInSurah: 1, text: `ayah-${surahNum}` }] },
  }));
}

function setupIndexedDBMock() {
  const mockStore: Record<string, any> = {
    getAll: vi.fn(() => {
      const req = { result: [] as unknown[], onsuccess: null as any, onerror: null as any };
      queueMicrotask(() => req.onsuccess?.());
      return req;
    }),
    get: vi.fn(() => {
      const req = { result: undefined, onsuccess: null as any, onerror: null as any };
      queueMicrotask(() => req.onsuccess?.());
      return req;
    }),
    put: vi.fn(() => {
      const req = { onsuccess: null as any, onerror: null as any };
      queueMicrotask(() => req.onsuccess?.());
      return req;
    }),
    count: vi.fn(() => {
      const req = { result: 0, onsuccess: null as any, onerror: null as any };
      queueMicrotask(() => req.onsuccess?.());
      return req;
    }),
    index: vi.fn(() => ({
      getAll: vi.fn(() => {
        const req = { result: [] as unknown[], onsuccess: null as any, onerror: null as any };
        queueMicrotask(() => req.onsuccess?.());
        return req;
      }),
    })),
  };

  const createMockTx = () => {
    const tx: Record<string, any> = {
      objectStore: vi.fn(() => mockStore),
      oncomplete: null as any,
      onerror: null as any,
    };
    const poll = () => {
      if (tx.oncomplete) {
        tx.oncomplete();
      } else {
        setTimeout(poll, 0);
      }
    };
    setTimeout(poll, 0);
    return tx;
  };

  const mockDb = {
    transaction: vi.fn(() => createMockTx()),
    objectStoreNames: { contains: () => true },
  };

  vi.stubGlobal("indexedDB", {
    open: vi.fn(() => {
      const openRequest: Record<string, any> = {
        result: mockDb,
        onsuccess: null as any,
        onerror: null as any,
        onupgradeneeded: null as any,
      };
      queueMicrotask(() => openRequest.onsuccess?.());
      return openRequest;
    }),
  });
}

describe("bulkPinSurahs reads retryAttempts for backoff delay", () => {
  const capturedBackoffDelays: number[] = [];
  let nativeSetTimeout: typeof globalThis.setTimeout;

  beforeEach(() => {
    capturedBackoffDelays.length = 0;
    setupIndexedDBMock();

    nativeSetTimeout = globalThis.setTimeout;
    const wrappedSetTimeout = ((fn: TimerHandler, ms?: number, ...args: unknown[]) => {
      if (typeof fn === "function" && typeof ms === "number" && ms >= 300) {
        capturedBackoffDelays.push(ms);
        return nativeSetTimeout(fn, 0, ...args);
      }
      return nativeSetTimeout(fn, ms, ...args);
    }) as typeof globalThis.setTimeout;
    Object.assign(wrappedSetTimeout, nativeSetTimeout);
    globalThis.setTimeout = wrappedSetTimeout;
  });

  afterEach(() => {
    globalThis.setTimeout = nativeSetTimeout;
    vi.restoreAllMocks();
  });

  it("applies base 300ms delay when retryAttempts is empty", async () => {
    const fetchFn = vi.fn((url: string) => {
      const surahNum = parseInt(url.split("/surah/")[1]);
      return Promise.resolve(makeSuccessResponse(surahNum));
    });

    await bulkPinSurahs([1, 2], "en.sahih", false, fetchFn, vi.fn(), undefined, new Map());

    expect(capturedBackoffDelays).toEqual([300]);
  });

  it("applies escalated delay based on retryAttempts value", async () => {
    const retryAttempts = new Map<number, number>();
    retryAttempts.set(1, 2);

    const fetchFn = vi.fn((url: string) => {
      const surahNum = parseInt(url.split("/surah/")[1]);
      return Promise.resolve(makeSuccessResponse(surahNum));
    });

    await bulkPinSurahs([1, 2], "en.sahih", false, fetchFn, vi.fn(), undefined, retryAttempts);

    expect(capturedBackoffDelays[0]).toBe(1200);
  });

  it("falls back to base delay for surahs not in retryAttempts map", async () => {
    const retryAttempts = new Map<number, number>();
    retryAttempts.set(99, 4);

    const fetchFn = vi.fn((url: string) => {
      const surahNum = parseInt(url.split("/surah/")[1]);
      return Promise.resolve(makeSuccessResponse(surahNum));
    });

    await bulkPinSurahs([1, 2], "en.sahih", false, fetchFn, vi.fn(), undefined, retryAttempts);

    expect(capturedBackoffDelays).toEqual([300]);
  });

  it("uses different delays per surah based on their retry counts", async () => {
    const retryAttempts = new Map<number, number>();
    retryAttempts.set(1, 0);
    retryAttempts.set(2, 3);

    const fetchFn = vi.fn((url: string) => {
      const surahNum = parseInt(url.split("/surah/")[1]);
      return Promise.resolve(makeSuccessResponse(surahNum));
    });

    await bulkPinSurahs([1, 2, 3], "en.sahih", false, fetchFn, vi.fn(), undefined, retryAttempts);

    expect(capturedBackoffDelays[0]).toBe(300);
    expect(capturedBackoffDelays[1]).toBe(2400);
  });
});

describe("retry counter resets after successful download", () => {
  const capturedBackoffDelays: number[] = [];
  let nativeSetTimeout: typeof globalThis.setTimeout;

  beforeEach(() => {
    capturedBackoffDelays.length = 0;
    setupIndexedDBMock();

    nativeSetTimeout = globalThis.setTimeout;
    const wrappedSetTimeout = ((fn: TimerHandler, ms?: number, ...args: unknown[]) => {
      if (typeof fn === "function" && typeof ms === "number" && ms >= 300) {
        capturedBackoffDelays.push(ms);
        return nativeSetTimeout(fn, 0, ...args);
      }
      return nativeSetTimeout(fn, ms, ...args);
    }) as typeof globalThis.setTimeout;
    Object.assign(wrappedSetTimeout, nativeSetTimeout);
    globalThis.setTimeout = wrappedSetTimeout;
  });

  afterEach(() => {
    globalThis.setTimeout = nativeSetTimeout;
    vi.restoreAllMocks();
  });

  function applyCallerRetryReset(
    retrySurahs: number[],
    failedSurahs: number[],
    retryAttempts: Map<number, number>
  ) {
    for (const s of retrySurahs) {
      if (failedSurahs.includes(s)) {
        retryAttempts.set(s, (retryAttempts.get(s) ?? 0) + 1);
      } else {
        retryAttempts.delete(s);
      }
    }
    if (retrySurahs.every(s => !failedSurahs.includes(s))) {
      retryAttempts.clear();
    }
  }

  it("clears retry entry for a surah that succeeds, resetting delay to 300ms", async () => {
    const retryAttempts = new Map<number, number>();
    retryAttempts.set(1, 3);
    retryAttempts.set(2, 2);
    expect(computeBackoffDelay(retryAttempts.get(1)!)).toBe(2400);
    expect(computeBackoffDelay(retryAttempts.get(2)!)).toBe(1200);

    const failSurah2 = vi.fn((url: string) => {
      const surahNum = parseInt(url.split("/surah/")[1]);
      if (String(surahNum) === "2") {
        return Promise.resolve(new Response(JSON.stringify({ code: 500 })));
      }
      return Promise.resolve(makeSuccessResponse(surahNum));
    });

    let finalProgress: any;
    await bulkPinSurahs(
      [1, 2], "en.sahih", false, failSurah2,
      (p) => { if (p.done) finalProgress = p; },
      undefined, retryAttempts
    );

    expect(finalProgress.failedSurahs).toContain(2);
    expect(finalProgress.failedSurahs).not.toContain(1);

    applyCallerRetryReset([1, 2], finalProgress.failedSurahs, retryAttempts);

    expect(retryAttempts.has(1)).toBe(false);
    expect(computeBackoffDelay(retryAttempts.get(1) ?? 0)).toBe(300);

    expect(retryAttempts.get(2)).toBe(3);
    expect(computeBackoffDelay(retryAttempts.get(2)!)).toBe(2400);
  });

  it("clears entire retry map when all surahs succeed", async () => {
    const retryAttempts = new Map<number, number>();
    retryAttempts.set(1, 2);
    retryAttempts.set(2, 1);

    const fetchFn = vi.fn((url: string) => {
      const surahNum = parseInt(url.split("/surah/")[1]);
      return Promise.resolve(makeSuccessResponse(surahNum));
    });

    let finalProgress: any;
    await bulkPinSurahs(
      [1, 2], "en.sahih", false, fetchFn,
      (p) => { if (p.done) finalProgress = p; },
      undefined, retryAttempts
    );

    expect(finalProgress.failed).toBe(0);
    expect(finalProgress.failedSurahs).toEqual([]);

    applyCallerRetryReset([1, 2], finalProgress.failedSurahs, retryAttempts);

    expect(retryAttempts.size).toBe(0);
    expect(computeBackoffDelay(retryAttempts.get(1) ?? 0)).toBe(300);
    expect(computeBackoffDelay(retryAttempts.get(2) ?? 0)).toBe(300);
  });

  it("subsequent bulkPinSurahs uses reset delays after success", async () => {
    const retryAttempts = new Map<number, number>();
    retryAttempts.set(1, 3);

    const fetchFn = vi.fn((url: string) => {
      const surahNum = parseInt(url.split("/surah/")[1]);
      return Promise.resolve(makeSuccessResponse(surahNum));
    });

    let finalProgress: any;
    await bulkPinSurahs(
      [1, 2], "en.sahih", false, fetchFn,
      (p) => { if (p.done) finalProgress = p; },
      undefined, retryAttempts
    );

    expect(capturedBackoffDelays[0]).toBe(2400);

    applyCallerRetryReset([1, 2], finalProgress.failedSurahs, retryAttempts);

    capturedBackoffDelays.length = 0;
    setupIndexedDBMock();

    await bulkPinSurahs(
      [3, 4], "en.sahih", false, fetchFn,
      vi.fn(), undefined, retryAttempts
    );

    expect(capturedBackoffDelays[0]).toBe(300);
  });
});
