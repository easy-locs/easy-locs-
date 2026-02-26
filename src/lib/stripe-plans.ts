export type PlanKey = "monthly" | "annual";

export interface PlanConfig {
  key: PlanKey;
  name: string;
  price: number;
  priceId: string;
  productId: string;
  interval: "mois" | "an";
  features: string[];
  highlight: boolean;
  savings?: string;
}

export const PLANS: PlanConfig[] = [
  {
    key: "monthly",
    name: "Mensuel",
    price: 29,
    priceId: "price_1T4sOdKcrlZX0EnnHIgwXcq9",
    productId: "prod_U2yLjzJN4Y7LYb",
    interval: "mois",
    features: [
      "PDF & documents illimités",
      "Baux, quittances, états des lieux",
      "Gestion locative complète",
      "Rappels automatiques",
      "Coffre-fort numérique",
      "Assistant IA",
      "Support prioritaire",
    ],
    highlight: false,
  },
  {
    key: "annual",
    name: "Annuel",
    price: 199,
    priceId: "price_1T4tliKcrlZX0EnnxHeOxHIO",
    productId: "prod_U2zlUjPtdVVjIw",
    interval: "an",
    features: [
      "PDF & documents illimités",
      "Baux, quittances, états des lieux",
      "Gestion locative complète",
      "Rappels automatiques",
      "Coffre-fort numérique",
      "Assistant IA",
      "Support prioritaire",
    ],
    highlight: true,
    savings: "Économisez 149€/an",
  },
];

export function getPlanByProductId(productId: string): PlanConfig | undefined {
  return PLANS.find((p) => p.productId === productId);
}

export function getPlanByKey(key: string): PlanConfig | undefined {
  return PLANS.find((p) => p.key === key);
}
