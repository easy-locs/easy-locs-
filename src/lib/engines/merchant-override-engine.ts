/**
 * Merchant Override Engine
 * 3-layer architecture: canonical base → auto-generated draft → merchant override
 * Ensures automation never overwrites merchant manual changes.
 */
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

// ── Types ──

export interface FieldOverride {
  id: string;
  entity_id: string;
  field_key: string;
  auto_value_json: any;
  merchant_value_json: any;
  is_auto_generated: boolean;
  is_merchant_locked: boolean;
  auto_source: string | null;
  override_source: string | null;
  suggestion_available: boolean;
  suggested_value_json: any;
  last_auto_update_at: string | null;
  last_merchant_update_at: string | null;
}

export type FieldStatus = "auto" | "manual" | "locked" | "suggested";

// ── Core Resolution ──

/**
 * Resolve the effective value for a field.
 * Priority: merchant_locked > merchant_manual > auto_generated
 */
export function resolveFieldValue(override: FieldOverride | null, autoValue: any): any {
  if (!override) return autoValue;
  if (override.is_merchant_locked && override.merchant_value_json != null) {
    return override.merchant_value_json;
  }
  if (override.merchant_value_json != null && override.last_merchant_update_at) {
    return override.merchant_value_json;
  }
  return override.auto_value_json ?? autoValue;
}

/** Get the status of a field */
export function getFieldStatus(override: FieldOverride | null): FieldStatus {
  if (!override) return "auto";
  if (override.is_merchant_locked) return "locked";
  if (override.suggestion_available) return "suggested";
  if (override.merchant_value_json != null && override.last_merchant_update_at) return "manual";
  return "auto";
}

// ── DB Operations ──

/** Get all overrides for an entity */
export async function getEntityOverrides(entityId: string): Promise<FieldOverride[]> {
  const { data } = await db
    .from("merchant_field_overrides")
    .select("*")
    .eq("entity_id", entityId);
  return data ?? [];
}

/** Get override for a specific field */
export async function getFieldOverride(entityId: string, fieldKey: string): Promise<FieldOverride | null> {
  const { data } = await db
    .from("merchant_field_overrides")
    .select("*")
    .eq("entity_id", entityId)
    .eq("field_key", fieldKey)
    .maybeSingle();
  return data;
}

/**
 * Set auto-generated value — only updates if merchant hasn't locked the field.
 * Returns true if the auto value was applied.
 */
export async function setAutoValue(
  entityId: string,
  fieldKey: string,
  autoValue: any,
  source: string = "engine"
): Promise<boolean> {
  // Check if merchant has locked this field
  const existing = await getFieldOverride(entityId, fieldKey);
  
  if (existing?.is_merchant_locked) {
    // Don't overwrite — offer as suggestion instead
    await db
      .from("merchant_field_overrides")
      .update({
        suggestion_available: true,
        suggested_value_json: autoValue,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    return false;
  }

  if (existing?.last_merchant_update_at && existing.merchant_value_json != null) {
    // Merchant has manually edited — don't overwrite, suggest instead
    await db
      .from("merchant_field_overrides")
      .update({
        suggestion_available: true,
        suggested_value_json: autoValue,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    return false;
  }

  // Safe to set auto value
  const { error } = await db
    .from("merchant_field_overrides")
    .upsert({
      entity_id: entityId,
      entity_type: "shop",
      field_key: fieldKey,
      auto_value_json: autoValue,
      is_auto_generated: true,
      auto_source: source,
      last_auto_update_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "entity_id,field_key" });

  return !error;
}

/** Merchant manually sets a value — locks against auto-override */
export async function setMerchantValue(
  entityId: string,
  fieldKey: string,
  merchantValue: any,
  userId?: string
): Promise<boolean> {
  const existing = await getFieldOverride(entityId, fieldKey);
  const previousValue = existing
    ? (existing.merchant_value_json ?? existing.auto_value_json)
    : null;

  const { error } = await db
    .from("merchant_field_overrides")
    .upsert({
      entity_id: entityId,
      entity_type: "shop",
      field_key: fieldKey,
      merchant_value_json: merchantValue,
      is_merchant_locked: false,
      override_source: "merchant",
      last_merchant_update_at: new Date().toISOString(),
      suggestion_available: false,
      suggested_value_json: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "entity_id,field_key" });

  if (!error && existing) {
    // Log history
    await db.from("merchant_override_history").insert({
      override_id: existing.id,
      entity_id: entityId,
      field_key: fieldKey,
      previous_value_json: previousValue,
      new_value_json: merchantValue,
      change_source: "merchant",
      changed_by: userId ?? null,
    });
  }

  return !error;
}

/** Lock a field — prevents ALL auto-updates */
export async function lockField(entityId: string, fieldKey: string): Promise<boolean> {
  const { error } = await db
    .from("merchant_field_overrides")
    .update({
      is_merchant_locked: true,
      updated_at: new Date().toISOString(),
    })
    .eq("entity_id", entityId)
    .eq("field_key", fieldKey);
  return !error;
}

/** Reset to auto — removes merchant override, re-enables automation */
export async function resetToAuto(entityId: string, fieldKey: string, userId?: string): Promise<boolean> {
  const existing = await getFieldOverride(entityId, fieldKey);
  
  const { error } = await db
    .from("merchant_field_overrides")
    .update({
      merchant_value_json: null,
      is_merchant_locked: false,
      override_source: null,
      last_merchant_update_at: null,
      suggestion_available: false,
      suggested_value_json: null,
      updated_at: new Date().toISOString(),
    })
    .eq("entity_id", entityId)
    .eq("field_key", fieldKey);

  if (!error && existing) {
    await db.from("merchant_override_history").insert({
      override_id: existing.id,
      entity_id: entityId,
      field_key: fieldKey,
      previous_value_json: existing.merchant_value_json,
      new_value_json: null,
      change_source: "reset_to_auto",
      changed_by: userId ?? null,
    });
  }

  return !error;
}

/** Accept a suggestion — applies the suggested value as the new auto value */
export async function acceptSuggestion(entityId: string, fieldKey: string): Promise<boolean> {
  const existing = await getFieldOverride(entityId, fieldKey);
  if (!existing?.suggestion_available) return false;

  const { error } = await db
    .from("merchant_field_overrides")
    .update({
      auto_value_json: existing.suggested_value_json,
      merchant_value_json: null,
      is_merchant_locked: false,
      suggestion_available: false,
      suggested_value_json: null,
      last_auto_update_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", existing.id);

  return !error;
}

/**
 * Check if automation can write to a field.
 * Used by all engines before auto-updating any entity field.
 */
export async function canAutoUpdate(entityId: string, fieldKey: string): Promise<boolean> {
  const override = await getFieldOverride(entityId, fieldKey);
  if (!override) return true; // No override record = auto is fine
  if (override.is_merchant_locked) return false;
  if (override.merchant_value_json != null && override.last_merchant_update_at) return false;
  return true;
}

// ── Bulk Resolution ──

/** Resolve all fields for an entity, merging auto and merchant values */
export async function resolveEntityFields(
  entityId: string,
  autoFields: Record<string, any>
): Promise<Record<string, { value: any; status: FieldStatus; hasSuggestion: boolean }>> {
  const overrides = await getEntityOverrides(entityId);
  const overrideMap = new Map(overrides.map(o => [o.field_key, o]));
  const result: Record<string, { value: any; status: FieldStatus; hasSuggestion: boolean }> = {};

  for (const [key, autoVal] of Object.entries(autoFields)) {
    const override = overrideMap.get(key) ?? null;
    result[key] = {
      value: resolveFieldValue(override, autoVal),
      status: getFieldStatus(override),
      hasSuggestion: override?.suggestion_available ?? false,
    };
  }

  return result;
}
