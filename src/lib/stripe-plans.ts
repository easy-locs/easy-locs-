export interface PlanConfig {
  key: string;
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
}

/** i18n-aware plan accessors */
export function getPlanDisplay(plan: PlanConfig, t: (key: string) => string) {
  return {
    name: t(plan.nameKey),
    subtitle: t(plan.subtitleKey),
    interval: t(plan.intervalKey),
    description: t(plan.descriptionKey),
    features: plan.featureKeys.map((k) => t(k)),
    savings: plan.savingsKey ? t(plan.savingsKey) : undefined,
  };
}

const FEATURE_KEYS = [
  "plan.feat.worldwide",
  "plan.feat.unlimited_properties",
  "plan.feat.unlimited_tenants",
  "plan.feat.long_short_term",
  "plan.feat.ota_sync",
  "plan.feat.legal_docs",
  "plan.feat.leases_inventory",
  "plan.feat.e_signature",
  "plan.feat.secure_archive",
  "plan.feat.pdf_export",
  "plan.feat.priority_support",
];

export const PLANS: PlanConfig[] = [
  {
    key: "unlimited_monthly",
    nameKey: "plan.name",
    subtitleKey: "plan.subtitle",
    price: 9.99,
    priceId: "price_1T50xQKcrlZX0EnnpjDZb41W",
    productId: "prod_U37B1NPO4TQTnD",
    intervalKey: "plan.interval.month",
    descriptionKey: "plan.description",
    featureKeys: FEATURE_KEYS,
    highlight: false,
  },
  {
    key: "unlimited_annual",
    nameKey: "plan.name",
    subtitleKey: "plan.subtitle",
    price: 99,
    priceId: "price_1T50xgKcrlZX0EnntbHkjEsC",
    productId: "prod_U37COZzTYiHqG1",
    intervalKey: "plan.interval.year",
    descriptionKey: "plan.description",
    featureKeys: FEATURE_KEYS,
    highlight: true,
    savingsKey: "plan.savings_annual",
  },
];

export function getPlanByProductId(productId: string): PlanConfig | undefined {
  return PLANS.find((p) => p.productId === productId);
}

export function getPlanByKey(key: string): PlanConfig | undefined {
  return PLANS.find((p) => p.key === key);
}
