import { BaseEngine, type EngineTickResult } from "../core/base-engine";
import {
  toViolationVertical,
  type CanonicalBannerEntity,
  type CanonicalCountryContext,
  type GovernanceViolation,
} from "@/domains/shared/canonical-types";
import { persistViolation } from "@/services/governance/violation-persistence";

const bannerPool = new Map<string, CanonicalBannerEntity>();
const bannerViolations: GovernanceViolation[] = [];

const ISLAMIC_COUNTRIES = [
  "AE", "SA", "KW", "QA", "BH", "OM", "JO", "LB", "IQ", "PS",
  "EG", "LY", "TN", "DZ", "MA", "MR", "SD", "SO", "DJ", "KM",
  "TR", "MY", "ID", "BN", "PK", "BD", "AF",
];

const NATIONAL_EVENTS: Record<string, { month: number; day: number; label: string }[]> = {
  AE: [{ month: 12, day: 2, label: "UAE National Day" }],
  SA: [{ month: 9, day: 23, label: "Saudi National Day" }],
  MA: [{ month: 7, day: 30, label: "Morocco Throne Day" }],
  FR: [{ month: 7, day: 14, label: "Bastille Day" }],
  TR: [{ month: 10, day: 29, label: "Republic Day" }],
  EG: [{ month: 7, day: 23, label: "Revolution Day" }],
  TN: [{ month: 3, day: 20, label: "Independence Day" }],
  DZ: [{ month: 11, day: 1, label: "Revolution Day" }],
};

interface BannerContext {
  countryCode: string;
  city?: string;
  locale: string;
  vertical?: CanonicalVertical;
  category?: string;
  cuisine?: string;
  userType?: string;
  timeOfDay?: string;
  season?: string;
  dayOfWeek?: number;
}

function resolveSeason(countryCode: string): string {
  const month = new Date().getMonth() + 1;
  const southernHemisphere = ["AU", "NZ", "ZA", "AR", "CL", "BR"].includes(countryCode);

  if (southernHemisphere) {
    if (month >= 12 || month <= 2) return "summer";
    if (month >= 3 && month <= 5) return "autumn";
    if (month >= 6 && month <= 8) return "winter";
    return "spring";
  }

  if (month >= 12 || month <= 2) return "winter";
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  return "autumn";
}

function resolveTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour >= 4 && hour < 7) return "dawn";
  if (hour >= 7 && hour < 11) return "morning";
  if (hour >= 11 && hour < 14) return "lunch";
  if (hour >= 14 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 20) return "dinner";
  return "late_night";
}

function checkIslamicContext(countryCode: string): string[] {
  if (!ISLAMIC_COUNTRIES.includes(countryCode)) return [];
  const contexts: string[] = [];
  const day = new Date().getDay();
  if (day === 5) contexts.push("jummah");
  return contexts;
}

function checkNationalEvent(countryCode: string): string | null {
  const events = NATIONAL_EVENTS[countryCode];
  if (!events) return null;
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  for (const e of events) {
    if (e.month === month && Math.abs(e.day - day) <= 3) return e.label;
  }
  return null;
}

export function registerBanner(banner: CanonicalBannerEntity): void {
  bannerPool.set(banner.id, banner);
}

export function selectBanners(
  context: BannerContext,
  maxResults: number = 3
): CanonicalBannerEntity[] {
  const now = new Date();
  const season = context.season ?? resolveSeason(context.countryCode);
  const timeOfDay = context.timeOfDay ?? resolveTimeOfDay();
  const islamicContexts = checkIslamicContext(context.countryCode);
  const nationalEvent = checkNationalEvent(context.countryCode);

  const candidates: { banner: CanonicalBannerEntity; score: number }[] = [];

  for (const banner of bannerPool.values()) {
    const validFrom = new Date(banner.validFrom);
    const validTo = banner.validTo ? new Date(banner.validTo) : null;
    if (now < validFrom) continue;
    if (validTo && now > validTo) continue;

    let score = 0;

    if (banner.audienceDefinition.countries.length === 0 ||
        banner.audienceDefinition.countries.includes(context.countryCode)) {
      score += 30;
    } else {
      continue;
    }

    if (context.city && banner.audienceDefinition.cities.includes(context.city)) {
      score += 20;
    }

    if (context.vertical && banner.audienceDefinition.verticals.length > 0) {
      if (banner.audienceDefinition.verticals.includes(context.vertical)) {
        score += 25;
      } else {
        continue;
      }
    }

    if (banner.triggerConditions.seasons.includes(season)) score += 15;
    if (banner.triggerConditions.timeOfDay.includes(timeOfDay)) score += 10;
    if (context.cuisine && banner.triggerConditions.cuisines.includes(context.cuisine)) score += 15;

    for (const ic of islamicContexts) {
      if (banner.triggerConditions.religions.includes(ic)) score += 20;
    }

    if (nationalEvent && banner.triggerConditions.events.includes(nationalEvent)) {
      score += 25;
    }

    if (banner.exclusionConditions.some((exc) =>
      exc === context.countryCode || exc === context.vertical
    )) {
      continue;
    }

    const priorityBonus = { critical: 40, high: 20, medium: 10, low: 0 };
    score += priorityBonus[banner.priority];

    candidates.push({ banner, score });
  }

  candidates.sort((a, b) => b.score - a.score);

  return candidates.slice(0, maxResults).map((c) => c.banner);
}

export function validateBannerPlacement(
  banner: CanonicalBannerEntity,
  context: BannerContext
): { valid: boolean; violation: GovernanceViolation | null } {
  if (
    banner.audienceDefinition.countries.length > 0 &&
    !banner.audienceDefinition.countries.includes(context.countryCode)
  ) {
    const v: GovernanceViolation = {
      id: `banner-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: "banner_conflict",
      severity: "error",
      source: `banner:${banner.id}`,
      target: `country:${context.countryCode}`,
      message: `Banner "${banner.title}" not approved for country ${context.countryCode}`,
      ownerDomain: "platform",
      vertical: toViolationVertical(banner.vertical),
      detectedAt: new Date().toISOString(),
      resolvedAt: null,
      autoRemediated: false,
      metadata: { bannerId: banner.id, country: context.countryCode },
      engine: "banner-strategy",
      code: "BANNER_COUNTRY_MISMATCH",
      dedupKey: `banner:${banner.id}:${context.countryCode}`,
      status: "new",
    };
    bannerViolations.push(v);
    persistViolation(v);
    return { valid: false, violation: v };
  }

  return { valid: true, violation: null };
}

export function getBannerViolations(): GovernanceViolation[] {
  return [...bannerViolations];
}

export class BannerStrategyEngine extends BaseEngine {
  constructor() {
    super({
      id: "banner-strategy",
      name: "Banner Strategy Engine",
      category: "governance",
      intervalMs: 60_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const recent = bannerViolations.filter(
      (v) => Date.now() - new Date(v.detectedAt).getTime() < this.intervalMs
    );
    const expired: string[] = [];
    const now = new Date();

    for (const [id, banner] of bannerPool) {
      if (banner.validTo && new Date(banner.validTo) < now) {
        expired.push(id);
      }
    }
    for (const id of expired) {
      bannerPool.delete(id);
    }

    return {
      level: recent.length > 0 ? "detect" : "observe",
      findings: recent.length + expired.length,
      actions: [
        ...recent.map((v) => `BANNER_CONFLICT: ${v.message}`),
        ...expired.map((id) => `EXPIRED: ${id}`),
      ].slice(0, 5),
      duration: 0,
    };
  }
}
