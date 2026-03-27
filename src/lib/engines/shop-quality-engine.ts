/** Stub — engine logic moved to backend. */
export interface ShopQualityResult { score: number; issues: any[]; }
export async function runShopQualityCheck(..._args: any[]): Promise<ShopQualityResult> {
  return { score: 0, issues: [] };
}
