/**
 * group.create — Canonical group creation pipeline.
 * Routes through orbitDb + flow gate.
 */
import { orbitDb } from "@/lib/db/orbitDb";
import { platformBus } from "@/lib/shared/platform-bus";
import { withFlowGate } from "@/domains/orbit/flow-gate";

export interface GroupPayload {
  title: string;
  description?: string;
  avatarUrl?: string;
  memberIds: string[];
  createdByUserId: string;
  createdByOrbitId?: string;
}

export const GroupCreate = {
  /** Validate group payload */
  validate(payload: GroupPayload): { valid: boolean; error?: string } {
    if (!payload.title.trim()) return { valid: false, error: "Group title is required" };
    if (payload.memberIds.length < 1) return { valid: false, error: "At least one member required" };
    if (payload.memberIds.length > 256) return { valid: false, error: "Max 256 members" };
    return { valid: true };
  },

  /** Create a group conversation via flow gate */
  async execute(payload: GroupPayload): Promise<{ id: string } | null> {
    return withFlowGate("conversation.createGroup", async () => {
      const validation = GroupCreate.validate(payload);
      if (!validation.valid) throw new Error(validation.error);

      const participants = [
        { userId: payload.createdByUserId, role: "admin" },
        ...payload.memberIds
          .filter((id) => id !== payload.createdByUserId)
          .map((id) => ({ userId: id, role: "member" })),
      ];

      const { data, error } = await orbitDb.conversations.insert({
        type: "group",
        title: payload.title,
        description: payload.description || null,
        avatar_url: payload.avatarUrl || null,
        participants,
        created_by_user_id: payload.createdByUserId,
        created_by_orbit_id: payload.createdByOrbitId || null,
      });

      if (error) throw error;

      platformBus.emit("orbit:group_created", {
        groupId: data.id,
        title: payload.title,
        memberCount: participants.length,
      }, "orbit", { userId: payload.createdByUserId });

      return data;
    });
  },
};
