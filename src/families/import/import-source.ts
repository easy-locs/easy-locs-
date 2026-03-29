/**
 * import.source — Source identification, metadata extraction, validation.
 */

export type ImportSourceType = "csv" | "json" | "contacts" | "media" | "onboarding";

export interface ImportSourceMeta {
  type: ImportSourceType;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  rowCount?: number;
  valid: boolean;
  error?: string;
}

const ALLOWED_MIMES: Record<ImportSourceType, string[]> = {
  csv: ["text/csv", "application/vnd.ms-excel"],
  json: ["application/json"],
  contacts: ["text/vcard", "text/csv", "application/json"],
  media: ["image/*", "video/*"],
  onboarding: ["application/json", "text/csv"],
};

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

export const ImportSource = {
  /** Detect source type from file */
  detect(file: File): ImportSourceType {
    if (file.name.endsWith(".csv")) return "csv";
    if (file.name.endsWith(".json")) return "json";
    if (file.name.endsWith(".vcf")) return "contacts";
    if (file.type.startsWith("image/") || file.type.startsWith("video/")) return "media";
    return "csv"; // default
  },

  /** Validate a source file */
  validate(file: File, expectedType?: ImportSourceType): ImportSourceMeta {
    const type = expectedType || this.detect(file);
    const meta: ImportSourceMeta = {
      type,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      valid: true,
    };

    if (file.size > MAX_FILE_SIZE) {
      meta.valid = false;
      meta.error = `File too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)`;
    }

    return meta;
  },
};
