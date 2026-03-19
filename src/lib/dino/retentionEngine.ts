/**
 * DINO V6 — User Retention Engine
 * Tracks user engagement patterns and triggers re-engagement actions.
 */

export interface UserEngagement {
  userId: string;
  visitCount: number;
  lastVisitAt: string;
  avgSessionMinutes: number;
  interactionLevel: "high" | "medium" | "low" | "dormant";
  favoriteServices: string[];
  lastOrderAt?: string;
}

export interface RetentionAction {
  userId: string;
  actionType: "smart_reminder" | "personalized_content" | "win_back" | "loyalty_reward" | "onboarding_nudge";
  channel: "push" | "email" | "in_app";
  priority: "high" | "medium" | "low";
  templateKey: string;
  payload: Record<string, unknown>;
}

function daysSince(dateStr: string): number {
  return (Date.now() - new Date(dateStr).getTime()) / 86_400_000;
}

export function classifyEngagement(user: UserEngagement): UserEngagement["interactionLevel"] {
  const daysSinceVisit = daysSince(user.lastVisitAt);
  if (daysSinceVisit <= 3 && user.visitCount >= 5) return "high";
  if (daysSinceVisit <= 7) return "medium";
  if (daysSinceVisit <= 30) return "low";
  return "dormant";
}

export function generateRetentionActions(users: UserEngagement[]): RetentionAction[] {
  const actions: RetentionAction[] = [];

  for (const user of users) {
    const level = classifyEngagement(user);
    const daysSinceVisit = daysSince(user.lastVisitAt);

    if (level === "dormant") {
      actions.push({
        userId: user.userId,
        actionType: "win_back",
        channel: "email",
        priority: "high",
        templateKey: "win_back_dormant",
        payload: { daysSinceVisit: Math.round(daysSinceVisit), favoriteServices: user.favoriteServices },
      });
    }

    if (level === "low") {
      actions.push({
        userId: user.userId,
        actionType: "smart_reminder",
        channel: "push",
        priority: "medium",
        templateKey: "engagement_reminder",
        payload: { favoriteServices: user.favoriteServices },
      });
    }

    if (level === "high" && user.visitCount >= 10) {
      actions.push({
        userId: user.userId,
        actionType: "loyalty_reward",
        channel: "in_app",
        priority: "low",
        templateKey: "loyalty_reward",
        payload: { visitCount: user.visitCount },
      });
    }

    // Onboarding nudge for new users with low engagement
    if (user.visitCount <= 2 && daysSinceVisit >= 1 && daysSinceVisit <= 7) {
      actions.push({
        userId: user.userId,
        actionType: "onboarding_nudge",
        channel: "push",
        priority: "high",
        templateKey: "complete_onboarding",
        payload: {},
      });
    }
  }

  return actions;
}
