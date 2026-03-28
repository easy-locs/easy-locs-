import { describe, it, expect } from "vitest";
import { classifyVertical, type ClassificationInput } from "../classifier/vertical-classifier";

describe("Vertical Classifier", () => {
  it("classifies by source type (deliveroo → food)", () => {
    const r = classifyVertical({ businessName: "Unknown", sourceType: "deliveroo" });
    expect(r.vertical).toBe("food");
    expect(r.confidence).toBe(90);
  });

  it("classifies by source type (booking → hotel)", () => {
    const r = classifyVertical({ businessName: "Hilton", sourceType: "booking" });
    expect(r.vertical).toBe("hotel");
    expect(r.confidence).toBe(90);
  });

  it("classifies by source type (noon → grocery)", () => {
    const r = classifyVertical({ businessName: "X", sourceType: "noon" });
    expect(r.vertical).toBe("grocery");
  });

  it("classifies by keywords (restaurant → food)", () => {
    const r = classifyVertical({ businessName: "Al Mallah Restaurant" });
    expect(r.vertical).toBe("food");
    expect(r.confidence).toBeGreaterThan(40);
  });

  it("classifies by keywords (hotel → hotel)", () => {
    const r = classifyVertical({ businessName: "JW Marriott Resort" });
    expect(r.vertical).toBe("hotel");
  });

  it("classifies by keywords (salon → services)", () => {
    const r = classifyVertical({ businessName: "Beauty Salon & Spa" });
    expect(r.vertical).toBe("services");
  });

  it("classifies by keywords (real estate → property)", () => {
    const r = classifyVertical({ businessName: "Dubai Real Estate Office" });
    expect(r.vertical).toBe("property");
  });

  it("classifies by tags", () => {
    const r = classifyVertical({ businessName: "X", tags: ["supermarket", "grocery"] });
    expect(r.vertical).toBe("grocery");
  });

  it("falls back to services with low confidence", () => {
    const r = classifyVertical({ businessName: "ACME Corp" });
    expect(r.vertical).toBe("services");
    expect(r.confidence).toBe(20);
    expect(r.reason).toBe("fallback");
  });
});
