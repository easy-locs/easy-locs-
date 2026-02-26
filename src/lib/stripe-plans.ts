export type PlanKey = "individual" | "landlord" | "freelancer" | "business";

export interface PlanConfig {
  key: PlanKey;
  name: string;
  price: number;
  priceId: string;
  productId: string;
  features: string[];
  highlight: boolean;
}

export const PLANS: PlanConfig[] = [
  {
    key: "individual",
    name: "Individual",
    price: 12,
    priceId: "price_1T4sOOKcrlZX0EnnaYSiUqcD",
    productId: "prod_U2yLnEYKPa8yLG",
    features: ["2 PDF/mois", "Coffre-fort 100 Mo", "Quittances"],
    highlight: false,
  },
  {
    key: "landlord",
    name: "Landlord",
    price: 29,
    priceId: "price_1T4sOdKcrlZX0EnnHIgwXcq9",
    productId: "prod_U2yLjzJN4Y7LYb",
    features: ["PDF illimités", "Baux & quittances", "Rappels", "Coffre-fort 1 Go"],
    highlight: true,
  },
  {
    key: "freelancer",
    name: "Freelancer",
    price: 39,
    priceId: "price_1T4sOzKcrlZX0EnnH2SfaaGA",
    productId: "prod_U2yLaqf6FPXuJ7",
    features: ["PDF illimités", "Documents entreprise", "Partages", "Coffre-fort 5 Go"],
    highlight: false,
  },
  {
    key: "business",
    name: "Business",
    price: 69,
    priceId: "price_1T4sPHKcrlZX0EnnUtweGNuE",
    productId: "prod_U2yLSNT98adKHF",
    features: ["Tout inclus", "Multi-utilisateurs", "API accès", "Support prioritaire"],
    highlight: false,
  },
];

export function getPlanByProductId(productId: string): PlanConfig | undefined {
  return PLANS.find((p) => p.productId === productId);
}

export function getPlanByKey(key: string): PlanConfig | undefined {
  return PLANS.find((p) => p.key === key);
}
