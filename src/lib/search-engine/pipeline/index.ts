/**
 * Search Pipeline — Atomic unit re-exports.
 */
export { guardSearchInput } from "./search.input.guard";
export { cleanQuery } from "./search.query.cleaner";
export { tokenizeQuery } from "./search.query.tokenizer";
export { haversineKm } from "./search.geo.distance";
export { applyRadiusFilter } from "./search.filter.radius";
export { rankResults } from "./search.rank.relevance";
export { fetchStorefronts } from "./search.fetch.storefronts";
export { fetchProducts } from "./search.fetch.products";
export { matchTaxonomy } from "./search.fetch.taxonomy";
export { matchLocations } from "./search.fetch.locations";
export { mergeResults } from "./search.merge.results";
