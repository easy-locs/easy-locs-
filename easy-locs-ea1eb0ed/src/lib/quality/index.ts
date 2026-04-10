export * from "./types";
export { isExemptFile, classifySupabaseUsage, generateArchitectureReport } from "./architecture-audit";
export { scanForTechnicalLeaks, scanUserFacingStrings, generateTechnicalLeakReport } from "./technical-leak-scanner";
export { detectDuplicationInPage, detectDuplicateStateOwnership, generateDuplicationReport, DUPLICATION_PATTERNS } from "./duplication-detector";
export { scanForHardcodedStrings, scanForMissingI18nUsage, generateI18nReport } from "./i18n-validator";
export { buildControlBoard, formatControlBoard } from "./control-board";
