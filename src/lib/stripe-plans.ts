export interface PlanConfig {
  key: string;
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
    key: "unlimited_monthly",
    name: "EasyLoc Illimité",
    subtitle: "Tout inclus",
    price: 9.99,
    priceId: "price_1T50xQKcrlZX0EnnpjDZb41W",
    productId: "prod_U37B1NPO4TQTnD",
    interval: "mois",
    description: "Accès illimité à toutes les fonctionnalités EasyLoc.",
    features: [
      "Tous les pays du monde",
      "Nombre illimité de biens",
      "Nombre illimité de locataires",
      "Locations longue durée + Airbnb",
      "Synchronisation Airbnb, Booking & OTA",
      "Documents juridiques multi-pays",
      "Baux, états des lieux, quittances",
      "Signature électronique",
      "Archivage sécurisé longue durée",
      "Export juridique PDF",
      "Support prioritaire",
    ],
    highlight: false,
  },
  {
    key: "unlimited_annual",
    name: "EasyLoc Illimité",
    subtitle: "Tout inclus",
    price: 99,
    priceId: "price_1T50xgKcrlZX0EnntbHkjEsC",
    productId: "prod_U37COZzTYiHqG1",
    interval: "an",
    description: "Accès illimité à toutes les fonctionnalités EasyLoc.",
    features: [
      "Tous les pays du monde",
      "Nombre illimité de biens",
      "Nombre illimité de locataires",
      "Locations longue durée + Airbnb",
      "Synchronisation Airbnb, Booking & OTA",
      "Documents juridiques multi-pays",
      "Baux, états des lieux, quittances",
      "Signature électronique",
      "Archivage sécurisé longue durée",
      "Export juridique PDF",
      "Support prioritaire",
    ],
    highlight: true,
    savings: "Économisez 20€/an",
  },
];

export function getPlanByProductId(productId: string): PlanConfig | undefined {
  return PLANS.find((p) => p.productId === productId);
}

export function getPlanByKey(key: string): PlanConfig | undefined {
  return PLANS.find((p) => p.key === key);
}
