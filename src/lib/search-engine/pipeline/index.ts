/**
 * Search Pipeline — Atomic unit re-exports.
 */
export { guardSearchInput } from "./search.input.guard";
export { cleanQuery } from "./search.query.cleaner";
export { tokenizeQuery } from "./search.query.tokenizer";
export { classifyIntent } from "./search.query.intent_classifier";
export { classifyVertical } from "./search.query.vertical_classifier";
export { resolveGeoContext } from "./search.geo.context_resolver";
export { haversineKm } from "./search.geo.distance";
export { selectSources } from "./search.source.selector";
export { applyRadiusFilter } from "./search.filter.radius";
export { filterByVisibility } from "./search.filter.visibility";
export { filterByVertical } from "./search.filter.vertical";
export { rankResults } from "./search.rank.relevance";
export { fetchStorefronts } from "./search.fetch.storefronts";
export { fetchProducts } from "./search.fetch.products";
export { matchTaxonomy } from "./search.fetch.taxonomy";
export { matchLocations } from "./search.fetch.locations";
export { mergeResults } from "./search.merge.results";
export { serializeSearchOutput } from "./search.output.serializer";
export { createTrace, addStep, finalizeTrace, addWarning } from "./search.output.debug_trace";
