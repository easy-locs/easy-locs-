// Template & Rules Engine Types

export type Country = "FR" | "BE" | "ES" | "IT" | "DE";

export type DocCategory = "rental" | "administrative" | "company" | "legal";

export type FieldType = "text" | "number" | "date" | "select" | "textarea" | "postal-code" | "email" | "phone";

export interface FieldSchema {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  validation?: FieldValidation;
  defaultValue?: string | number;
  group?: string;
}

export interface FieldValidation {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  patternMessage?: string;
  custom?: (value: unknown, allValues: Record<string, unknown>) => string | null;
}

export interface ValidationResult {
  errors: ValidationMessage[];   // Blocking
  warnings: ValidationMessage[]; // Non-blocking
  corrections: AutoCorrection[]; // Applied automatically
}

export interface ValidationMessage {
  field: string;
  message: string;
}

export interface AutoCorrection {
  field: string;
  original: unknown;
  corrected: unknown;
  message: string;
}

export interface DocumentTemplate {
  id: string;
  version: string;
  country: Country;
  category: DocCategory;
  docType: string;
  label: string;
  description: string;
  legalBasis?: string;
  fields: FieldSchema[];
  clauses: ClauseDefinition[];
  needsLegalReview: boolean;
  active: boolean;
}

export interface ClauseDefinition {
  id: string;
  label: string;
  text: string;
  required: boolean;
  conditional?: (data: Record<string, unknown>) => boolean;
}
