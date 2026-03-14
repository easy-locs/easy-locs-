export interface PlanConfig {
  key: string;
  tier: "free" | "solo" | "team" | "company";
  nameKey: string;
  subtitleKey: string;
  price: number;
  priceId: string;
  productId: string;
  intervalKey: string;
  featureKeys: string[];
  highlight: boolean;
  savingsKey?: string;
  descriptionKey: string;
  maxEmployees?: number;
}

/** i18n-aware plan accessors */
export function getPlanDisplay(plan: PlanConfig, t: (key: string) => string) {
  return {
    name: t(plan.nameKey) || plan.nameKey,
    subtitle: t(plan.subtitleKey) || plan.subtitleKey,
    interval: t(plan.intervalKey) || plan.intervalKey,
    description: t(plan.descriptionKey) || plan.descriptionKey,
    features: plan.featureKeys.map((k) => t(k) || k),
    savings: plan.savingsKey ? (t(plan.savingsKey) || plan.savingsKey) : undefined,
  };
}

const SOLO_FEATURES = [
  "plan.feat.unlimited_properties",
  "plan.feat.unlimited_services",
  "plan.feat.one_profile",
  "plan.feat.long_short_term",
  "plan.feat.legal_docs",
  "plan.feat.leases_inventory",
  "plan.feat.e_signature",
  "plan.feat.pdf_export",
  "plan.feat.ota_sync",
  "plan.feat.secure_archive",
];

const TEAM_FEATURES = [
  ...SOLO_FEATURES.filter(f => f !== "plan.feat.one_profile"),
  "plan.feat.ten_employees",
  "plan.feat.priority_support",
];

const COMPANY_FEATURES = [
  ...TEAM_FEATURES.filter(f => f !== "plan.feat.ten_employees"),
  "plan.feat.fifty_employees",
  "plan.feat.multi_country",
  "plan.feat.api_access",
];

// Product ID → tier mapping for check-subscription
export const PRODUCT_TIER_MAP: Record<string, string> = {
  // Solo
  "prod_U7umDIXfN7CQf2": "solo",
  "prod_U7unnsqliODBFg": "solo",
  // Team
  "prod_U7uoc9MNmkojax": "team",
  "prod_U7uotRXnfBtYj6": "team",
  // Company
  "prod_U7up10rqd4eQhA": "company",
  "prod_U7uqF0RSK8MZBk": "company",
  // Orbit Ghost
  "prod_U94pR9V8P0rfbq": "ghost",
  // Legacy — map to solo
  "prod_U37B1NPO4TQTnD": "solo",
  "prod_U37COZzTYiHqG1": "solo",
  "prod_U354fxGmmhSvn0": "solo",
  "prod_U355WIZ1brDxXV": "solo",
  "prod_U355aIW4nePfxQ": "solo",
  "prod_U355FFHHJ8rgAT": "solo",
  "prod_U2yLjzJN4Y7LYb": "solo",
  "prod_U2zlUjPtdVVjIw": "solo",
};

export const PLANS: PlanConfig[] = [
  // Solo Monthly
  {
    key: "solo_monthly",
    tier: "solo",
    nameKey: "plan.solo.name",
    subtitleKey: "plan.solo.subtitle",
    price: 9.99,
    priceId: "price_1T9ewsKcrlZX0EnnZ3BSFqbA",
    productId: "prod_U7umDIXfN7CQf2",
    intervalKey: "plan.interval.month",
    descriptionKey: "plan.solo.description",
    featureKeys: SOLO_FEATURES,
    highlight: false,
    maxEmployees: 1,
  },
  // Solo Annual
  {
    key: "solo_annual",
    tier: "solo",
    nameKey: "plan.solo.name",
    subtitleKey: "plan.solo.subtitle",
    price: 99,
    priceId: "price_1T9exiKcrlZX0EnnKD84obOV",
    productId: "prod_U7unnsqliODBFg",
    intervalKey: "plan.interval.year",
    descriptionKey: "plan.solo.description",
    featureKeys: SOLO_FEATURES,
    highlight: true,
    savingsKey: "plan.savings_annual",
    maxEmployees: 1,
  },
  // Team Monthly
  {
    key: "team_monthly",
    tier: "team",
    nameKey: "plan.team.name",
    subtitleKey: "plan.team.subtitle",
    price: 29,
    priceId: "price_1T9eyUKcrlZX0Enn2oIXajIL",
    productId: "prod_U7uoc9MNmkojax",
    intervalKey: "plan.interval.month",
    descriptionKey: "plan.team.description",
    featureKeys: TEAM_FEATURES,
    highlight: false,
    maxEmployees: 10,
  },
  // Team Annual
  {
    key: "team_annual",
    tier: "team",
    nameKey: "plan.team.name",
    subtitleKey: "plan.team.subtitle",
    price: 299,
    priceId: "price_1T9ez9KcrlZX0EnnSZ7rW1kd",
    productId: "prod_U7uotRXnfBtYj6",
    intervalKey: "plan.interval.year",
    descriptionKey: "plan.team.description",
    featureKeys: TEAM_FEATURES,
    highlight: true,
    savingsKey: "plan.savings_annual",
    maxEmployees: 10,
  },
  // Company Monthly
  {
    key: "company_monthly",
    tier: "company",
    nameKey: "plan.company.name",
    subtitleKey: "plan.company.subtitle",
    price: 99,
    priceId: "price_1T9ezqKcrlZX0EnnILcbutR3",
    productId: "prod_U7up10rqd4eQhA",
    intervalKey: "plan.interval.month",
    descriptionKey: "plan.company.description",
    featureKeys: COMPANY_FEATURES,
    highlight: false,
    maxEmployees: 50,
  },
  // Company Annual
  {
    key: "company_annual",
    tier: "company",
    nameKey: "plan.company.name",
    subtitleKey: "plan.company.subtitle",
    price: 999,
    priceId: "price_1T9f0XKcrlZX0EnnWoxleETG",
    productId: "prod_U7uqF0RSK8MZBk",
    intervalKey: "plan.interval.year",
    descriptionKey: "plan.company.description",
    featureKeys: COMPANY_FEATURES,
    highlight: true,
    savingsKey: "plan.savings_annual",
    maxEmployees: 50,
  },
];

export function getPlanByProductId(productId: string): PlanConfig | undefined {
  return PLANS.find((p) => p.productId === productId);
}

export function getPlanByKey(key: string): PlanConfig | undefined {
  return PLANS.find((p) => p.key === key);
}

export function getPlansForTier(tier: string, interval: "monthly" | "annual"): PlanConfig | undefined {
  const suffix = interval === "monthly" ? "_monthly" : "_annual";
  return PLANS.find((p) => p.key === `${tier}${suffix}`);
}

export function getTierFromPlan(planKey: string): string {
  const plan = PLANS.find(p => p.key === planKey);
  return plan?.tier || "free";
}
