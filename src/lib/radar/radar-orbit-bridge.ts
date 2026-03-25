/**
 * Radar → Orbit Bridge — Opens or creates an Orbit chat thread from any radar entity.
 * Enables the See → Chat → Order → Pay flow in <10s.
 * 
 * SCHEMA-VERIFIED: conversations_v2 columns:
 *   id, type, title, participants (jsonb), listing_id, booking_id,
 *   lease_id, last_message_at, created_at, updated_at, created_by_orbit_id
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
    // First get the user's orbit_id
    const { data: orbitProfile } = await supabase
      .from("orbit_profiles_v2")
      .select("orbit_id")
      .eq("id", userId)
      .maybeSingle();

    const userOrbitId = orbitProfile?.orbit_id || userId;

    // Check if conversation already exists for this entity + user
    // conversations_v2.participants is JSONB — search for user's orbit_id or user_id
    const { data: existing } = await (supabase
      .from("conversations_v2" as any)
      .select("id")
      .eq("type", "entity")
      .eq("title", entity.name)
      .contains("participants", [userOrbitId])
      .maybeSingle()) as any;

    if (existing?.id) {
      eventBus.emit("CONTACT_INITIATED", {
        targetUserId: entity.id,
        source: "radar",
        entityId: entity.id,
      });
      navigate(`/orbit?thread=${existing.id}`);
      return existing.id;
    }

    // Create new conversation thread using real schema columns
    const { data: newThread, error } = await (supabase
      .from("conversations_v2" as any)
      .insert({
        type: "entity",
        title: entity.name,
        participants: [userOrbitId],
        created_by_orbit_id: userOrbitId,
      })
      .select("id")
      .single()) as any;

    if (error || !newThread) {
      console.error("[radar-orbit] Failed to create thread:", error);
      // Fallback: navigate to orbit with entity context in URL
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
