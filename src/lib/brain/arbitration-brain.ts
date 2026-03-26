/**
 * ARBITRATION BRAIN — Re-exports from platform-super-brain.ts
 * 
 * This is a stable facade. The actual arbitration logic lives in
 * platform-super-brain.ts which remains the canonical implementation.
 * 
 * Owns:
 * - Final price decision
 * - Final ETA (post trust adjustments)
 * - Merchant ranking/visibility overrides
 * - Promise control (reject/degrade)
 * - Surge decision
 * - Safety blocks
 * 
 * Priority: Safety > Operational Truth > Customer Promise > Profitability > Growth
 */
export {
  arbitrate,
  quickArbitrate,
  DecisionPriority,
  type ArbitrationDecision,
  type ArbitrationInput,
  type ArbitrationResult,
} from "./platform-super-brain";
