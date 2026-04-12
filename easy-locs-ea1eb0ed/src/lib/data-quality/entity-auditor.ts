import type {
  EntityClassification,
  EntityFinding,
  EntityIssue,
  IssueSeverity,
  RemediationEntry,
} from "./types";
import { quarantineEntity, isQuarantined } from "./quarantine";
import { CATEGORY_TREE } from "@/lib/taxonomy/category-tree";
import { CANONICAL_VERTICALS, isCanonicalVertical } from "@/domains/shared/canonical-types";
import { FALLBACK_STORIES } from "@/data/fallback-stories";
import { FALLBACK_PROPERTIES } from "@/data/fallback-properties";
import { FALLBACK_HOTELS } from "@/data/fallback-hotels";
import { FALLBACK_RESTAURANTS, FALLBACK_MENUS } from "@/data/fallback-restaurants";
import { FALLBACK_SHOPS, FALLBACK_GROCERY } from "@/data/fallback-shops";
import { FALLBACK_SERVICES, FALLBACK_SERVICE_ITEMS } from "@/data/fallback-services";

const verticalSubcategoryMap = new Map<string, Set<string>>();
const verticalCategoryMap = new Map<string, string>();

for (const cat of CATEGORY_TREE) {
  verticalCategoryMap.set(cat.key, cat.vertical);
  const existing = verticalSubcategoryMap.get(cat.vertical) ?? new Set<string>();
  for (const sub of cat.subcategories) {
    existing.add(sub.value);
  }
  verticalSubcategoryMap.set(cat.vertical, existing);
}

const VERTICAL_ALLOWED_ENTITY_TYPES: Record<string, string[]> = {
  property: ["property"],
  stay: ["stay"],
  food: ["merchant", "product"],
  grocery: ["merchant", "product"],
  utility: ["atm", "fuel", "service", "parking", "pharmacy", "hospital"],
  mobility: ["driver", "fleet", "vehicle"],
  shops: ["merchant", "product"],
  services: ["merchant", "provider"],
  healthcare: ["merchant", "service"],
  experiences: ["merchant", "service"],
  hotel: ["stay"],
  beauty: ["merchant", "provider"],
  education: ["merchant", "provider"],
  retail: ["merchant", "product"],
  ride: ["driver", "fleet", "vehicle"],
  delivery: ["driver", "fleet"],
  finance: ["service"],
  service: ["merchant", "provider"],
  flight: ["flight"],
  events: ["merchant", "service"],
};

function issue(
  category: EntityIssue["category"],
  severity: IssueSeverity,
  code: string,
  message: string,
  field?: string,
  expected?: string,
  actual?: string
): EntityIssue {
  return { category, severity, code, message, field, expected, actual };
}

function classifyFromIssues(issues: EntityIssue[]): EntityClassification {
  if (issues.length === 0) return "VALID";

  const hasCritical = issues.some((i) => i.severity === "critical");
  const hasHigh = issues.some((i) => i.severity === "high");
  const hasCrossVertical = issues.some((i) => i.category === "cross_vertical");
  const hasBrokenMedia = issues.some((i) => i.code === "BROKEN_MEDIA" || i.code === "MISSING_MEDIA");
  const hasBrokenRef = issues.some((i) => i.category === "reference_integrity" && i.severity === "critical");
  const hasIncomplete = issues.some((i) => i.code === "MISSING_REQUIRED_FIELD");
  const hasMisclassified = issues.some(
    (i) => i.code === "WRONG_VERTICAL" || i.code === "INVALID_SUBCATEGORY" || i.code === "ENTITY_TYPE_MISMATCH"
  );

  if (hasCrossVertical) return "CROSS_VERTICAL_CONTAMINATION";
  if (hasBrokenMedia && hasCritical) return "BROKEN_MEDIA";
  if (hasBrokenRef) return "BROKEN_REFERENCE";
  if (hasMisclassified) return "MISCLASSIFIED";
  if (hasIncomplete && hasCritical) return "INCOMPLETE";
  if (hasCritical) return "INVALID";
  if (hasHigh) return "SUSPICIOUS";
  return "VALID_WITH_WARNINGS";
}

const seenIds = new Map<string, string>();
const seenSlugs = new Map<string, string>();
const seenTitles = new Map<string, string[]>();

function checkDuplicates(
  entityId: string,
  source: string,
  slug?: string,
  title?: string
): EntityIssue[] {
  const issues: EntityIssue[] = [];

  const existingSource = seenIds.get(entityId);
  if (existingSource && existingSource !== source) {
    issues.push(
      issue("uniqueness", "high", "DUPLICATE_ID", `Duplicate entity ID "${entityId}" also in ${existingSource}`, "id")
    );
  }
  seenIds.set(entityId, source);

  if (slug) {
    const existingSlug = seenSlugs.get(slug);
    if (existingSlug && existingSlug !== entityId) {
      issues.push(
        issue("uniqueness", "medium", "DUPLICATE_SLUG", `Duplicate slug "${slug}" shared with ${existingSlug}`, "slug")
      );
    }
    seenSlugs.set(slug, entityId);
  }

  if (title) {
    const norm = title.toLowerCase().trim();
    const existing = seenTitles.get(norm) ?? [];
    if (existing.length > 0 && !existing.includes(entityId)) {
      issues.push(
        issue(
          "uniqueness",
          "low",
          "NEAR_DUPLICATE_TITLE",
          `Near-duplicate title "${title}" shared with [${existing.join(", ")}]`,
          "title"
        )
      );
    }
    existing.push(entityId);
    seenTitles.set(norm, existing);
  }

  return issues;
}

function validateVertical(vertical: string): EntityIssue[] {
  const issues: EntityIssue[] = [];
  if (!vertical) {
    issues.push(issue("vertical_integrity", "critical", "MISSING_VERTICAL", "No vertical assigned", "vertical"));
  } else if (!isCanonicalVertical(vertical)) {
    const closest = CANONICAL_VERTICALS.find(
      (v) => v.startsWith(vertical.slice(0, 3)) || vertical.startsWith(v.slice(0, 3))
    );
    issues.push(
      issue(
        "vertical_integrity",
        "critical",
        "WRONG_VERTICAL",
        `Vertical "${vertical}" is not canonical`,
        "vertical",
        `One of: ${CANONICAL_VERTICALS.join(", ")}`,
        vertical
      )
    );
    if (closest) {
      issues[issues.length - 1].message += ` (did you mean "${closest}"?)`;
    }
  }
  return issues;
}

function validateSubcategory(vertical: string, subcategory: string): EntityIssue[] {
  const issues: EntityIssue[] = [];
  if (!subcategory) {
    issues.push(
      issue("taxonomy_integrity", "medium", "MISSING_SUBCATEGORY", "No subcategory assigned", "subcategory")
    );
    return issues;
  }

  const allowedSubs = verticalSubcategoryMap.get(vertical);
  if (allowedSubs && !allowedSubs.has(subcategory)) {
    const allSubs = Array.from(allowedSubs);
    const closest = allSubs.find(
      (s) => s.includes(subcategory) || subcategory.includes(s)
    );
    issues.push(
      issue(
        "taxonomy_integrity",
        "high",
        "INVALID_SUBCATEGORY",
        `Subcategory "${subcategory}" not valid for vertical "${vertical}"`,
        "subcategory",
        `One of: ${allSubs.slice(0, 10).join(", ")}${allSubs.length > 10 ? "..." : ""}`,
        subcategory
      )
    );
    if (closest) {
      issues[issues.length - 1].message += ` (closest match: "${closest}")`;
    }
  }
  return issues;
}

function validateEntityType(vertical: string, entityType: string): EntityIssue[] {
  const issues: EntityIssue[] = [];
  if (!entityType) {
    issues.push(
      issue("taxonomy_integrity", "high", "MISSING_ENTITY_TYPE", "No entity type specified", "entityType")
    );
    return issues;
  }

  const allowed = VERTICAL_ALLOWED_ENTITY_TYPES[vertical];
  if (allowed && !allowed.includes(entityType)) {
    issues.push(
      issue(
        "cross_vertical",
        "critical",
        "ENTITY_TYPE_MISMATCH",
        `Entity type "${entityType}" not allowed in vertical "${vertical}" (allowed: ${allowed.join(", ")})`,
        "entityType",
        allowed.join(", "),
        entityType
      )
    );
  }
  return issues;
}

function validateMedia(mediaUrl: string | undefined, entityTitle: string): EntityIssue[] {
  const issues: EntityIssue[] = [];

  if (!mediaUrl || mediaUrl.trim() === "") {
    issues.push(issue("media_integrity", "critical", "MISSING_MEDIA", "No media URL assigned", "mediaUrl"));
    return issues;
  }

  if (mediaUrl.includes("placeholder") || mediaUrl.includes("dummy") || mediaUrl.includes("lorem")) {
    issues.push(
      issue("media_integrity", "high", "PLACEHOLDER_MEDIA", "Placeholder/dummy media detected", "mediaUrl")
    );
  }

  if (mediaUrl.startsWith("data:image/svg+xml")) {
    return issues;
  }

  if (!mediaUrl.startsWith("http") && !mediaUrl.startsWith("data:") && !mediaUrl.startsWith("/")) {
    issues.push(
      issue("media_integrity", "high", "INVALID_MEDIA_URL", `Media URL format invalid: "${mediaUrl.slice(0, 50)}"`, "mediaUrl")
    );
  }

  return issues;
}

function validateFieldCompleteness(
  fields: Record<string, unknown>,
  required: string[],
  entityId: string
): EntityIssue[] {
  const issues: EntityIssue[] = [];
  for (const field of required) {
    const val = fields[field];
    if (val === undefined || val === null || val === "") {
      issues.push(
        issue(
          "field_completeness",
          "critical",
          "MISSING_REQUIRED_FIELD",
          `Required field "${field}" is missing or empty`,
          field
        )
      );
    }
  }
  return issues;
}

function validateCoordinates(lat: number | undefined, lng: number | undefined): EntityIssue[] {
  const issues: EntityIssue[] = [];
  if (lat === undefined || lng === undefined) {
    issues.push(
      issue("field_completeness", "medium", "MISSING_COORDINATES", "Coordinates missing", "latitude/longitude")
    );
    return issues;
  }
  if (lat < -90 || lat > 90) {
    issues.push(
      issue("field_completeness", "critical", "INVALID_LATITUDE", `Latitude ${lat} out of range [-90, 90]`, "latitude")
    );
  }
  if (lng < -180 || lng > 180) {
    issues.push(
      issue("field_completeness", "critical", "INVALID_LONGITUDE", `Longitude ${lng} out of range [-180, 180]`, "longitude")
    );
  }
  return issues;
}

export function resetAuditState(): void {
  seenIds.clear();
  seenSlugs.clear();
  seenTitles.clear();
}

export interface AuditResult {
  findings: EntityFinding[];
  remediations: RemediationEntry[];
}

export function auditAllEntities(): AuditResult {
  resetAuditState();
  const findings: EntityFinding[] = [];
  const remediations: RemediationEntry[] = [];
  const now = new Date().toISOString();

  for (const story of FALLBACK_STORIES) {
    const issues: EntityIssue[] = [];
    issues.push(...validateVertical(story.vertical));
    issues.push(...validateSubcategory(story.vertical, story.subcategoryKey));
    issues.push(...validateEntityType(story.vertical, story.entityType));
    issues.push(...validateMedia(story.mediaUrl, story.title));
    issues.push(...checkDuplicates(story.id, "FALLBACK_STORIES", undefined, story.title));
    issues.push(
      ...validateFieldCompleteness(
        { id: story.id, title: story.title, vertical: story.vertical, mediaUrl: story.mediaUrl, entityId: story.entityId },
        ["id", "title", "vertical", "mediaUrl", "entityId"],
        story.id
      )
    );

    if (story.vertical !== story.categoryKey && story.storyType !== "deal") {
      issues.push(
        issue(
          "taxonomy_integrity",
          "high",
          "CATEGORY_VERTICAL_MISMATCH",
          `categoryKey "${story.categoryKey}" does not match vertical "${story.vertical}"`,
          "categoryKey",
          story.vertical,
          story.categoryKey
        )
      );
    }

    const classification = classifyFromIssues(issues);
    const finding: EntityFinding = {
      entityId: story.id,
      source: "FALLBACK_STORIES",
      vertical: story.vertical,
      category: story.categoryKey,
      subcategory: story.subcategoryKey,
      entityType: story.entityType,
      title: story.title,
      mediaSummary: story.mediaUrl ? (story.mediaUrl.startsWith("data:") ? "SVG data URI" : story.mediaUrl.slice(0, 80)) : "NONE",
      classification,
      issues,
    };
    findings.push(finding);

    if (shouldQuarantine(classification)) {
      quarantineEntity({
        entityId: story.id,
        source: "FALLBACK_STORIES",
        vertical: story.vertical,
        title: story.title,
        classification,
        reasonCodes: issues.filter((i) => i.severity === "critical" || i.severity === "high").map((i) => i.code),
        quarantinedAt: now,
        reviewable: true,
      });
    }
  }

  for (const prop of FALLBACK_PROPERTIES) {
    const issues: EntityIssue[] = [];
    issues.push(...validateVertical(prop.vertical));
    issues.push(...validateSubcategory(prop.vertical, prop.subcategory));
    issues.push(...validateMedia(prop.image, prop.title));
    issues.push(...validateCoordinates(prop.latitude, prop.longitude));
    issues.push(...checkDuplicates(prop.id, "FALLBACK_PROPERTIES", prop.slug, prop.title));
    issues.push(
      ...validateFieldCompleteness(
        { id: prop.id, title: prop.title, vertical: prop.vertical, image: prop.image, city: prop.city, currency: prop.currency },
        ["id", "title", "vertical", "image", "city", "currency"],
        prop.id
      )
    );

    const classification = classifyFromIssues(issues);
    findings.push({
      entityId: prop.id,
      source: "FALLBACK_PROPERTIES",
      vertical: prop.vertical,
      category: "property",
      subcategory: prop.subcategory,
      entityType: "property",
      title: prop.title,
      mediaSummary: prop.image ? (prop.image.startsWith("data:") ? "SVG data URI" : prop.image.slice(0, 80)) : "NONE",
      classification,
      issues,
    });

    if (shouldQuarantine(classification)) {
      quarantineEntity({
        entityId: prop.id,
        source: "FALLBACK_PROPERTIES",
        vertical: prop.vertical,
        title: prop.title,
        classification,
        reasonCodes: issues.filter((i) => i.severity === "critical" || i.severity === "high").map((i) => i.code),
        quarantinedAt: now,
        reviewable: true,
      });
    }
  }

  for (const hotel of FALLBACK_HOTELS) {
    const issues: EntityIssue[] = [];
    const hotelVertical = hotel.vertical === "hotel" || hotel.vertical === "stay" ? "stay" : hotel.vertical;

    if (hotel.vertical !== "stay" && hotel.vertical !== "hotel") {
      issues.push(
        issue(
          "vertical_integrity",
          "high",
          "WRONG_VERTICAL",
          `Hotel "${hotel.name}" has vertical "${hotel.vertical}" instead of "stay"`,
          "vertical",
          "stay",
          hotel.vertical
        )
      );
    }

    issues.push(...validateSubcategory("stay", hotel.subcategory));
    issues.push(...validateMedia(hotel.banner_url, hotel.name));
    issues.push(...validateCoordinates(hotel.latitude, hotel.longitude));
    issues.push(...checkDuplicates(hotel.id, "FALLBACK_HOTELS", hotel.slug, hotel.name));
    issues.push(
      ...validateFieldCompleteness(
        { id: hotel.id, name: hotel.name, vertical: hotel.vertical, banner_url: hotel.banner_url, city: hotel.city, currency: hotel.currency },
        ["id", "name", "vertical", "banner_url", "city", "currency"],
        hotel.id
      )
    );

    for (const room of hotel.room_types) {
      if (room.hotel_id !== hotel.id) {
        issues.push(
          issue(
            "reference_integrity",
            "critical",
            "BROKEN_ROOM_REFERENCE",
            `Room "${room.name}" references hotel_id "${room.hotel_id}" but belongs to "${hotel.id}"`,
            "room.hotel_id",
            hotel.id,
            room.hotel_id
          )
        );
      }
      if (!room.image) {
        issues.push(
          issue("media_integrity", "medium", "MISSING_ROOM_MEDIA", `Room "${room.name}" has no image`, "room.image")
        );
      }
    }

    if (hotel.vertical === "hotel" && hotel.vertical !== "stay") {
      remediations.push({
        entityId: hotel.id,
        source: "FALLBACK_HOTELS",
        action: "auto_fixed",
        field: "vertical",
        beforeState: hotel.vertical,
        afterState: "stay",
        reason: "Hotel vertical should be 'stay' per canonical taxonomy",
        confidence: "high",
        timestamp: now,
      });
    }

    const classification = classifyFromIssues(issues);
    findings.push({
      entityId: hotel.id,
      source: "FALLBACK_HOTELS",
      vertical: hotelVertical,
      category: hotel.category,
      subcategory: hotel.subcategory,
      entityType: "stay",
      title: hotel.name,
      mediaSummary: hotel.banner_url
        ? hotel.banner_url.startsWith("data:") ? "SVG data URI" : hotel.banner_url.slice(0, 80)
        : "NONE",
      classification,
      issues,
    });

    if (shouldQuarantine(classification)) {
      quarantineEntity({
        entityId: hotel.id,
        source: "FALLBACK_HOTELS",
        vertical: hotelVertical,
        title: hotel.name,
        classification,
        reasonCodes: issues.filter((i) => i.severity === "critical" || i.severity === "high").map((i) => i.code),
        quarantinedAt: now,
        reviewable: true,
      });
    }
  }

  for (const rest of FALLBACK_RESTAURANTS) {
    const issues: EntityIssue[] = [];
    issues.push(...validateVertical(rest.vertical));
    issues.push(...validateSubcategory(rest.vertical, rest.subcategory));
    issues.push(...validateMedia(rest.banner_url, rest.name));
    issues.push(...validateMedia(rest.logo_url, rest.name + " logo"));
    issues.push(...validateCoordinates(rest.latitude, rest.longitude));
    issues.push(...checkDuplicates(rest.id, "FALLBACK_RESTAURANTS", rest.slug, rest.name));
    issues.push(
      ...validateFieldCompleteness(
        { id: rest.id, name: rest.name, vertical: rest.vertical, banner_url: rest.banner_url, city: rest.city, currency: rest.currency },
        ["id", "name", "vertical", "banner_url", "city", "currency"],
        rest.id
      )
    );

    const menuItems = FALLBACK_MENUS[rest.id];
    if (!menuItems || menuItems.length === 0) {
      issues.push(
        issue(
          "reference_integrity",
          "medium",
          "NO_MENU_ITEMS",
          `Restaurant "${rest.name}" has no menu items`,
          "menu"
        )
      );
    } else {
      for (const item of menuItems) {
        if (item.shop_id !== rest.id) {
          issues.push(
            issue(
              "reference_integrity",
              "critical",
              "BROKEN_MENU_REFERENCE",
              `Menu item "${item.name}" references shop_id "${item.shop_id}" but restaurant is "${rest.id}"`,
              "menuItem.shop_id",
              rest.id,
              item.shop_id
            )
          );
        }
      }
    }

    const classification = classifyFromIssues(issues);
    findings.push({
      entityId: rest.id,
      source: "FALLBACK_RESTAURANTS",
      vertical: rest.vertical,
      category: rest.category,
      subcategory: rest.subcategory,
      entityType: "merchant",
      title: rest.name,
      mediaSummary: rest.banner_url
        ? rest.banner_url.startsWith("data:") ? "SVG data URI" : rest.banner_url.slice(0, 80)
        : "NONE",
      classification,
      issues,
    });

    if (shouldQuarantine(classification)) {
      quarantineEntity({
        entityId: rest.id,
        source: "FALLBACK_RESTAURANTS",
        vertical: rest.vertical,
        title: rest.name,
        classification,
        reasonCodes: issues.filter((i) => i.severity === "critical" || i.severity === "high").map((i) => i.code),
        quarantinedAt: now,
        reviewable: true,
      });
    }
  }

  auditShopLikeEntities(FALLBACK_SHOPS, "FALLBACK_SHOPS", "shops", findings, remediations);
  auditShopLikeEntities(FALLBACK_GROCERY, "FALLBACK_GROCERY", "grocery", findings, remediations);

  for (const svc of FALLBACK_SERVICES) {
    const issues: EntityIssue[] = [];
    issues.push(...validateVertical(svc.vertical));
    issues.push(...validateSubcategory(svc.vertical, svc.subcategory));
    issues.push(...validateMedia(svc.banner_url, svc.name));
    issues.push(...validateMedia(svc.logo_url, svc.name + " logo"));
    issues.push(...validateCoordinates(svc.latitude, svc.longitude));
    issues.push(...checkDuplicates(svc.id, "FALLBACK_SERVICES", svc.slug, svc.name));
    issues.push(
      ...validateFieldCompleteness(
        { id: svc.id, name: svc.name, vertical: svc.vertical, banner_url: svc.banner_url, city: svc.city, currency: svc.currency },
        ["id", "name", "vertical", "banner_url", "city", "currency"],
        svc.id
      )
    );

    const svcItems = FALLBACK_SERVICE_ITEMS.filter((i) => i.provider_id === svc.id);
    if (svcItems.length === 0) {
      issues.push(
        issue("reference_integrity", "medium", "NO_SERVICE_ITEMS", `Provider "${svc.name}" has no service items`, "serviceItems")
      );
    }

    const classification = classifyFromIssues(issues);
    findings.push({
      entityId: svc.id,
      source: "FALLBACK_SERVICES",
      vertical: svc.vertical,
      category: svc.category,
      subcategory: svc.subcategory,
      entityType: "provider",
      title: svc.name,
      mediaSummary: svc.banner_url
        ? svc.banner_url.startsWith("data:") ? "SVG data URI" : svc.banner_url.slice(0, 80)
        : "NONE",
      classification,
      issues,
    });

    if (shouldQuarantine(classification)) {
      quarantineEntity({
        entityId: svc.id,
        source: "FALLBACK_SERVICES",
        vertical: svc.vertical,
        title: svc.name,
        classification,
        reasonCodes: issues.filter((i) => i.severity === "critical" || i.severity === "high").map((i) => i.code),
        quarantinedAt: now,
        reviewable: true,
      });
    }
  }

  for (const item of FALLBACK_SERVICE_ITEMS) {
    const parentExists = FALLBACK_SERVICES.some((s) => s.id === item.provider_id);
    if (!parentExists) {
      const issues: EntityIssue[] = [
        issue(
          "reference_integrity",
          "critical",
          "ORPHAN_SERVICE_ITEM",
          `Service item "${item.name}" references provider "${item.provider_id}" which does not exist`,
          "provider_id"
        ),
      ];
      findings.push({
        entityId: item.id,
        source: "FALLBACK_SERVICE_ITEMS",
        vertical: "services",
        category: item.category,
        subcategory: "",
        entityType: "service_item",
        title: item.name,
        mediaSummary: item.image ? (item.image.startsWith("data:") ? "SVG data URI" : item.image.slice(0, 80)) : "NONE",
        classification: "ORPHAN",
        issues,
      });
    }
  }

  return { findings, remediations };
}

function auditShopLikeEntities(
  entities: Array<{
    id: string;
    name: string;
    slug: string;
    vertical: string;
    category: string;
    subcategory: string;
    banner_url: string;
    logo_url: string;
    latitude: number;
    longitude: number;
    rating: number;
    city?: string;
    address?: string;
  }>,
  sourceName: string,
  expectedVertical: string,
  findings: EntityFinding[],
  remediations: RemediationEntry[]
): void {
  const now = new Date().toISOString();

  for (const entity of entities) {
    const issues: EntityIssue[] = [];
    issues.push(...validateVertical(entity.vertical));

    if (entity.vertical !== expectedVertical) {
      issues.push(
        issue(
          "vertical_integrity",
          "high",
          "WRONG_VERTICAL",
          `Entity "${entity.name}" in ${sourceName} has vertical "${entity.vertical}" instead of "${expectedVertical}"`,
          "vertical",
          expectedVertical,
          entity.vertical
        )
      );
    }

    issues.push(...validateSubcategory(entity.vertical, entity.subcategory));
    issues.push(...validateMedia(entity.banner_url, entity.name));
    issues.push(...validateMedia(entity.logo_url, entity.name + " logo"));
    issues.push(...validateCoordinates(entity.latitude, entity.longitude));
    issues.push(...checkDuplicates(entity.id, sourceName, entity.slug, entity.name));
    issues.push(
      ...validateFieldCompleteness(
        { id: entity.id, name: entity.name, vertical: entity.vertical, banner_url: entity.banner_url },
        ["id", "name", "vertical", "banner_url"],
        entity.id
      )
    );

    if (entity.rating !== undefined && (entity.rating < 0 || entity.rating > 5)) {
      issues.push(
        issue("field_completeness", "medium", "INVALID_RATING", `Rating ${entity.rating} out of range [0, 5]`, "rating")
      );
    }

    const classification = classifyFromIssues(issues);
    findings.push({
      entityId: entity.id,
      source: sourceName,
      vertical: entity.vertical,
      category: entity.category,
      subcategory: entity.subcategory,
      entityType: "merchant",
      title: entity.name,
      mediaSummary: entity.banner_url
        ? entity.banner_url.startsWith("data:") ? "SVG data URI" : entity.banner_url.slice(0, 80)
        : "NONE",
      classification,
      issues,
    });

    if (shouldQuarantine(classification)) {
      quarantineEntity({
        entityId: entity.id,
        source: sourceName,
        vertical: entity.vertical,
        title: entity.name,
        classification,
        reasonCodes: issues.filter((i) => i.severity === "critical" || i.severity === "high").map((i) => i.code),
        quarantinedAt: now,
        reviewable: true,
      });
    }
  }
}

function shouldQuarantine(classification: EntityClassification): boolean {
  return [
    "INVALID",
    "CROSS_VERTICAL_CONTAMINATION",
    "BROKEN_MEDIA",
    "BROKEN_REFERENCE",
    "ORPHAN",
  ].includes(classification);
}
