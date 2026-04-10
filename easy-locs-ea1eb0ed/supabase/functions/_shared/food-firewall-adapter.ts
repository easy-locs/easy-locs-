/**
 * Food Firewall Adapter — Wrapper for brain-firewall.ts
 * Enforces firewall on all food merchant critical writes.
 */
import { firewallCheck, guardedUpdate } from "./brain-firewall.ts";

const FOOD_PROTECTED_FIELDS = [
  "visibility_mode",
  "category",
  "subcategory",
  "is_published",
  "publish_gate_status",
] as const;

export async function guardFoodMerchantWrite(
  supabase: any,
  engineName: string,
  merchantId: string,
  fields: Record<string, any>,
  previousValues?: Record<string, any>
): Promise<{ written: boolean; blocked: boolean; reasons: string[] }> {
  // Check if any protected field is being written
  const hasProtectedField = FOOD_PROTECTED_FIELDS.some(
    (f) => fields[f] !== undefined
  );

  if (!hasProtectedField) {
    // Non-critical write — bypass firewall
    await supabase.from("seed_merchants").update(fields).eq("id", merchantId);
    return { written: true, blocked: false, reasons: [] };
  }

  return guardedUpdate(
    supabase,
    engineName,
    "seed_merchants",
    merchantId,
    fields,
    previousValues
  );
}
