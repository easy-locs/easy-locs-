export type V1CoreBlock =
  | "home"
  | "orbit"
  | "achille"
  | "ride"
  | "wallet"
  | "merchant"
  | "notifications"
  | "settings";

export const V1_CORE_BLOCKS: V1CoreBlock[] = [
  "home",
  "orbit",
  "achille",
  "ride",
  "wallet",
  "merchant",
  "notifications",
  "settings",
];

export const V1_SECONDARY_BLOCKS = [
  "loyalty",
  "reviews",
  "crm",
  "growth",
  "quality",
  "analytics",
  "content_ops",
  "promo_ops",
  "seed_tools",
  "dispatch_tuning",
  "family_profile",
  "meal_planner",
  "party_builder",
  "saved_carts",
  "experiments",
  "advanced_merchant_tools",
  "debug",
  "engine_control",
] as const;

export function isV1CoreBlock(key: string) {
  return V1_CORE_BLOCKS.includes(key as V1CoreBlock);
}
