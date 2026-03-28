/**
 * search.query.tokenizer — Split cleaned query into meaningful tokens.
 */
export interface QueryTokens {
  raw: string;
  tokens: string[];
  hasGeoHint: boolean;
  hasVerticalHint: boolean;
}

const GEO_KEYWORDS = ["near", "in", "around", "at"];

export function tokenizeQuery(cleaned: string): QueryTokens {
  const tokens = cleaned.split(/\s+/).filter(Boolean);
  const hasGeoHint = tokens.some((t) => GEO_KEYWORDS.includes(t));
  const hasVerticalHint = tokens.length > 1; // multi-word may contain vertical
  return { raw: cleaned, tokens, hasGeoHint, hasVerticalHint };
}
