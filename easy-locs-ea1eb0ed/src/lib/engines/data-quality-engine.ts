import { db } from "@/services/db";

interface QualityDimension {
  dimension: string;
  score: number;
  issues: string[];
}

interface QualityResult {
  shopId: string;
  shopName: string;
  overallScore: number;
  grade: string;
  dimensions: QualityDimension[];
}

interface MerchantQualityRow {
  id: string;
  name: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  cover_image_url: string | null;
  logo_url: string | null;
  description: string | null;
  vertical: string | null;
  latitude: number | null;
  longitude: number | null;
  email: string | null;
}

function gradeFromScore(score: number): string {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 40) return "D";
  return "F";
}

export async function runDataQualityEngine(batchSize = 100) {
  const { data: merchants } = await db
    .from("seed_merchants")
    .select("id, name, address, phone, website, cover_image_url, logo_url, description, vertical, latitude, longitude, email")
    .limit(batchSize);

  if (!merchants || merchants.length === 0) {
    return { status: "completed", results: [], scanned: 0 };
  }

  const results: QualityResult[] = [];

  for (const row of merchants) {
    const m = row as unknown as MerchantQualityRow;
    const dims: QualityDimension[] = [];

    const identity: QualityDimension = { dimension: "identity", score: 0, issues: [] };
    if (m.name && m.name.trim().length >= 2) identity.score += 50;
    else identity.issues.push("missing_or_short_name");
    if (m.vertical) identity.score += 30;
    else identity.issues.push("no_vertical");
    if (m.description && m.description.length > 10) identity.score += 20;
    else identity.issues.push("weak_description");
    dims.push(identity);

    const contact: QualityDimension = { dimension: "contact", score: 0, issues: [] };
    if (m.phone) contact.score += 40;
    else contact.issues.push("no_phone");
    if (m.address) contact.score += 40;
    else contact.issues.push("no_address");
    if (m.email || m.website) contact.score += 20;
    else contact.issues.push("no_email_or_website");
    dims.push(contact);

    const geo: QualityDimension = { dimension: "geo", score: 0, issues: [] };
    if (m.address) geo.score += 50;
    else geo.issues.push("no_address");
    if (m.latitude && m.longitude) geo.score += 50;
    else geo.issues.push("no_coordinates");
    dims.push(geo);

    const visuals: QualityDimension = { dimension: "visuals", score: 0, issues: [] };
    if (m.cover_image_url) visuals.score += 50;
    else visuals.issues.push("no_cover_image");
    if (m.logo_url) visuals.score += 50;
    else visuals.issues.push("no_logo");
    dims.push(visuals);

    const content: QualityDimension = { dimension: "content", score: 0, issues: [] };
    if (m.description && m.description.length > 50) content.score += 50;
    else if (m.description && m.description.length > 10) content.score += 25;
    else content.issues.push("weak_content");
    if (m.website) content.score += 25;
    if (m.name && !/^[A-Z\s]+$/.test(m.name) && !/^[a-z\s]+$/.test(m.name)) content.score += 25;
    else content.issues.push("name_casing_issue");
    dims.push(content);

    const overallScore = Math.round(dims.reduce((s, d) => s + d.score, 0) / dims.length);

    results.push({
      shopId: m.id,
      shopName: m.name ?? "",
      overallScore,
      grade: gradeFromScore(overallScore),
      dimensions: dims,
    });
  }

  return { status: "completed", results, scanned: results.length };
}
