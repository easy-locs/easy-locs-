/**
 * Hotel Publish Gate Engine — Quality gate for hotel/stay vertical.
 *
 * Gates:
 * - Mandatory fields: name, address, phone, cover image, description
 * - At least 1 room with valid type, pricing, and images
 * - Quality score threshold ≥ 40
 * - Stale listing auto-unpublish (no update in 90 days)
 */
import { db } from "@/services/db";
import { validateBasicMerchantInfo } from "./publish-gate-base";
import { CANONICAL_ROOM_TYPES } from "./hotel-room-normalizer-engine";

import { cFrom, cRpc } from "@/lib/execution/content-mutation";
export interface HotelGateResult {
  shopId: string;
  shopName: string;
  passed: boolean;
  failures: string[];
  qualityScore: number;
  autoUnpublished: boolean;
}

export interface HotelGateBatchReport {
  status: "completed";
  results: HotelGateResult[];
  passed: number;
  blocked: number;
  /** Always 0 — hotel gate does not auto-promote; promotion is handled by runAutoPublish(). */
  promoted: 0;
  autoUnpublished: number;
}

const HOTEL_QUALITY_THRESHOLD = 40;
const STALE_DAYS = 90;

function computeHotelQualityScore(m: Record<string, unknown>): number {
  let score = 0;

  // Basic info (40 pts)
  if (m.name && String(m.name).trim().length >= 2) score += 10;
  if (m.address) score += 10;
  if (m.phone) score += 5;
  if (m.cover_image_url || m.cover_image) score += 5;
  const desc = m.description as string | undefined;
  if (desc && desc.length >= 30) score += 10;

  // Rooms data (40 pts)
  const rooms = Array.isArray(m.rooms_json) ? (m.rooms_json as Record<string, unknown>[]) : [];
  if (rooms.length > 0) {
    score += 15;
    const hasValidPricing = rooms.some(r => {
      const price = Number(r.price_per_night ?? r.price ?? 0);
      return price > 0;
    });
    if (hasValidPricing) score += 10;
    const hasImages = rooms.some(r => Array.isArray(r.images) && (r.images as unknown[]).length > 0);
    if (hasImages) score += 10;
    const hasAmenities = rooms.some(r => Array.isArray(r.amenities) && (r.amenities as unknown[]).length > 0);
    if (hasAmenities) score += 5;
  }

  // Extra hotel attributes (20 pts)
  if (m.star_rating && Number(m.star_rating) >= 1) score += 5;
  if (m.check_in_time) score += 5;
  if (m.check_out_time) score += 5;
  const policies = m.policies_json ?? m.policies;
  if (policies) score += 5;

  return score;
}

function validateHotelMerchant(m: Record<string, unknown>): string[] {
  const failures: string[] = [];

  // Basic mandatory fields
  failures.push(...validateBasicMerchantInfo(m, { requireDescription: true }));

  // Must have at least 1 room
  const rooms = Array.isArray(m.rooms_json) ? (m.rooms_json as Record<string, unknown>[]) : [];
  if (rooms.length === 0) {
    failures.push("no_rooms_defined");
    return failures;
  }

  // At least one room must pass ALL structural checks: valid type + valid price + real image + capacity
  const hasFullyValidRoom = rooms.some(r => {
    // Type check
    const roomType = String(r.type ?? r.room_type ?? "").toLowerCase().trim();
    const hasValidType = (CANONICAL_ROOM_TYPES as readonly string[]).includes(roomType);
    // Price check
    const price = Number(r.price_per_night ?? r.price ?? 0);
    const hasValidPrice = price > 0 && price <= 100_000;
    // Image check: at least one non-placeholder image
    const imageArr = Array.isArray(r.images) ? (r.images as unknown[]) : [];
    const hasRealImage = imageArr.some(img => {
      const imgObj = img as Record<string, unknown> | string | null;
      const url = String(typeof imgObj === "string" ? imgObj : ((imgObj as Record<string, unknown>)?.url ?? "")).toLowerCase();
      return url.startsWith("http") && !url.includes("placeholder") && !url.includes("unsplash");
    });
    // Capacity check
    const capacity = Number(r.capacity ?? r.max_guests ?? 0);
    const hasCapacity = capacity > 0;

    return hasValidType && hasValidPrice && hasRealImage && hasCapacity;
  });

  if (!hasFullyValidRoom) {
    failures.push("no_room_with_full_structural_data");
  }

  // Quality threshold
  const score = computeHotelQualityScore(m);
  if (score < HOTEL_QUALITY_THRESHOLD) {
    failures.push(`quality_score_too_low:${score}/${HOTEL_QUALITY_THRESHOLD}`);
  }

  return failures;
}

function isStale(m: Record<string, unknown>): boolean {
  const updatedAt = m.updated_at as string | null;
  if (!updatedAt) return false;
  const ageMs = Date.now() - new Date(updatedAt).getTime();
  return ageMs > STALE_DAYS * 24 * 60 * 60 * 1000;
}

export async function runHotelPublishGate(batchSize = 100): Promise<HotelGateBatchReport> {
  const { data: merchants } = await cFrom("seed_merchants")
    .select("id, name, cover_image_url, cover_image, phone, address, description, rooms_json, star_rating, check_in_time, check_out_time, policies_json, updated_at, is_published, visibility_score, vertical")
    .in("vertical", ["hotel", "stay"])
    .limit(batchSize);

  if (!merchants || merchants.length === 0) {
    return { status: "completed", results: [], passed: 0, blocked: 0, promoted: 0, autoUnpublished: 0 };
  }

  const results: HotelGateResult[] = [];
  let passed = 0;
  let blocked = 0;
  let autoUnpublished = 0;
  const now = new Date().toISOString();

  for (const m of merchants) {
    const merchant = m as Record<string, unknown>;
    const qualityScore = computeHotelQualityScore(merchant);
    const stale = isStale(merchant);

    try {
      // Auto-unpublish stale listings
      if (stale && merchant.is_published) {
        const { error: staleErr } = await cFrom("seed_merchants")
          .update({ is_published: false, gate_status: "failed", blocking_reason: "stale_listing", pipeline_stage: "auto_unpublished_stale", updated_at: now })
          .eq("id", merchant.id);
        if (staleErr) throw staleErr;
        autoUnpublished++;
        results.push({
          shopId: String(merchant.id),
          shopName: String(merchant.name ?? ""),
          passed: false,
          failures: ["stale_listing_auto_unpublished"],
          qualityScore,
          autoUnpublished: true,
        });
        blocked++;
        continue;
      }

      const failures = validateHotelMerchant(merchant);
      const gateResult: HotelGateResult = {
        shopId: String(merchant.id),
        shopName: String(merchant.name ?? ""),
        passed: failures.length === 0,
        failures,
        qualityScore,
        autoUnpublished: false,
      };

      if (failures.length === 0) {
        // Gate passed — mark gate_status=passed and set quality metadata.
        // Do NOT publish here; publishing happens via runAutoPublish() after
        // the moderation stage has run (moderation scans gate_status=passed, is_published=false).
        const { error: passErr } = await cFrom("seed_merchants")
          .update({
            gate_status: "passed",
            blocking_reason: null,
            pipeline_stage: "validated",
            visibility_score: qualityScore,
            updated_at: now,
          })
          .eq("id", merchant.id);
        if (passErr) throw passErr;
        passed++;
      } else {
        // Gate failed — set gate_status=failed to block auto-publish (fail closed)
        const blockingReason = failures.join(", ");
        const { error: failErr } = await cFrom("seed_merchants")
          .update({
            gate_status: "failed",
            blocking_reason: blockingReason,
            is_published: false,
            pipeline_stage: "blocked_quality_gate",
            visibility_score: qualityScore,
            updated_at: now,
          })
          .eq("id", merchant.id);
        if (failErr) throw failErr;
        blocked++;
      }

      results.push(gateResult);
    } catch (err) {
      // DB write failed: treat the merchant as blocked (fail closed) to prevent
      // a write-error from silently allowing a non-gated record to proceed.
      const shopId = String(merchant.id);
      const shopName = String(merchant.name ?? "");
      console.error(`[hotel-publish-gate] DB write failed for ${shopId}:`, err);
      results.push({ shopId, shopName, passed: false, failures: ["db_write_error"], qualityScore, autoUnpublished: false });
      blocked++;
    }
  }

  console.log(`[hotel-publish-gate] Scanned ${merchants.length} hotels: ${passed} passed, ${blocked} blocked, ${autoUnpublished} auto-unpublished`);

  return { status: "completed", results, passed, blocked, promoted: 0, autoUnpublished };
}
