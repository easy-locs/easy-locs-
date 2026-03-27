/** Stub — engine logic moved to backend. */
export interface DecisionResult { decisions: any[]; confidence: number; executed: any[]; }
export function runAIDecisionEngine(..._args: any[]): DecisionResult {
  return { decisions: [], confidence: 0, executed: [] };
}
