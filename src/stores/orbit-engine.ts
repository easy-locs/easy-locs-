/**
 * Orbit Engine V3 — Backward-compatible re-export from split module.
 * 
 * MIGRATION: This file now re-exports from src/stores/orbit-engine/index.ts
 * All consumers continue to work without changes.
 * 
 * Split structure:
 * - orbit-engine/types.ts      → type definitions
 * - orbit-engine/fetchers.ts   → isolated DB queries per module
 * - orbit-engine/alerts.ts     → pure alert generation + urgency
 * - orbit-engine/store-types.ts→ full store interface
 * - orbit-engine/index.ts      → store composition
 */
export { useOrbitEngine } from "./orbit-engine/index";
export type { OrbitAlert, OrbitModule, OrbitModuleState } from "./orbit-engine/index";
