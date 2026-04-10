/**
 * Override Write Gate — Wraps engine writes through the merchant override system.
 * ALL engines must use safeAutoWrite() instead of direct DB updates on piloted fields.
 */
import { canAutoUpdate, setAutoValue } from "./merchant-override-engine";
import { isValidFieldKey, SYSTEM_ONLY_FIELDS, type OverrideFieldKey } from "./override-field-registry";

/**
 * Safe auto-write: checks override permission before writing.
 * Returns { written: true } if value was applied, { written: false, suggested: true } if saved as suggestion.
 */
export async function safeAutoWrite(
  entityId: string,
  fieldKey: string,
  value: any,
  source: string = "engine"
): Promise<{ written: boolean; suggested: boolean }> {
  // System fields bypass override check
  if (SYSTEM_ONLY_FIELDS.has(fieldKey)) {
    const ok = await setAutoValue(entityId, fieldKey, value, source);
    return { written: ok, suggested: false };
  }

  // Validate field key
  if (!isValidFieldKey(fieldKey)) {
    console.warn(`[WriteGate] Unknown field key: "${fieldKey}" — skipping`);
    return { written: false, suggested: false };
  }

  // Check merchant override permission
  const allowed = await canAutoUpdate(entityId, fieldKey);
  
  if (allowed) {
    const ok = await setAutoValue(entityId, fieldKey, value, source);
    return { written: ok, suggested: false };
  } else {
    // Store as suggestion only
    await setAutoValue(entityId, fieldKey, value, source);
    return { written: false, suggested: true };
  }
}

/**
 * Batch safe auto-write for multiple fields at once.
 * Returns summary of what was written vs suggested.
 */
export async function batchSafeAutoWrite(
  entityId: string,
  fields: Record<string, any>,
  source: string = "engine"
): Promise<{ written: string[]; suggested: string[]; skipped: string[] }> {
  const written: string[] = [];
  const suggested: string[] = [];
  const skipped: string[] = [];

  for (const [key, value] of Object.entries(fields)) {
    if (!isValidFieldKey(key)) {
      skipped.push(key);
      continue;
    }
    const result = await safeAutoWrite(entityId, key, value, source);
    if (result.written) written.push(key);
    else if (result.suggested) suggested.push(key);
    else skipped.push(key);
  }

  return { written, suggested, skipped };
}
