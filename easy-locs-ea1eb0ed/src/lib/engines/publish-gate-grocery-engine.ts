import {
  parseCatalogEntries,
  validateBasicMerchantInfo,
  validateCatalogIntegrity,
  runPublishGateBatch,
} from "./publish-gate-base";

function validateGroceryMerchant(m: Record<string, unknown>): string[] {
  return [
    ...validateBasicMerchantInfo(m),
    ...validateCatalogIntegrity(parseCatalogEntries(m.menu_items_json), {
      emptyFailure: "empty_catalog",
      minCount: 5,
      minCountFailure: "catalog_too_small",
      priceFailure: "invalid_prices",
    }),
  ];
}

export async function runPublishGateGrocery(batchSize = 100) {
  return runGroceryPublishGate(batchSize);
}

export async function runGroceryPublishGate(batchSize = 100) {
  return runPublishGateBatch(
    "grocery",
    "id, name, cover_image_url, phone, address, menu_items_json, vertical",
    "menu_items_json",
    validateGroceryMerchant,
    batchSize,
  );
}
