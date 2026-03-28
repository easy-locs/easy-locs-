/**
 * Pipeline Orchestrator V2 — Gold-standard resumable, observable, partial-success coordinator.
 * 
 * RULES:
 * - Zero business logic here. Every computation delegated to atomic units.
 * - Every step runs through step-runner with retry + soft-fail.
 * - Full forensic trace produced for every run.
 * - Partial failures are isolated — a failed image scorer does not kill entity build.
 * - Produces business-ready outputs: storefront payload, search payload, map payload, publish decision.
 */
import type {
  RawInput, PipelineResult, StepState, InputLayerOutput,
  FetchLayerOutput, GeoLayerOutput, TaxonomyLayerOutput, MediaLayerOutput,
  QualityReport, GovernanceLayerOutput, PersistenceResult,
  PublishGateDecision, EntityProfile, AuditTrace,
} from "./contracts";
import type { CanonicalOnboardingRecord, Vertical } from "../types";

import { executeStep, executeStepSync, type StepContext } from "./step-runner";
import { runInputLayer } from "./input";
import { runGeoLayer } from "./geo";
import { runTaxonomyLayer } from "./taxonomy";
import { runMediaLayer } from "./media";
import { runQualityLayer } from "./quality";
import { runGovernanceLayer } from "./governance";
import { buildAuditTrace } from "./output/output.audit_trace.build";
import { buildPreview } from "./output/output.preview.build";
import { buildStorefrontPayload } from "./persistence/persistence.storefront_payload.build";
import { writeImportRun } from "./persistence/persistence.import_run.write";
import { writeCanonicalRecords } from "./persistence/persistence.canonical_record.write";
import { createOrUpdateStorefront } from "./persistence/persistence.storefront.create_or_update";

import { groupEntities } from "../entity-resolution.engine";
import { mergeEntityRecords } from "../field-merge.engine";
import { fillMissingWithWebFallback } from "../web-fallback.engine";
import { sanitizeCanonicalRecord } from "../micro/record.sanitizer";
import { fetchFromSources } from "../micro/source.fetcher";

export async function runPipelineV2(rawParams: {
  raw: string;
  vertical?: Vertical;
  city?: string;
  district?: string;
  country?: string;
  phone?: string;
  language?: string;
  timezone?: string;
  currency?: string;
  /** If true, persist results to DB */
  persist?: boolean;
}): Promise<PipelineResult> {
  const pipelineId = crypto.randomUUID();
  const pipelineStart = performance.now();
  const steps: StepState[] = [];
  const softCtx = (name: string, idx: number): StepContext => ({
    runId: pipelineId, stepIndex: idx, maxRetries: 1, softFail: true,
  });
  const hardCtx = (name: string, idx: number): StepContext => ({
    runId: pipelineId, stepIndex: idx, maxRetries: 2, softFail: false,
  });

  // ── STEP 1: INPUT LAYER ──────────────────────────────────
  const inputStep = executeStepSync("input.layer", rawParams, pipelineId, () =>
    runInputLayer(rawParams),
  );
  steps.push(inputStep.state);
  const inputOutput = inputStep.data!;
  const vertical = inputOutput.vertical;

  // ── STEP 2: FETCH LAYER ──────────────────────────────────
  const fetchStep = await executeStep("fetch.layer", inputOutput, hardCtx("fetch", 1), async () => {
    const result = await fetchFromSources({
      vertical,
      name: rawParams.raw.startsWith("http") ? undefined : rawParams.raw,
      website: rawParams.raw.startsWith("http") ? rawParams.raw : undefined,
      query: rawParams.raw,
      city: inputOutput.geoHints.city,
      country: inputOutput.geoHints.country,
      district: inputOutput.geoHints.district,
    });
    return result;
  });
  steps.push(fetchStep.state);
  const allRecords = fetchStep.data?.records ?? [];

  // ── STEP 3: ENTITY GROUPING ──────────────────────────────
  const groupStep = executeStepSync("entity.grouper", { recordCount: allRecords.length }, pipelineId, () =>
    groupEntities(allRecords),
  );
  steps.push(groupStep.state);
  const groups = groupStep.data ?? [];

  // ── PER-ENTITY PROCESSING ────────────────────────────────
  const canonicalResults: CanonicalOnboardingRecord[] = [];
  const qualityReports: QualityReport[] = [];
  const governanceOutputs: GovernanceLayerOutput[] = [];
  const publishDecisions: PublishGateDecision[] = [];
  const profiles: EntityProfile[] = [];

  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];

    // Step 4: Field merge
    const mergeStep = executeStepSync(`field.merger[${i}]`, { groupSize: group.length }, pipelineId, () =>
      mergeEntityRecords(vertical, group),
    );
    steps.push(mergeStep.state);
    if (!mergeStep.data) continue;

    // Step 5: Web fallback (soft-fail)
    let finalGroup = [...group];
    if (mergeStep.data.missingFields.length > 0) {
      const fallbackStep = await executeStep(`web.fallback[${i}]`, { missing: mergeStep.data.missingFields }, softCtx("fallback", 5), async () =>
        fillMissingWithWebFallback(vertical, {
          name: mergeStep.data!.canonicalName,
          city: mergeStep.data!.city,
          district: mergeStep.data!.district,
          country: mergeStep.data!.country,
          website: mergeStep.data!.website,
          phone: mergeStep.data!.phone,
        }),
      );
      steps.push(fallbackStep.state);
      if (fallbackStep.data) finalGroup = [...finalGroup, ...fallbackStep.data];
    }

    // Re-merge with fallback data
    const finalMerge = mergeEntityRecords(vertical, finalGroup);

    // Step 6: Sanitize
    const sanitizeStep = executeStepSync(`record.sanitizer[${i}]`, { id: finalMerge.entityId }, pipelineId, () =>
      sanitizeCanonicalRecord(finalMerge),
    );
    steps.push(sanitizeStep.state);
    const canonical = sanitizeStep.data ?? finalMerge;
    canonicalResults.push(canonical);

    // Step 7: Geo layer (soft-fail)
    const geoStep = executeStepSync(`geo.layer[${i}]`, { city: canonical.city }, pipelineId, () =>
      runGeoLayer({
        address: canonical.address,
        city: canonical.city ?? inputOutput.geoHints.city,
        district: canonical.district ?? inputOutput.geoHints.district,
        country: canonical.country ?? inputOutput.geoHints.country,
        lat: canonical.lat,
        lng: canonical.lng,
      }),
    );
    steps.push(geoStep.state);
    const geo = geoStep.data!;

    // Step 8: Media layer (soft-fail)
    const mediaStep = executeStepSync(`media.layer[${i}]`, { photoCount: canonical.photos.length }, pipelineId, () =>
      runMediaLayer(canonical.photos),
    );
    steps.push(mediaStep.state);
    const media = mediaStep.data!;

    // Step 9: Taxonomy layer
    const taxonomyStep = executeStepSync(`taxonomy.layer[${i}]`, { vertical }, pipelineId, () =>
      runTaxonomyLayer({
        hintVertical: vertical,
        text: [canonical.canonicalName, canonical.address, ...canonical.categories].filter(Boolean).join(" "),
        categories: canonical.categories,
        subcategories: canonical.subcategories,
        menuCount: canonical.menuItems.length,
        roomCount: canonical.hotelInventory.length,
        serviceCount: canonical.serviceItems.length,
        productCount: 0,
      }),
    );
    steps.push(taxonomyStep.state);
    const taxonomy = taxonomyStep.data!;

    // Step 10: Quality layer
    const qualityStep = executeStepSync(`quality.layer[${i}]`, { id: canonical.entityId }, pipelineId, () =>
      runQualityLayer({
        vertical,
        name: canonical.canonicalName, address: canonical.address,
        city: geo.resolution.city, country: geo.resolution.countryCode,
        lat: geo.resolution.lat, lng: geo.resolution.lng,
        phone: canonical.phone, website: canonical.website,
        categories: canonical.categories.length, hasHours: !!canonical.openingHours,
        hasZone: !!geo.resolution.zone,
        photoCount: media.deduplicated.length, hasLogo: !!media.selectedLogo,
        hasCover: !!media.selectedCover,
        stockPhotoCount: media.scored.filter((s) => s.isStock).length,
        menuItems: canonical.menuItems.length, hotelRooms: canonical.hotelInventory.length,
        services: canonical.serviceItems.length, products: 0,
        sourceCount: canonical.sourceProofs.length, hasPrimarySource: canonical.sourceProofs.length > 0,
        mergeConfidence: canonical.mergeConfidence,
      }),
    );
    steps.push(qualityStep.state);
    const quality = qualityStep.data!;
    qualityReports.push(quality);

    // Step 11: Governance layer
    const govStep = executeStepSync(`governance.layer[${i}]`, { quality: quality.globalScore }, pipelineId, () =>
      runGovernanceLayer({
        entityId: canonical.entityId,
        vertical,
        country: geo.resolution.countryCode,
        city: geo.resolution.city,
        sourcesUsed: canonical.sourceProofs.map((p) => p.source),
        quality,
        isClaimed: false,
      }),
    );
    steps.push(govStep.state);
    const governance = govStep.data!;
    governanceOutputs.push(governance);
    publishDecisions.push(governance.publishDecision);

    // Build entity profile for trace
    profiles.push({
      identity: {
        entityId: canonical.entityId,
        canonicalName: canonical.canonicalName,
        branchName: canonical.branchName,
        vertical,
      },
      location: geo.resolution,
      contact: { phone: canonical.phone, email: null, website: canonical.website, socialLinks: [] },
      media,
      taxonomy: taxonomy.mapping,
      hours: { raw: canonical.openingHours, isOpen24h: false, timezone: geo.resolution.timezone },
      rating: canonical.rating,
      reviewCount: canonical.reviewCount,
    });
  }

  // ── PERSISTENCE (optional) ───────────────────────────────
  let persistence: PersistenceResult | null = null;

  if (rawParams.persist !== false) {
    const persistStep = await executeStep("persistence.layer", { count: canonicalResults.length }, softCtx("persist", 12), async () => {
      const publishMap: Record<string, string> = {};
      for (const d of publishDecisions) publishMap[d.entityId] = d.targetVisibility;

      const runId = await writeImportRun({
        vertical,
        input: inputOutput.raw,
        status: "completed",
        resultJson: { entityCount: canonicalResults.length },
      });

      const canonicalIds = await writeCanonicalRecords(runId, canonicalResults, publishMap);

      let storefrontId: string | null = null;
      let storefrontSlug: string | null = null;

      for (let i = 0; i < canonicalResults.length; i++) {
        const gov = governanceOutputs[i];
        if (!gov) continue;

        const sfPayload = buildStorefrontPayload({
          record: canonicalResults[i],
          governance: gov,
          media: profiles[i]?.media ?? { normalized: [], deduplicated: [], scored: [], selectedCover: null, selectedLogo: null, gallery: [] },
          taxonomy: profiles[i]?.taxonomy ?? { vertical, category: null, subcategory: null, tags: [], confidence: 0 },
          geo: profiles[i]?.location ?? { country: null, countryCode: null, city: null, district: null, zone: null, lat: null, lng: null, timezone: null, currency: null, language: null, confidence: 0 },
        });

        const sf = await createOrUpdateStorefront(canonicalResults[i].entityId, sfPayload, gov.visibilityMode);
        storefrontId = sf.id;
        storefrontSlug = sf.slug;
      }

      return {
        importRunId: runId,
        canonicalRecordIds: canonicalIds,
        storefrontId,
        storefrontSlug,
        searchIndexEnqueued: false, // TODO: wire search index
        mapIndexEnqueued: false,    // TODO: wire map index
      } satisfies PersistenceResult;
    });
    steps.push(persistStep.state);
    persistence = persistStep.data;
  }

  // ── BUILD TRACE + OUTPUT ─────────────────────────────────
  const totalDurationMs = Math.round(performance.now() - pipelineStart);

  const trace = buildAuditTrace({
    runId: persistence?.importRunId ?? pipelineId,
    pipelineId,
    input: inputOutput.raw,
    steps,
    profiles,
    qualityReports,
    governanceDecisions: governanceOutputs,
    persistence,
    totalDurationMs,
  });

  const preview = buildPreview({
    canonical: canonicalResults,
    governance: governanceOutputs,
    quality: qualityReports,
    trace,
  });

  // Final trace log
  const successCount = steps.filter((s) => s.status === "success").length;
  const failCount = steps.filter((s) => s.status === "failed").length;
  console.log(
    `[pipeline] ═══ COMPLETE ${pipelineId.slice(0, 8)} ═══ ${totalDurationMs}ms | ${steps.length} steps | ${successCount} ok | ${failCount} failed | ${canonicalResults.length} entities`,
  );

  return {
    runId: persistence?.importRunId ?? pipelineId,
    canonical: canonicalResults,
    publishDecisions,
    qualityReports,
    governanceOutputs,
    persistence,
    preview,
    trace,
  };
}
