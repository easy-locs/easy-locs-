/** Stub — engine logic moved to backend. */
export interface ShopQualityResult { score: number; issues: any[]; globalQualityScore: number; qualityClass: string; coherence: { score: number; issues: string[] }; }
export function runShopQualityCheck(..._args: any[]): ShopQualityResult {
  return { score: 0, issues: [], globalQualityScore: 0, qualityClass: "unknown", coherence: { score: 0, issues: [] } };
}
