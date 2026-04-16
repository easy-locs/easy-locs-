const BYTES_PER_CHAR = 2;
const OBJECT_OVERHEAD_BYTES = 64;
const ARRAY_OVERHEAD_BYTES = 32;

export function estimateStringSize(value: string): number {
  return value.length * BYTES_PER_CHAR + OBJECT_OVERHEAD_BYTES;
}

export function estimateObjectSize(obj: unknown): number {
  if (obj === null || obj === undefined) return 0;

  if (typeof obj === "string") return estimateStringSize(obj);
  if (typeof obj === "number" || typeof obj === "boolean") return 8;

  if (Array.isArray(obj)) {
    let total = ARRAY_OVERHEAD_BYTES;
    for (const item of obj) {
      total += estimateObjectSize(item);
    }
    return total;
  }

  if (typeof obj === "object") {
    let total = OBJECT_OVERHEAD_BYTES;
    for (const key of Object.keys(obj as Record<string, unknown>)) {
      total += estimateStringSize(key);
      total += estimateObjectSize((obj as Record<string, unknown>)[key]);
    }
    return total;
  }

  return 8;
}

export function estimateJsonSize(json: string): number {
  return json.length * BYTES_PER_CHAR;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function estimateListItemSize(
  itemType: "conversation" | "message" | "notification" | "property" | "product" | "generic",
): number {
  const defaults: Record<string, number> = {
    conversation: 72,
    message: 56,
    notification: 64,
    property: 120,
    product: 80,
    generic: 64,
  };
  return defaults[itemType] ?? defaults.generic;
}
