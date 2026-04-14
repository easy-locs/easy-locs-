import {
  MODULE_WIRING,
  type VerticalKey,
  type ModuleWiring,
  type DashboardWiring,
  type RadarWiring,
  type WalletWiring,
  type MeWiring,
  type OrbitWiring,
} from "./module-wiring";

export interface DashboardHeroCategory {
  labelKey: string;
  fallback: string;
  emoji: string;
  route: string;
  color: string;
}

const VERTICAL_HERO_COLORS: Record<VerticalKey, string> = {
  food: "hsl(25 85% 55%)",
  grocery: "hsl(90 50% 45%)",
  shops: "hsl(var(--accent))",
  services: "hsl(210 70% 55%)",
  beauty: "hsl(340 65% 55%)",
  health: "hsl(0 65% 50%)",
  taxi: "hsl(200 80% 50%)",
  delivery: "hsl(160 60% 45%)",
  property: "hsl(var(--accent))",
  stay: "hsl(270 60% 55%)",
  travel: "hsl(280 70% 55%)",
  utility: "hsl(140 50% 45%)",
  education: "hsl(220 70% 55%)",
  finance: "hsl(152 60% 42%)",
  nightlife: "hsl(280 70% 55%)",
  experiences: "hsl(340 65% 55%)",
  mobility: "hsl(30 80% 50%)",
  healthcare: "hsl(0 65% 50%)",
};

const HERO_VERTICALS: VerticalKey[] = [
  "food", "services", "stay", "taxi", "delivery", "property",
];

export function getDashboardHeroCategories(): DashboardHeroCategory[] {
  return HERO_VERTICALS.map((key) => {
    const w = MODULE_WIRING[key];
    const route = w.dashboard.quickActions[0]?.route ?? `/browse/${key}`;
    return {
      labelKey: `home.cat_${key}`,
      fallback: w.label.split(" ")[0],
      emoji: w.emoji,
      route,
      color: VERTICAL_HERO_COLORS[key],
    };
  });
}

export function getDashboardCategoryImageKeys(): VerticalKey[] {
  return Object.keys(MODULE_WIRING) as VerticalKey[];
}

export function getAllDashboardQuickActions(): { vertical: VerticalKey; actions: DashboardWiring["quickActions"] }[] {
  return (Object.entries(MODULE_WIRING) as [VerticalKey, ModuleWiring][]).map(
    ([key, w]) => ({ vertical: key, actions: w.dashboard.quickActions })
  );
}

export interface RadarLayerDef {
  id: string;
  radarCategory: string;
  vertical: VerticalKey;
  labelKey: string;
  emoji: string;
  color: string;
}

const RADAR_LAYER_COLORS: Record<string, string> = {
  food: "hsl(15 80% 55%)",
  grocery: "hsl(90 50% 45%)",
  shops: "hsl(var(--accent))",
  services: "hsl(270 60% 55%)",
  property: "hsl(225 20% 35%)",
  utility: "hsl(140 50% 45%)",
  stay: "hsl(200 70% 50%)",
  nightlife: "hsl(280 70% 55%)",
  experiences: "hsl(340 65% 55%)",
  mobility: "hsl(30 80% 50%)",
  healthcare: "hsl(0 65% 50%)",
};

export function getRadarLayerDefs(): RadarLayerDef[] {
  const seen = new Set<string>();
  const layers: RadarLayerDef[] = [];

  for (const [key, w] of Object.entries(MODULE_WIRING) as [VerticalKey, ModuleWiring][]) {
    const rc = w.radar.radarCategory;
    if (seen.has(rc)) continue;
    seen.add(rc);
    layers.push({
      id: rc,
      radarCategory: rc,
      vertical: key,
      labelKey: `radar.layer_${rc}`,
      emoji: w.emoji,
      color: RADAR_LAYER_COLORS[rc] ?? "hsl(200 60% 50%)",
    });
  }
  return layers;
}

export function getRadarCategoryToLayerMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const [key, w] of Object.entries(MODULE_WIRING) as [VerticalKey, ModuleWiring][]) {
    map[key] = w.radar.radarCategory;
  }
  return map;
}

export function getWalletVerticalFeatures(): {
  vertical: VerticalKey;
  supportsTips: boolean;
  supportsDeposit: boolean;
  supportsRefund: boolean;
  supportsInstallment: boolean;
  supportsSubscription: boolean;
  paymentFlow: string;
  billingType: string;
}[] {
  return (Object.entries(MODULE_WIRING) as [VerticalKey, ModuleWiring][])
    .filter(([, w]) => w.wallet.paymentFlow !== "none")
    .map(([key, w]) => ({
      vertical: key,
      supportsTips: w.wallet.supportsTips,
      supportsDeposit: w.wallet.supportsDeposit,
      supportsRefund: w.wallet.supportsRefund,
      supportsInstallment: w.wallet.supportsInstallment,
      supportsSubscription: w.wallet.supportsSubscription,
      paymentFlow: w.wallet.paymentFlow,
      billingType: w.wallet.billingType,
    }));
}

export interface MeEssentialItem {
  vertical: VerticalKey;
  historyType: string;
  favoritesType: string;
  documentsType: string | null;
  addressRelevance: string;
  preferencesKeys: string[];
  showInProfile: boolean;
}

export function getMeEssentials(): MeEssentialItem[] {
  return (Object.entries(MODULE_WIRING) as [VerticalKey, ModuleWiring][])
    .filter(([, w]) => w.me.showInProfile)
    .map(([key, w]) => ({
      vertical: key,
      historyType: w.me.historyType,
      favoritesType: w.me.favoritesType,
      documentsType: w.me.documentsType,
      addressRelevance: w.me.addressRelevance,
      preferencesKeys: w.me.preferencesKeys,
      showInProfile: w.me.showInProfile,
    }));
}

export function getMeHistoryTypes(): string[] {
  return [...new Set(
    Object.values(MODULE_WIRING).map(w => w.me.historyType).filter(Boolean)
  )];
}

export function getMeFavoritesTypes(): string[] {
  return [...new Set(
    Object.values(MODULE_WIRING).map(w => w.me.favoritesType).filter(Boolean)
  )];
}

export function getOrbitThreadTypesForVertical(vertical: VerticalKey): OrbitWiring {
  return MODULE_WIRING[vertical].orbit;
}

export function getAllOrbitThreadTypes(): { vertical: VerticalKey; threadTypes: string[]; entityLink: string; contactLabel: string }[] {
  return (Object.entries(MODULE_WIRING) as [VerticalKey, ModuleWiring][])
    .filter(([, w]) => w.orbit.threadTypes.length > 0)
    .map(([key, w]) => ({
      vertical: key,
      threadTypes: w.orbit.threadTypes,
      entityLink: w.orbit.entityLink,
      contactLabel: w.orbit.contactLabel,
    }));
}

export function getVerticalLabel(vertical: VerticalKey): string {
  return MODULE_WIRING[vertical].label;
}

export function getVerticalEmoji(vertical: VerticalKey): string {
  return MODULE_WIRING[vertical].emoji;
}

export function getDashboardWiringForCategory(categoryKey: string): DashboardWiring | null {
  const vertical = (MODULE_WIRING as Record<string, ModuleWiring>)[categoryKey];
  return vertical?.dashboard ?? null;
}

export function getRadarLayersFromWiring(): { id: string; verticals: VerticalKey[] }[] {
  const layerMap = new Map<string, VerticalKey[]>();
  for (const [key, w] of Object.entries(MODULE_WIRING) as [VerticalKey, ModuleWiring][]) {
    const rc = w.radar.radarCategory;
    if (!layerMap.has(rc)) layerMap.set(rc, []);
    layerMap.get(rc)!.push(key);
  }
  return Array.from(layerMap.entries()).map(([id, verticals]) => ({ id, verticals }));
}
