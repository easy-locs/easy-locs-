import { describe, it, expect } from "vitest";
import {
  whatsappLink,
  telegramLink,
  emailLink,
  phoneLink,
  smsLink,
} from "../contact-utils";
import type { ListingContext } from "../contact-utils";

const fullCtx: ListingContext = {
  title: "Studio Apartment",
  url: "https://example.com/listing/1",
  price: "500€/month",
  city: "Paris",
  country: "France",
  imageUrl: "https://example.com/img.jpg",
};

describe("whatsappLink", () => {
  it("builds a wa.me link with prefilled inquiry message", () => {
    const link = whatsappLink("+33612345678", fullCtx);
    expect(link).toContain("https://wa.me/33612345678?text=");
    expect(link).toContain(encodeURIComponent("Studio Apartment"));
  });

  it("returns empty string when phone sanitizes to empty", () => {
    expect(whatsappLink("", fullCtx)).toBe("");
  });

  it("returns empty string for non-digit phone", () => {
    expect(whatsappLink("abc", fullCtx)).toBe("");
  });

  it("includes price in the message when provided", () => {
    const link = whatsappLink("+33612345678", fullCtx);
    expect(decodeURIComponent(link)).toContain("500€/month");
  });

  it("includes city in the message when provided", () => {
    const link = whatsappLink("+33612345678", fullCtx);
    expect(decodeURIComponent(link)).toContain("Paris");
  });

  it("includes listing URL in the message", () => {
    const link = whatsappLink("+33612345678", fullCtx);
    expect(decodeURIComponent(link)).toContain("https://example.com/listing/1");
  });

  it("works when price is missing", () => {
    const ctx: ListingContext = { title: "Flat", url: "https://example.com" };
    const link = whatsappLink("+33612345678", ctx);
    expect(link).toContain("https://wa.me/33612345678?text=");
    expect(decodeURIComponent(link)).not.toContain("undefined");
  });

  it("works when city is missing", () => {
    const ctx: ListingContext = { title: "Flat", price: "300€" };
    const link = whatsappLink("+33612345678", ctx);
    expect(link).toContain("https://wa.me/");
    expect(decodeURIComponent(link)).not.toContain("undefined");
  });

  it("works when ctx.url is missing", () => {
    const ctx: ListingContext = { title: "Flat" };
    const link = whatsappLink("+33612345678", ctx);
    expect(link).toContain("https://wa.me/33612345678?text=");
    expect(decodeURIComponent(link)).toContain("Flat");
  });

  it("handles phone with mixed formatting", () => {
    const link = whatsappLink("+212 (0) 6-12.34 56 78", fullCtx);
    expect(link).toContain("https://wa.me/");
    expect(link).not.toBe("");
  });
});

describe("telegramLink", () => {
  it("returns t.me link when username is provided", () => {
    const link = telegramLink("johndoe", fullCtx);
    expect(link).toBe("https://t.me/johndoe");
  });

  it("strips leading @ from username", () => {
    const link = telegramLink("@johndoe", fullCtx);
    expect(link).toBe("https://t.me/johndoe");
  });

  it("passes through full http URLs unchanged", () => {
    const link = telegramLink("https://t.me/johndoe", fullCtx);
    expect(link).toBe("https://t.me/johndoe");
  });

  it("builds share link when username is undefined", () => {
    const link = telegramLink(undefined, fullCtx);
    expect(link).toContain("https://t.me/share/url?url=");
    expect(link).toContain(encodeURIComponent("https://example.com/listing/1"));
    expect(link).toContain(encodeURIComponent("Studio Apartment"));
  });

  it("falls back to window URL when ctx.url is missing", () => {
    const ctx: ListingContext = { title: "Flat" };
    const link = telegramLink(undefined, ctx);
    expect(link).toContain("https://t.me/share/url?url=");
    expect(link).toContain(`text=${encodeURIComponent("Flat")}`);
  });

  it("falls back to share link when username is empty string", () => {
    const link = telegramLink("", fullCtx);
    expect(link).toContain("https://t.me/share/url?url=");
    expect(link).toContain(encodeURIComponent("https://example.com/listing/1"));
  });
});

describe("emailLink", () => {
  it("always returns /orbit regardless of email", () => {
    expect(emailLink("test@example.com", fullCtx)).toBe("/orbit");
  });

  it("returns /orbit with empty email", () => {
    expect(emailLink("", fullCtx)).toBe("/orbit");
  });
});

describe("phoneLink", () => {
  it("builds a tel: link", () => {
    expect(phoneLink("+33612345678")).toBe("tel:+33612345678");
  });

  it("preserves raw phone formatting", () => {
    expect(phoneLink("(555) 123-4567")).toBe("tel:(555) 123-4567");
  });
});

describe("smsLink", () => {
  it("builds an sms: link with listing context in body", () => {
    const link = smsLink("+33612345678", fullCtx);
    expect(link).toContain("sms:+33612345678?body=");
    expect(decodeURIComponent(link)).toContain("Studio Apartment");
    expect(decodeURIComponent(link)).toContain("https://example.com/listing/1");
  });

  it("includes title in the body", () => {
    const ctx: ListingContext = { title: "Beach Villa" };
    const link = smsLink("+1555000", ctx);
    expect(decodeURIComponent(link)).toContain('"Beach Villa"');
  });

  it("falls back to window URL when ctx.url is missing", () => {
    const ctx: ListingContext = { title: "Flat" };
    const link = smsLink("+1555", ctx);
    expect(link).toContain("sms:+1555?body=");
    expect(decodeURIComponent(link)).toContain("Flat");
  });
});
