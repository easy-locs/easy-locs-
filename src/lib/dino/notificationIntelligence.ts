/**
 * DINO V5 — Global Notification Intelligence
 * Timed, contextual, non-spammy notification rules.
 */

export interface NotificationCandidate {
  userId: string;
  templateKey: string;
  channel: "email" | "push" | "sms" | "in_app";
  scheduledAt?: string;
  payload: Record<string, unknown>;
}

export interface NotificationRule {
  templateKey: string;
  maxPerDay: number;
  maxPerWeek: number;
  cooldownHours: number;
  allowedChannels: string[];
  priority: number; // lower = higher priority
}

const RULES: Record<string, NotificationRule> = {
  missing_photos_reminder:  { templateKey: "missing_photos_reminder",  maxPerDay: 1, maxPerWeek: 2, cooldownHours: 72, allowedChannels: ["email"], priority: 3 },
  missing_categories_reminder: { templateKey: "missing_categories_reminder", maxPerDay: 1, maxPerWeek: 1, cooldownHours: 168, allowedChannels: ["email"], priority: 4 },
  cart_abandoned:           { templateKey: "cart_abandoned",           maxPerDay: 1, maxPerWeek: 3, cooldownHours: 4,  allowedChannels: ["push", "email"], priority: 1 },
  win_back_dormant:         { templateKey: "win_back_dormant",        maxPerDay: 1, maxPerWeek: 1, cooldownHours: 168, allowedChannels: ["email"], priority: 2 },
  engagement_reminder:      { templateKey: "engagement_reminder",     maxPerDay: 1, maxPerWeek: 2, cooldownHours: 48, allowedChannels: ["push"], priority: 3 },
  loyalty_reward:           { templateKey: "loyalty_reward",          maxPerDay: 1, maxPerWeek: 1, cooldownHours: 168, allowedChannels: ["in_app"], priority: 5 },
  complete_onboarding:      { templateKey: "complete_onboarding",     maxPerDay: 1, maxPerWeek: 3, cooldownHours: 24, allowedChannels: ["push", "email"], priority: 1 },
  quality_improvement:      { templateKey: "quality_improvement",     maxPerDay: 1, maxPerWeek: 1, cooldownHours: 168, allowedChannels: ["email"], priority: 4 },
};

export interface NotificationHistory {
  templateKey: string;
  sentAt: string;
}

export function shouldSendNotification(
  candidate: NotificationCandidate,
  recentHistory: NotificationHistory[]
): { allowed: boolean; reason?: string } {
  const rule = RULES[candidate.templateKey];
  if (!rule) return { allowed: true };

  // Check channel
  if (!rule.allowedChannels.includes(candidate.channel)) {
    return { allowed: false, reason: `Channel "${candidate.channel}" not allowed for this template` };
  }

  const now = Date.now();
  const matching = recentHistory.filter(h => h.templateKey === candidate.templateKey);

  // Cooldown check
  const lastSent = matching[0];
  if (lastSent) {
    const hoursSince = (now - new Date(lastSent.sentAt).getTime()) / 3_600_000;
    if (hoursSince < rule.cooldownHours) {
      return { allowed: false, reason: `Cooldown: ${Math.round(rule.cooldownHours - hoursSince)}h remaining` };
    }
  }

  // Daily limit
  const today = new Date().toISOString().slice(0, 10);
  const todayCount = matching.filter(h => h.sentAt.startsWith(today)).length;
  if (todayCount >= rule.maxPerDay) {
    return { allowed: false, reason: "Daily limit reached" };
  }

  // Weekly limit
  const weekAgo = new Date(now - 7 * 86_400_000).toISOString();
  const weekCount = matching.filter(h => h.sentAt > weekAgo).length;
  if (weekCount >= rule.maxPerWeek) {
    return { allowed: false, reason: "Weekly limit reached" };
  }

  return { allowed: true };
}

export function getNotificationRules() {
  return { ...RULES };
}
