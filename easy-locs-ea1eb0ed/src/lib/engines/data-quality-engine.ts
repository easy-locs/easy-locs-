import { normalizeSubcategory, normalizeVertical } from "@/lib/taxonomy/world-class-taxonomy";
import { resolveSubcategory } from "@/lib/taxonomy/category-tree";

export interface QualityDimension {
  name: string;
  score: number;
  maxScore: number;
  issues: string[];
}

export interface DataQualityReport {
  entityId: string;
  overallScore: number;
  grade: "A" | "B" | "C" | "D" | "F";
  dimensions: QualityDimension[];
  suggestions: string[];
  autoFixApplied: string[];
}

export interface EntityData {
  id: string;
  name?: string | null;
  vertical?: string | null;
  subcategory?: string | null;
  description?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  country_code?: string | null;
  city?: string | null;
  logo?: string | null;
  cover?: string | null;
  photos?: string[];
  tags?: string[];
  opening_hours?: Record<string, unknown> | null;
  menu_items_count?: number;
  catalog_items_count?: number;
  reviews_count?: number;
  avg_rating?: number | null;
}

function scoreIdentity(entity: EntityData): QualityDimension {
  let score = 0;
  const maxScore = 25;
  const issues: string[] = [];

  if (entity.name && entity.name.length >= 2) {
    score += 10;
    if (entity.name.length >= 5) score += 3;
  } else {
    issues.push("Name is missing or too short");
  }

  if (entity.vertical) {
    score += 4;
    const normalized = normalizeVertical(entity.vertical);
    if (normalized !== "services" || entity.vertical === "services") score += 1;
  } else {
    issues.push("No vertical assigned");
  }

  if (entity.subcategory) {
    score += 5;
    const norm = normalizeSubcategory(entity.subcategory);
    if (norm) {
      const resolved = resolveSubcategory(norm);
      if (resolved) score += 2;
    }
  } else {
    issues.push("No subcategory assigned");
  }

  return { name: "Identity", score: Math.min(score, maxScore), maxScore, issues };
}

function scoreContact(entity: EntityData): QualityDimension {
  let score = 0;
  const maxScore = 20;
  const issues: string[] = [];

  if (entity.phone) {
    score += 7;
    const cleanPhone = entity.phone.replace(/[^0-9+]/g, "");
    if (cleanPhone.length >= 7) score += 1;
  } else {
    issues.push("No phone number");
  }

  if (entity.email) {
    score += 4;
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(entity.email)) score += 1;
  }

  if (entity.website) {
    score += 4;
    try {
      new URL(entity.website.startsWith("http") ? entity.website : `https://${entity.website}`);
      score += 1;
    } catch { /* invalid URL */ }
  }

  if (entity.address && entity.address.length >= 5) {
    score += 3;
  } else {
    issues.push("No address or address too short");
  }

  return { name: "Contact", score: Math.min(score, maxScore), maxScore, issues };
}

function scoreGeo(entity: EntityData): QualityDimension {
  let score = 0;
  const maxScore = 20;
  const issues: string[] = [];

  if (entity.lat != null && entity.lng != null) {
    if (Math.abs(entity.lat) <= 90 && Math.abs(entity.lng) <= 180 && entity.lat !== 0 && entity.lng !== 0) {
      score += 10;
    } else {
      issues.push("Invalid or zero coordinates");
    }
  } else {
    issues.push("No GPS coordinates");
  }

  if (entity.country_code && entity.country_code.length === 2) score += 4;
  else issues.push("Missing or invalid country code");

  if (entity.city) score += 3;
  else issues.push("No city");

  if (entity.address && entity.address.length > 10) score += 3;

  return { name: "Geo", score: Math.min(score, maxScore), maxScore, issues };
}

function scoreVisuals(entity: EntityData): QualityDimension {
  let score = 0;
  const maxScore = 15;
  const issues: string[] = [];

  if (entity.logo) score += 5;
  else issues.push("No logo");

  if (entity.cover) score += 5;
  else issues.push("No cover image");

  const photoCount = entity.photos?.length ?? 0;
  if (photoCount >= 3) score += 5;
  else if (photoCount >= 1) score += 3;
  else issues.push("No photos");

  return { name: "Visuals", score: Math.min(score, maxScore), maxScore, issues };
}

function scoreContent(entity: EntityData): QualityDimension {
  let score = 0;
  const maxScore = 20;
  const issues: string[] = [];

  if (entity.description && entity.description.length >= 20) {
    score += 5;
    if (entity.description.length >= 100) score += 2;
  } else {
    issues.push("Description missing or too short (< 20 chars)");
  }

  if (entity.opening_hours) score += 3;
  else issues.push("No opening hours");

  const menuCount = entity.menu_items_count ?? 0;
  const catalogCount = entity.catalog_items_count ?? 0;
  if (menuCount > 0 || catalogCount > 0) {
    score += 4;
    if (menuCount >= 10 || catalogCount >= 10) score += 2;
  } else {
    issues.push("No menu or catalog items");
  }

  if (entity.tags && entity.tags.length >= 2) score += 2;
  else issues.push("No tags or too few tags");

  if (entity.reviews_count && entity.reviews_count > 0) score += 1;
  if (entity.avg_rating && entity.avg_rating >= 3.5) score += 1;

  return { name: "Content", score: Math.min(score, maxScore), maxScore, issues };
}

function computeGrade(score: number): "A" | "B" | "C" | "D" | "F" {
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 50) return "C";
  if (score >= 30) return "D";
  return "F";
}

export function assessEntityQuality(entity: EntityData): DataQualityReport {
  const dimensions = [
    scoreIdentity(entity),
    scoreContact(entity),
    scoreGeo(entity),
    scoreVisuals(entity),
    scoreContent(entity),
  ];

  const totalScore = dimensions.reduce((s, d) => s + d.score, 0);
  const totalMax = dimensions.reduce((s, d) => s + d.maxScore, 0);
  const overallScore = Math.round((totalScore / totalMax) * 100);
  const grade = computeGrade(overallScore);

  const suggestions: string[] = [];
  const autoFixApplied: string[] = [];

  for (const dim of dimensions) {
    for (const issue of dim.issues) {
      if (issue === "No vertical assigned" && entity.subcategory) {
        const norm = normalizeSubcategory(entity.subcategory);
        if (norm) {
          const resolved = resolveSubcategory(norm);
          if (resolved) {
            autoFixApplied.push(`Auto-set vertical to "${resolved.primary.vertical}" from subcategory`);
            continue;
          }
        }
      }
      suggestions.push(issue);
    }
  }

  return {
    entityId: entity.id,
    overallScore,
    grade,
    dimensions,
    suggestions,
    autoFixApplied,
  };
}

export function batchAssessQuality(entities: EntityData[]): {
  reports: DataQualityReport[];
  summary: {
    total: number;
    averageScore: number;
    gradeDistribution: Record<string, number>;
    topIssues: Array<{ issue: string; count: number }>;
  };
} {
  const reports = entities.map(assessEntityQuality);
  const total = reports.length;
  const averageScore = total > 0
    ? Math.round(reports.reduce((s, r) => s + r.overallScore, 0) / total)
    : 0;

  const gradeDistribution: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  const issueCounts = new Map<string, number>();

  for (const report of reports) {
    gradeDistribution[report.grade]++;
    for (const suggestion of report.suggestions) {
      issueCounts.set(suggestion, (issueCounts.get(suggestion) ?? 0) + 1);
    }
  }

  const topIssues = [...issueCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([issue, count]) => ({ issue, count }));

  return {
    reports,
    summary: { total, averageScore, gradeDistribution, topIssues },
  };
}
