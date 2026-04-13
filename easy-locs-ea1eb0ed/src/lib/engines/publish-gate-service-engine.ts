import {
  parseCatalogEntries,
  validateBasicMerchantInfo,
  validateCatalogIntegrity,
  runPublishGateBatch,
} from "./publish-gate-base";

function validateServiceMerchant(m: Record<string, unknown>): string[] {
  return [
    ...validateBasicMerchantInfo(m, { requireDescription: true }),
    ...validateCatalogIntegrity(parseCatalogEntries(m.service_catalog_json), {
      emptyFailure: "empty_catalog",
      priceFailure: "missing_prices",
      allowPriceRange: true,
    }),
  ];
}

export async function runPublishGateService(batchSize = 100) {
  return runServicePublishGate(batchSize);
}

export async function runServicePublishGate(batchSize = 100) {
  return runPublishGateBatch(
    "services",
    "id, name, cover_image_url, phone, address, description, service_catalog_json, vertical",
    "service_catalog_json",
    validateServiceMerchant,
    batchSize,
  );
}
