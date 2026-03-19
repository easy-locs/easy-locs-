/**
 * Ad Slots — Reserved placements for future AI-controlled advertising.
 * All slots are disabled by default.
 */

export interface AdSlot {
  slotId: string;
  placement: "home_top" | "home_mid" | "marketplace_featured" | "nearby_results" | "shop_detail";
  isEnabled: boolean;
  isAiControlled: boolean;
  reserved: boolean;
}

export interface SponsoredItem {
  id: string;
  title: string;
  sponsorScore: number;
  budgetRemaining: number;
  isActive: boolean;
}

export const AD_SLOTS: AdSlot[] = [
  { slotId: "home_top_1", placement: "home_top", isEnabled: false, isAiControlled: true, reserved: true },
  { slotId: "marketplace_featured_1", placement: "marketplace_featured", isEnabled: false, isAiControlled: true, reserved: true },
  { slotId: "nearby_results_1", placement: "nearby_results", isEnabled: false, isAiControlled: true, reserved: true },
];

export function getAdSlot(placement: AdSlot["placement"]): AdSlot | null {
  return AD_SLOTS.find((s) => s.placement === placement) ?? null;
}

export function selectSponsoredItems(
  items: SponsoredItem[], placement: AdSlot["placement"], limit = 2,
): SponsoredItem[] {
  const slot = getAdSlot(placement);
  if (!slot || !slot.isEnabled) return [];
  return [...items]
    .filter((x) => x.isActive && x.budgetRemaining > 0)
    .sort((a, b) => b.sponsorScore - a.sponsorScore)
    .slice(0, limit);
}
