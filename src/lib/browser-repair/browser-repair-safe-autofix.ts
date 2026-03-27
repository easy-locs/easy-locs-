import { supabase } from "@/integrations/supabase/client";

export async function safeAutoFixLiveMerchantIntegrity() {
  const { data: broken } = await (supabase as any)
    .from("seed_merchants")
    .select("id")
    .eq("visibility_mode", "live")
    .or("name.is.null,category.is.null,vertical.is.null")
    .limit(50);

  let fixed = 0;

  for (const row of broken ?? []) {
    const { error } = await (supabase as any)
      .from("seed_merchants")
      .update({
        visibility_mode: "hidden",
        blocking_reason: "browser_repair:missing_required_fields",
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);

    if (!error) fixed++;
  }

  return fixed;
}

export async function safeAutoFixBrokenGroups() {
  const { data: rows } = await (supabase as any)
    .from("conversations_v2")
    .select("id, participants, type")
    .eq("type", "group")
    .limit(50);

  let fixed = 0;

  for (const row of rows ?? []) {
    const participants = Array.isArray(row.participants) ? row.participants : [];
    if (participants.length >= 2) continue;

    const { error } = await (supabase as any)
      .from("conversations_v2")
      .update({
        type: "direct",
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);

    if (!error) fixed++;
  }

  return fixed;
}

export async function safeAutoFixStuckEngines() {
  const { data: rows } = await (supabase as any)
    .from("engine_supervisor")
    .select("engine_name, status")
    .eq("status", "running");

  if (!rows?.length) return 0;

  const { error } = await (supabase as any)
    .from("engine_supervisor")
    .update({
      status: "idle",
      updated_at: new Date().toISOString(),
    })
    .eq("status", "running");

  if (error) return 0;
  return rows.length;
}
