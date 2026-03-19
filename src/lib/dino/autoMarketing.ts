/**
 * DINO V8 — Auto Marketing System
 * Sends automated, localized campaigns based on user segments and marketplace state.
 */

export interface CampaignTarget {
  segmentType: "dormant_users" | "new_users" | "high_value" | "at_risk_pros" | "inactive_pros" | "zone_users";
  estimatedReach: number;
  country: string;
  language: string;
  filters: Record<string, unknown>;
}

export interface Campaign {
  id: string;
  name: string;
  type: "retention" | "acquisition" | "activation" | "seasonal" | "reengagement";
  targets: CampaignTarget[];
  channels: ("push" | "email" | "in_app" | "sms")[];
  templateKey: string;
  scheduledAt: string;
  status: "draft" | "scheduled" | "sent" | "cancelled";
  content: Record<string, string>;  // language → message
}

export interface CampaignSuggestion {
  name: string;
  type: Campaign["type"];
  reason: string;
  priority: "high" | "medium" | "low";
  estimatedImpact: string;
  suggestedChannels: string[];
  suggestedTemplate: string;
}

export function suggestCampaigns(context: {
  dormantUserCount: number;
  newUserCount: number;
  inactiveProCount: number;
  lowQualityListingCount: number;
  seasonalEvent?: string;
  country: string;
}): CampaignSuggestion[] {
  const suggestions: CampaignSuggestion[] = [];

  if (context.dormantUserCount > 50) {
    suggestions.push({
      name: "Win Back Dormant Users",
      type: "reengagement",
      reason: `${context.dormantUserCount} users inactive for 30+ days`,
      priority: "high",
      estimatedImpact: `Potential ${Math.round(context.dormantUserCount * 0.1)} reactivations`,
      suggestedChannels: ["email", "push"],
      suggestedTemplate: "win_back_dormant",
    });
  }

  if (context.newUserCount > 20) {
    suggestions.push({
      name: "Welcome & Activate New Users",
      type: "activation",
      reason: `${context.newUserCount} new users need activation`,
      priority: "high",
      estimatedImpact: `Target ${Math.round(context.newUserCount * 0.6)} activations`,
      suggestedChannels: ["push", "in_app"],
      suggestedTemplate: "welcome_activation",
    });
  }

  if (context.inactiveProCount > 10) {
    suggestions.push({
      name: "Reactivate Professionals",
      type: "activation",
      reason: `${context.inactiveProCount} inactive pros — marketplace supply at risk`,
      priority: "high",
      estimatedImpact: `Recover ${Math.round(context.inactiveProCount * 0.3)} active listings`,
      suggestedChannels: ["email", "sms"],
      suggestedTemplate: "pro_reactivation",
    });
  }

  if (context.seasonalEvent) {
    suggestions.push({
      name: `${context.seasonalEvent} Campaign`,
      type: "seasonal",
      reason: `${context.seasonalEvent} event active in ${context.country}`,
      priority: "medium",
      estimatedImpact: "15-30% engagement boost during event",
      suggestedChannels: ["push", "in_app", "email"],
      suggestedTemplate: `seasonal_${context.seasonalEvent.toLowerCase().replace(/\s/g, "_")}`,
    });
  }

  if (context.lowQualityListingCount > 20) {
    suggestions.push({
      name: "Quality Improvement Drive",
      type: "activation",
      reason: `${context.lowQualityListingCount} listings below quality threshold`,
      priority: "medium",
      estimatedImpact: "Improve overall marketplace quality score",
      suggestedChannels: ["email"],
      suggestedTemplate: "quality_improvement",
    });
  }

  return suggestions.sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.priority] - { high: 0, medium: 1, low: 2 }[b.priority]));
}
