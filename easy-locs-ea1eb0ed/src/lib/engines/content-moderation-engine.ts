/**
 * Content Moderation Engine — Pipeline stage between Validate and Publish.
 *
 * Checks:
 * 1. Text: profanity filter, spam patterns, abusive content keywords
 * 2. Image URLs: blocked domains, placeholder detection, suspicious patterns
 *
 * Rule-based (no AI). Returns flagged listings for review or blocking.
 */
import { db } from "@/services/db";

// ── Profanity / Abuse word list (abbreviated, extend as needed) ──
const PROFANITY_PATTERNS = [
  /\bfuck\b/i, /\bshit\b/i, /\bass\b/i, /\bbitch\b/i, /\bdamn\b/i,
  /\bcrap\b/i, /\bkill\b/i, /\bdie\b/i, /\bhate\b/i, /\bterror\b/i,
  /\bbomb\b/i, /\bweapon\b/i, /\bdrug[s]?\b/i, /\bheroin\b/i, /\bcocain\b/i,
  /\bprostitut/i, /\bescort\b/i, /\bporn\b/i, /\bxxx\b/i,
];

// ── Spam patterns ──
const SPAM_PATTERNS = [
  /click here now/i, /buy now!/i, /100% free/i, /limited time offer/i,
  /congratulations you won/i, /act now/i, /risk.?free/i, /no credit check/i,
  /guaranteed income/i, /make money fast/i, /work from home/i,
  /\$\d{3,}\s*per\s*(day|hour|week)/i,
];

// ── Blocked image domains (adult, malicious, spam) ──
const BLOCKED_IMAGE_DOMAINS = [
  "xvideos.com", "pornhub.com", "xhamster.com",
  "spam.com", "malware.com", "phishing.io",
];

// ── Placeholder / dummy image patterns ──
const PLACEHOLDER_IMAGE_PATTERNS = [
  "placeholder", "dummyimage", "placehold.co", "via.placeholder",
  "picsum.photos", "lorempixel", "unsplash.com", "fakeimg",
];

export interface ModerationIssue {
  field: string;
  issue: string;
  severity: "critical" | "high" | "medium" | "low";
  matched?: string;
}

export interface ModerationResult {
  shopId: string;
  shopName: string;
  passed: boolean;
  issues: ModerationIssue[];
  action: "allow" | "flag" | "block";
}

export interface ModerationBatchReport {
  status: "completed";
  results: ModerationResult[];
  allowed: number;
  flagged: number;
  blocked: number;
  processed: number;
}

function checkText(text: string, fieldName: string): ModerationIssue[] {
  const issues: ModerationIssue[] = [];

  for (const pattern of PROFANITY_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      issues.push({
        field: fieldName,
        issue: "profanity_or_abuse",
        severity: "critical",
        matched: match[0],
      });
      break;
    }
  }

  for (const pattern of SPAM_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      issues.push({
        field: fieldName,
        issue: "spam_pattern",
        severity: "high",
        matched: match[0],
      });
      break;
    }
  }

  // Excessive caps (>60% uppercase in text > 20 chars is spammy)
  if (text.length > 20) {
    const upperCount = text.replace(/[^A-Za-z]/g, "").split("").filter(c => c === c.toUpperCase()).length;
    const total = text.replace(/[^A-Za-z]/g, "").length;
    if (total > 0 && upperCount / total > 0.6) {
      issues.push({ field: fieldName, issue: "excessive_caps", severity: "medium" });
    }
  }

  // Excessive repetition (same word 5+ times)
  const wordCounts: Record<string, number> = {};
  for (const word of text.toLowerCase().split(/\s+/)) {
    if (word.length > 3) wordCounts[word] = (wordCounts[word] ?? 0) + 1;
  }
  for (const [word, count] of Object.entries(wordCounts)) {
    if (count >= 5) {
      issues.push({ field: fieldName, issue: "word_repetition_spam", severity: "medium", matched: word });
      break;
    }
  }

  return issues;
}

function checkImageUrl(url: string, fieldName: string): ModerationIssue[] {
  const issues: ModerationIssue[] = [];
  const lower = url.toLowerCase();

  for (const domain of BLOCKED_IMAGE_DOMAINS) {
    if (lower.includes(domain)) {
      issues.push({ field: fieldName, issue: "blocked_image_domain", severity: "critical", matched: domain });
      return issues;
    }
  }

  for (const pattern of PLACEHOLDER_IMAGE_PATTERNS) {
    if (lower.includes(pattern)) {
      issues.push({ field: fieldName, issue: "placeholder_image_detected", severity: "low", matched: pattern });
      return issues;
    }
  }

  return issues;
}

function moderateMerchant(m: Record<string, unknown>): ModerationResult {
  const issues: ModerationIssue[] = [];

  // Check text fields
  const name = String(m.name ?? "");
  const description = String(m.description ?? "");
  const category = String(m.category ?? "");

  issues.push(...checkText(name, "name"));
  issues.push(...checkText(description, "description"));
  issues.push(...checkText(category, "category"));

  // Check service/menu item names
  const menuItems = Array.isArray(m.menu_items_json) ? m.menu_items_json : [];
  for (const item of menuItems.slice(0, 20)) {
    const itemObj = item as Record<string, unknown>;
    const itemName = String(itemObj?.name ?? "");
    if (itemName) issues.push(...checkText(itemName, "menu_item_name"));
  }

  // Check image URLs
  const imageFields = ["cover_image_url", "cover_image", "logo_url", "logo_image", "banner_url"];
  for (const field of imageFields) {
    const url = String(m[field] ?? "");
    if (url.startsWith("http")) {
      issues.push(...checkImageUrl(url, field));
    }
  }

  // Check room images for hotel
  const rooms = Array.isArray(m.rooms_json) ? m.rooms_json : [];
  for (const room of rooms.slice(0, 5)) {
    const roomObj = room as Record<string, unknown>;
    const roomImages = Array.isArray(roomObj?.images) ? (roomObj.images as unknown[]) : [];
    for (const img of roomImages) {
      const imgObj = img as Record<string, unknown> | string | null;
      const url = String(typeof imgObj === "string" ? imgObj : (imgObj as Record<string, unknown>)?.url ?? "");
      if (url.startsWith("http")) {
        issues.push(...checkImageUrl(url, "room_image"));
      }
    }
  }

  const hasCritical = issues.some(i => i.severity === "critical");
  const hasHigh = issues.some(i => i.severity === "high");

  let action: "allow" | "flag" | "block" = "allow";
  if (hasCritical) action = "block";
  else if (hasHigh || issues.length >= 3) action = "flag";

  return {
    shopId: String(m.id),
    shopName: name,
    passed: action === "allow",
    issues,
    action,
  };
}

export async function runContentModeration(batchSize = 100): Promise<ModerationBatchReport> {
  // Scope to validated, pre-publish candidates only:
  //   gate_status=passed (passed all vertical gates) AND not yet published.
  //   Exclude records that have already been moderated (blocked or flagged).
  //   Include records with null pipeline_stage (newly validated, never staged).
  // This prevents the moderation stage from re-processing already-published
  // inventory or out-of-flow records.
  const { data: merchants } = await db
    .from("seed_merchants")
    .select("id, name, description, category, cover_image_url, cover_image, logo_url, logo_image, banner_url, menu_items_json, rooms_json, vertical, pipeline_stage, is_published")
    .eq("gate_status", "passed")
    .eq("is_published", false)
    .or("pipeline_stage.is.null,pipeline_stage.not.in.(moderation_blocked,moderation_flagged,moderation_passed,published,blocked_quality_gate,auto_unpublished_stale)")
    .eq("is_active", true)
    .limit(batchSize);

  if (!merchants || merchants.length === 0) {
    return { status: "completed", results: [], allowed: 0, flagged: 0, blocked: 0, processed: 0 };
  }

  const results: ModerationResult[] = [];
  let allowed = 0;
  let flagged = 0;
  let blocked = 0;
  const now = new Date().toISOString();

  for (const m of merchants) {
    const result = moderateMerchant(m as Record<string, unknown>);
    results.push(result);

    try {
      if (result.action === "block") {
        const blockingReason = result.issues.map(i => i.issue).slice(0, 3).join(", ");
        const { error: blockErr } = await db("seed_merchants")
          .update({
            is_published: false,
            gate_status: "failed",
            blocking_reason: `moderation_blocked: ${blockingReason}`,
            pipeline_stage: "moderation_blocked",
            updated_at: now,
          })
          .eq("id", m.id);
        if (blockErr) throw blockErr;
        blocked++;
      } else if (result.action === "flag") {
        const { error: flagErr } = await db("seed_merchants")
          .update({
            gate_status: "review",
            blocking_reason: "moderation_flagged_for_review",
            pipeline_stage: "moderation_flagged",
            updated_at: now,
          })
          .eq("id", m.id);
        if (flagErr) throw flagErr;
        flagged++;
      } else {
        // Allow: advance pipeline_stage so this record isn't re-scanned next run
        const { error: allowErr } = await db("seed_merchants")
          .update({ pipeline_stage: "moderation_passed", updated_at: now })
          .eq("id", m.id);
        if (allowErr) throw allowErr;
        allowed++;
      }
    } catch (err) {
      // DB write failed: for block/flag, this is a critical enforcement failure.
      // Fail closed — treat as blocked so the record is not inadvertently allowed.
      console.error(`[content-moderation] DB write failed for ${m.id}:`, err);
      if (result.action === "allow") {
        // Allowed record whose stage advance failed — it will be re-processed next run.
        allowed++;
      } else {
        // Block/flag write failed — fail closed: treat as blocked.
        blocked++;
      }
    }
  }

  console.log(`[content-moderation] Processed ${merchants.length}: ${allowed} allowed, ${flagged} flagged, ${blocked} blocked`);

  return { status: "completed", results, allowed, flagged, blocked, processed: merchants.length };
}

/**
 * Check a single text string for moderation issues (utility for inline use).
 */
export function moderateText(text: string): { safe: boolean; issues: ModerationIssue[] } {
  const issues = checkText(text, "text");
  return { safe: issues.length === 0, issues };
}

/**
 * Check a single image URL for moderation issues.
 */
export function moderateImageUrl(url: string): { safe: boolean; issues: ModerationIssue[] } {
  const issues = checkImageUrl(url, "image");
  return { safe: issues.length === 0, issues };
}
