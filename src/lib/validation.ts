/**
 * Validation & Forms Engine
 * Reusable Zod schemas, sanitization, and form helpers.
 */
import { z } from "zod";

/* ═══════════════════════════════════════════════════
   1. SANITIZATION
   ═══════════════════════════════════════════════════ */

/** Strip HTML tags from a string */
export function stripHTML(input: string): string {
  return input.replace(/<[^>]*>/g, "").trim();
}

/** Sanitize a string for safe display (escape HTML entities) */
export function escapeHTML(input: string): string {
  const map: Record<string, string> = {
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#x27;", "/": "&#x2F;",
  };
  return input.replace(/[&<>"'/]/g, (c) => map[c] || c);
}

/** Normalize whitespace (collapse multiple spaces/newlines) */
export function normalizeWhitespace(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

/** Remove null bytes and control characters */
export function sanitizeControl(input: string): string {
  return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
}

/** Full sanitize pipeline */
export function sanitize(input: string): string {
  return normalizeWhitespace(sanitizeControl(stripHTML(input)));
}

/* ═══════════════════════════════════════════════════
   2. COMMON ZOD SCHEMAS
   ═══════════════════════════════════════════════════ */

/** Email with normalization */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Adresse email invalide")
  .max(255, "Email trop long");

/** Phone: international format */
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9\s\-().]{7,20}$/, "Numéro de téléphone invalide")
  .transform((v) => v.replace(/[\s\-().]/g, ""));

/** Safe text input (no HTML, max length) */
export function safeText(maxLength = 500) {
  return z
    .string()
    .trim()
    .max(maxLength, `Maximum ${maxLength} caractères`)
    .transform(sanitize);
}

/** Multiline text (preserves newlines, strips HTML) */
export function safeTextarea(maxLength = 5000) {
  return z
    .string()
    .trim()
    .max(maxLength, `Maximum ${maxLength} caractères`)
    .transform((v) => sanitizeControl(stripHTML(v)));
}

/** Positive number */
export const positiveNumber = z
  .number({ invalid_type_error: "Nombre requis" })
  .positive("Doit être positif");

/** Non-negative number (0 allowed) */
export const nonNegativeNumber = z
  .number({ invalid_type_error: "Nombre requis" })
  .min(0, "Doit être positif ou zéro");

/** Currency amount (2 decimal max) */
export const currencyAmount = z
  .number({ invalid_type_error: "Montant requis" })
  .min(0, "Montant invalide")
  .transform((v) => Math.round(v * 100) / 100);

/** UUID */
export const uuidSchema = z
  .string()
  .uuid("Identifiant invalide");

/** URL with protocol */
export const urlSchema = z
  .string()
  .trim()
  .url("URL invalide")
  .max(2048, "URL trop longue");

/** Date string (YYYY-MM-DD) */
export const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Format de date invalide (YYYY-MM-DD)")
  .refine((d) => !isNaN(new Date(d).getTime()), "Date invalide");

/** Month string (YYYY-MM) */
export const monthSchema = z
  .string()
  .regex(/^\d{4}-\d{2}$/, "Format de mois invalide (YYYY-MM)");

/** Password with strength requirements */
export const passwordSchema = z
  .string()
  .min(8, "Minimum 8 caractères")
  .max(128, "Maximum 128 caractères")
  .regex(/[a-z]/, "Doit contenir une minuscule")
  .regex(/[A-Z]/, "Doit contenir une majuscule")
  .regex(/[0-9]/, "Doit contenir un chiffre");

/* ═══════════════════════════════════════════════════
   3. DOMAIN SCHEMAS
   ═══════════════════════════════════════════════════ */

/** Contact form */
export const contactSchema = z.object({
  name: safeText(100).pipe(z.string().min(1, "Nom requis")),
  email: emailSchema,
  phone: phoneSchema.optional(),
  message: safeTextarea(2000).pipe(z.string().min(1, "Message requis")),
});

/** Property creation */
export const propertySchema = z.object({
  title: safeText(200).pipe(z.string().min(1, "Titre requis")),
  address: safeText(500).pipe(z.string().min(1, "Adresse requise")),
  city: safeText(100).pipe(z.string().min(1, "Ville requise")),
  postal_code: z.string().trim().max(20, "Code postal trop long").optional(),
  surface_m2: positiveNumber.optional(),
  rooms: nonNegativeNumber.optional(),
  rent_amount: currencyAmount.optional(),
  property_type: z.enum(["apartment", "house", "studio", "commercial", "land", "other"]).default("apartment"),
});

/** Tenant creation */
export const tenantSchema = z.object({
  name: safeText(200).pipe(z.string().min(1, "Nom requis")),
  email: emailSchema,
  phone: phoneSchema.optional(),
  monthly_income: currencyAmount.optional(),
  profession: safeText(200).optional(),
});

/** Lease creation */
export const leaseSchema = z.object({
  tenant_id: uuidSchema,
  property_id: uuidSchema,
  start_date: dateStringSchema,
  end_date: dateStringSchema.optional(),
  rent_amount: currencyAmount,
  charges_amount: currencyAmount.optional(),
  deposit_amount: currencyAmount.optional(),
}).refine(
  (d) => !d.end_date || new Date(d.end_date) > new Date(d.start_date),
  { message: "La date de fin doit être après la date de début", path: ["end_date"] }
);

/** Payment recording */
export const paymentSchema = z.object({
  tenant_id: uuidSchema,
  amount: currencyAmount.pipe(z.number().positive("Montant requis")),
  month: monthSchema,
  method: z.enum(["bank_transfer", "cash", "check", "card", "mobile"]).default("bank_transfer"),
  notes: safeTextarea(1000).optional(),
});

/* ═══════════════════════════════════════════════════
   4. FORM HELPERS
   ═══════════════════════════════════════════════════ */

export type ValidationErrors<T> = Partial<Record<keyof T, string>>;

/** Validate data against a Zod schema, return first error per field */
export function validateForm<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown
): { success: true; data: z.infer<T> } | { success: false; errors: ValidationErrors<z.infer<T>> } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join(".") || "_root";
    if (!errors[path]) {
      errors[path] = issue.message;
    }
  }
  return { success: false, errors: errors as ValidationErrors<z.infer<T>> };
}

/** Check if a single field is valid */
export function validateField<T extends z.ZodTypeAny>(
  schema: T,
  value: unknown
): string | null {
  const result = schema.safeParse(value);
  if (result.success) return null;
  return result.error.issues[0]?.message ?? "Valeur invalide";
}

/** Password strength scorer (0-4) */
export function scorePassword(password: string): {
  score: number;
  label: "weak" | "fair" | "good" | "strong";
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;

  if (password.length >= 8) score++;
  else feedback.push("Minimum 8 caractères");

  if (password.length >= 12) score++;

  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  else feedback.push("Mélangez majuscules et minuscules");

  if (/[0-9]/.test(password) && /[^a-zA-Z0-9]/.test(password)) score++;
  else feedback.push("Ajoutez chiffres et caractères spéciaux");

  const labels = ["weak", "fair", "good", "strong"] as const;
  return {
    score: Math.min(score, 4),
    label: labels[Math.min(score, 3)],
    feedback,
  };
}
