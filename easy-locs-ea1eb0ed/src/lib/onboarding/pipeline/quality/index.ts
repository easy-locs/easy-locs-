/**
 * Quality Layer barrel.
 */
import type { QualityReport } from "../contracts";
import type { Vertical } from "../../types";
import { scoreCompleteness } from "./quality.completeness.score";
import { scoreMedia } from "./quality.media.score";
import { scoreCatalog } from "./quality.catalog.score";
import { scoreLocation } from "./quality.location.score";
import { scoreTrust } from "./quality.trust.score";
import { computeGlobalScore } from "./quality.global.score";

export { scoreCompleteness } from "./quality.completeness.score";
export { scoreMedia } from "./quality.media.score";
export { scoreCatalog } from "./quality.catalog.score";
export { scoreLocation } from "./quality.location.score";
export { scoreTrust } from "./quality.trust.score";
export { computeGlobalScore } from "./quality.global.score";

export function runQualityLayer(params: {
  vertical: Vertical;
  name: string | null; address: string | null; city: string | null; country: string | null;
  lat: number | null; lng: number | null; phone: string | null; website: string | null;
  categories: number; hasHours: boolean; hasZone: boolean;
  photoCount: number; hasLogo: boolean; hasCover: boolean; stockPhotoCount: number;
  menuItems: number; hotelRooms: number; services: number; products: number;
  sourceCount: number; hasPrimarySource: boolean; mergeConfidence: number;
}): QualityReport {
  const completeness = scoreCompleteness({
    name: !!params.name, address: !!params.address, city: !!params.city,
    country: !!params.country, lat: params.lat != null, lng: params.lng != null,
    phone: !!params.phone, website: !!params.website,
    categories: params.categories, hasHours: params.hasHours,
  });

  const media = scoreMedia({
    photoCount: params.photoCount, hasLogo: params.hasLogo,
    hasCover: params.hasCover, stockPhotoCount: params.stockPhotoCount,
  });

  const catalog = scoreCatalog(params.vertical, {
    menuItems: params.menuItems, hotelRooms: params.hotelRooms,
    services: params.services, products: params.products,
  });

  const location = scoreLocation({
    hasAddress: !!params.address, hasCity: !!params.city,
    hasCountry: !!params.country, hasCoords: params.lat != null,
    hasZone: params.hasZone,
  });

  const trust = scoreTrust({
    sourceCount: params.sourceCount, hasPrimarySource: params.hasPrimarySource,
    mergeConfidence: params.mergeConfidence, hasVerifiedPhone: !!params.phone,
  });

  const missingFields: string[] = [];
  if (!params.name) missingFields.push("name");
  if (!params.address) missingFields.push("address");
  if (params.lat == null) missingFields.push("coordinates");
  if (params.categories === 0) missingFields.push("categories");

  return computeGlobalScore([completeness, media, catalog, location, trust], missingFields, params.vertical);
}
