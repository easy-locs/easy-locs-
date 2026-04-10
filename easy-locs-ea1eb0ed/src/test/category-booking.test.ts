import { describe, it, expect } from "vitest";
import { getCategoryBookingConfig, isRangeCategory } from "@/components/marketplace/CategoryBookingConfig";

describe("CategoryBookingConfig", () => {
  it("returns range mode for car_rental", () => {
    const cfg = getCategoryBookingConfig("car_rental");
    expect(cfg.calendarMode).toBe("range");
    expect(cfg.priceUnit).toBe("/day");
    expect(cfg.showReturnTime).toBe(true);
  });

  it("returns single mode for airport_transfer with locations", () => {
    const cfg = getCategoryBookingConfig("airport_transfer");
    expect(cfg.calendarMode).toBe("single");
    expect(cfg.showLocations).toBe(true);
    expect(cfg.showPassengers).toBe(true);
  });

  it("returns single mode for tours with quantity as participants", () => {
    const cfg = getCategoryBookingConfig("tours");
    expect(cfg.calendarMode).toBe("single");
    expect(cfg.showQuantity).toBe(true);
    expect(cfg.quantityLabel).toBe("Participants");
  });

  it("returns range mode for accommodation", () => {
    expect(isRangeCategory("accommodation")).toBe(true);
    expect(isRangeCategory("tours")).toBe(false);
    expect(isRangeCategory("airport_transfer")).toBe(false);
  });

  it("returns range mode for coworking", () => {
    const cfg = getCategoryBookingConfig("coworking");
    expect(cfg.calendarMode).toBe("range");
    expect(cfg.showQuantity).toBe(true);
    expect(cfg.quantityLabel).toBe("Desks");
  });

  it("returns default config for unknown category", () => {
    const cfg = getCategoryBookingConfig("unknown_thing");
    expect(cfg.calendarMode).toBe("single");
    expect(cfg.showTime).toBe(true);
  });

  it("cleaning has duration display", () => {
    const cfg = getCategoryBookingConfig("cleaning");
    expect(cfg.showDuration).toBe(true);
    expect(cfg.showLocations).toBe(false);
  });

  it("restaurant shows guests quantity", () => {
    const cfg = getCategoryBookingConfig("restaurant");
    expect(cfg.quantityLabel).toBe("Guests");
    expect(cfg.showTime).toBe(true);
  });

  it("event shows tickets", () => {
    const cfg = getCategoryBookingConfig("event");
    expect(cfg.quantityLabel).toBe("Tickets");
    expect(cfg.priceUnit).toBe("/ticket");
  });
});
