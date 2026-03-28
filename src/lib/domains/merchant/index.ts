/**
 * Canonical Merchant Domain — atomic subdomain exports.
 * 
 * merchant.identity    → ID, slug, owner
 * merchant.location    → geo, address, zone
 * merchant.contact     → phone, email, social
 * merchant.visibility  → publish state, search/map
 * merchant.status      → operational hours
 * merchant.media       → logo, cover, gallery
 * merchant.taxonomy    → vertical, category, tags
 * merchant.fulfillment → delivery/pickup policies
 */
export * from "./merchant.identity";
export * from "./merchant.location";
export * from "./merchant.contact";
export * from "./merchant.visibility";
export * from "./merchant.status";
export * from "./merchant.media";
export * from "./merchant.taxonomy";
export * from "./merchant.fulfillment";
