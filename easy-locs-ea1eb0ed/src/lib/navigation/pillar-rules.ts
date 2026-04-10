import type { Pillar, ActionLevel } from "./navigation-intent";

export interface PillarTransitionRule {
  from: Pillar;
  to: Pillar;
  defaultLevel: ActionLevel;
  upgradeConditions: string[];
}

export const PILLAR_RULES: PillarTransitionRule[] = [
  { from: "dashboard", to: "radar", defaultLevel: "overlay", upgradeConditions: ["full_search", "open_full_map", "explore_zone", "filter_advanced"] },
  { from: "dashboard", to: "orbit", defaultLevel: "overlay", upgradeConditions: ["full_chat", "active_call", "manage_contacts"] },
  { from: "dashboard", to: "wallet", defaultLevel: "overlay", upgradeConditions: ["manage_payments", "view_analytics"] },
  { from: "dashboard", to: "me", defaultLevel: "overlay", upgradeConditions: ["manage_profile", "manage_business", "manage_settings"] },

  { from: "radar", to: "orbit", defaultLevel: "overlay", upgradeConditions: ["full_chat", "active_call"] },
  { from: "radar", to: "wallet", defaultLevel: "overlay", upgradeConditions: ["manage_payments"] },
  { from: "radar", to: "me", defaultLevel: "overlay", upgradeConditions: ["manage_profile"] },
  { from: "radar", to: "dashboard", defaultLevel: "full", upgradeConditions: [] },

  { from: "orbit", to: "radar", defaultLevel: "full", upgradeConditions: [] },
  { from: "orbit", to: "wallet", defaultLevel: "overlay", upgradeConditions: ["manage_payments"] },
  { from: "orbit", to: "me", defaultLevel: "overlay", upgradeConditions: ["manage_profile"] },
  { from: "orbit", to: "dashboard", defaultLevel: "full", upgradeConditions: [] },

  { from: "wallet", to: "radar", defaultLevel: "full", upgradeConditions: [] },
  { from: "wallet", to: "orbit", defaultLevel: "overlay", upgradeConditions: ["full_chat"] },
  { from: "wallet", to: "me", defaultLevel: "overlay", upgradeConditions: ["manage_profile"] },
  { from: "wallet", to: "dashboard", defaultLevel: "full", upgradeConditions: [] },

  { from: "me", to: "radar", defaultLevel: "full", upgradeConditions: [] },
  { from: "me", to: "orbit", defaultLevel: "overlay", upgradeConditions: ["full_chat"] },
  { from: "me", to: "wallet", defaultLevel: "overlay", upgradeConditions: ["manage_payments"] },
  { from: "me", to: "dashboard", defaultLevel: "full", upgradeConditions: [] },
];

export function getTransitionRule(from: Pillar, to: Pillar): PillarTransitionRule | undefined {
  return PILLAR_RULES.find(r => r.from === from && r.to === to);
}

export function shouldUpgradeToFull(from: Pillar, to: Pillar, action: string): boolean {
  const rule = getTransitionRule(from, to);
  if (!rule) return true;
  return rule.upgradeConditions.includes(action);
}
