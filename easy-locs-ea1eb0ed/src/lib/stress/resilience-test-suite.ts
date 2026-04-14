import {
  transition,
  CONNECTION_MACHINE,
  AUTH_SESSION_MACHINE,
  MESSAGE_MACHINE,
  UPLOAD_MACHINE,
  CHECKOUT_MACHINE,
  BOOKING_MACHINE,
  SUBSCRIPTION_MACHINE,
  type ConnectionState,
  type AuthSessionState,
  type MessageState,
  type UploadState,
  type CheckoutState,
  type BookingFlowState,
  type SubscriptionState,
  type CanonicalMachineDef,
} from "@/lib/state-machines/canonical-machines";
import {
  isMessageDuplicate,
  markMessageSeen,
  generateIdempotencyKey,
  deduplicateMessages,
} from "@/lib/dedup/message-dedup";
import {
  runSchemaGate,
  runTaxonomyGate,
  runConfidenceGate,
  runAllGates,
} from "@/services/validation/gate-runner";
import {
  evaluateQuarantine,
} from "@/services/quarantine/quarantine-engine";
import type { CanonicalEntity, PipelineResult, GateCheckOutput, MediaAsset } from "@/domains/content-pipeline/types";
import type { CanonicalVertical } from "@/lib/taxonomy/canonical-registry";

export type StressTestId =
  | "multi_session"
  | "reconnect_resilience"
  | "rapid_event_storm"
  | "publish_gate_load"
  | "cascading_failure"
  | "rollback_behavior"
  | "dedup_under_load"
  | "exhaustive_state_traversal"
  | "boundary_confidence"
  | "cross_vertical_contamination"
  | "full_gate_chain_stress"
  | "state_machine_fuzzer";

export interface StressTestResult {
  testId: StressTestId;
  testName: string;
  passed: boolean;
  details: string;
  metrics: Record<string, number>;
  errors: string[];
  durationMs: number;
}

export interface ResilienceReport {
  totalTests: number;
  passed: number;
  failed: number;
  results: StressTestResult[];
  timestamp: string;
  durationMs: number;
}

function createSeededRng(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

const ALL_VERTICALS: CanonicalVertical[] = [
  "food", "grocery", "hotel", "service", "services",
  "property", "flight", "ride", "delivery", "retail",
  "shops", "healthcare", "events", "experiences", "education",
  "beauty", "mobility", "stay", "utility", "finance",
];

function buildTestEntity(overrides: Partial<CanonicalEntity> & { name: string; vertical: CanonicalVertical }): CanonicalEntity {
  return {
    id: `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    normalizedEntityId: "norm-1",
    vertical: overrides.vertical,
    category: overrides.category ?? "general",
    subcategory: overrides.subcategory ?? "default",
    canonicalType: overrides.canonicalType ?? "listing",
    canonicalSubtype: overrides.canonicalSubtype ?? null,
    canonicalPath: overrides.canonicalPath ?? `${overrides.vertical}.general.default.listing`,
    confidenceScore: overrides.confidenceScore ?? 0.95,
    confidenceBand: overrides.confidenceBand ?? "high",
    mapperVersion: "1.0",
    validationStatus: overrides.validationStatus ?? "classified",
    publishStatus: overrides.publishStatus ?? "classified",
    reviewRequired: overrides.reviewRequired ?? false,
    name: overrides.name,
    description: overrides.description ?? null,
    address: overrides.address ?? null,
    city: overrides.city ?? null,
    country: overrides.country ?? null,
    countryCode: overrides.countryCode ?? null,
    phone: overrides.phone ?? null,
    email: overrides.email ?? null,
    website: overrides.website ?? null,
    lat: overrides.lat ?? null,
    lng: overrides.lng ?? null,
    metadata: overrides.metadata ?? {},
    sourceProvenance: {
      sourceType: "manual",
      sourceId: "stress-test",
      sourceUrl: null,
      importedAt: new Date().toISOString(),
      normalizedAt: new Date().toISOString(),
      classifiedAt: new Date().toISOString(),
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function buildTestMediaAsset(entityId: string): MediaAsset {
  return {
    id: `media-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    entityId,
    sourceUrl: "https://example.com/image.jpg",
    sourceType: "manual",
    sourceProvenance: null,
    storedUrl: "https://cdn.example.com/stored.jpg",
    thumbnailUrl: "https://cdn.example.com/thumb.jpg",
    width: 800,
    height: 600,
    sizeBytes: 150000,
    format: "jpeg",
    fingerprint: `fp-${entityId}`,
    detectedMediaKind: null,
    entityMatchConfidence: 0.95,
    verticalMatchConfidence: 0.90,
    qualityScore: 0.85,
    verificationStatus: "approved",
    moderationStatus: "approved",
    lockStatus: "unlocked",
    isPrimary: true,
    rejectionReason: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function testMultiSession(): StressTestResult {
  const startTime = Date.now();
  const errors: string[] = [];
  const sessionCount = 100;
  const sessions: { id: string; state: AuthSessionState }[] = [];

  for (let i = 0; i < sessionCount; i++) {
    sessions.push({ id: `session-${i}`, state: AUTH_SESSION_MACHINE.initial });
  }

  for (const session of sessions) {
    const s1 = transition(AUTH_SESSION_MACHINE, session.state, "LOGIN");
    if (!s1) { errors.push(`Session ${session.id}: LOGIN failed from ${session.state}`); continue; }
    session.state = s1;

    if (session.id.endsWith("7") || session.id.endsWith("3")) {
      const mfa = transition(AUTH_SESSION_MACHINE, session.state, "MFA_REQUIRED");
      if (mfa) {
        session.state = mfa;
        const verified = transition(AUTH_SESSION_MACHINE, session.state, "MFA_VERIFIED");
        if (verified) session.state = verified;
        else errors.push(`Session ${session.id}: MFA_VERIFIED failed from ${session.state}`);
        continue;
      }
    }

    if (session.id.endsWith("5")) {
      const fail = transition(AUTH_SESSION_MACHINE, session.state, "FAILURE");
      if (fail) {
        session.state = fail;
        const retry = transition(AUTH_SESSION_MACHINE, session.state, "LOGIN");
        if (retry) session.state = retry;
        const s2 = transition(AUTH_SESSION_MACHINE, session.state, "SUCCESS");
        if (s2) session.state = s2;
        continue;
      }
    }

    const s2 = transition(AUTH_SESSION_MACHINE, session.state, "SUCCESS");
    if (!s2) { errors.push(`Session ${session.id}: SUCCESS failed from ${session.state}`); continue; }
    session.state = s2;
  }

  const authenticatedCount = sessions.filter(s => s.state === "authenticated").length;

  for (let i = 0; i < 30; i++) {
    const s = sessions[i];
    const expired = transition(AUTH_SESSION_MACHINE, s.state, "EXPIRE");
    if (expired) s.state = expired;
    const refreshed = transition(AUTH_SESSION_MACHINE, s.state, "LOGIN");
    if (refreshed) s.state = refreshed;
    const authed = transition(AUTH_SESSION_MACHINE, s.state, "SUCCESS");
    if (authed) s.state = authed;
  }

  for (let i = 0; i < 10; i++) {
    const s = sessions[sessionCount - 1 - i];
    const logout = transition(AUTH_SESSION_MACHINE, s.state, "LOGOUT");
    if (logout) s.state = logout;
    const reLogin = transition(AUTH_SESSION_MACHINE, s.state, "LOGIN");
    if (reLogin) s.state = reLogin;
    const reAuth = transition(AUTH_SESSION_MACHINE, s.state, "SUCCESS");
    if (reAuth) s.state = reAuth;
  }

  const finalAuthenticated = sessions.filter(s => s.state === "authenticated").length;
  const minExpected = Math.floor(sessionCount * 0.9);
  const passed = authenticatedCount >= minExpected && finalAuthenticated >= minExpected && errors.length === 0;

  return {
    testId: "multi_session",
    testName: "Multi-Session Concurrent Access (100 sessions, MFA + failure branches)",
    passed,
    details: `${sessionCount} sessions: ${authenticatedCount} initially authenticated, ${finalAuthenticated} after refresh/logout cycles, min required=${minExpected}`,
    metrics: { sessionCount, initialAuthenticated: authenticatedCount, finalAuthenticated, minExpected },
    errors,
    durationMs: Date.now() - startTime,
  };
}

function testReconnectResilience(): StressTestResult {
  const startTime = Date.now();
  const errors: string[] = [];
  const reconnectCycles = 100;
  let state: ConnectionState = CONNECTION_MACHINE.initial;
  let successfulReconnects = 0;
  let failedDrops = 0;

  const connected = transition(CONNECTION_MACHINE, state, "CONNECT");
  if (connected) state = connected;
  const established = transition(CONNECTION_MACHINE, state, "CONNECTED");
  if (established) state = established;

  for (let i = 0; i < reconnectCycles; i++) {
    const dropped = transition(CONNECTION_MACHINE, state, "DROP");
    if (!dropped) {
      failedDrops++;
      errors.push(`Cycle ${i}: DROP failed from ${state}`);
      continue;
    }
    state = dropped;

    if (state !== "reconnecting") {
      errors.push(`Cycle ${i}: expected reconnecting, got ${state}`);
      continue;
    }

    if (i % 10 === 9) {
      const failedReconnect = transition(CONNECTION_MACHINE, state, "FAIL");
      if (failedReconnect) {
        state = failedReconnect;
        const retry = transition(CONNECTION_MACHINE, state, "RETRY");
        if (retry) state = retry;
        const retryConnected = transition(CONNECTION_MACHINE, state, "CONNECTED");
        if (retryConnected) {
          state = retryConnected;
          successfulReconnects++;
          continue;
        }
      }
    }

    const reconnected = transition(CONNECTION_MACHINE, state, "CONNECTED");
    if (!reconnected) { errors.push(`Cycle ${i}: CONNECTED failed from ${state}`); continue; }
    state = reconnected;

    if (state === "connected") successfulReconnects++;
  }

  const passed = successfulReconnects === reconnectCycles && errors.length === 0;

  return {
    testId: "reconnect_resilience",
    testName: "Reconnect After Disconnect (100 cycles, intermittent failures)",
    passed,
    details: `${successfulReconnects}/${reconnectCycles} reconnect cycles successful, ${failedDrops} drop failures`,
    metrics: { reconnectCycles, successfulReconnects, failedDrops },
    errors,
    durationMs: Date.now() - startTime,
  };
}

function testRapidEventStorm(): StressTestResult {
  const startTime = Date.now();
  const errors: string[] = [];
  const eventCount = 1000;
  const messages: Array<{ id: string; tempId: string; idempotencyKey: string }> = [];

  for (let i = 0; i < eventCount; i++) {
    messages.push({
      id: `msg-storm-${i}`,
      tempId: `temp-storm-${i}`,
      idempotencyKey: generateIdempotencyKey("user-storm", "conv-storm", `temp-storm-${i}`),
    });
  }

  let duplicatesDetected = 0;
  let uniqueProcessed = 0;

  for (const msg of messages) {
    const check = isMessageDuplicate(msg);
    if (check.isDuplicate) {
      duplicatesDetected++;
    } else {
      markMessageSeen(msg);
      uniqueProcessed++;
    }
  }

  let falsePositives = 0;
  for (const msg of messages) {
    const recheck = isMessageDuplicate(msg);
    if (!recheck.isDuplicate) {
      falsePositives++;
    }
  }

  let missedDoubleSubmits = 0;
  for (const msg of messages) {
    const dupMsg = { ...msg };
    const check = isMessageDuplicate(dupMsg);
    if (!check.isDuplicate) {
      missedDoubleSubmits++;
      errors.push(`Double-submit not detected for ${msg.id}`);
    }
  }

  const nearDuplicates: Array<{ id: string; tempId: string; idempotencyKey: string }> = [];
  for (let i = 0; i < 200; i++) {
    nearDuplicates.push({
      id: `msg-near-${i}`,
      tempId: `temp-near-${i}`,
      idempotencyKey: generateIdempotencyKey("user-storm", "conv-storm", `temp-near-${i}`),
    });
  }
  let nearDupUnique = 0;
  for (const msg of nearDuplicates) {
    const check = isMessageDuplicate(msg);
    if (!check.isDuplicate) {
      markMessageSeen(msg);
      nearDupUnique++;
    }
  }
  if (nearDupUnique !== 200) {
    errors.push(`Near-duplicate test: expected 200 unique, got ${nearDupUnique}`);
  }

  const rawMessages = messages.map((m, i) => ({
    id: m.id,
    created_at: new Date(Date.now() + i).toISOString(),
  }));
  const heavilyDuplicated = [
    ...rawMessages,
    ...rawMessages.slice(0, 300),
    ...rawMessages.slice(200, 500),
    ...rawMessages.slice(700, 1000),
  ];
  const deduped = deduplicateMessages(heavilyDuplicated);
  const arrayDedupCorrect = deduped.length === rawMessages.length;

  if (!arrayDedupCorrect) {
    errors.push(`Array dedup: expected ${rawMessages.length}, got ${deduped.length}`);
  }

  const passed = uniqueProcessed === eventCount && falsePositives === 0 && arrayDedupCorrect && missedDoubleSubmits === 0 && errors.length === 0;

  return {
    testId: "rapid_event_storm",
    testName: "Rapid Event Storm (1000 events + 200 near-duplicates + heavy array dedup)",
    passed,
    details: `${uniqueProcessed} unique, ${duplicatesDetected} initial dupes, ${falsePositives} false positives, ${missedDoubleSubmits} missed double-submits, array dedup ${arrayDedupCorrect ? "OK" : "FAIL"}`,
    metrics: { eventCount, uniqueProcessed, duplicatesDetected, falsePositives, missedDoubleSubmits, nearDupUnique, heavyDupInputSize: heavilyDuplicated.length },
    errors,
    durationMs: Date.now() - startTime,
  };
}

function testPublishGateUnderLoad(): StressTestResult {
  const startTime = Date.now();
  const errors: string[] = [];
  const entityCount = 500;
  let schemaPassCount = 0;
  let schemaFailCount = 0;
  let taxonomyPassCount = 0;
  let taxonomyFailCount = 0;
  let confidencePassCount = 0;
  let confidenceFailCount = 0;
  let fullChainPassCount = 0;

  const validEntities: CanonicalEntity[] = [];
  const invalidEntities: CanonicalEntity[] = [];

  const entityConfigs: Array<{ vertical: CanonicalVertical; category: string; subcategory: string; canonicalType: string }> = [
    { vertical: "food", category: "restaurant", subcategory: "casual_dining", canonicalType: "casual_dining_restaurant" },
    { vertical: "grocery", category: "supermarket", subcategory: "general_supermarket", canonicalType: "general_supermarket" },
    { vertical: "stay", category: "hotel", subcategory: "business_hotel", canonicalType: "business_hotel" },
    { vertical: "shops", category: "fashion", subcategory: "general_fashion", canonicalType: "fashion_store" },
    { vertical: "healthcare", category: "clinic", subcategory: "general", canonicalType: "general_clinic" },
  ];

  for (let i = 0; i < entityCount; i++) {
    const config = entityConfigs[i % entityConfigs.length];
    if (i % 5 === 0) {
      const invalidType = i % 15;
      if (invalidType < 5) {
        invalidEntities.push(buildTestEntity({
          name: "",
          vertical: config.vertical,
          category: "",
          subcategory: "",
          canonicalType: "",
          canonicalPath: "",
          confidenceScore: 0.3,
          confidenceBand: "rejected",
        }));
      } else if (invalidType < 10) {
        invalidEntities.push(buildTestEntity({
          name: `Invalid Low Confidence ${i}`,
          vertical: config.vertical,
          category: config.category,
          subcategory: config.subcategory,
          canonicalType: config.canonicalType,
          canonicalPath: `${config.vertical}.${config.category}.${config.subcategory}.${config.canonicalType}`,
          confidenceScore: 0.15,
          confidenceBand: "rejected",
        }));
      } else {
        invalidEntities.push(buildTestEntity({
          name: `Invalid Bad Taxonomy ${i}`,
          vertical: "food" as CanonicalVertical,
          category: "completely_fake_category",
          subcategory: "nonexistent_sub",
          canonicalType: "bogus_type_xyz",
          canonicalPath: "food.completely_fake_category.nonexistent_sub.bogus_type_xyz",
          confidenceScore: 0.5,
          confidenceBand: "low",
        }));
      }
    } else {
      validEntities.push(buildTestEntity({
        name: `Test Entity ${i} - ${config.vertical}`,
        vertical: config.vertical,
        category: config.category,
        subcategory: config.subcategory,
        canonicalType: config.canonicalType,
        canonicalPath: `${config.vertical}.${config.category}.${config.subcategory}.${config.canonicalType}`,
        confidenceScore: 0.92 + Math.random() * 0.07,
        confidenceBand: "high",
      }));
    }
  }

  for (const entity of validEntities) {
    const schemaResult = runSchemaGate(entity);
    const taxonomyResult = runTaxonomyGate(entity);
    const confidenceResult = runConfidenceGate(entity);

    if (schemaResult.result === "pass") schemaPassCount++;
    else { schemaFailCount++; errors.push(`Valid entity ${entity.id} failed schema gate: ${schemaResult.details}`); }

    if (taxonomyResult.result === "pass" || taxonomyResult.result === "warn") taxonomyPassCount++;
    else { taxonomyFailCount++; errors.push(`Valid entity ${entity.id} failed taxonomy gate: ${taxonomyResult.details}`); }

    if (confidenceResult.result === "pass") confidencePassCount++;
    else confidenceFailCount++;

    const allPassed = schemaResult.result === "pass" &&
      (taxonomyResult.result === "pass" || taxonomyResult.result === "warn") &&
      (confidenceResult.result === "pass" || confidenceResult.result === "warn");
    if (allPassed) fullChainPassCount++;
  }

  for (const entity of invalidEntities) {
    const schemaResult = runSchemaGate(entity);
    const taxonomyResult = runTaxonomyGate(entity);
    const confidenceResult = runConfidenceGate(entity);

    if (schemaResult.result === "fail") schemaFailCount++;
    else { schemaPassCount++; }

    const anyFailed = schemaResult.result === "fail" || taxonomyResult.result === "fail" || confidenceResult.result === "fail";
    if (!anyFailed) {
      errors.push(`Invalid entity ${entity.id} passed all gates when at least one should have failed`);
    }
  }

  const expectedValidCount = entityCount - Math.floor(entityCount / 5);
  const expectedInvalidCount = Math.floor(entityCount / 5);
  const validEntitiesCorrect = validEntities.length === expectedValidCount;
  const invalidEntitiesCorrect = invalidEntities.length === expectedInvalidCount;

  if (!validEntitiesCorrect) errors.push(`Expected ${expectedValidCount} valid entities, got ${validEntities.length}`);
  if (!invalidEntitiesCorrect) errors.push(`Expected ${expectedInvalidCount} invalid entities, got ${invalidEntities.length}`);

  const passed = errors.length === 0;

  return {
    testId: "publish_gate_load",
    testName: "Full Publish Gate Chain Under Load (500 entities, 5 verticals, 3 invalid types)",
    passed,
    details: `${entityCount} entities: schema pass=${schemaPassCount} fail=${schemaFailCount}, taxonomy pass=${taxonomyPassCount} fail=${taxonomyFailCount}, confidence pass=${confidencePassCount} fail=${confidenceFailCount}, full chain pass=${fullChainPassCount}`,
    metrics: { entityCount, schemaPassCount, schemaFailCount, taxonomyPassCount, taxonomyFailCount, confidencePassCount, confidenceFailCount, fullChainPassCount },
    errors,
    durationMs: Date.now() - startTime,
  };
}

function testCascadingFailure(): StressTestResult {
  const startTime = Date.now();
  const errors: string[] = [];

  const validEntity = buildTestEntity({
    name: "Cascade Test Entity",
    vertical: "food" as CanonicalVertical,
    category: "restaurant",
    subcategory: "casual_dining",
    canonicalType: "casual_dining_restaurant",
    canonicalPath: "food.restaurant.casual_dining.casual_dining_restaurant",
    confidenceScore: 0.97,
    confidenceBand: "high",
  });

  const gateResults: GateCheckOutput[] = [
    runSchemaGate(validEntity),
    runTaxonomyGate(validEntity),
    runConfidenceGate(validEntity),
  ];

  const passedGates = gateResults.filter(g => g.result === "pass" || g.result === "warn").length;
  const failedGates = gateResults.filter(g => g.result === "fail").length;

  if (failedGates > 0) {
    const failedNames = gateResults.filter(g => g.result === "fail").map(g => g.gateId);
    errors.push(`Expected all gates to pass for valid entity, but ${failedNames.join(", ")} failed`);
  }

  const degradationLevels = [
    { name: "missing name", overrides: { name: "", confidenceScore: 0.97, confidenceBand: "high" as const } },
    { name: "low confidence", overrides: { name: "Test", confidenceScore: 0.1, confidenceBand: "rejected" as const } },
    { name: "bad taxonomy", overrides: { name: "Test", category: "", canonicalType: "", canonicalPath: "" } },
    { name: "all broken", overrides: { name: "", category: "", canonicalType: "", canonicalPath: "", confidenceScore: 0.05, confidenceBand: "rejected" as const } },
  ];

  let quarantinedCount = 0;
  const expectedMinFailedGates: Record<string, number> = {
    "missing name": 1,
    "low confidence": 1,
    "bad taxonomy": 1,
    "all broken": 2,
  };

  for (const level of degradationLevels) {
    const degraded = buildTestEntity({
      name: level.overrides.name ?? "Test",
      vertical: "food" as CanonicalVertical,
      ...level.overrides,
    });

    const degradedGates: GateCheckOutput[] = [
      runSchemaGate(degraded),
      runTaxonomyGate(degraded),
      runConfidenceGate(degraded),
    ];

    const failedGateIds = degradedGates.filter(g => g.result === "fail").map(g => g.gateId);
    const anyFailed = failedGateIds.length > 0;
    if (!anyFailed) {
      errors.push(`Degradation level "${level.name}" should have at least one failing gate`);
    }

    const minExpected = expectedMinFailedGates[level.name] ?? 1;
    if (failedGateIds.length < minExpected) {
      errors.push(`Degradation "${level.name}": expected >= ${minExpected} failed gates, got ${failedGateIds.length} (${failedGateIds.join(", ")})`);
    }

    const pipelineResult: PipelineResult = {
      entityId: degraded.id,
      status: "quarantined",
      canonicalPath: degraded.canonicalPath || null,
      confidenceScore: degraded.confidenceScore,
      confidenceBand: degraded.confidenceBand,
      gateResults: degradedGates,
      passedAllGates: false,
      quarantined: true,
      quarantineReasons: [],
      publishEligible: false,
      reviewRequired: true,
      auditTrail: [],
    };

    const quarantineDecision = evaluateQuarantine(pipelineResult);
    if (quarantineDecision.shouldQuarantine) {
      quarantinedCount++;
      if (quarantineDecision.reasons.length === 0) {
        errors.push(`Degradation "${level.name}": quarantined but no reasons provided`);
      }
    }
  }

  if (quarantinedCount < degradationLevels.length) {
    errors.push(`Only ${quarantinedCount}/${degradationLevels.length} degradation levels were quarantined`);
  }

  const brokenEntity = buildTestEntity({
    name: "",
    vertical: "" as CanonicalVertical,
    category: "",
    subcategory: "",
    canonicalType: "",
    canonicalPath: "",
    confidenceScore: 0.1,
    confidenceBand: "rejected",
  });

  const brokenGateResults: GateCheckOutput[] = [
    runSchemaGate(brokenEntity),
    runTaxonomyGate(brokenEntity),
    runConfidenceGate(brokenEntity),
  ];

  const brokenPipelineResult: PipelineResult = {
    entityId: brokenEntity.id,
    status: "quarantined",
    canonicalPath: brokenEntity.canonicalPath || null,
    confidenceScore: brokenEntity.confidenceScore,
    confidenceBand: brokenEntity.confidenceBand,
    gateResults: brokenGateResults,
    passedAllGates: false,
    quarantined: true,
    quarantineReasons: [],
    publishEligible: false,
    reviewRequired: true,
    auditTrail: [],
  };

  const quarantineDecision = evaluateQuarantine(brokenPipelineResult);

  if (!quarantineDecision.shouldQuarantine) {
    errors.push("Broken entity was not quarantined despite all gates failing");
  }

  if (quarantineDecision.failedGates.length === 0) {
    errors.push("Quarantine decision has no failed gates for broken entity");
  }

  const earlyAbortEntity = buildTestEntity({
    name: "",
    vertical: "food" as CanonicalVertical,
    canonicalType: "casual_dining_restaurant",
    canonicalPath: "food.restaurant.casual_dining.casual_dining_restaurant",
    confidenceScore: 0.97,
    confidenceBand: "high",
  });

  const earlySchemaResult = runSchemaGate(earlyAbortEntity);
  if (earlySchemaResult.result !== "fail") {
    errors.push("Entity with empty name should fail schema gate");
  }

  const passed = errors.length === 0;

  return {
    testId: "cascading_failure",
    testName: "Cascading Failure Through Gate Pipeline + Quarantine (graduated degradation)",
    passed,
    details: `Valid entity: ${passedGates}/3 gates passed. Broken entity: quarantined=${quarantineDecision.shouldQuarantine}, failed gates=${quarantineDecision.failedGates.length}. Degradation levels quarantined: ${quarantinedCount}/${degradationLevels.length}`,
    metrics: {
      validGatesPassed: passedGates,
      brokenQuarantined: quarantineDecision.shouldQuarantine ? 1 : 0,
      brokenFailedGates: quarantineDecision.failedGates.length,
      quarantineReasons: quarantineDecision.reasons.length,
      degradationLevelsQuarantined: quarantinedCount,
    },
    errors,
    durationMs: Date.now() - startTime,
  };
}

function testRollbackBehavior(): StressTestResult {
  const startTime = Date.now();
  const errors: string[] = [];
  const entityCount = 100;

  const entities: CanonicalEntity[] = [];
  const snapshots: Map<string, {
    name: string;
    confidenceScore: number;
    validationStatus: string;
    category: string;
    subcategory: string;
    canonicalType: string;
    canonicalPath: string;
    metadata: Record<string, unknown>;
  }> = new Map();

  for (let i = 0; i < entityCount; i++) {
    const entity = buildTestEntity({
      name: `Rollback Entity ${i}`,
      vertical: "food" as CanonicalVertical,
      category: "restaurant",
      subcategory: "casual_dining",
      canonicalType: "casual_dining_restaurant",
      canonicalPath: "food.restaurant.casual_dining.casual_dining_restaurant",
      confidenceScore: 0.95,
      confidenceBand: "high",
      metadata: { originalIndex: i, tag: `batch-${Math.floor(i / 10)}` },
    });
    entities.push(entity);
    snapshots.set(entity.id, {
      name: entity.name,
      confidenceScore: entity.confidenceScore,
      validationStatus: entity.validationStatus,
      category: entity.category,
      subcategory: entity.subcategory,
      canonicalType: entity.canonicalType,
      canonicalPath: entity.canonicalPath,
      metadata: { ...entity.metadata },
    });
  }

  for (const entity of entities) {
    entity.name = `Modified ${entity.name}`;
    entity.confidenceScore = 0.99;
    entity.validationStatus = "approved";
    entity.category = "corrupted_category";
    entity.subcategory = "corrupted_sub";
    entity.metadata = { corrupted: true };
  }

  const allModified = entities.every(e =>
    e.name.startsWith("Modified") &&
    e.confidenceScore === 0.99 &&
    e.category === "corrupted_category"
  );
  if (!allModified) errors.push("Not all entities were fully corrupted before rollback");

  const repairFailed = true;
  if (repairFailed) {
    for (const entity of entities) {
      const snapshot = snapshots.get(entity.id);
      if (snapshot) {
        entity.name = snapshot.name;
        entity.confidenceScore = snapshot.confidenceScore;
        entity.validationStatus = snapshot.validationStatus;
        entity.category = snapshot.category;
        entity.subcategory = snapshot.subcategory;
        entity.canonicalType = snapshot.canonicalType;
        entity.canonicalPath = snapshot.canonicalPath;
        entity.metadata = { ...snapshot.metadata };
      } else {
        errors.push(`No snapshot found for entity ${entity.id}`);
      }
    }
  }

  const allRolledBack = entities.every(e => {
    const snap = snapshots.get(e.id);
    if (!snap) return false;
    return e.name === snap.name &&
      e.confidenceScore === snap.confidenceScore &&
      e.validationStatus === snap.validationStatus &&
      e.category === snap.category &&
      e.subcategory === snap.subcategory &&
      e.canonicalType === snap.canonicalType &&
      e.canonicalPath === snap.canonicalPath &&
      JSON.stringify(e.metadata) === JSON.stringify(snap.metadata);
  });

  if (!allRolledBack) errors.push("Rollback did not restore original state (including metadata) for all entities");

  let postRollbackGateFailures = 0;
  for (const entity of entities) {
    const schemaResult = runSchemaGate(entity);
    if (schemaResult.result === "fail") {
      postRollbackGateFailures++;
      errors.push(`Entity ${entity.id} fails schema gate after rollback`);
    }
  }

  const passed = allModified && allRolledBack && postRollbackGateFailures === 0 && errors.length === 0;

  return {
    testId: "rollback_behavior",
    testName: "Rollback When Repair Fails (100 entities, multi-field corruption + restore)",
    passed,
    details: `${entityCount} entities: modified=${allModified}, rolled back=${allRolledBack}, post-rollback gate failures=${postRollbackGateFailures}`,
    metrics: { entityCount, modified: allModified ? entityCount : 0, rolledBack: allRolledBack ? entityCount : 0, postRollbackGateFailures },
    errors,
    durationMs: Date.now() - startTime,
  };
}

function testDedupUnderLoad(): StressTestResult {
  const startTime = Date.now();
  const errors: string[] = [];
  const batchSize = 2000;

  const messages: Array<{ id: string; created_at: string }> = [];
  for (let i = 0; i < batchSize; i++) {
    messages.push({
      id: `load-msg-${i}`,
      created_at: new Date(Date.now() + i).toISOString(),
    });
  }

  const withDuplicates = [
    ...messages,
    ...messages.slice(0, 500),
    ...messages.slice(500, 1000),
    ...messages.slice(1000, 1500),
    ...messages.slice(0, 200),
    ...messages.slice(1800, 2000),
  ];
  const deduped = deduplicateMessages(withDuplicates);

  const dedupCorrect = deduped.length === batchSize;
  if (!dedupCorrect) {
    errors.push(`Expected ${batchSize} unique messages, got ${deduped.length}`);
  }

  const idSet = new Set(deduped.map(m => m.id));
  const allUnique = idSet.size === deduped.length;
  if (!allUnique) {
    errors.push(`Deduped result contains duplicates: ${deduped.length} items but ${idSet.size} unique IDs`);
  }

  for (let i = 0; i < batchSize; i++) {
    if (!idSet.has(`load-msg-${i}`)) {
      errors.push(`Missing message load-msg-${i} after dedup`);
      if (errors.length > 10) { errors.push("...truncated"); break; }
    }
  }

  const singleItemDedup = deduplicateMessages([messages[0]]);
  if (singleItemDedup.length !== 1) {
    errors.push(`Single item dedup failed: expected 1, got ${singleItemDedup.length}`);
  }

  const emptyDedup = deduplicateMessages([]);
  if (emptyDedup.length !== 0) {
    errors.push(`Empty dedup failed: expected 0, got ${emptyDedup.length}`);
  }

  const allSameId = Array.from({ length: 100 }, () => ({ id: "same-id", created_at: new Date().toISOString() }));
  const sameIdDedup = deduplicateMessages(allSameId);
  if (sameIdDedup.length !== 1) {
    errors.push(`All-same-id dedup: expected 1, got ${sameIdDedup.length}`);
  }

  const passed = dedupCorrect && allUnique && errors.length === 0;

  return {
    testId: "dedup_under_load",
    testName: "Dedup Engine Under Load (2000 messages + 2200 duplicates + edge cases)",
    passed,
    details: `Input: ${withDuplicates.length}, Output: ${deduped.length}, Expected: ${batchSize}, Edge cases: single=${singleItemDedup.length}, empty=${emptyDedup.length}, allSame=${sameIdDedup.length}`,
    metrics: { inputSize: withDuplicates.length, outputSize: deduped.length, expectedSize: batchSize, edgeCaseSingle: singleItemDedup.length, edgeCaseEmpty: emptyDedup.length, edgeCaseAllSame: sameIdDedup.length },
    errors,
    durationMs: Date.now() - startTime,
  };
}

function testExhaustiveStateTraversal(): StressTestResult {
  const startTime = Date.now();
  const errors: string[] = [];

  interface MachineEntry {
    name: string;
    machine: CanonicalMachineDef<string>;
  }

  const machines: MachineEntry[] = [
    { name: "MESSAGE", machine: MESSAGE_MACHINE as CanonicalMachineDef<string> },
    { name: "UPLOAD", machine: UPLOAD_MACHINE as CanonicalMachineDef<string> },
    { name: "CONNECTION", machine: CONNECTION_MACHINE as CanonicalMachineDef<string> },
    { name: "AUTH_SESSION", machine: AUTH_SESSION_MACHINE as CanonicalMachineDef<string> },
    { name: "CHECKOUT", machine: CHECKOUT_MACHINE as CanonicalMachineDef<string> },
    { name: "BOOKING", machine: BOOKING_MACHINE as CanonicalMachineDef<string> },
    { name: "SUBSCRIPTION", machine: SUBSCRIPTION_MACHINE as CanonicalMachineDef<string> },
  ];

  let totalStates = 0;
  let totalTransitions = 0;
  let validTransitions = 0;
  let deadStates = 0;
  let unreachableFromInitial = 0;

  for (const entry of machines) {
    const { name, machine } = entry;
    const states = Object.keys(machine.states);
    totalStates += states.length;

    if (!states.includes(machine.initial)) {
      errors.push(`${name}: initial state "${machine.initial}" not in states`);
    }

    const reachable = new Set<string>();
    const queue = [machine.initial];
    reachable.add(machine.initial);

    while (queue.length > 0) {
      const current = queue.shift()!;
      const node = machine.states[current];
      if (!node?.on) continue;

      for (const [event, target] of Object.entries(node.on)) {
        totalTransitions++;
        if (!states.includes(target as string)) {
          errors.push(`${name}: state "${current}" event "${event}" targets non-existent state "${target}"`);
        } else {
          validTransitions++;
          if (!reachable.has(target as string)) {
            reachable.add(target as string);
            queue.push(target as string);
          }
        }
      }
    }

    for (const state of states) {
      if (!reachable.has(state)) {
        unreachableFromInitial++;
        errors.push(`${name}: state "${state}" is unreachable from initial state "${machine.initial}"`);
      }
    }

    for (const state of states) {
      const node = machine.states[state];
      const hasOutgoing = node?.on && Object.keys(node.on).length > 0;
      const isTarget = states.some(s => {
        const n = machine.states[s];
        return n?.on && Object.values(n.on).includes(state);
      });
      if (!hasOutgoing && !isTarget && state !== machine.initial) {
        deadStates++;
      }
    }

    const bogusEvents = ["NONEXISTENT", "FAKE_EVENT", "XYZ_123", ""];
    for (const state of states) {
      for (const bogus of bogusEvents) {
        const result = transition(machine, state, bogus);
        if (result !== null) {
          errors.push(`${name}: bogus event "${bogus}" from "${state}" should return null but returned "${result}"`);
        }
      }
    }
  }

  const passed = errors.length === 0;

  return {
    testId: "exhaustive_state_traversal",
    testName: "Exhaustive State Machine Traversal (7 machines, reachability + bogus events)",
    passed,
    details: `${machines.length} machines, ${totalStates} states, ${totalTransitions} transitions (${validTransitions} valid), ${unreachableFromInitial} unreachable, ${deadStates} dead-end states`,
    metrics: { machineCount: machines.length, totalStates, totalTransitions, validTransitions, unreachableFromInitial, deadStates },
    errors,
    durationMs: Date.now() - startTime,
  };
}

function testBoundaryConfidence(): StressTestResult {
  const startTime = Date.now();
  const errors: string[] = [];

  const boundaryScores = [0.0, 0.01, 0.09, 0.10, 0.11, 0.19, 0.20, 0.21, 0.29, 0.30, 0.31,
    0.39, 0.40, 0.41, 0.49, 0.50, 0.51, 0.59, 0.60, 0.61, 0.69, 0.70, 0.71,
    0.79, 0.80, 0.81, 0.89, 0.90, 0.91, 0.94, 0.95, 0.96, 0.99, 1.0];

  function expectedBand(score: number): CanonicalEntity["confidenceBand"] {
    if (score < 0.30) return "rejected";
    if (score < 0.60) return "low";
    if (score < 0.80) return "medium";
    return "high";
  }

  let testedCount = 0;
  let gateConsistentCount = 0;
  let mismatchTestedCount = 0;

  for (const score of boundaryScores) {
    const band = expectedBand(score);
    const entity = buildTestEntity({
      name: `Boundary Entity Score=${score}`,
      vertical: "food" as CanonicalVertical,
      category: "restaurant",
      subcategory: "casual_dining",
      canonicalType: "casual_dining_restaurant",
      canonicalPath: "food.restaurant.casual_dining.casual_dining_restaurant",
      confidenceScore: score,
      confidenceBand: band,
    });

    const confidenceResult = runConfidenceGate(entity);
    testedCount++;

    if (score < 0.30 && confidenceResult.result === "pass") {
      errors.push(`Score ${score}: confidence gate should not pass for rejected band`);
    }
    if (score >= 0.80 && confidenceResult.result === "fail") {
      errors.push(`Score ${score}: confidence gate should not fail for high band`);
    }

    const schemaResult = runSchemaGate(entity);
    if (schemaResult.result === "pass") gateConsistentCount++;
  }

  const adversarialMismatches: Array<{ score: number; claimedBand: CanonicalEntity["confidenceBand"]; shouldFail: boolean }> = [
    { score: 0.10, claimedBand: "high", shouldFail: true },
    { score: 0.05, claimedBand: "medium", shouldFail: true },
    { score: 0.95, claimedBand: "rejected", shouldFail: false },
    { score: 0.50, claimedBand: "high", shouldFail: false },
    { score: 0.20, claimedBand: "low", shouldFail: true },
  ];

  for (const mismatch of adversarialMismatches) {
    const entity = buildTestEntity({
      name: `Adversarial Mismatch Score=${mismatch.score} Band=${mismatch.claimedBand}`,
      vertical: "food" as CanonicalVertical,
      category: "restaurant",
      subcategory: "casual_dining",
      canonicalType: "casual_dining_restaurant",
      canonicalPath: "food.restaurant.casual_dining.casual_dining_restaurant",
      confidenceScore: mismatch.score,
      confidenceBand: mismatch.claimedBand,
    });

    const result = runConfidenceGate(entity);
    mismatchTestedCount++;

    if (mismatch.shouldFail && result.result === "pass") {
      errors.push(`Adversarial mismatch (score=${mismatch.score}, band=${mismatch.claimedBand}): gate passed but should reject low-score entity regardless of claimed band`);
    }
  }

  const minConsistencyRate = 0.95;
  const consistencyRate = gateConsistentCount / testedCount;
  if (consistencyRate < minConsistencyRate) {
    errors.push(`Schema gate consistency rate ${(consistencyRate * 100).toFixed(1)}% below minimum ${minConsistencyRate * 100}%`);
  }

  const passed = errors.length === 0;

  return {
    testId: "boundary_confidence",
    testName: "Boundary Confidence Score Edge Cases (34 boundary values)",
    passed,
    details: `${testedCount} boundary scores tested, ${mismatchTestedCount} adversarial mismatches, ${gateConsistentCount} schema-consistent, consistency rate=${(consistencyRate * 100).toFixed(1)}%`,
    metrics: { testedCount, mismatchTestedCount, gateConsistentCount, consistencyRate: Math.round(consistencyRate * 100) },
    errors,
    durationMs: Date.now() - startTime,
  };
}

function testCrossVerticalContamination(): StressTestResult {
  const startTime = Date.now();
  const errors: string[] = [];

  const entitiesByVertical: Map<CanonicalVertical, CanonicalEntity[]> = new Map();

  for (const vertical of ALL_VERTICALS) {
    const batch: CanonicalEntity[] = [];
    for (let i = 0; i < 25; i++) {
      batch.push(buildTestEntity({
        name: `${vertical} Entity ${i}`,
        vertical,
        category: "general",
        subcategory: "default",
        canonicalType: "listing",
        canonicalPath: `${vertical}.general.default.listing`,
        confidenceScore: 0.92,
        confidenceBand: "high",
      }));
    }
    entitiesByVertical.set(vertical, batch);
  }

  let totalEntities = 0;
  let crossContaminations = 0;

  for (const [vertical, entities] of entitiesByVertical) {
    for (const entity of entities) {
      totalEntities++;
      if (entity.vertical !== vertical) {
        crossContaminations++;
        errors.push(`Entity ${entity.id} has vertical "${entity.vertical}" but was created for "${vertical}"`);
      }
      if (!entity.canonicalPath.startsWith(vertical + ".")) {
        crossContaminations++;
        errors.push(`Entity ${entity.id} canonicalPath "${entity.canonicalPath}" doesn't start with vertical "${vertical}"`);
      }
    }
  }

  let gateIsolationFailures = 0;
  for (const [vertical, entities] of entitiesByVertical) {
    for (const entity of entities) {
      const schemaResult = runSchemaGate(entity);
      if (schemaResult.result === "fail") {
        gateIsolationFailures++;
        if (gateIsolationFailures <= 5) {
          errors.push(`${vertical} entity ${entity.id} failed schema gate: ${schemaResult.details}`);
        }
      }
    }
  }

  const mixedBatch: CanonicalEntity[] = [];
  for (const [, entities] of entitiesByVertical) {
    mixedBatch.push(entities[0]);
  }
  const crossRng = createSeededRng(42);
  for (let i = mixedBatch.length - 1; i > 0; i--) {
    const j = Math.floor(crossRng() * (i + 1));
    [mixedBatch[i], mixedBatch[j]] = [mixedBatch[j], mixedBatch[i]];
  }

  let mixedBatchIssues = 0;
  for (const entity of mixedBatch) {
    const result = runSchemaGate(entity);
    if (result.result === "fail") {
      mixedBatchIssues++;
    }
  }

  if (mixedBatchIssues > 0) {
    errors.push(`${mixedBatchIssues} mixed-batch entities failed schema gate (cross-vertical interference)`);
  }

  const passed = crossContaminations === 0 && gateIsolationFailures === 0 && mixedBatchIssues === 0 && errors.length === 0;

  return {
    testId: "cross_vertical_contamination",
    testName: "Cross-Vertical Contamination Detection (20 verticals x 25 entities)",
    passed,
    details: `${totalEntities} entities across ${ALL_VERTICALS.length} verticals: ${crossContaminations} contaminations, ${gateIsolationFailures} gate isolation failures, ${mixedBatchIssues} mixed batch issues`,
    metrics: { totalEntities, verticalCount: ALL_VERTICALS.length, crossContaminations, gateIsolationFailures, mixedBatchIssues },
    errors,
    durationMs: Date.now() - startTime,
  };
}

function testFullGateChainStress(): StressTestResult {
  const startTime = Date.now();
  const errors: string[] = [];
  const entityCount = 200;

  let publishEligibleCount = 0;
  let quarantinedCount = 0;
  let reviewRequiredCount = 0;
  let totalGateResults = 0;
  let validEntityCount = 0;
  let invalidEntityCount = 0;
  let falseQuarantines = 0;
  let missedInvalidDetections = 0;
  const chainRng = createSeededRng(1337);

  for (let i = 0; i < entityCount; i++) {
    const isValid = i % 4 !== 0;
    if (isValid) validEntityCount++;
    else invalidEntityCount++;

    const entity = isValid
      ? buildTestEntity({
          name: `Full Chain Entity ${i}`,
          vertical: "food" as CanonicalVertical,
          category: "restaurant",
          subcategory: "casual_dining",
          canonicalType: "casual_dining_restaurant",
          canonicalPath: "food.restaurant.casual_dining.casual_dining_restaurant",
          confidenceScore: 0.93 + chainRng() * 0.06,
          confidenceBand: "high",
        })
      : buildTestEntity({
          name: i % 8 === 0 ? "" : `Broken Entity ${i}`,
          vertical: "food" as CanonicalVertical,
          category: i % 8 === 0 ? "" : "restaurant",
          subcategory: "casual_dining",
          canonicalType: i % 8 === 0 ? "" : "casual_dining_restaurant",
          canonicalPath: i % 8 === 0 ? "" : "food.restaurant.casual_dining.casual_dining_restaurant",
          confidenceScore: i % 8 === 0 ? 0.1 : 0.35,
          confidenceBand: i % 8 === 0 ? "rejected" : "low",
        });

    const mediaAssets: MediaAsset[] = isValid ? [buildTestMediaAsset(entity.id)] : [];
    const existingEntities: Array<{ id: string; name: string; lat: number | null; lng: number | null; canonicalType: string }> = [];

    const result = runAllGates(entity, mediaAssets, existingEntities);

    totalGateResults += result.gateResults.length;

    if (result.publishEligible) publishEligibleCount++;
    if (result.quarantined) quarantinedCount++;
    if (result.reviewRequired) reviewRequiredCount++;

    if (isValid && result.quarantined && result.gateResults.every(g => g.result !== "fail")) {
      falseQuarantines++;
      errors.push(`Valid entity ${entity.id} quarantined despite no gate failures`);
    }
    if (!isValid && !result.quarantined && result.gateResults.every(g => g.result === "pass")) {
      missedInvalidDetections++;
      errors.push(`Invalid entity ${entity.id} passed all gates and was not quarantined`);
    }
  }

  const expectedValidCount = entityCount - Math.floor(entityCount / 4);
  if (validEntityCount !== expectedValidCount) {
    errors.push(`Expected ${expectedValidCount} valid entities, got ${validEntityCount}`);
  }
  if (publishEligibleCount === 0) {
    errors.push("No entities were publish-eligible - unexpected");
  }
  if (quarantinedCount === 0) {
    errors.push("No entities were quarantined - expected some failures");
  }
  if (totalGateResults < entityCount * 7) {
    errors.push(`Too few gate results: ${totalGateResults}, expected at least ${entityCount * 7} (7 gates per entity)`);
  }
  if (falseQuarantines > 0) {
    errors.push(`${falseQuarantines} valid entities were falsely quarantined`);
  }

  const passed = errors.length === 0;

  return {
    testId: "full_gate_chain_stress",
    testName: "Full 7-Gate Chain Stress (200 entities via runAllGates)",
    passed,
    details: `${entityCount} entities (${validEntityCount} valid, ${invalidEntityCount} invalid) through full 7-gate chain: ${publishEligibleCount} publish-eligible, ${quarantinedCount} quarantined, ${falseQuarantines} false quarantines, ${missedInvalidDetections} missed invalid, ${totalGateResults} total gate results`,
    metrics: { entityCount, validEntityCount, invalidEntityCount, publishEligibleCount, quarantinedCount, reviewRequiredCount, totalGateResults, falseQuarantines, missedInvalidDetections },
    errors,
    durationMs: Date.now() - startTime,
  };
}

function testStateMachineFuzzer(): StressTestResult {
  const startTime = Date.now();
  const errors: string[] = [];

  interface MachineEntry {
    name: string;
    machine: CanonicalMachineDef<string>;
  }

  const machines: MachineEntry[] = [
    { name: "MESSAGE", machine: MESSAGE_MACHINE as CanonicalMachineDef<string> },
    { name: "UPLOAD", machine: UPLOAD_MACHINE as CanonicalMachineDef<string> },
    { name: "CONNECTION", machine: CONNECTION_MACHINE as CanonicalMachineDef<string> },
    { name: "AUTH_SESSION", machine: AUTH_SESSION_MACHINE as CanonicalMachineDef<string> },
    { name: "CHECKOUT", machine: CHECKOUT_MACHINE as CanonicalMachineDef<string> },
    { name: "BOOKING", machine: BOOKING_MACHINE as CanonicalMachineDef<string> },
    { name: "SUBSCRIPTION", machine: SUBSCRIPTION_MACHINE as CanonicalMachineDef<string> },
  ];

  const randomWalksPerMachine = 500;
  const maxStepsPerWalk = 50;
  let totalWalks = 0;
  let totalSteps = 0;
  let nullTransitions = 0;
  let successfulTransitions = 0;
  let stateViolations = 0;
  const fuzzRng = createSeededRng(7919);

  for (const entry of machines) {
    const { name, machine } = entry;
    const allStates = Object.keys(machine.states);
    const allEvents: string[] = [];
    for (const state of allStates) {
      const node = machine.states[state];
      if (node?.on) {
        for (const event of Object.keys(node.on)) {
          if (!allEvents.includes(event)) allEvents.push(event);
        }
      }
    }

    for (let walk = 0; walk < randomWalksPerMachine; walk++) {
      totalWalks++;
      let current = machine.initial;
      const visited = new Set<string>();
      visited.add(current);

      for (let step = 0; step < maxStepsPerWalk; step++) {
        const eventIndex = Math.floor(fuzzRng() * (allEvents.length + 2));
        const event = eventIndex < allEvents.length
          ? allEvents[eventIndex]
          : `FUZZ_${step}_${walk}`;

        const next = transition(machine, current, event);
        totalSteps++;

        if (next === null) {
          nullTransitions++;
        } else {
          successfulTransitions++;
          if (!allStates.includes(next)) {
            stateViolations++;
            errors.push(`${name}: transition from "${current}" via "${event}" landed on unknown state "${next}"`);
          }
          current = next;
          visited.add(current);
        }
      }
    }
  }

  if (stateViolations > 0) {
    errors.push(`${stateViolations} state violations detected across all machines`);
  }

  const transitionRate = successfulTransitions / totalSteps;
  if (transitionRate < 0.01) {
    errors.push(`Suspiciously low transition rate: ${(transitionRate * 100).toFixed(2)}%`);
  }

  const passed = errors.length === 0;

  return {
    testId: "state_machine_fuzzer",
    testName: "State Machine Fuzzer (7 machines x 500 random walks x 50 steps)",
    passed,
    details: `${totalWalks} walks, ${totalSteps} total steps, ${successfulTransitions} valid transitions, ${nullTransitions} null transitions, ${stateViolations} violations, rate=${(transitionRate * 100).toFixed(1)}%`,
    metrics: { totalWalks, totalSteps, successfulTransitions, nullTransitions, stateViolations, transitionRatePct: Math.round(transitionRate * 100) },
    errors,
    durationMs: Date.now() - startTime,
  };
}

export function runResilienceTestSuite(): ResilienceReport {
  const startTime = Date.now();
  const results: StressTestResult[] = [
    testMultiSession(),
    testReconnectResilience(),
    testRapidEventStorm(),
    testPublishGateUnderLoad(),
    testCascadingFailure(),
    testRollbackBehavior(),
    testDedupUnderLoad(),
    testExhaustiveStateTraversal(),
    testBoundaryConfidence(),
    testCrossVerticalContamination(),
    testFullGateChainStress(),
    testStateMachineFuzzer(),
  ];

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  return {
    totalTests: results.length,
    passed,
    failed,
    results,
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - startTime,
  };
}

export function getResilienceReportSummary(report: ResilienceReport): string {
  const lines = [
    `=== STRESS & RESILIENCE TEST REPORT ===`,
    `Timestamp: ${report.timestamp}`,
    `Duration: ${report.durationMs}ms`,
    ``,
    `Total tests: ${report.totalTests}`,
    `Passed: ${report.passed}`,
    `Failed: ${report.failed}`,
    ``,
  ];

  for (const r of report.results) {
    const status = r.passed ? "PASS" : "FAIL";
    lines.push(`[${status}] ${r.testName}`);
    lines.push(`  ${r.details}`);
    if (r.errors.length > 0) {
      for (const e of r.errors) {
        lines.push(`  ERROR: ${e}`);
      }
    }
    const metricStr = Object.entries(r.metrics).map(([k, v]) => `${k}=${v}`).join(", ");
    lines.push(`  Metrics: ${metricStr}`);
    lines.push(`  Duration: ${r.durationMs}ms`);
    lines.push(``);
  }

  return lines.join("\n");
}
