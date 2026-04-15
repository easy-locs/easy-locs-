import { describe, it, expect, vi, afterEach } from "vitest";
import {
  isSocialShareEligible,
  getSocialShareUrl,
  getCleanShareUrl,
  getShareLinks,
  appendReferralCode,
  sharePage,
  SOCIAL_SHARE_EXCLUDED_TYPES,
  type ShareableType,
} from "@/lib/social-share";

const ALL_SHAREABLE_TYPES: ShareableType[] = [
  "listing", "service", "host", "provider", "real-estate",
  "payment", "profile", "contact", "shop", "product",
  "order", "short-link",
  "restaurant", "quran", "hadith", "forex", "annonce",
  "analytics", "location", "deal", "flight", "ride",
];

const ELIGIBLE_TYPES: ShareableType[] = [
  "shop", "product", "order", "service", "listing", "deal",
  "restaurant", "quran", "hadith", "forex", "annonce",
  "analytics", "location", "flight", "ride",
];

const NON_ELIGIBLE_TYPES: ShareableType[] = ALL_SHAREABLE_TYPES.filter(
  (t) => !ELIGIBLE_TYPES.includes(t),
);

describe("isSocialShareEligible", () => {
  it("covers all 22 ShareableType values", () => {
    expect(ALL_SHAREABLE_TYPES).toHaveLength(22);
  });

  it.each(ELIGIBLE_TYPES)("returns true for eligible type '%s'", (type) => {
    expect(isSocialShareEligible(type)).toBe(true);
  });

  it.each(NON_ELIGIBLE_TYPES)("returns false for non-eligible type '%s'", (type) => {
    expect(isSocialShareEligible(type)).toBe(false);
  });

  it("SOCIAL_SHARE_EXCLUDED_TYPES set matches the non-eligible list exactly", () => {
    expect([...SOCIAL_SHARE_EXCLUDED_TYPES].sort()).toEqual([...NON_ELIGIBLE_TYPES].sort());
  });
});

const EXPECTED_CLEAN_URLS: Record<ShareableType, string> = {
  listing: "https://www.easy-locs.com/listing/SLUG",
  service: "https://www.easy-locs.com/book/SLUG",
  host: "https://www.easy-locs.com/host/SLUG",
  provider: "https://www.easy-locs.com/provider/SLUG",
  "real-estate": "https://www.easy-locs.com/properties/SLUG",
  payment: "https://www.easy-locs.com/pay/link/SLUG",
  profile: "https://www.easy-locs.com/u/SLUG",
  contact: "https://www.easy-locs.com/add-contact?userId=SLUG",
  shop: "https://www.easy-locs.com/s/SLUG",
  product: "https://www.easy-locs.com/p/SLUG",
  order: "https://www.easy-locs.com/my-orders?id=SLUG",
  "short-link": "https://www.easy-locs.com/sl/SLUG",
  restaurant: "https://www.easy-locs.com/food/restaurant/SLUG",
  quran: "https://www.easy-locs.com/dashboard/islamic?tab=quran&surah=SLUG",
  hadith: "https://www.easy-locs.com/dashboard/islamic?tab=hadith&id=SLUG",
  forex: "https://www.easy-locs.com/wallet?tab=forex&pair=SLUG",
  annonce: "https://www.easy-locs.com/annonces/SLUG",
  analytics: "https://www.easy-locs.com/dashboard/properties?tab=analyticsSLUG",
  location: "https://www.easy-locs.com/share-location/SLUG",
  deal: "https://www.easy-locs.com/deals/SLUG",
  flight: "https://www.easy-locs.com/travel/flights?id=SLUG",
  ride: "https://www.easy-locs.com/mobility?id=SLUG",
};

describe("getCleanShareUrl", () => {
  it.each(ALL_SHAREABLE_TYPES)(
    "produces the exact expected URL for type '%s'",
    (type) => {
      expect(getCleanShareUrl(type, "SLUG")).toBe(EXPECTED_CLEAN_URLS[type]);
    },
  );

  it("handles slugs with special characters", () => {
    expect(getCleanShareUrl("listing", "café & bar")).toBe(
      "https://www.easy-locs.com/listing/café & bar",
    );
  });
});

describe("getSocialShareUrl", () => {
  it("builds a branded /share/ URL", () => {
    expect(getSocialShareUrl("listing", "my-listing")).toBe(
      "https://www.easy-locs.com/share/listing/my-listing",
    );
  });

  it("encodes the slug", () => {
    expect(getSocialShareUrl("shop", "hello world")).toBe(
      "https://www.easy-locs.com/share/shop/hello%20world",
    );
  });

  it("appends no version query when version is undefined", () => {
    const url = getSocialShareUrl("deal", "summer");
    expect(url).not.toContain("?v=");
  });

  it("appends no version query when version is empty string", () => {
    const url = getSocialShareUrl("deal", "summer", "");
    expect(url).not.toContain("?v=");
  });

  it("normalizes a numeric version", () => {
    const url = getSocialShareUrl("deal", "summer", 42);
    expect(url).toBe("https://www.easy-locs.com/share/deal/summer?v=42");
  });

  it("normalizes a string version that is a valid date", () => {
    const url = getSocialShareUrl("listing", "slug", "2024-01-15T00:00:00Z");
    const parsed = Date.parse("2024-01-15T00:00:00Z");
    expect(url).toBe(
      `https://www.easy-locs.com/share/listing/slug?v=${parsed}`,
    );
  });

  it("strips non-alphanumeric characters from arbitrary string versions", () => {
    const url = getSocialShareUrl("shop", "slug", "v1.2.3");
    expect(url).toBe("https://www.easy-locs.com/share/shop/slug?v=v123");
  });

  it("returns no version when cleaned string is empty", () => {
    const url = getSocialShareUrl("shop", "slug", "...");
    expect(url).not.toContain("?v=");
  });
});

describe("appendReferralCode", () => {
  it("appends ref param with ? when URL has no query", () => {
    expect(appendReferralCode("https://example.com/page", "ABC")).toBe(
      "https://example.com/page?ref=ABC",
    );
  });

  it("appends ref param with & when URL already has a query", () => {
    expect(appendReferralCode("https://example.com/page?x=1", "ABC")).toBe(
      "https://example.com/page?x=1&ref=ABC",
    );
  });

  it("returns the original URL when referralCode is undefined", () => {
    expect(appendReferralCode("https://example.com/page")).toBe(
      "https://example.com/page",
    );
  });

  it("returns the original URL when referralCode is empty string", () => {
    expect(appendReferralCode("https://example.com/page", "")).toBe(
      "https://example.com/page",
    );
  });

  it("encodes the referral code", () => {
    expect(appendReferralCode("https://example.com", "a b")).toBe(
      "https://example.com?ref=a%20b",
    );
  });
});

describe("getShareLinks", () => {
  it("uses branded /share/ URL for social platforms when type is eligible", () => {
    const links = getShareLinks("listing", "my-listing", "Nice Apt");
    expect(links.telegram).toContain(encodeURIComponent("https://www.easy-locs.com/share/listing/my-listing"));
    expect(links.facebook).toContain(encodeURIComponent("https://www.easy-locs.com/share/listing/my-listing"));
    expect(links.twitter).toContain(encodeURIComponent("https://www.easy-locs.com/share/listing/my-listing"));
    expect(links.linkedin).toContain(encodeURIComponent("https://www.easy-locs.com/share/listing/my-listing"));
  });

  it("falls back to clean SPA URL for social platforms when type is NOT eligible", () => {
    const links = getShareLinks("host", "my-host", "Host Page");
    const cleanUrl = "https://www.easy-locs.com/host/my-host";
    expect(links.telegram).toContain(encodeURIComponent(cleanUrl));
    expect(links.facebook).toContain(encodeURIComponent(cleanUrl));
    expect(links.twitter).toContain(encodeURIComponent(cleanUrl));
    expect(links.linkedin).toContain(encodeURIComponent(cleanUrl));
  });

  it("always uses clean SPA URL for copy, email, and sms", () => {
    const links = getShareLinks("listing", "my-listing", "Nice Apt");
    expect(links.copy).toBe("https://www.easy-locs.com/listing/my-listing");
    expect(links.email).toContain(encodeURIComponent("https://www.easy-locs.com/listing/my-listing"));
    expect(links.sms).toContain(encodeURIComponent("https://www.easy-locs.com/listing/my-listing"));
  });

  it("includes version in social URL when provided", () => {
    const links = getShareLinks("shop", "my-shop", "Shop", 7);
    expect(links.telegram).toContain(encodeURIComponent("https://www.easy-locs.com/share/shop/my-shop?v=7"));
  });

  it("includes referral code in all platform URLs", () => {
    const links = getShareLinks("listing", "slug", "Title", undefined, "REF1");
    const encodedRef = encodeURIComponent("ref=REF1");
    expect(links.copy).toContain("ref=REF1");
    expect(links.telegram).toContain(encodedRef);
    expect(links.facebook).toContain(encodedRef);
    expect(links.twitter).toContain(encodedRef);
    expect(links.linkedin).toContain(encodedRef);
    expect(links.whatsapp).toContain(encodeURIComponent("ref=REF1"));
    expect(links.email).toContain(encodedRef);
    expect(links.sms).toContain(encodedRef);
  });

  it("version is ignored in social URL for non-eligible types", () => {
    const links = getShareLinks("host", "my-host", "Host", 99);
    const cleanUrl = "https://www.easy-locs.com/host/my-host";
    expect(links.telegram).toContain(encodeURIComponent(cleanUrl));
    expect(links.telegram).not.toContain("v=99");
  });

  it("produces a valid whatsapp wa.me link with social URL content", () => {
    const links = getShareLinks("deal", "big-sale", "Big Sale");
    expect(links.whatsapp).toMatch(/^https:\/\/wa\.me\/\?text=/);
    expect(links.whatsapp).toContain(encodeURIComponent("https://www.easy-locs.com/share/deal/big-sale"));
  });

  it("encodes title in social platform links", () => {
    const links = getShareLinks("listing", "s", "My Apt & Home");
    const encodedTitle = encodeURIComponent("My Apt & Home");
    expect(links.telegram).toContain(encodedTitle);
    expect(links.twitter).toContain(encodedTitle);
    expect(links.email).toContain(encodedTitle);
  });

  it("returns all expected link keys", () => {
    const links = getShareLinks("listing", "s", "T");
    expect(Object.keys(links).sort()).toEqual(
      ["copy", "email", "facebook", "linkedin", "sms", "telegram", "twitter", "whatsapp"].sort(),
    );
  });
});

describe("sharePage", () => {
  const originalNavigator = globalThis.navigator;

  function mockNavigator(overrides: Record<string, unknown>) {
    Object.defineProperty(globalThis, "navigator", {
      value: { ...originalNavigator, ...overrides },
      writable: true,
      configurable: true,
    });
  }

  afterEach(() => {
    Object.defineProperty(globalThis, "navigator", {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
    vi.restoreAllMocks();
  });

  const defaultOpts = {
    type: "service" as const,
    slug: "my-slug",
    title: "My Service",
  };

  it('returns "shared" when Web Share API succeeds', async () => {
    const shareFn = vi.fn().mockResolvedValue(undefined);
    mockNavigator({ share: shareFn, clipboard: { writeText: vi.fn() } });

    const result = await sharePage(defaultOpts);

    expect(result).toBe("shared");
    expect(shareFn).toHaveBeenCalledWith({
      title: "My Service",
      url: "https://www.easy-locs.com/book/my-slug",
    });
  });

  it('falls back to clipboard and returns "copied" when Web Share throws', async () => {
    const shareFn = vi.fn().mockRejectedValue(new Error("user cancelled"));
    const writeTextFn = vi.fn().mockResolvedValue(undefined);
    mockNavigator({ share: shareFn, clipboard: { writeText: writeTextFn } });

    const result = await sharePage(defaultOpts);

    expect(result).toBe("copied");
    expect(writeTextFn).toHaveBeenCalledWith(
      "https://www.easy-locs.com/book/my-slug",
    );
  });

  it('falls back to clipboard and returns "copied" when navigator.share is undefined', async () => {
    const writeTextFn = vi.fn().mockResolvedValue(undefined);
    mockNavigator({ share: undefined, clipboard: { writeText: writeTextFn } });

    const result = await sharePage(defaultOpts);

    expect(result).toBe("copied");
    expect(writeTextFn).toHaveBeenCalledWith(
      "https://www.easy-locs.com/book/my-slug",
    );
  });

  it('returns "failed" when both Web Share and clipboard fail', async () => {
    const shareFn = vi.fn().mockRejectedValue(new Error("share error"));
    const writeTextFn = vi.fn().mockRejectedValue(new Error("clipboard error"));
    mockNavigator({ share: shareFn, clipboard: { writeText: writeTextFn } });

    const result = await sharePage(defaultOpts);

    expect(result).toBe("failed");
  });

  it("appends referralCode to the shared URL via Web Share", async () => {
    const shareFn = vi.fn().mockResolvedValue(undefined);
    mockNavigator({ share: shareFn, clipboard: { writeText: vi.fn() } });

    await sharePage({ ...defaultOpts, referralCode: "ABC123" });

    expect(shareFn).toHaveBeenCalledWith({
      title: "My Service",
      url: "https://www.easy-locs.com/book/my-slug?ref=ABC123",
    });
  });

  it("appends referralCode with & when URL already has query params", async () => {
    const shareFn = vi.fn().mockResolvedValue(undefined);
    mockNavigator({ share: shareFn, clipboard: { writeText: vi.fn() } });

    await sharePage({
      type: "quran",
      slug: "2",
      title: "Quran Surah",
      referralCode: "REF99",
    });

    expect(shareFn).toHaveBeenCalledWith({
      title: "Quran Surah",
      url: "https://www.easy-locs.com/dashboard/islamic?tab=quran&surah=2&ref=REF99",
    });
  });

  it("copies referralCode URL to clipboard on fallback", async () => {
    const writeTextFn = vi.fn().mockResolvedValue(undefined);
    mockNavigator({ share: undefined, clipboard: { writeText: writeTextFn } });

    const result = await sharePage({ ...defaultOpts, referralCode: "XYZ" });

    expect(result).toBe("copied");
    expect(writeTextFn).toHaveBeenCalledWith(
      "https://www.easy-locs.com/book/my-slug?ref=XYZ",
    );
  });
});
