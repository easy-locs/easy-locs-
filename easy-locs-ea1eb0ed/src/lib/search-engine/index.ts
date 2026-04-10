/**
 * Search Engine — Canonical exports.
 */
export { useUnifiedSearchStore } from "./search-store";
export type { SearchState, SearchResult, AutocompleteGroup, SearchSuggestion, SearchResultType } from "./search-types";
export { DEFAULT_SEARCH_STATE, RADIUS_OPTIONS } from "./search-types";
export { resolveSearch, resolveAutocomplete } from "./search-resolver";
export { getSuggestions, saveToHistory } from "./search-suggestions";
