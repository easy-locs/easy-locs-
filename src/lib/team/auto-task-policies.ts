/**
 * Auto task policies — automatically create team tasks for disputes, payouts, moderation.
 */
import { createTeamTask } from "@/lib/team/create-team-task";

export async function createDisputeTask(params: { workspaceId: string; rideRequestId: string }) {
  return createTeamTask({
    workspaceId: params.workspaceId,
    taskType: "dispute",
    title: "Resolve ride dispute",
    description: "A new ride dispute needs review",
    contextType: "ride",
    contextId: params.rideRequestId,
    priority: "high",
  });
}

export async function createPayoutTask(params: { workspaceId: string; payoutId: string }) {
  return createTeamTask({
    workspaceId: params.workspaceId,
    taskType: "payout",
    title: "Process driver payout",
    description: "Pending payout requires action",
    contextType: "driver_payout",
    contextId: params.payoutId,
    priority: "medium",
  });
}

export async function createModerationTask(params: { workspaceId: string; messageId?: string | null }) {
  return createTeamTask({
    workspaceId: params.workspaceId,
    taskType: "moderation",
    title: "Review moderation event",
    description: "A flagged message needs review",
    contextType: "message",
    contextId: params.messageId ?? null,
    priority: "high",
  });
}
