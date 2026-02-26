export type PlanTier = "local" | "global";
export type PlanInterval = "monthly" | "annual";
export type PlanKey = `${PlanTier}_${PlanInterval}`;

export interface PlanConfig {
  key: PlanKey;
  tier: PlanTier;
  name: string;
  subtitle: string;
  price: number;
  priceId: string;
  productId: string;
  interval: "mois" | "an";
  features: string[];
  highlight: boolean;
  savings?: string;
  description: string;
}

export const PLANS: PlanConfig[] = [
  {
    key: "local_monthly",
    tier: "local",
    name: "Local",
    subtitle: "1 pays",
    price: 29,
    priceId: "price_1T4yukKcrlZX0EnnBHZvH0kN",
    productId: "prod_U354fxGmmhSvn0",
    interval: "mois",
    description: "Idéal pour les bailleurs et hôtes opérant dans un seul pays.",
    features: [
      "1 pays au choix",
      "Nombre illimité de biens",
      "Nombre illimité de locataires",
      "Locations longue durée + Airbnb",
      "Synchronisation Airbnb & Booking",
      "Baux conformes au pays sélectionné",
      "États des lieux, quittances, résiliations",
      "Archivage sécurisé",
      "Signature électronique standard",
    ],
    highlight: false,
  },
  {
    key: "local_annual",
    tier: "local",
    name: "Local",
    subtitle: "1 pays",
    price: 199,
    priceId: "price_1T4yuyKcrlZX0EnnLJIFwgnQ",
    productId: "prod_U355WIZ1brDxXV",
    interval: "an",
    description: "Idéal pour les bailleurs et hôtes opérant dans un seul pays.",
    features: [
      "1 pays au choix",
      "Nombre illimité de biens",
      "Nombre illimité de locataires",
      "Locations longue durée + Airbnb",
      "Synchronisation Airbnb & Booking",
      "Baux conformes au pays sélectionné",
      "États des lieux, quittances, résiliations",
      "Archivage sécurisé",
      "Signature électronique standard",
    ],
    highlight: false,
    savings: "Économisez 149€/an",
  },
  {
    key: "global_monthly",
    tier: "global",
    name: "Global",
    subtitle: "Tous les pays",
    price: 79,
    priceId: "price_1T4yvUKcrlZX0Enn8RaH9jGK",
    productId: "prod_U355aIW4nePfxQ",
    interval: "mois",
    description: "Idéal pour investisseurs et gestionnaires multi-pays.",
    features: [
      "Tous les pays du monde",
      "Nombre illimité de biens",
      "Nombre illimité de locataires",
      "Locations longue durée + Airbnb",
      "Synchronisation Airbnb & Booking + OTA",
      "Documents juridiques multi-pays",
      "Annexes légales par pays",
      "Signature électronique internationale",
      "Archivage longue durée",
      "Export juridique PDF",
      "Support prioritaire",
    ],
    highlight: true,
  },
  {
    key: "global_annual",
    tier: "global",
    name: "Global",
    subtitle: "Tous les pays",
    price: 499,
    priceId: "price_1T4yvmKcrlZX0EnndLXibrTC",
    productId: "prod_U355FFHHJ8rgAT",
    interval: "an",
    description: "Idéal pour investisseurs et gestionnaires multi-pays.",
    features: [
      "Tous les pays du monde",
      "Nombre illimité de biens",
      "Nombre illimité de locataires",
      "Locations longue durée + Airbnb",
      "Synchronisation Airbnb & Booking + OTA",
      "Documents juridiques multi-pays",
      "Annexes légales par pays",
      "Signature électronique internationale",
      "Archivage longue durée",
      "Export juridique PDF",
      "Support prioritaire",
    ],
    highlight: true,
    savings: "Économisez 449€/an",
  },
];

export function getPlanByProductId(productId: string): PlanConfig | undefined {
  return PLANS.find((p) => p.productId === productId);
}

export function getPlanByKey(key: string): PlanConfig | undefined {
  return PLANS.find((p) => p.key === key);
}

export function getPlansByTier(tier: PlanTier): PlanConfig[] {
  return PLANS.filter((p) => p.tier === tier);
}
