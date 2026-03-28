/**
 * Pipeline Types — Strict I/O contracts for every micro-engine.
 * Single source of truth for the URL→Shop pipeline data flow.
 */
import type { CanonicalOnboardingRecord, SourceEntityRecord, Vertical, OnboardingQualityResult, PublishGateResult } from "../types";

/** Input contract for the pipeline */
export interface PipelineInput {
  vertical: Vertical;
  name?: string;
  city?: string;
  district?: string;
  country?: string;
  website?: string;
  phone?: string;
  query?: string;
}

/** Validation result from input.validator */
export interface InputValidationResult {
  valid: boolean;
  errors: string[];
  sanitizedInput: PipelineInput;
}

/** Result of source fetching */
export interface SourceFetchResult {
  records: SourceEntityRecord[];
  sourcesQueried: string[];
  errors: Array<{ source: string; error: string }>;
  durationMs: number;
}

/** Result of entity grouping */
export interface GroupingResult {
  groups: SourceEntityRecord[][];
  totalRecords: number;
  groupCount: number;
}

/** Result of record sanitization */
export interface SanitizationResult {
  record: CanonicalOnboardingRecord;
  changesApplied: string[];
}

/** Result of a single pipeline step (generic wrapper) */
export interface StepResult<T> {
  stepName: string;
  success: boolean;
  data: T;
  durationMs: number;
  error?: string;
}

/** Full pipeline trace for observability */
export interface PipelineTrace {
  pipelineId: string;
  input: PipelineInput;
  steps: Array<{
    name: string;
    durationMs: number;
    success: boolean;
    inputSummary?: string;
    outputSummary?: string;
    error?: string;
  }>;
  totalDurationMs: number;
  completedAt: string;
}

/** Publish decision for a single entity */
export interface PublishDecision {
  entityId: string;
  allowed: boolean;
  targetVisibility: "draft" | "public";
  reasons: string[];
  qualityScore: number;
}
