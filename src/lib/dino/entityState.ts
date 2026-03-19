/**
 * DINO Entity State — Track state of any entity across audit/sync cycles.
 */

import { supabase } from "@/integrations/supabase/client";

export async function setEntityState(
  entityType: string,
  entityId: string,
  stateKey: string,
  stateValue: Record<string, unknown>
) {
  const existing = await getEntityState(entityType, entityId, stateKey);

  if (existing) {
    const { error } = await supabase
      .from("dino_entity_state")
      .update({
        state_value: stateValue,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("dino_entity_state")
      .insert({
        entity_type: entityType,
        entity_id: entityId,
        state_key: stateKey,
        state_value: stateValue,
        updated_at: new Date().toISOString(),
      });
    if (error) throw error;
  }
}

export async function getEntityState(
  entityType: string,
  entityId: string,
  stateKey: string
) {
  const { data, error } = await supabase
    .from("dino_entity_state")
    .select("*")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .eq("state_key", stateKey)
    .maybeSingle();

  if (error) throw error;
  return data;
}
