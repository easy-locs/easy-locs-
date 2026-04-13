import {
  parseCatalogEntries,
  validateBasicMerchantInfo,
  validateCatalogIntegrity,
  runPublishGateBatch,
} from "./publish-gate-base";

function validateFoodMerchant(m: Record<string, unknown>): string[] {
  return [
    ...validateBasicMerchantInfo(m, { requireDescription: true }),
    ...validateCatalogIntegrity(parseCatalogEntries(m.menu_items_json), {
      emptyFailure: "empty_menu",
      minCount: 3,
      minCountFailure: "menu_too_small",
      priceFailure: "invalid_menu_prices",
    }),
  ];
}

export async function runPublishGateFood(batchSize = 100) {
  return runFoodPublishGate(batchSize);
}

export async function runFoodPublishGate(batchSize = 100) {
  return runPublishGateBatch(
    "food",
    "id, name, cover_image_url, logo_url, phone, address, description, menu_items_json, vertical",
    "menu_items_json",
    validateFoodMerchant,
    batchSize,
  );
}

