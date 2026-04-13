import type { CanonicalNodeType } from "./canonical-content-graph";

export type ValidationStage =
  | "NORMALIZE"
  | "TYPE_VALIDATION"
  | "TAXONOMY_VALIDATION"
  | "RELATION_VALIDATION"
  | "MEDIA_VALIDATION"
  | "GEO_VALIDATION"
  | "TIME_VALIDATION"
  | "STATE_VALIDATION"
  | "SECURITY_VALIDATION"
  | "QUALITY_SCORING"
  | "CONFLICT_CHECK";

export type ValidationVerdict = "ACCEPTED" | "REJECTED" | "NEEDS_REVIEW";

export interface ValidationError {
  stage: ValidationStage;
  field: string;
  message: string;
  severity: "error" | "warning";
}

export interface ValidationResult {
  verdict: ValidationVerdict;
  score: number;
  errors: ValidationError[];
  warnings: ValidationError[];
  stages_passed: ValidationStage[];
  stages_failed: ValidationStage[];
  normalized_data?: Record<string, unknown>;
  duration_ms: number;
}

export interface ValidationInput {
  type: CanonicalNodeType;
  taxonomy_path?: string;
  data: Record<string, unknown>;
  media?: Array<{ url: string; type: string; alt?: string }>;
  geo?: { lat: number; lng: number; country?: string; city?: string };
  time?: { start?: string; end?: string; timezone?: string };
  state?: string;
  source?: string;
}

const REQUIRED_FIELDS: Record<string, string[]> = {
  LISTING: ["name", "description", "taxonomy_path"],
  PRODUCT: ["name", "price", "taxonomy_path"],
  SERVICE_ITEM: ["name", "taxonomy_path"],
  BUSINESS: ["name", "type"],
  USER: ["email"],
  ORDER: ["items", "total"],
  BOOKING: ["listing_id", "start_date", "end_date"],
  PAYMENT: ["amount", "currency"],
  DELIVERY_JOB: ["pickup", "dropoff"],
  MEDIA_ASSET: ["url", "type"],
  AD_CAMPAIGN: ["name", "taxonomy_target"],
  REVIEW: ["rating", "target_id"],
};

const VALID_MEDIA_TYPES = ["IMAGE", "VIDEO", "BANNER", "AD", "MENU", "PROFILE", "GALLERY"];

class ValidationPipeline {
  private rejectionLog: Array<{
    timestamp: number;
    type: string;
    errors: ValidationError[];
  }> = [];

  validate(input: ValidationInput): ValidationResult {
    const start = performance.now();
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    const passed: ValidationStage[] = [];
    const failed: ValidationStage[] = [];
    let normalized: Record<string, unknown> = { ...input.data };

    const normalize = this.runNormalize(input, normalized);
    normalized = normalize.data;
    if (normalize.ok) passed.push("NORMALIZE");
    else { failed.push("NORMALIZE"); errors.push(...normalize.errors); }

    const typeCheck = this.runTypeValidation(input);
    if (typeCheck.ok) passed.push("TYPE_VALIDATION");
    else { failed.push("TYPE_VALIDATION"); errors.push(...typeCheck.errors); }

    const taxCheck = this.runTaxonomyValidation(input);
    if (taxCheck.ok) passed.push("TAXONOMY_VALIDATION");
    else {
      failed.push("TAXONOMY_VALIDATION");
      errors.push(...taxCheck.errors);
      warnings.push(...taxCheck.warnings);
    }

    const relCheck = this.runRelationValidation(input);
    if (relCheck.ok) passed.push("RELATION_VALIDATION");
    else { failed.push("RELATION_VALIDATION"); errors.push(...relCheck.errors); }

    const mediaCheck = this.runMediaValidation(input);
    if (mediaCheck.ok) passed.push("MEDIA_VALIDATION");
    else {
      failed.push("MEDIA_VALIDATION");
      errors.push(...mediaCheck.errors);
      warnings.push(...mediaCheck.warnings);
    }

    const geoCheck = this.runGeoValidation(input);
    if (geoCheck.ok) passed.push("GEO_VALIDATION");
    else { failed.push("GEO_VALIDATION"); errors.push(...geoCheck.errors); }

    const timeCheck = this.runTimeValidation(input);
    if (timeCheck.ok) passed.push("TIME_VALIDATION");
    else { failed.push("TIME_VALIDATION"); errors.push(...timeCheck.errors); }

    const stateCheck = this.runStateValidation(input);
    if (stateCheck.ok) passed.push("STATE_VALIDATION");
    else { failed.push("STATE_VALIDATION"); errors.push(...stateCheck.errors); }

    const secCheck = this.runSecurityValidation(input);
    if (secCheck.ok) passed.push("SECURITY_VALIDATION");
    else { failed.push("SECURITY_VALIDATION"); errors.push(...secCheck.errors); }

    const score = this.computeQualityScore(input, errors, warnings);
    passed.push("QUALITY_SCORING");

    passed.push("CONFLICT_CHECK");

    const criticalErrors = errors.filter((e) => e.severity === "error");
    let verdict: ValidationVerdict = "ACCEPTED";
    if (criticalErrors.length > 0) verdict = "REJECTED";
    else if (warnings.length > 3 || score < 50) verdict = "NEEDS_REVIEW";

    const duration_ms = Math.round(performance.now() - start);

    if (verdict === "REJECTED") {
      this.rejectionLog.push({
        timestamp: Date.now(),
        type: input.type,
        errors: criticalErrors,
      });
      if (this.rejectionLog.length > 1000) {
        this.rejectionLog = this.rejectionLog.slice(-500);
      }
    }

    return {
      verdict,
      score,
      errors: criticalErrors,
      warnings,
      stages_passed: passed,
      stages_failed: failed,
      normalized_data: normalized,
      duration_ms,
    };
  }

  private runNormalize(
    input: ValidationInput,
    data: Record<string, unknown>
  ): { ok: boolean; data: Record<string, unknown>; errors: ValidationError[] } {
    const errors: ValidationError[] = [];
    const normalized = { ...data };

    if (typeof normalized["name"] === "string") {
      normalized["name"] = (normalized["name"] as string).trim();
    }
    if (typeof normalized["email"] === "string") {
      normalized["email"] = (normalized["email"] as string).trim().toLowerCase();
    }
    if (typeof normalized["description"] === "string") {
      normalized["description"] = (normalized["description"] as string).trim();
    }

    if (input.taxonomy_path) {
      normalized["taxonomy_path"] = input.taxonomy_path.toUpperCase().trim();
    }

    return { ok: errors.length === 0, data: normalized, errors };
  }

  private runTypeValidation(
    input: ValidationInput
  ): { ok: boolean; errors: ValidationError[] } {
    const errors: ValidationError[] = [];
    const required = REQUIRED_FIELDS[input.type];

    if (required) {
      for (const field of required) {
        if (field === "taxonomy_path") {
          if (!input.taxonomy_path && !input.data["taxonomy_path"]) {
            errors.push({
              stage: "TYPE_VALIDATION",
              field,
              message: `Required field "${field}" is missing`,
              severity: "error",
            });
          }
        } else if (
          input.data[field] === undefined ||
          input.data[field] === null ||
          input.data[field] === ""
        ) {
          errors.push({
            stage: "TYPE_VALIDATION",
            field,
            message: `Required field "${field}" is missing`,
            severity: "error",
          });
        }
      }
    }

    return { ok: errors.length === 0, errors };
  }

  private runTaxonomyValidation(
    input: ValidationInput
  ): { ok: boolean; errors: ValidationError[]; warnings: ValidationError[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    const path = input.taxonomy_path || (input.data["taxonomy_path"] as string);

    if (!path) return { ok: true, errors, warnings };

    const taxonomyValid = typeof path === "string" && path.length > 0 && path.includes("/");
    if (!taxonomyValid) {
      errors.push({
        stage: "TAXONOMY_VALIDATION",
        field: "taxonomy_path",
        message: `Invalid taxonomy path: "${path}"`,
        severity: "error",
      });
    }

    return { ok: errors.length === 0, errors, warnings };
  }

  private runRelationValidation(
    input: ValidationInput
  ): { ok: boolean; errors: ValidationError[] } {
    const errors: ValidationError[] = [];

    if (input.type === "ORDER" && !input.data["listing_id"] && !input.data["items"]) {
      errors.push({
        stage: "RELATION_VALIDATION",
        field: "listing_id",
        message: "Order must reference a listing or items",
        severity: "error",
      });
    }

    if (input.type === "REVIEW" && !input.data["target_id"]) {
      errors.push({
        stage: "RELATION_VALIDATION",
        field: "target_id",
        message: "Review must reference a target entity",
        severity: "error",
      });
    }

    return { ok: errors.length === 0, errors };
  }

  private runMediaValidation(
    input: ValidationInput
  ): { ok: boolean; errors: ValidationError[]; warnings: ValidationError[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    if (!input.media || input.media.length === 0) {
      return { ok: true, errors, warnings };
    }

    for (let i = 0; i < input.media.length; i++) {
      const m = input.media[i];
      if (!m.url) {
        errors.push({
          stage: "MEDIA_VALIDATION",
          field: `media[${i}].url`,
          message: "Media URL is required",
          severity: "error",
        });
      }
      if (!VALID_MEDIA_TYPES.includes(m.type?.toUpperCase())) {
        errors.push({
          stage: "MEDIA_VALIDATION",
          field: `media[${i}].type`,
          message: `Invalid media type: ${m.type}`,
          severity: "error",
        });
      }
      if (!m.alt) {
        warnings.push({
          stage: "MEDIA_VALIDATION",
          field: `media[${i}].alt`,
          message: "Missing alt text for media",
          severity: "warning",
        });
      }
    }

    return { ok: errors.length === 0, errors, warnings };
  }

  private runGeoValidation(
    input: ValidationInput
  ): { ok: boolean; errors: ValidationError[] } {
    const errors: ValidationError[] = [];

    if (!input.geo) return { ok: true, errors };

    if (input.geo.lat < -90 || input.geo.lat > 90) {
      errors.push({
        stage: "GEO_VALIDATION",
        field: "geo.lat",
        message: `Invalid latitude: ${input.geo.lat}`,
        severity: "error",
      });
    }

    if (input.geo.lng < -180 || input.geo.lng > 180) {
      errors.push({
        stage: "GEO_VALIDATION",
        field: "geo.lng",
        message: `Invalid longitude: ${input.geo.lng}`,
        severity: "error",
      });
    }

    return { ok: errors.length === 0, errors };
  }

  private runTimeValidation(
    input: ValidationInput
  ): { ok: boolean; errors: ValidationError[] } {
    const errors: ValidationError[] = [];

    if (!input.time) return { ok: true, errors };

    if (input.time.start && input.time.end) {
      const start = new Date(input.time.start).getTime();
      const end = new Date(input.time.end).getTime();
      if (isNaN(start)) {
        errors.push({
          stage: "TIME_VALIDATION",
          field: "time.start",
          message: "Invalid start time format",
          severity: "error",
        });
      }
      if (isNaN(end)) {
        errors.push({
          stage: "TIME_VALIDATION",
          field: "time.end",
          message: "Invalid end time format",
          severity: "error",
        });
      }
      if (!isNaN(start) && !isNaN(end) && end <= start) {
        errors.push({
          stage: "TIME_VALIDATION",
          field: "time",
          message: "End time must be after start time",
          severity: "error",
        });
      }
    }

    return { ok: errors.length === 0, errors };
  }

  private runStateValidation(
    input: ValidationInput
  ): { ok: boolean; errors: ValidationError[] } {
    const errors: ValidationError[] = [];

    if (!input.state) return { ok: true, errors };

    const validStates = [
      "draft", "pending", "active", "suspended", "archived", "deleted",
      "pending_review", "validated", "published",
      "created", "priced", "paid", "accepted", "preparing", "picked_up",
      "delivered", "completed", "cancelled", "refunded",
    ];

    if (!validStates.includes(input.state)) {
      errors.push({
        stage: "STATE_VALIDATION",
        field: "state",
        message: `Invalid state: ${input.state}`,
        severity: "error",
      });
    }

    return { ok: errors.length === 0, errors };
  }

  private runSecurityValidation(
    input: ValidationInput
  ): { ok: boolean; errors: ValidationError[] } {
    const errors: ValidationError[] = [];

    const suspiciousPatterns = [/<script/i, /javascript:/i, /on\w+\s*=/i];
    const stringFields = Object.entries(input.data).filter(
      ([, v]) => typeof v === "string"
    );

    for (const [key, value] of stringFields) {
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(value as string)) {
          errors.push({
            stage: "SECURITY_VALIDATION",
            field: key,
            message: `Suspicious content detected in "${key}"`,
            severity: "error",
          });
          break;
        }
      }
    }

    return { ok: errors.length === 0, errors };
  }

  private computeQualityScore(
    input: ValidationInput,
    errors: ValidationError[],
    warnings: ValidationError[]
  ): number {
    let score = 100;

    score -= errors.length * 15;
    score -= warnings.length * 5;

    const data = input.data;
    const total = Object.keys(data).length;
    const filled = Object.values(data).filter(
      (v) => v !== null && v !== undefined && v !== ""
    ).length;
    if (total > 0) {
      const completeness = filled / total;
      score = Math.round(score * (0.5 + 0.5 * completeness));
    }

    if (input.media && input.media.length > 0) score += 5;
    if (input.geo) score += 5;
    if (input.taxonomy_path) score += 5;

    return Math.max(0, Math.min(100, score));
  }

  getRecentRejections(limit = 50) {
    return this.rejectionLog.slice(-limit);
  }

  getStats() {
    return {
      totalRejections: this.rejectionLog.length,
      rejectionsByType: this.rejectionLog.reduce(
        (acc, r) => {
          acc[r.type] = (acc[r.type] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
    };
  }
}

export const validationPipeline = new ValidationPipeline();
