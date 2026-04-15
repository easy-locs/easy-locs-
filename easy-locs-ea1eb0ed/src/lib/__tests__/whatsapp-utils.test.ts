import { describe, it, expect } from "vitest";
import {
  sanitizePhone,
  hasCountryCode,
  isValidWhatsAppNumber,
  detectCountryCode,
  buildWhatsAppLink,
  buildWhatsAppShareLink,
  buildWhatsAppShareLinkWithUrl,
  buildListingInquiryMessage,
  buildBookingShareMessage,
  buildInvoiceShareMessage,
  buildShareMessage,
  whatsappLinkFromContext,
  triggerHaptic,
} from "../whatsapp-utils";

describe("sanitizePhone", () => {
  it("strips spaces, dashes, parentheses, and dots", () => {
    expect(sanitizePhone("+1 (555) 123-4567")).toBe("15551234567");
  });

  it("removes leading + sign", () => {
    expect(sanitizePhone("+33612345678")).toBe("33612345678");
  });

  it("strips all non-digit characters", () => {
    expect(sanitizePhone("abc123def456")).toBe("123456");
  });

  it("returns empty string for empty input", () => {
    expect(sanitizePhone("")).toBe("");
  });

  it("handles number with dots as separators", () => {
    expect(sanitizePhone("33.6.12.34.56.78")).toBe("33612345678");
  });

  it("handles number with mixed formatting", () => {
    expect(sanitizePhone("+212 (0) 6-12.34 56 78")).toBe("2120612345678");
  });
});

describe("hasCountryCode", () => {
  it("returns true for numbers starting with +", () => {
    expect(hasCountryCode("+33612345678")).toBe(true);
  });

  it("returns true for numbers starting with 00", () => {
    expect(hasCountryCode("0033612345678")).toBe(true);
  });

  it("returns false for local numbers starting with 0", () => {
    expect(hasCountryCode("0612345678")).toBe(false);
  });

  it("returns true for long numbers without prefix", () => {
    expect(hasCountryCode("33612345678")).toBe(true);
  });

  it("returns false for short numbers without country code", () => {
    expect(hasCountryCode("12345")).toBe(false);
  });
});

describe("isValidWhatsAppNumber", () => {
  it("accepts valid international numbers with +", () => {
    expect(isValidWhatsAppNumber("+33612345678")).toBe(true);
  });

  it("accepts valid international numbers without +", () => {
    expect(isValidWhatsAppNumber("33612345678")).toBe(true);
  });

  it("rejects numbers that are too short (< 7 digits)", () => {
    expect(isValidWhatsAppNumber("+1234")).toBe(false);
  });

  it("rejects numbers that are too long (> 15 digits)", () => {
    expect(isValidWhatsAppNumber("1234567890123456")).toBe(false);
  });

  it("rejects local numbers starting with 0", () => {
    expect(isValidWhatsAppNumber("0612345678")).toBe(false);
  });

  it("accepts numbers starting with 00 (international prefix)", () => {
    expect(isValidWhatsAppNumber("0033612345678")).toBe(true);
  });

  it("rejects empty string", () => {
    expect(isValidWhatsAppNumber("")).toBe(false);
  });
});

describe("detectCountryCode", () => {
  it("detects French numbers", () => {
    expect(detectCountryCode("+33612345678")).toBe("FR");
  });

  it("detects US/CA numbers", () => {
    expect(detectCountryCode("15551234567")).toBe("US/CA");
  });

  it("detects UAE numbers", () => {
    expect(detectCountryCode("+971501234567")).toBe("UAE");
  });

  it("detects Moroccan numbers", () => {
    expect(detectCountryCode("212612345678")).toBe("MA");
  });

  it("returns null for unknown codes", () => {
    expect(detectCountryCode("+99912345678")).toBeNull();
  });
});

describe("buildWhatsAppLink", () => {
  it("builds a basic wa.me link without message", () => {
    expect(buildWhatsAppLink("+33612345678", "")).toBe("https://wa.me/33612345678");
  });

  it("builds a wa.me link with message", () => {
    const link = buildWhatsAppLink("+33612345678", "Hello there");
    expect(link).toBe("https://wa.me/33612345678?text=Hello%20there");
  });

  it("returns empty string when phone is empty", () => {
    expect(buildWhatsAppLink("", "Hello")).toBe("");
  });

  it("encodes special characters in message", () => {
    const link = buildWhatsAppLink("33612345678", "Price: 1000€ & more");
    expect(link).toContain("text=Price%3A%201000%E2%82%AC%20%26%20more");
  });
});

describe("buildWhatsAppShareLink", () => {
  it("builds a share link with encoded message", () => {
    const link = buildWhatsAppShareLink("Check this out!");
    expect(link).toBe("https://wa.me/?text=Check%20this%20out!");
  });
});

describe("buildWhatsAppShareLinkWithUrl", () => {
  it("builds a share link with title and URL", () => {
    const link = buildWhatsAppShareLinkWithUrl("My Listing", "https://example.com/listing/1");
    expect(link).toBe(
      `https://wa.me/?text=${encodeURIComponent("My Listing\n\nhttps://example.com/listing/1")}`
    );
  });
});

describe("buildListingInquiryMessage", () => {
  describe("English locale", () => {
    it("builds a basic inquiry message", () => {
      const msg = buildListingInquiryMessage({ title: "Studio Apartment", locale: "en" });
      expect(msg).toContain('I\'m interested in "Studio Apartment"');
      expect(msg).toContain("Is it still available?");
    });

    it("includes price when provided", () => {
      const msg = buildListingInquiryMessage({
        title: "Studio Apartment",
        price: "500€/month",
        locale: "en",
      });
      expect(msg).toContain("(500€/month)");
    });

    it("includes city when provided", () => {
      const msg = buildListingInquiryMessage({
        title: "Studio Apartment",
        city: "Paris",
        locale: "en",
      });
      expect(msg).toContain("in Paris");
    });

    it("includes URL when provided", () => {
      const msg = buildListingInquiryMessage({
        title: "Studio",
        url: "https://example.com/listing/1",
        locale: "en",
      });
      expect(msg).toContain("https://example.com/listing/1");
    });
  });

  describe("French locale", () => {
    it("builds a French inquiry message", () => {
      const msg = buildListingInquiryMessage({ title: "Studio Meublé", locale: "fr" });
      expect(msg).toContain('je suis intéressé(e) par "Studio Meublé"');
      expect(msg).toContain("Est-ce toujours disponible ?");
    });

    it("includes city with French preposition", () => {
      const msg = buildListingInquiryMessage({
        title: "Studio",
        city: "Lyon",
        locale: "fr",
      });
      expect(msg).toContain("à Lyon");
    });
  });

  describe("Arabic locale", () => {
    it("builds an Arabic inquiry message", () => {
      const msg = buildListingInquiryMessage({ title: "شقة", locale: "ar" });
      expect(msg).toContain('أنا مهتم بـ "شقة"');
      expect(msg).toContain("هل لا يزال متاحاً؟");
    });

    it("includes city in Arabic", () => {
      const msg = buildListingInquiryMessage({
        title: "شقة",
        city: "الدار البيضاء",
        locale: "ar",
      });
      expect(msg).toContain("في الدار البيضاء");
    });
  });
});

describe("buildBookingShareMessage", () => {
  describe("English locale", () => {
    it("builds a basic booking confirmation", () => {
      const msg = buildBookingShareMessage({ serviceName: "Haircut", locale: "en" });
      expect(msg).toContain("Booking Confirmation");
      expect(msg).toContain("Service: Haircut");
    });

    it("includes all optional fields", () => {
      const msg = buildBookingShareMessage({
        serviceName: "Haircut",
        date: "2025-01-15",
        time: "14:00",
        price: "30",
        currency: "EUR",
        reference: "BK-001",
        clientName: "John Doe",
        locale: "en",
      });
      expect(msg).toContain("Date: 2025-01-15 at 14:00");
      expect(msg).toContain("Amount: 30 EUR");
      expect(msg).toContain("Ref: BK-001");
      expect(msg).toContain("Client: John Doe");
    });

    it("omits time suffix when time is not provided", () => {
      const msg = buildBookingShareMessage({
        serviceName: "Haircut",
        date: "2025-01-15",
        locale: "en",
      });
      expect(msg).toContain("Date: 2025-01-15");
      expect(msg).not.toContain(" at ");
    });
  });

  describe("French locale", () => {
    it("builds a French booking confirmation", () => {
      const msg = buildBookingShareMessage({
        serviceName: "Coupe",
        date: "15/01/2025",
        time: "14h00",
        locale: "fr",
      });
      expect(msg).toContain("Confirmation de réservation");
      expect(msg).toContain("Service : Coupe");
      expect(msg).toContain("Date : 15/01/2025 à 14h00");
    });
  });

  describe("Arabic locale", () => {
    it("builds an Arabic booking confirmation", () => {
      const msg = buildBookingShareMessage({
        serviceName: "قص شعر",
        price: "30",
        currency: "MAD",
        locale: "ar",
      });
      expect(msg).toContain("تأكيد الحجز");
      expect(msg).toContain("الخدمة: قص شعر");
      expect(msg).toContain("المبلغ: 30 MAD");
    });
  });
});

describe("buildInvoiceShareMessage", () => {
  const baseParams = {
    invoiceNumber: "INV-2025-001",
    serviceName: "Web Development",
    amount: "5000",
    clientName: "Acme Corp",
  };

  describe("English locale", () => {
    it("builds a basic invoice message", () => {
      const msg = buildInvoiceShareMessage({ ...baseParams, locale: "en" });
      expect(msg).toContain("Invoice INV-2025-001");
      expect(msg).toContain("Service: Web Development");
      expect(msg).toContain("Amount: 5000 ");
      expect(msg).toContain("Client: Acme Corp");
    });

    it("includes tax info when provided", () => {
      const msg = buildInvoiceShareMessage({
        ...baseParams,
        taxRate: 20,
        locale: "en",
      });
      expect(msg).toContain("(incl. VAT 20%)");
    });

    it("uses custom tax label", () => {
      const msg = buildInvoiceShareMessage({
        ...baseParams,
        taxRate: 19,
        taxLabel: "GST",
        locale: "en",
      });
      expect(msg).toContain("(incl. GST 19%)");
    });

    it("includes company name when provided", () => {
      const msg = buildInvoiceShareMessage({
        ...baseParams,
        companyName: "DevShop LLC",
        locale: "en",
      });
      expect(msg).toContain("— DevShop LLC");
    });

    it("omits tax line when taxRate is 0", () => {
      const msg = buildInvoiceShareMessage({
        ...baseParams,
        taxRate: 0,
        locale: "en",
      });
      expect(msg).not.toContain("incl.");
    });

    it("includes currency when provided", () => {
      const msg = buildInvoiceShareMessage({
        ...baseParams,
        currency: "USD",
        locale: "en",
      });
      expect(msg).toContain("Amount: 5000 USD");
    });
  });

  describe("French locale", () => {
    it("builds a French invoice message", () => {
      const msg = buildInvoiceShareMessage({ ...baseParams, locale: "fr" });
      expect(msg).toContain("Facture INV-2025-001");
      expect(msg).toContain("Service : Web Development");
      expect(msg).toContain("Client : Acme Corp");
    });

    it("uses TVA as default tax label", () => {
      const msg = buildInvoiceShareMessage({
        ...baseParams,
        taxRate: 20,
        locale: "fr",
      });
      expect(msg).toContain("(incl. TVA 20%)");
    });
  });

  describe("Arabic locale", () => {
    it("builds an Arabic invoice message", () => {
      const msg = buildInvoiceShareMessage({ ...baseParams, locale: "ar" });
      expect(msg).toContain("فاتورة INV-2025-001");
      expect(msg).toContain("الخدمة: Web Development");
      expect(msg).toContain("العميل: Acme Corp");
    });

    it("uses Arabic tax label by default", () => {
      const msg = buildInvoiceShareMessage({
        ...baseParams,
        taxRate: 15,
        locale: "ar",
      });
      expect(msg).toContain("(شامل ضريبة 15%)");
    });
  });
});

describe("buildShareMessage", () => {
  it("builds a basic share message with title and url", () => {
    const msg = buildShareMessage("My Property", "https://example.com/p/1", undefined, undefined);
    expect(msg).toContain("My Property");
    expect(msg).toContain("https://example.com/p/1");
  });

  it("includes price when provided", () => {
    const msg = buildShareMessage("My Property", "https://example.com/p/1", undefined, "500€");
    expect(msg).toContain("My Property — 500€");
  });

  it("includes truncated description", () => {
    const longDesc = "A".repeat(200);
    const msg = buildShareMessage("Title", "https://example.com", longDesc);
    expect(msg).toContain("A".repeat(120));
    expect(msg).not.toContain("A".repeat(121));
  });
});

describe("whatsappLinkFromContext", () => {
  it("builds a full wa.me link from listing context", () => {
    const link = whatsappLinkFromContext("+33612345678", {
      title: "Studio Apartment",
      price: "500€",
      city: "Paris",
      url: "https://example.com/listing/1",
    });
    expect(link).toContain("https://wa.me/33612345678?text=");
    expect(link).toContain(encodeURIComponent("Studio Apartment"));
  });

  it("returns empty string for empty phone", () => {
    const link = whatsappLinkFromContext("", { title: "Studio" });
    expect(link).toBe("");
  });

  it("returns empty string for non-digit phone", () => {
    const link = whatsappLinkFromContext("abc", { title: "Studio" });
    expect(link).toBe("");
  });
});

describe("triggerHaptic", () => {
  it("does not throw when navigator is undefined", () => {
    expect(() => triggerHaptic()).not.toThrow();
  });

  it("does not throw with medium style", () => {
    expect(() => triggerHaptic("medium")).not.toThrow();
  });
});

describe("buildWhatsAppShareLink edge cases", () => {
  it("handles empty message", () => {
    const link = buildWhatsAppShareLink("");
    expect(link).toBe("https://wa.me/?text=");
  });
});

describe("buildWhatsAppShareLinkWithUrl edge cases", () => {
  it("handles empty title and url", () => {
    const link = buildWhatsAppShareLinkWithUrl("", "");
    expect(link).toBe(`https://wa.me/?text=${encodeURIComponent("\n\n")}`);
  });
});

describe("message builders default locale fallback", () => {
  it("buildListingInquiryMessage picks a locale automatically when none specified", () => {
    const msg = buildListingInquiryMessage({ title: "Test" });
    expect(msg.length).toBeGreaterThan(0);
    expect(msg).toContain("Test");
  });

  it("buildBookingShareMessage picks a locale automatically when none specified", () => {
    const msg = buildBookingShareMessage({ serviceName: "Test" });
    expect(msg.length).toBeGreaterThan(0);
    expect(msg).toContain("Test");
  });

  it("buildInvoiceShareMessage picks a locale automatically when none specified", () => {
    const msg = buildInvoiceShareMessage({
      invoiceNumber: "INV-001",
      serviceName: "Test",
      amount: "100",
      clientName: "Client",
    });
    expect(msg.length).toBeGreaterThan(0);
    expect(msg).toContain("INV-001");
  });
});
