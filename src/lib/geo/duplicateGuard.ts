/**
 * duplicateGuard — Enforces duplicate detection in real create flows.
 * Wraps the duplicateDetector for use in onboarding, business creation, listing creation.
 */
import { supabase } from "@/integrations/supabase/client";
import { detectDuplicate, type DuplicateCandidate, type DuplicateResult } from "./duplicateDetector";

const db = supabase as any;

export interface DuplicateCheckResult {
  blocked: boolean;
  result: DuplicateResult;
  existingMatch?: { id: string; name: string };
}

/** Check for duplicate storefronts before creation */
export async function checkStorefrontDuplicate(
  name: string,
  lat: number | null,
  lng: number | null,
  phone?: string | null,
  excludeId?: string
): Promise<DuplicateCheckResult> {
  const { data: existing } = await db
    .from("storefront_pages")
    .select("id, name, latitude, longitude, phone")
    .limit(200);

  if (!existing?.length) return { blocked: false, result: { isDuplicate: false, score: 0, matchedId: null, reasons: [] } };

  const candidates: DuplicateCandidate[] = existing.map((e: any) => ({
    id: e.id,
    name: e.name || "",
    lat: e.latitude,
    lng: e.longitude,
    phone: e.phone,
  }));

  const candidate: DuplicateCandidate = {
    id: excludeId || "new",
    name,
    lat,
    lng,
    phone,
  };

  const result = detectDuplicate(candidate, candidates);

  if (result.isDuplicate && result.matchedId) {
    const match = existing.find((e: any) => e.id === result.matchedId);
    return {
      blocked: true,
      result,
      existingMatch: match ? { id: match.id, name: match.name } : undefined,
    };
  }

  return { blocked: false, result };
}

/** Check for duplicate listings before creation */
export async function checkListingDuplicate(
  title: string,
  lat: number | null,
  lng: number | null,
  table = "public_listings"
): Promise<DuplicateCheckResult> {
  const { data: existing } = await db
    .from(table)
    .select("id, title, latitude, longitude")
    .limit(200);

  if (!existing?.length) return { blocked: false, result: { isDuplicate: false, score: 0, matchedId: null, reasons: [] } };

  const candidates: DuplicateCandidate[] = existing.map((e: any) => ({
    id: e.id,
    name: e.title || "",
    lat: e.latitude,
    lng: e.longitude,
  }));

  const candidate: DuplicateCandidate = { id: "new", name: title, lat, lng };
  const result = detectDuplicate(candidate, candidates);

  if (result.isDuplicate && result.matchedId) {
    const match = existing.find((e: any) => e.id === result.matchedId);
    return {
      blocked: true,
      result,
      existingMatch: match ? { id: match.id, name: match.title } : undefined,
    };
  }

  return { blocked: false, result };
}

/** Check for duplicate services before creation */
export async function checkServiceDuplicate(
  title: string,
  lat: number | null,
  lng: number | null,
  phone?: string | null
): Promise<DuplicateCheckResult> {
  const { data: existing } = await db
    .from("marketplace_services")
    .select("id, title, latitude, longitude, phone")
    .limit(200);

  if (!existing?.length) return { blocked: false, result: { isDuplicate: false, score: 0, matchedId: null, reasons: [] } };

  const candidates: DuplicateCandidate[] = existing.map((e: any) => ({
    id: e.id,
    name: e.title || "",
    lat: e.latitude,
    lng: e.longitude,
    phone: e.phone,
  }));

  const candidate: DuplicateCandidate = { id: "new", name: title, lat, lng, phone };
  const result = detectDuplicate(candidate, candidates);

  if (result.isDuplicate && result.matchedId) {
    const match = existing.find((e: any) => e.id === result.matchedId);
    return {
      blocked: true,
      result,
      existingMatch: match ? { id: match.id, name: match.title } : undefined,
    };
  }

  return { blocked: false, result };
}
