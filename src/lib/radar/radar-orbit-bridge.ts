/**
 * Radar → Orbit Bridge — Opens or creates an Orbit chat thread from any radar entity.
 * Enables the See → Chat → Order → Pay flow in <10s.
 */
import { supabase } from "@/integrations/supabase/client";
import { eventBus } from "@/lib/events/eventBus";

export interface RadarEntity {
  id: string;
  name: string;
  category?: string;
  imageUrl?: string;
  image_url?: string;
  lat?: number;
  lng?: number;
  rating?: number;
}

/**
 * Find or create an Orbit conversation for a radar entity,
 * then navigate to it. Returns the thread ID.
 */
export async function openOrbitFromRadar(
  entity: RadarEntity,
  userId: string,
  navigate: (path: string) => void
): Promise<string | null> {
  try {
    // Check if conversation already exists for this entity + user
    const query = supabase
      .from("conversations_v2")
      .select("id")
      .eq("context_type", "entity")
      .eq("context_id", entity.id);
    const { data: existing } = await (query as any).contains("participant_ids", [userId]).maybeSingle();

    if (existing?.id) {
      eventBus.emit("CONTACT_INITIATED", {
        targetUserId: entity.id,
        source: "radar",
        entityId: entity.id,
      });
      navigate(`/orbit?thread=${existing.id}`);
      return existing.id;
    }

    // Create new conversation thread
    const { data: newThread, error } = await supabase
      .from("conversations_v2")
      .insert({
        participant_ids: [userId],
        context_type: "entity",
        context_id: entity.id,
        title: entity.name,
        metadata: {
          entity_name: entity.name,
          entity_category: entity.category,
          entity_image: entity.imageUrl || entity.image_url,
          entity_lat: entity.lat,
          entity_lng: entity.lng,
          entity_rating: entity.rating,
          source: "radar",
        },
      } as any)
      .select("id")
      .single();

    if (error || !newThread) {
      console.error("[radar-orbit] Failed to create thread:", error);
      // Fallback: navigate to orbit with entity context
      navigate(`/orbit?entity=${entity.id}&name=${encodeURIComponent(entity.name)}`);
      return null;
    }

    eventBus.emit("CONTACT_INITIATED", {
      targetUserId: entity.id,
      source: "radar",
      entityId: entity.id,
    });

    navigate(`/orbit?thread=${newThread.id}`);
    return newThread.id;
  } catch (err) {
    console.error("[radar-orbit] Error:", err);
    navigate(`/orbit?entity=${entity.id}&name=${encodeURIComponent(entity.name)}`);
    return null;
  }
}
