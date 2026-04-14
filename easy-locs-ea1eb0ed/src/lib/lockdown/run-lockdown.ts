import { runProductionLockdown, getLockdownDetailedReport, type LockdownInput } from "./production-lockdown-orchestrator";
import type { MappingEntity } from "@/services/validation/mapping-corrector";
import type { MediaAssetRecord } from "@/lib/cleanup/orphan-asset-cleaner";

function buildSampleEntitySets(): Record<string, Record<string, unknown>[]> {
  const listings: Record<string, unknown>[] = [];
  for (let i = 0; i < 30; i++) {
    listings.push({
      id: `listing-${i}`,
      name: i < 5 ? "Mama's Kitchen" : `Listing ${i}`,
      phone: i < 5 ? "+1-555-0100" : `+1-555-${String(i).padStart(4, "0")}`,
      address: i < 5 ? "123 Main St" : `${i * 10} Oak Ave`,
      lat: i < 5 ? 40.7128 : 40.7128 + i * 0.01,
      lng: i < 5 ? -74.006 : -74.006 + i * 0.01,
      website: `https://listing${i}.example.com`,
      vertical: "food",
      city: "New York",
    });
  }

  const contacts: Record<string, unknown>[] = [];
  for (let i = 0; i < 20; i++) {
    contacts.push({
      id: `contact-${i}`,
      name: i < 3 ? "John Smith" : `Contact ${i}`,
      phone: i < 3 ? "+1-555-9999" : `+1-555-${String(1000 + i)}`,
      address: null,
      lat: null,
      lng: null,
    });
  }

  const merchants: Record<string, unknown>[] = [];
  for (let i = 0; i < 15; i++) {
    merchants.push({
      id: `merchant-${i}`,
      name: i < 4 ? "Corner Store LLC" : `Merchant ${i}`,
      phone: i < 4 ? "+1-555-7777" : `+1-555-${String(2000 + i)}`,
      address: i < 4 ? "456 Elm St" : `${i * 20} Pine Rd`,
      lat: i < 4 ? 34.0522 : 34.0522 + i * 0.01,
      lng: i < 4 ? -118.2437 : -118.2437 + i * 0.01,
      vertical: "services",
      city: "Los Angeles",
    });
  }

  const conversations: Record<string, unknown>[] = [];
  for (let i = 0; i < 10; i++) {
    conversations.push({
      id: `conv-${i}`,
      name: i < 2 ? "Support Chat" : `Conversation ${i}`,
      display_name: i < 2 ? "Support Chat" : `Conversation ${i}`,
    });
  }

  const services: Record<string, unknown>[] = [];
  for (let i = 0; i < 10; i++) {
    services.push({
      id: `service-${i}`,
      name: i < 2 ? "Plumbing Service" : `Service ${i}`,
      phone: i < 2 ? "+1-555-3333" : `+1-555-${String(3000 + i)}`,
      vertical: "services",
    });
  }

  const media: Record<string, unknown>[] = [];
  for (let i = 0; i < 10; i++) {
    media.push({
      id: `media-${i}`,
      name: i < 2 ? "hero-banner.jpg" : `media-${i}.jpg`,
      source_id: i < 2 ? "src-hero" : `src-${i}`,
    });
  }

  const notifications: Record<string, unknown>[] = [];
  for (let i = 0; i < 10; i++) {
    notifications.push({
      id: `notif-${i}`,
      name: i < 2 ? "Payment Received" : `Notification ${i}`,
      source_id: i < 2 ? "payment-src" : `notif-src-${i}`,
    });
  }

  const walletRecords: Record<string, unknown>[] = [];
  for (let i = 0; i < 10; i++) {
    walletRecords.push({
      id: `wallet-${i}`,
      name: `Wallet Record ${i}`,
      external_id: `ext-wallet-${i}`,
    });
  }

  const sessions: Record<string, unknown>[] = [];
  for (let i = 0; i < 10; i++) {
    sessions.push({
      id: `session-${i}`,
      name: i < 2 ? "auth-session" : `session-${i}`,
      source_id: i < 2 ? "auth-src" : `session-src-${i}`,
    });
  }

  const imports: Record<string, unknown>[] = [];
  for (let i = 0; i < 10; i++) {
    imports.push({
      id: `import-${i}`,
      name: i < 3 ? "Batch Import 2024-01" : `Import ${i}`,
      source_id: i < 3 ? "batch-2024-01" : `import-src-${i}`,
    });
  }

  return {
    listing: listings,
    contact: contacts,
    merchant: merchants,
    conversation: conversations,
    service: services,
    media,
    notification: notifications,
    wallet_record: walletRecords,
    session: sessions,
    import: imports,
  };
}

function buildSampleMappingEntities(): MappingEntity[] {
  const entities: MappingEntity[] = [];

  entities.push({
    id: "map-1",
    name: "Valid Restaurant",
    vertical: "food",
    category: "restaurant",
    subcategory: "casual_dining",
    canonicalType: "casual_dining_restaurant",
    canonicalPath: "food.restaurant.casual_dining.casual_dining_restaurant",
    parentId: null,
    foreignKeys: {},
    metadata: { cuisine: "Italian", priceRange: "$$" },
    status: "classified",
    updatedAt: new Date().toISOString(),
  });

  entities.push({
    id: "map-2",
    name: "Bad Vertical Entity",
    vertical: "foood",
    category: "restaurant",
    subcategory: "fast_food",
    canonicalType: "fast_food_restaurant",
    canonicalPath: "foood.restaurant.fast_food.fast_food_restaurant",
    parentId: null,
    foreignKeys: {},
    metadata: {},
    status: "classified",
    updatedAt: new Date().toISOString(),
  });

  entities.push({
    id: "map-3",
    name: "Broken FK Entity",
    vertical: "food",
    category: "restaurant",
    subcategory: "casual_dining",
    canonicalType: "casual_dining_restaurant",
    canonicalPath: "food.restaurant.casual_dining.casual_dining_restaurant",
    parentId: "nonexistent-parent-999",
    foreignKeys: { merchantId: "nonexistent-merchant-888" },
    metadata: { note: "" },
    status: "classified",
    updatedAt: new Date().toISOString(),
  });

  entities.push({
    id: "map-4",
    name: "Completely Invalid",
    vertical: "zzzzz",
    category: "invalid",
    subcategory: "none",
    canonicalType: "nothing",
    canonicalPath: "zzzzz.invalid.none.nothing",
    parentId: null,
    foreignKeys: {},
    metadata: {},
    status: "classified",
    updatedAt: new Date().toISOString(),
  });

  for (let i = 5; i < 15; i++) {
    entities.push({
      id: `map-${i}`,
      name: `Clean Entity ${i}`,
      vertical: "food",
      category: "restaurant",
      subcategory: "casual_dining",
      canonicalType: "casual_dining_restaurant",
      canonicalPath: "food.restaurant.casual_dining.casual_dining_restaurant",
      parentId: null,
      foreignKeys: {},
      metadata: { verified: true },
      status: "classified",
      updatedAt: new Date().toISOString(),
    });
  }

  return entities;
}

function buildSampleMediaAssets(): { assets: MediaAssetRecord[]; entityIds: Set<string> } {
  const entityIds = new Set<string>();
  for (let i = 0; i < 50; i++) {
    entityIds.add(`entity-${i}`);
  }

  const assets: MediaAssetRecord[] = [];

  for (let i = 0; i < 30; i++) {
    assets.push({
      id: `asset-${i}`,
      url: `https://cdn.example.com/images/img-${i}.jpg`,
      entityId: `entity-${i}`,
      uploadedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: "active",
      fileSize: 50000 + i * 1000,
      mimeType: "image/jpeg",
      bucket: "media",
      path: `images/img-${i}.jpg`,
      cdnUrl: `https://cdn.example.com/images/img-${i}.jpg`,
    });
  }

  for (let i = 30; i < 35; i++) {
    assets.push({
      id: `asset-orphan-${i}`,
      url: `https://cdn.example.com/images/orphan-${i}.jpg`,
      entityId: `deleted-entity-${i}`,
      uploadedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: "active",
      fileSize: 75000,
      mimeType: "image/jpeg",
      bucket: "media",
      path: `images/orphan-${i}.jpg`,
      cdnUrl: `https://cdn.example.com/images/orphan-${i}.jpg`,
    });
  }

  assets.push({
    id: "asset-abandoned-1",
    url: "https://cdn.example.com/uploads/stuck.jpg",
    entityId: "entity-1",
    uploadedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    status: "pending",
    fileSize: 100000,
    mimeType: "image/jpeg",
    bucket: "uploads",
    path: "uploads/stuck.jpg",
    cdnUrl: null,
  });

  assets.push({
    id: "asset-no-entity",
    url: "https://cdn.example.com/images/no-entity.jpg",
    entityId: null,
    uploadedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    status: "active",
    fileSize: 60000,
    mimeType: "image/jpeg",
    bucket: "media",
    path: "images/no-entity.jpg",
    cdnUrl: "https://cdn.example.com/images/no-entity.jpg",
  });

  assets.push({
    id: "asset-bad-cdn",
    url: "https://cdn.example.com/images/bad-cdn.jpg",
    entityId: "entity-5",
    uploadedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    status: "active",
    fileSize: 40000,
    mimeType: "image/jpeg",
    bucket: "media",
    path: "images/bad-cdn.jpg",
    cdnUrl: "http://localhost:3000/bad-cdn.jpg",
  });

  return { assets, entityIds };
}

export function executeLockdownRun(): string {
  const entitySets = buildSampleEntitySets();
  const mappingEntities = buildSampleMappingEntities();
  const { assets, entityIds } = buildSampleMediaAssets();

  const input: LockdownInput = {
    entitySets,
    mappingEntities,
    mediaAssets: assets,
    entityIdIndex: entityIds,
  };

  const artifact = runProductionLockdown(input);
  const detailedReport = getLockdownDetailedReport(artifact);

  const artifactJson = JSON.stringify({
    runId: artifact.runId,
    startedAt: artifact.startedAt,
    completedAt: artifact.completedAt,
    durationMs: artifact.durationMs,
    overallPassed: artifact.overallPassed,
    failureReasons: artifact.failureReasons,
    mergedEntityIds: artifact.mergedEntityIds,
    removedEntityIds: artifact.removedEntityIds,
    correctedEntityIds: artifact.correctedEntityIds,
    quarantinedEntityIds: artifact.quarantinedEntityIds,
    orphanAssetIds: artifact.orphanAssetIds,
    dedup: {
      totalScanned: artifact.dedupResult.totalScanned,
      totalDuplicates: artifact.dedupResult.totalDuplicates,
      totalMerged: artifact.dedupResult.totalMerged,
      totalRemoved: artifact.dedupResult.totalRemoved,
      totalSurvivors: artifact.dedupResult.totalSurvivors,
    },
    mapping: {
      scanned: artifact.mappingResult.scanned,
      corrected: artifact.mappingResult.corrected,
      quarantined: artifact.mappingResult.quarantined,
      flagged: artifact.mappingResult.flagged,
    },
    orphans: {
      totalAssets: artifact.orphanResult.totalAssets,
      totalOrphans: artifact.orphanResult.totalOrphans,
      totalCleanedBytes: artifact.orphanResult.totalCleanedBytes,
    },
    e2e: {
      totalFlows: artifact.e2eResult.totalFlows,
      passed: artifact.e2eResult.passed,
      failed: artifact.e2eResult.failed,
      deadButtons: artifact.e2eResult.deadButtonsTotal,
      illegalTransitions: artifact.e2eResult.illegalTransitionsTotal,
      silentDrops: artifact.e2eResult.silentDropsTotal,
    },
    resilience: {
      totalTests: artifact.resilienceResult.totalTests,
      passed: artifact.resilienceResult.passed,
      failed: artifact.resilienceResult.failed,
    },
  }, null, 2);

  return [detailedReport, "", "========================================", "MACHINE-READABLE ARTIFACT (JSON)", "========================================", artifactJson].join("\n");
}
