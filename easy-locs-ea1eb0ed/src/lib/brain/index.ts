/**
 * BRAIN INDEX — Platform Brain Architecture Registry
 * 
 * Exactly 5 brains, no more, no less:
 * 
 * 1. GEO BRAIN      — location, address, zone_key
 * 2. EXECUTION BRAIN — ETA, traffic, weather, rider supply, station
 * 3. CATEGORY BRAIN  — per-vertical behavior, flow logic
 * 4. ARBITRATION BRAIN — conflict resolution, final decisions
 * 5. EXPERIENCE BRAIN — UI suggestions, trending, animations
 * 
 * Connection flow:
 * UI → Experience Brain → Arbitration Brain → Category Brain → Execution Brain → Geo Brain → DB
 */

// 1. Geo Brain
export { getGeoBrainState, setAddressFromPlace, requestGPS, type GeoBrainState } from "./geo-brain";

// 2. Execution Brain
export { deriveExecutionState, fetchExecutionState, type ExecutionBrainState } from "./execution-brain";

// 3. Category Brain
export { getCategoryBrain, getDeliveryCategories, getMobilityCategories, type CategoryBrainState, type CategoryKey } from "./category-brain";

// 4. Arbitration Brain
export { arbitrate, quickArbitrate, DecisionPriority, type ArbitrationDecision, type ArbitrationInput, type ArbitrationResult } from "./arbitration-brain";

// 5. Experience Brain
export { computeExperienceBrain, computeSmartSuggestions, computeTrending, refreshExperience, type ExperienceBrainOutput, type SmartSuggestion, type TrendingItem } from "./experience-brain";
