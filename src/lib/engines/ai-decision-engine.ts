/** Stub — engine logic moved to backend. */
export interface DecisionResult { decisions: any[]; confidence: number; }
export async function runAIDecisionEngine(..._args: any[]): Promise<DecisionResult> {
  return { decisions: [], confidence: 0 };
}
