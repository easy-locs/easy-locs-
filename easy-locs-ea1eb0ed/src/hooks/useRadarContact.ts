/**
 * useRadarContact — Canonical hook for Radar → Orbit contact flow.
 *
 * Unifies:
 *  - radar-orbit-bridge.ts (entity → orbit)
 *  - contactBridge.ts (discovery → orbit)
 *  - navigate-to-thread.ts (userId → orbit thread)
 *
 * Contract:
 *  - URL param is always `thread` (e.g. /orbit?thread=<uuid>)
 *  - participants stored as simple string array [userId, targetUserId]
 *  - Falls back to /orbit?entity=<id>&name=<name> if thread creation fails
 */
import { useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getOrCreateDirectThread } from "@/lib/direct-thread";
import { db as supabase } from "@/services/db";
import { orbitDispatch } from "@/families/orbit-dispatch/orbit-dispatch";
import { platformBus } from "@/lib/shared/platform-bus";
import { toast } from "sonner";

export interface RadarContactTarget {
  entityId: string;
  entityName: string;
  entityType?: string;
  targetUserId?: string | null;
  autoMessage?: string;
}

export interface UseRadarContactResult {
  contact: (target: RadarContactTarget) => Promise<void>;
  isLoading: boolean;
}

/**
 * Resolve the ownerUserId for a radar entity by looking up storefront_pages
 * or marketplace_listings tables. Returns null if not found.
 */
async function resolveTargetUser(entityId: string, entityType?: string): Promise<string | null> {
  try {
    const { data: sf } = await supabase
      .from("storefront_pages")
      .select("owner_id")
      .eq("id", entityId)
      .maybeSingle();
    if (sf?.owner_id) return sf.owner_id;
  } catch (_) {}

  try {
    const { data: ml } = await supabase
      .from("marketplace_listings")
      .select("org_id, created_by")
      .eq("id", entityId)
      .maybeSingle();
    if (ml?.created_by || ml?.org_id) return ml.created_by || ml.org_id;
  } catch (_) {}

  return null;
}

export function useRadarContact(): UseRadarContactResult {
  const { user } = useAuth();
  const navigate = useNavigate();
  const loadingRef = useRef(false);

  const contact = useCallback(async (target: RadarContactTarget): Promise<void> => {
    if (loadingRef.current) return;
    loadingRef.current = true;

    try {
      if (!user?.id) {
        navigate("/login");
        return;
      }

      // Resolve targetUserId if not provided
      let targetUserId = target.targetUserId ?? null;
      if (!targetUserId) {
        targetUserId = await resolveTargetUser(target.entityId, target.entityType);
      }

      if (!targetUserId || targetUserId === user.id) {
        // Cannot contact self or unknown owner — fall back to orbit with entity context
        navigate(`/orbit?entity=${target.entityId}&name=${encodeURIComponent(target.entityName)}`);
        return;
      }

      const result = await getOrCreateDirectThread({
        currentUserId: user.id,
        targetUserId,
        targetName: target.entityName,
      });

      if (!result?.conversationId) {
        navigate(`/orbit?entity=${target.entityId}&name=${encodeURIComponent(target.entityName)}`);
        return;
      }

      const conversationId = result.conversationId;

      if (target.autoMessage) {
        orbitDispatch({
          type: "send_text",
          conversationId,
          body: target.autoMessage,
        }).catch(console.error);
      }

      platformBus.emit("radar:contact_opened", {
        entityId: target.entityId,
        entityName: target.entityName,
        conversationId,
        source: "radar",
      }, "radar");

      navigate(`/orbit?thread=${conversationId}`);
    } catch (err) {
      console.error("[useRadarContact] error:", err);
      toast.error("Could not open conversation");
      navigate(`/orbit?entity=${target.entityId}&name=${encodeURIComponent(target.entityName)}`);
    } finally {
      loadingRef.current = false;
    }
  }, [user?.id, navigate]);

  return { contact, isLoading: loadingRef.current };
}
