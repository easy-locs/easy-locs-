/**
 * AI Feedback Engine — recomputes per-entity recommendation scores from recent signals.
 * Uses time-decay weighted aggregation across interest/conversion/trust/momentum.
 */
import { supabase } from "@/integrations/supabase/client";

function daysAgoIso(days: number) {
  return new Date(Date.now() - days * 86400000).toISOString();
}

export async function recomputeEntityAiScores(limit = 100): Promise<{ updated: number }> {
  const since30 = daysAgoIso(30);

  const { data: signals, error } = await (supabase as any)
    .from("entity_feedback_signals")
    .select("entity_id, event_type, weight, created_at")
    .gte("created_at", since30)
    .order("created_at", { ascending: false })
    .limit(5000);

  if (error) {
    console.error("[ai-feedback] fetch signals error", error);
    return { updated: 0 };
  }

  // Group by entity
  const grouped: Record<string, any[]> = {};
  for (const s of signals ?? []) {
    if (!grouped[s.entity_id]) grouped[s.entity_id] = [];
    grouped[s.entity_id].push(s);
  }

  let updated = 0;

  for (const [entityId, entitySignals] of Object.entries(grouped).slice(0, limit)) {
    let interest = 0;
    let conversion = 0;
    let trust = 0;
    let momentum = 0;

    for (const s of entitySignals) {
      const ageDays = Math.max(0, (Date.now() - new Date(s.created_at).getTime()) / 86400000);
      const decay = Math.max(0.2, 1 - ageDays / 30);
      const w = Number(s.weight || 0) * decay;

      if (["entity.view", "entity.click", "favorite.added"].includes(s.event_type)) {
        interest += w;
      }
      if (["order.created", "order.completed"].includes(s.event_type)) {
        conversion += w;
      }
      if (["order.completed", "favorite.added"].includes(s.event_type)) {
        trust += w;
      }
      if (["entity.click", "order.created", "boost.purchased"].includes(s.event_type)) {
        momentum += w;
      }
      if (s.event_type === "cart.abandoned") {
        conversion -= Math.abs(w);
      }
    }

    const recommendation =
      interest * 0.25 +
      conversion * 0.35 +
      trust * 0.2 +
      momentum * 0.2;

    const freshness = Math.min(100, Math.max(10, entitySignals.length * 2));

    await (supabase as any)
      .from("entity_ai_scores")
      .upsert({
        entity_id: entityId,
        entity_type: "merchant",
        interest_score: Math.round(interest * 100) / 100,
        conversion_score: Math.round(conversion * 100) / 100,
        trust_score: Math.round(trust * 100) / 100,
        momentum_score: Math.round(momentum * 100) / 100,
        freshness_score: Math.round(freshness * 100) / 100,
        recommendation_score: Math.round(recommendation * 100) / 100,
        updated_at: new Date().toISOString(),
      });

    updated++;
  }

  return { updated };
}
