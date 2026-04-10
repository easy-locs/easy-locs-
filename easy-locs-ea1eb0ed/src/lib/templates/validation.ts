import type { DocumentTemplate, ValidationResult, ValidationMessage, AutoCorrection } from "./types";

export function validateDocument(
  template: DocumentTemplate,
  data: Record<string, unknown>
): ValidationResult {
  const errors: ValidationMessage[] = [];
  const warnings: ValidationMessage[] = [];
  const corrections: AutoCorrection[] = [];

  for (const field of template.fields) {
    const raw = data[field.key];
    const value = raw === undefined || raw === null ? "" : raw;

    // Auto-corrections
    if (typeof value === "string" && value.length > 0) {
      const trimmed = value.trim();
      if (trimmed !== value) {
        corrections.push({ field: field.key, original: value, corrected: trimmed, message: `Espaces supprimés pour "${field.label}"` });
        data[field.key] = trimmed;
      }
      // Title case for names
      if (field.type === "text" && (field.key.toLowerCase().includes("name") || field.key.toLowerCase().includes("nom"))) {
        const titled = trimmed.replace(/\b\w/g, (c) => c.toUpperCase());
        if (titled !== trimmed) {
          corrections.push({ field: field.key, original: trimmed, corrected: titled, message: `Majuscules ajustées pour "${field.label}"` });
          data[field.key] = titled;
        }
      }
    }

    // Numeric normalization
    if (field.type === "number" && typeof value === "string" && value.length > 0) {
      const num = parseFloat(value.replace(",", "."));
      if (!isNaN(num)) {
        corrections.push({ field: field.key, original: value, corrected: num, message: `Converti en nombre pour "${field.label}"` });
        data[field.key] = num;
      }
    }

    // Required check
    if (field.required) {
      if (value === "" || value === 0 || value === undefined || value === null) {
        errors.push({ field: field.key, message: `"${field.label}" est requis.` });
        continue;
      }
    }

    if (!value && !field.required) continue;

    const v = field.validation;
    if (!v) continue;

    // Number range
    if (field.type === "number") {
      const num = Number(value);
      if (v.min !== undefined && num < v.min) errors.push({ field: field.key, message: `"${field.label}" doit être ≥ ${v.min}.` });
      if (v.max !== undefined && num > v.max) errors.push({ field: field.key, message: `"${field.label}" doit être ≤ ${v.max}.` });
    }

    // String length
    if (typeof value === "string") {
      if (v.minLength && value.length < v.minLength) errors.push({ field: field.key, message: `"${field.label}" doit contenir au moins ${v.minLength} caractères.` });
      if (v.maxLength && value.length > v.maxLength) errors.push({ field: field.key, message: `"${field.label}" ne doit pas dépasser ${v.maxLength} caractères.` });
      if (v.pattern && !v.pattern.test(value)) errors.push({ field: field.key, message: v.patternMessage || `"${field.label}" format invalide.` });
    }

    // Custom validation
    if (v.custom) {
      const msg = v.custom(value, data);
      if (msg) errors.push({ field: field.key, message: msg });
    }
  }

  // Logical date checks
  const startFields = ["periodStart", "startDate", "dateDebut"];
  const endFields = ["periodEnd", "endDate", "dateFin"];
  for (const sf of startFields) {
    for (const ef of endFields) {
      if (data[sf] && data[ef]) {
        if (new Date(String(data[sf])) >= new Date(String(data[ef]))) {
          errors.push({ field: ef, message: "La date de fin doit être postérieure à la date de début." });
        }
      }
    }
  }

  // Deposit vs rent warning
  if (data.depositAmount && data.rentAmount) {
    const deposit = Number(data.depositAmount);
    const rent = Number(data.rentAmount);
    if (deposit > rent * 2) {
      warnings.push({ field: "depositAmount", message: "Le dépôt de garantie dépasse 2 mois de loyer (maximum légal pour un meublé)." });
    }
  }

  return { errors, warnings, corrections };
}
