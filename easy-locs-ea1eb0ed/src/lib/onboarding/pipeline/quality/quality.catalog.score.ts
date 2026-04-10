/**
 * quality.catalog.score — Scores catalog richness per vertical.
 * ONE thing: evaluate menu/rooms/services/products.
 */
import type { QualityDimension } from "../contracts";
import type { Vertical } from "../../types";

export function scoreCatalog(vertical: Vertical, counts: {
  menuItems: number; hotelRooms: number; services: number; products: number;
}): QualityDimension {
  let score = 0;
  const details: string[] = [];

  if (vertical === "food" || vertical === "grocery") {
    if (counts.menuItems === 0) { details.push("no menu items"); }
    else if (counts.menuItems < 5) { score += 40; details.push("few menu items"); }
    else if (counts.menuItems < 15) { score += 70; }
    else { score += 100; }
  } else if (vertical === "hotel") {
    if (counts.hotelRooms === 0) { details.push("no room types"); }
    else if (counts.hotelRooms < 3) { score += 50; }
    else { score += 100; }
  } else if (vertical === "services") {
    if (counts.services === 0) { details.push("no service items"); score += 20; }
    else if (counts.services < 3) { score += 60; }
    else { score += 100; }
  } else if (vertical === "property") {
    score += 60; // Property has less structured catalogs
  } else {
    score += 50;
  }

  score = Math.max(0, Math.min(100, score));
  return { dimension: "catalog", score, weight: 0.25, details: details.join("; ") || "catalog present" };
}
