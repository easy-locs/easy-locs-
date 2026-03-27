/** Stub — engine logic moved to backend. */
export interface ShopQualityResult { score: number; issues: any[]; globalQualityScore: number; qualityClass: string; coherence: { score: number; issues: string[]; status: string; entity_menu_match_score: number }; }
export function runShopQualityCheck(..._args: any[]): ShopQualityResult {
  return { score: 0, issues: [], globalQualityScore: 0, qualityClass: "unknown", coherence: { score: 0, issues: [], status: "stub", entity_menu_match_score: 0 } };
}
