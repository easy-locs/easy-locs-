import { createAppNotification } from "@/lib/notifications/app-notification-service";

export async function inviteContactToOrbit(input: {
  targetUserId: string;
  inviterUserId: string;
  inviterName?: string;
}) {
  await createAppNotification({
    userId: input.targetUserId,
    scope: "orbit",
    category: "invite",
    title: "New Orbit invite",
    body: `${input.inviterName || "Someone"} added you to Orbit`,
    route: "/orbit",
    severity: "info",
    entityType: "orbit_invite",
    entityId: input.inviterUserId,
  });
}
