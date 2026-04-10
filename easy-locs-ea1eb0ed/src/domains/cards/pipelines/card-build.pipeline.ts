/**
 * Card Build Pipeline — resolve → normalize → compute → store
 */
import { supabase } from "@/integrations/supabase/client";
import { normalizeEntity } from "../normalizers";
import { useCardStore } from "../card.store";
import type { CardViewModel } from "../selectors";
import type { CardCommandResult } from "../card-dispatch";

function toViewModel(entity: ReturnType<typeof normalizeEntity>): CardViewModel {
  return {
    id: entity.id,
    entityType: entity.entityType,
    title: entity.title,
    subtitle: entity.subtitle,
    imageUrl: entity.imageUrl,
    badges: entity.badgeLabels,
    rating: entity.rating != null ? entity.rating.toFixed(1) : null,
    reviewCount: entity.reviewCount ?? 0,
    priceLabel: entity.priceLabel,
    distanceLabel: entity.distance,
    etaLabel: entity.eta,
    status: entity.status,
    category: entity.category,
  };
}

export async function cardBuildPipeline(
  entityId: string,
  entityType: string,
): Promise<CardCommandResult> {
  const store = useCardStore.getState();

  // Already cached?
  if (store.cards[entityId]) return { ok: true };

  // Resolve from DB (lazy import to avoid circular)
  const { supabase } = await import("@/integrations/supabase/client");
  const tableMap: Record<string, string> = {
    storefront: "storefront_pages",
    listing: "property_listings_v2",
    activity: "activities",
    merchant: "auto_discovered_merchants",
  };
  const table = tableMap[entityType];
  if (!table) return { ok: false, error: `unknown_entity_type:${entityType}` };

  const { data, error } = await (supabase.from as any)(table).select("*").eq("id", entityId).maybeSingle();
  if (error || !data) return { ok: false, error: error?.message || "not_found" };

  // Normalize → ViewModel → Store
  const entity = normalizeEntity(data, entityType);
  const card = toViewModel(entity);
  store.setEntity(entityId, entity);
  store.setCard(entityId, card);

  return { ok: true };
}

export async function cardBatchPipeline(
  entityIds: string[],
  entityType: string,
): Promise<CardCommandResult> {
  const store = useCardStore.getState();
  const missing = entityIds.filter((id) => !store.cards[id]);
  if (!missing.length) return { ok: true };

  const tableMap: Record<string, string> = {
    storefront: "storefront_pages",
    listing: "property_listings_v2",
    activity: "activities",
    merchant: "auto_discovered_merchants",
  };
  const table = tableMap[entityType];
  if (!table) return { ok: false, error: `unknown_entity_type:${entityType}` };

  const { supabase } = await import("@/integrations/supabase/client");
  const { data, error } = await (supabase.from as any)(table).select("*").in("id", missing);
  if (error) return { ok: false, error: error.message };

  const entries = (data ?? []).map((row: any) => {
    const entity = normalizeEntity(row, entityType);
    return { id: entity.id, entity, card: toViewModel(entity) };
  });
  store.setBatch(entries);

  return { ok: true };
}
