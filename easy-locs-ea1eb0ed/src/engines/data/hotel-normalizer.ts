import { BaseEngine, type EngineTickResult } from "../core/base-engine";

export class HotelNormalizer extends BaseEngine {
  constructor() {
    super({
      id: "data-hotel-normalizer",
      name: "Hotel Normalizer",
      category: "data",
      intervalMs: 180_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: string[] = [];

    const roomCards = document.querySelectorAll("[data-room-type]");
    roomCards.forEach(el => {
      const roomType = el.getAttribute("data-room-type") || "";
      const price = parseFloat(el.getAttribute("data-room-price") || "0");
      const capacity = parseInt(el.getAttribute("data-room-capacity") || "0", 10);

      if (!roomType) findings.push("Room without type classification");
      if (price <= 0) findings.push(`Room "${roomType}" has invalid price: ${price}`);
      if (capacity <= 0 || capacity > 20) findings.push(`Room "${roomType}" has unusual capacity: ${capacity}`);
    });

    const ratingEls = document.querySelectorAll("[data-hotel-rating]");
    ratingEls.forEach(el => {
      const rating = parseFloat(el.getAttribute("data-hotel-rating") || "0");
      if (rating < 0 || rating > 5) {
        findings.push(`Invalid hotel rating: ${rating}`);
      }
    });

    return { level: findings.length > 0 ? "detect" : "observe", findings: findings.length, actions: [], duration: 0 };
  }
}
