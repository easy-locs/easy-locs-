import { describe, it, expect, vi, beforeEach } from "vitest";
import { getAllCachedEntries, getStorageQuota } from "../quran-cache";
import { formatStorageSize, STORAGE_QUOTA_WARNING_PERCENT, isStorageQuotaWarning } from "../storage-utils";

function createMockAyah(arabicLen: number, translationLen: number, transliterationLen?: number) {
  return {
    number: 1,
    arabic: "ع".repeat(arabicLen),
    translation: "a".repeat(translationLen),
    ...(transliterationLen !== undefined ? { transliteration: "t".repeat(transliterationLen) } : {}),
  };
}

function expectedAyahSize(arabicLen: number, translationLen: number, transliterationLen?: number) {
  let size = arabicLen * 2 + translationLen * 2 + 16;
  if (transliterationLen !== undefined) size += transliterationLen * 2;
  return size;
}

function expectedEntryOverhead(key: string, language: string) {
  return key.length * 2 + language.length * 2 + 64;
}

function makeCachedSurah(
  surahNumber: number,
  language: string,
  ayahs: ReturnType<typeof createMockAyah>[],
  opts: { pinned?: boolean; cachedAt?: number; accessedAt?: number; withTransliteration?: boolean } = {}
) {
  const withT = opts.withTransliteration ?? false;
  const key = `${surahNumber}:${language}:${withT ? "t" : "n"}`;
  return {
    key,
    surahNumber,
    language,
    ayahs,
    cachedAt: opts.cachedAt ?? Date.now(),
    accessedAt: opts.accessedAt ?? Date.now(),
    pinned: opts.pinned ?? false,
  };
}

function createMockIndexedDB(entries: ReturnType<typeof makeCachedSurah>[]) {
  const mockStore = {
    getAll: vi.fn(() => {
      const req = { result: [...entries], onsuccess: null as any, onerror: null as any };
      setTimeout(() => req.onsuccess?.());
      return req;
    }),
  };

  const mockTx = {
    objectStore: vi.fn(() => mockStore),
    oncomplete: null as any,
    onerror: null as any,
  };

  const mockDb = {
    transaction: vi.fn(() => mockTx),
    objectStoreNames: { contains: () => true },
  };

  const openRequest = {
    result: mockDb,
    onsuccess: null as any,
    onerror: null as any,
    onupgradeneeded: null as any,
  };

  vi.stubGlobal("indexedDB", {
    open: vi.fn(() => {
      setTimeout(() => openRequest.onsuccess?.());
      return openRequest;
    }),
  });

  return { mockDb, mockStore, mockTx };
}

describe("estimateCachedSurahSize (via getAllCachedEntries)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("calculates size for ayahs with arabic + translation only", async () => {
    const ayahs = [createMockAyah(10, 20), createMockAyah(15, 25)];
    const entry = makeCachedSurah(1, "en.sahih", ayahs);
    createMockIndexedDB([entry]);

    const result = await getAllCachedEntries();

    const expectedSize =
      expectedAyahSize(10, 20) +
      expectedAyahSize(15, 25) +
      expectedEntryOverhead(entry.key, entry.language);

    expect(result).toHaveLength(1);
    expect(result[0].estimatedSizeBytes).toBe(expectedSize);
  });

  it("includes transliteration bytes when present", async () => {
    const ayahs = [createMockAyah(10, 20, 30)];
    const entry = makeCachedSurah(1, "en.sahih", ayahs, { withTransliteration: true });
    createMockIndexedDB([entry]);

    const result = await getAllCachedEntries();

    const expectedSize =
      expectedAyahSize(10, 20, 30) +
      expectedEntryOverhead(entry.key, entry.language);

    expect(result).toHaveLength(1);
    expect(result[0].estimatedSizeBytes).toBe(expectedSize);
  });

  it("handles empty ayahs array", async () => {
    const entry = makeCachedSurah(1, "en.sahih", []);
    createMockIndexedDB([entry]);

    const result = await getAllCachedEntries();

    expect(result).toHaveLength(1);
    expect(result[0].estimatedSizeBytes).toBe(expectedEntryOverhead(entry.key, entry.language));
    expect(result[0].ayahCount).toBe(0);
  });

  it("scales linearly with number of ayahs", async () => {
    const singleAyah = [createMockAyah(50, 100)];
    const threeAyahs = [createMockAyah(50, 100), createMockAyah(50, 100), createMockAyah(50, 100)];

    const entry1 = makeCachedSurah(1, "en.sahih", singleAyah);
    const entry2 = makeCachedSurah(2, "en.sahih", threeAyahs);
    createMockIndexedDB([entry1, entry2]);

    const result = await getAllCachedEntries();

    const singleAyahEntrySize = result.find(e => e.surahNumber === 1)!.estimatedSizeBytes;
    const threeAyahEntrySize = result.find(e => e.surahNumber === 2)!.estimatedSizeBytes;

    const overhead1 = expectedEntryOverhead(entry1.key, entry1.language);
    const overhead2 = expectedEntryOverhead(entry2.key, entry2.language);
    const perAyah = expectedAyahSize(50, 100);

    expect(singleAyahEntrySize).toBe(perAyah + overhead1);
    expect(threeAyahEntrySize).toBe(perAyah * 3 + overhead2);
  });
});

describe("getAllCachedEntries grouping and estimatedSizeBytes aggregation", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("sums estimatedSizeBytes across language variants for the same surah", async () => {
    const ayahsFr = [createMockAyah(10, 30)];
    const ayahsEn = [createMockAyah(10, 25)];

    const entryFr = makeCachedSurah(1, "fr.hamidullah", ayahsFr);
    const entryEn = makeCachedSurah(1, "en.sahih", ayahsEn);
    createMockIndexedDB([entryFr, entryEn]);

    const result = await getAllCachedEntries();

    expect(result).toHaveLength(1);
    expect(result[0].surahNumber).toBe(1);

    const expectedFrSize = expectedAyahSize(10, 30) + expectedEntryOverhead(entryFr.key, entryFr.language);
    const expectedEnSize = expectedAyahSize(10, 25) + expectedEntryOverhead(entryEn.key, entryEn.language);

    expect(result[0].estimatedSizeBytes).toBe(expectedFrSize + expectedEnSize);
  });

  it("sums estimatedSizeBytes across transliteration variants for the same surah", async () => {
    const ayahsNoT = [createMockAyah(10, 20)];
    const ayahsWithT = [createMockAyah(10, 20, 15)];

    const entryNoT = makeCachedSurah(1, "en.sahih", ayahsNoT, { withTransliteration: false });
    const entryWithT = makeCachedSurah(1, "en.sahih", ayahsWithT, { withTransliteration: true });
    createMockIndexedDB([entryNoT, entryWithT]);

    const result = await getAllCachedEntries();

    expect(result).toHaveLength(1);

    const sizeNoT = expectedAyahSize(10, 20) + expectedEntryOverhead(entryNoT.key, entryNoT.language);
    const sizeWithT = expectedAyahSize(10, 20, 15) + expectedEntryOverhead(entryWithT.key, entryWithT.language);

    expect(result[0].estimatedSizeBytes).toBe(sizeNoT + sizeWithT);
  });

  it("keeps separate entries for different surahs", async () => {
    const entry1 = makeCachedSurah(1, "en.sahih", [createMockAyah(10, 20)]);
    const entry2 = makeCachedSurah(2, "en.sahih", [createMockAyah(15, 25)]);
    createMockIndexedDB([entry1, entry2]);

    const result = await getAllCachedEntries();

    expect(result).toHaveLength(2);
    expect(result[0].surahNumber).toBe(1);
    expect(result[1].surahNumber).toBe(2);
    expect(result[0].estimatedSizeBytes).not.toBe(result[1].estimatedSizeBytes);
  });

  it("uses max ayahCount when grouping variants", async () => {
    const entry1 = makeCachedSurah(1, "en.sahih", [createMockAyah(5, 5), createMockAyah(5, 5), createMockAyah(5, 5)]);
    const entry2 = makeCachedSurah(1, "fr.hamidullah", [createMockAyah(5, 5), createMockAyah(5, 5)]);
    createMockIndexedDB([entry1, entry2]);

    const result = await getAllCachedEntries();

    expect(result).toHaveLength(1);
    expect(result[0].ayahCount).toBe(3);
  });

  it("marks pinned=true if any variant is pinned", async () => {
    const entry1 = makeCachedSurah(1, "en.sahih", [createMockAyah(5, 5)], { pinned: false });
    const entry2 = makeCachedSurah(1, "fr.hamidullah", [createMockAyah(5, 5)], { pinned: true });
    createMockIndexedDB([entry1, entry2]);

    const result = await getAllCachedEntries();

    expect(result).toHaveLength(1);
    expect(result[0].pinned).toBe(true);
  });

  it("filters out expired non-pinned entries", async () => {
    const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;
    const fresh = makeCachedSurah(1, "en.sahih", [createMockAyah(5, 5)]);
    const expired = makeCachedSurah(2, "en.sahih", [createMockAyah(5, 5)], { cachedAt: eightDaysAgo });
    const expiredButPinned = makeCachedSurah(3, "en.sahih", [createMockAyah(5, 5)], { cachedAt: eightDaysAgo, pinned: true });
    createMockIndexedDB([fresh, expired, expiredButPinned]);

    const result = await getAllCachedEntries();

    const surahNumbers = result.map(e => e.surahNumber);
    expect(surahNumbers).toContain(1);
    expect(surahNumbers).not.toContain(2);
    expect(surahNumbers).toContain(3);
  });

  it("returns entries sorted by surahNumber", async () => {
    const entry3 = makeCachedSurah(3, "en.sahih", [createMockAyah(5, 5)]);
    const entry1 = makeCachedSurah(1, "en.sahih", [createMockAyah(5, 5)]);
    const entry2 = makeCachedSurah(2, "en.sahih", [createMockAyah(5, 5)]);
    createMockIndexedDB([entry3, entry1, entry2]);

    const result = await getAllCachedEntries();

    expect(result.map(e => e.surahNumber)).toEqual([1, 2, 3]);
  });

  it("returns empty array when no entries exist", async () => {
    createMockIndexedDB([]);

    const result = await getAllCachedEntries();

    expect(result).toEqual([]);
  });
});

describe("getStorageQuota", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns usage, quota, and percentUsed", async () => {
    Object.defineProperty(navigator, "storage", {
      value: {
        estimate: vi.fn().mockResolvedValue({ usage: 500_000, quota: 1_000_000 }),
      },
      writable: true,
      configurable: true,
    });

    const result = await getStorageQuota();

    expect(result).toEqual({
      usageBytes: 500_000,
      quotaBytes: 1_000_000,
      percentUsed: 50,
    });
  });

  it("calculates percentUsed correctly at various levels", async () => {
    Object.defineProperty(navigator, "storage", {
      value: {
        estimate: vi.fn().mockResolvedValue({ usage: 800_000, quota: 1_000_000 }),
      },
      writable: true,
      configurable: true,
    });

    const result = await getStorageQuota();

    expect(result!.percentUsed).toBe(80);
  });

  it("returns percentUsed=0 when quota is 0", async () => {
    Object.defineProperty(navigator, "storage", {
      value: {
        estimate: vi.fn().mockResolvedValue({ usage: 0, quota: 0 }),
      },
      writable: true,
      configurable: true,
    });

    const result = await getStorageQuota();

    expect(result).toEqual({
      usageBytes: 0,
      quotaBytes: 0,
      percentUsed: 0,
    });
  });

  it("handles missing usage/quota fields gracefully", async () => {
    Object.defineProperty(navigator, "storage", {
      value: {
        estimate: vi.fn().mockResolvedValue({}),
      },
      writable: true,
      configurable: true,
    });

    const result = await getStorageQuota();

    expect(result).toEqual({
      usageBytes: 0,
      quotaBytes: 0,
      percentUsed: 0,
    });
  });

  it("returns null when navigator.storage is unavailable", async () => {
    Object.defineProperty(navigator, "storage", {
      value: undefined,
      writable: true,
      configurable: true,
    });

    const result = await getStorageQuota();

    expect(result).toBeNull();
  });

  it("returns null when estimate() throws", async () => {
    Object.defineProperty(navigator, "storage", {
      value: {
        estimate: vi.fn().mockRejectedValue(new Error("denied")),
      },
      writable: true,
      configurable: true,
    });

    const result = await getStorageQuota();

    expect(result).toBeNull();
  });
});

describe("quota warning threshold (from storage-utils)", () => {
  it("STORAGE_QUOTA_WARNING_PERCENT is 80", () => {
    expect(STORAGE_QUOTA_WARNING_PERCENT).toBe(80);
  });

  it("usage at 79% is below warning threshold", () => {
    expect(isStorageQuotaWarning(79)).toBe(false);
  });

  it("usage at 80% triggers warning threshold", () => {
    expect(isStorageQuotaWarning(80)).toBe(true);
  });

  it("usage at 95% is above warning threshold", () => {
    expect(isStorageQuotaWarning(95)).toBe(true);
  });

  it("usage at 0% is below warning threshold", () => {
    expect(isStorageQuotaWarning(0)).toBe(false);
  });

  it("usage at 100% is above warning threshold", () => {
    expect(isStorageQuotaWarning(100)).toBe(true);
  });
});

describe("formatStorageSize (from storage-utils)", () => {
  it("formats bytes", () => {
    expect(formatStorageSize(500)).toBe("500 B");
  });

  it("formats zero bytes", () => {
    expect(formatStorageSize(0)).toBe("0 B");
  });

  it("formats kilobytes", () => {
    expect(formatStorageSize(2048)).toBe("~2.0 KB");
  });

  it("formats boundary at 1024 bytes", () => {
    expect(formatStorageSize(1024)).toBe("~1.0 KB");
    expect(formatStorageSize(1023)).toBe("1023 B");
  });

  it("formats megabytes", () => {
    expect(formatStorageSize(5 * 1024 * 1024)).toBe("~5.0 MB");
  });

  it("formats boundary at 1 MB", () => {
    expect(formatStorageSize(1024 * 1024)).toBe("~1.0 MB");
    expect(formatStorageSize(1024 * 1024 - 1)).toBe("~1024.0 KB");
  });

  it("formats fractional values", () => {
    expect(formatStorageSize(1536)).toBe("~1.5 KB");
    expect(formatStorageSize(1.5 * 1024 * 1024)).toBe("~1.5 MB");
  });
});
