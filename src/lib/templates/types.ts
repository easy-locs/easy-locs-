// Template & Rules Engine Types

export type Country = "FR" | "BE" | "ES" | "IT" | "DE" | "PT" | "NL" | "CH" | "LU" | "GB" | "AT"
  | "PL" | "SE" | "DK" | "NO" | "FI" | "GR" | "CZ" | "HU" | "RO" | "HR" | "IE" | "BG" | "SK"
  | "SI" | "LT" | "LV" | "EE" | "CY" | "MT"
  | "US" | "CA" | "BR" | "MX" | "AR" | "CL" | "CO" | "PE"
  | "UY" | "EC" | "VE" | "DO" | "CR" | "PA" | "GT" | "JM" | "TT" | "BO" | "PY" | "HN" | "SV" | "NI" | "CU"
  | "MA" | "TN" | "DZ" | "SN" | "CI" | "CM" | "GA" | "CG" | "CD" | "MG" | "MU" | "ZA" | "NG" | "KE" | "GH"
  | "EG" | "ET" | "TZ" | "UG" | "RW" | "BF" | "ML" | "NE" | "TD" | "BJ" | "TG" | "GN" | "MW" | "ZM" | "ZW" | "BW" | "NA" | "MZ" | "AO" | "LY" | "SD"
  | "AE" | "SA" | "QA" | "BH" | "KW" | "OM" | "LB" | "JO" | "IL" | "TR" | "IQ"
  | "JP" | "KR" | "CN" | "IN" | "SG" | "MY" | "TH" | "VN" | "PH" | "ID" | "AU" | "NZ"
  | "PK" | "BD" | "LK" | "NP" | "KH" | "MM" | "TW" | "HK" | "KZ"
  | "UA" | "RS" | "GE" | "AL" | "MK" | "BA" | "ME" | "XK" | "MD" | "IS"
  | string; // Allow any country code for dynamic worldwide support

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
