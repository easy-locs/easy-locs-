/**
 * UNIFIED GLOBAL UX / UI / DIGITAL / LEAD / PAYMENT ENGINE
 * 
 * Central orchestrator connecting:
 * - UX/UI quality (layout, alignment, truncation, spacing)
 * - Digital content (banners, promotions, seasonal)
 * - Lead generation (CTA placement, visibility, urgency)
 * - Payment conversion (friction reduction, wallet prompts)
 * - Orbit communication (in-chat actions, payment flows)
 * - Marketplace performance (listing quality, category ranking)
 * - Country/event intelligence (holidays, seasons, culture)
 */

import { eventBus } from "@/lib/core/event-bus";

// ─── Types ───────────────────────────────────────────────────

export type EngineModule =
  | "ux_quality"
  | "digital_content"
  | "lead_conversion"
  | "payment_conversion"
  | "wallet_optimization"
  | "orbit_actions"
  | "marketplace_quality"
  | "country_events"
  | "kiosk_optimization"
  | "property_management";

export type IssueSeverity = "info" | "low" | "medium" | "high" | "critical";

export interface UnifiedIssue {
  id: string;
  module: EngineModule;
  severity: IssueSeverity;
  type: string;
  route: string;
  message: string;
  autoFixable: boolean;
  suggestedAction?: string;
  meta?: Record<string, unknown>;
}

export interface ConversionFriction {
  id: string;
  module: EngineModule;
  stage: "awareness" | "interest" | "consideration" | "intent" | "purchase";
  dropOffRate: number;
  route: string;
  suggestedFix: string;
}

export interface CountryEventActivation {
  eventKey: string;
  eventName: string;
  country: string;
  startDate: string;
  endDate: string;
  activatedModules: EngineModule[];
  bannerConfig?: {
    gradient: string;
    emoji: string;
    title: string;
    subtitle: string;
    cta: string;
    route: string;
  };
}

export interface UnifiedEngineReport {
  generatedAt: string;
  country: string | null;
  city: string | null;
  timezone: string | null;
  localHour: number | null;

  // Scores (0-100)
  scores: {
    uxQuality: number;
    digitalPresence: number;
    leadConversion: number;
    paymentConversion: number;
    walletUsage: number;
    orbitEngagement: number;
    marketplaceHealth: number;
    overallHealth: number;
  };

  issues: UnifiedIssue[];
  frictions: ConversionFriction[];
  activeEvents: CountryEventActivation[];
  automatedActions: AutomatedAction[];
}

export interface AutomatedAction {
  id: string;
  module: EngineModule;
  actionType: string;
  description: string;
  executed: boolean;
  executedAt?: string;
}

// ─── World Holiday Intelligence ──────────────────────────────

export interface WorldHoliday {
  key: string;
  name: string;
  type: "religious" | "national" | "commercial" | "cultural";
  countries: string[] | "all";
  /** Month (1-12) or dynamic calculation */
  monthHint: number | "dynamic";
  dayHint?: number;
  durationDays: number;
  modules: EngineModule[];
  bannerGradient: string;
  emoji: string;
}

export const WORLD_HOLIDAYS: WorldHoliday[] = [
  // Religious
  { key: "ramadan", name: "Ramadan", type: "religious", countries: ["AE", "SA", "KW", "QA", "BH", "OM", "EG", "MA", "TN", "DZ", "TR", "MY", "ID", "PK"], monthHint: "dynamic", durationDays: 30, modules: ["digital_content", "marketplace_quality", "lead_conversion"], bannerGradient: "linear-gradient(135deg, hsl(280 60% 20%), hsl(260 50% 30%))", emoji: "🌙" },
  { key: "eid_fitr", name: "Eid al-Fitr", type: "religious", countries: ["AE", "SA", "KW", "QA", "BH", "OM", "EG", "MA", "TN", "DZ", "TR", "MY", "ID", "PK"], monthHint: "dynamic", durationDays: 3, modules: ["digital_content", "payment_conversion", "wallet_optimization"], bannerGradient: "linear-gradient(135deg, hsl(45 80% 50%), hsl(35 90% 55%))", emoji: "🎉" },
  { key: "eid_adha", name: "Eid al-Adha", type: "religious", countries: ["AE", "SA", "KW", "QA", "BH", "OM", "EG", "MA", "TN", "DZ", "TR", "MY", "ID", "PK"], monthHint: "dynamic", durationDays: 4, modules: ["digital_content", "payment_conversion", "marketplace_quality"], bannerGradient: "linear-gradient(135deg, hsl(160 50% 25%), hsl(140 40% 35%))", emoji: "🐑" },
  { key: "christmas", name: "Christmas", type: "religious", countries: ["US", "GB", "FR", "DE", "IT", "ES", "AU", "CA", "BR", "MX", "PH"], monthHint: 12, dayHint: 25, durationDays: 3, modules: ["digital_content", "payment_conversion", "lead_conversion", "marketplace_quality"], bannerGradient: "linear-gradient(135deg, hsl(0 70% 35%), hsl(120 60% 25%))", emoji: "🎄" },
  { key: "diwali", name: "Diwali", type: "religious", countries: ["IN", "NP", "LK", "MY", "SG"], monthHint: "dynamic", durationDays: 5, modules: ["digital_content", "wallet_optimization", "payment_conversion"], bannerGradient: "linear-gradient(135deg, hsl(35 90% 50%), hsl(15 80% 45%))", emoji: "🪔" },
  { key: "chinese_new_year", name: "Chinese New Year", type: "religious", countries: ["CN", "SG", "MY", "TW", "HK", "VN", "TH"], monthHint: "dynamic", durationDays: 15, modules: ["digital_content", "marketplace_quality", "payment_conversion"], bannerGradient: "linear-gradient(135deg, hsl(0 80% 45%), hsl(35 90% 50%))", emoji: "🧧" },
  { key: "easter", name: "Easter", type: "religious", countries: ["US", "GB", "FR", "DE", "IT", "ES", "AU", "BR", "MX", "PH"], monthHint: "dynamic", durationDays: 3, modules: ["digital_content", "lead_conversion"], bannerGradient: "linear-gradient(135deg, hsl(280 50% 60%), hsl(50 80% 70%))", emoji: "🐣" },

  // Commercial
  { key: "black_friday", name: "Black Friday", type: "commercial", countries: "all", monthHint: 11, durationDays: 4, modules: ["digital_content", "payment_conversion", "lead_conversion", "marketplace_quality", "wallet_optimization"], bannerGradient: "linear-gradient(135deg, hsl(0 0% 10%), hsl(0 0% 25%))", emoji: "🛒" },
  { key: "cyber_monday", name: "Cyber Monday", type: "commercial", countries: "all", monthHint: 11, durationDays: 1, modules: ["digital_content", "payment_conversion", "lead_conversion"], bannerGradient: "linear-gradient(135deg, hsl(200 80% 40%), hsl(180 70% 35%))", emoji: "💻" },
  { key: "singles_day", name: "Singles' Day (11.11)", type: "commercial", countries: ["CN", "SG", "MY", "AE"], monthHint: 11, dayHint: 11, durationDays: 1, modules: ["digital_content", "payment_conversion", "marketplace_quality"], bannerGradient: "linear-gradient(135deg, hsl(340 80% 50%), hsl(320 70% 45%))", emoji: "💝" },

  // National (examples)
  { key: "uae_national_day", name: "UAE National Day", type: "national", countries: ["AE"], monthHint: 12, dayHint: 2, durationDays: 2, modules: ["digital_content", "marketplace_quality", "payment_conversion", "lead_conversion"], bannerGradient: "linear-gradient(135deg, hsl(0 70% 40%), hsl(120 60% 30%))", emoji: "🇦🇪" },
  { key: "saudi_national_day", name: "Saudi National Day", type: "national", countries: ["SA"], monthHint: 9, dayHint: 23, durationDays: 2, modules: ["digital_content", "marketplace_quality"], bannerGradient: "linear-gradient(135deg, hsl(120 60% 25%), hsl(120 50% 35%))", emoji: "🇸🇦" },
  { key: "bastille_day", name: "Bastille Day", type: "national", countries: ["FR"], monthHint: 7, dayHint: 14, durationDays: 1, modules: ["digital_content"], bannerGradient: "linear-gradient(135deg, hsl(220 70% 40%), hsl(0 70% 45%))", emoji: "🇫🇷" },
  { key: "independence_day_us", name: "Independence Day", type: "national", countries: ["US"], monthHint: 7, dayHint: 4, durationDays: 1, modules: ["digital_content", "marketplace_quality"], bannerGradient: "linear-gradient(135deg, hsl(220 60% 35%), hsl(0 70% 45%))", emoji: "🇺🇸" },
];

// ─── UX Quality Rules ────────────────────────────────────────

interface UxRule {
  id: string;
  name: string;
  severity: IssueSeverity;
  autoFixable: boolean;
  check: () => UnifiedIssue[];
}

function checkOverflow(): UnifiedIssue[] {
  const doc = document.documentElement;
  const body = document.body;
  const hasOverflow = Math.max(doc.scrollWidth, body.scrollWidth) > Math.max(doc.clientWidth, window.innerWidth);
  if (!hasOverflow) return [];
  return [{
    id: `ux_overflow_${Date.now()}`,
    module: "ux_quality",
    severity: "high",
    type: "horizontal_overflow",
    route: window.location.pathname,
    message: "Page has horizontal overflow — content exceeds viewport width",
    autoFixable: true,
    suggestedAction: "Apply overflow-x: hidden to container or fix overflowing element",
  }];
}

function checkTruncation(): UnifiedIssue[] {
  const issues: UnifiedIssue[] = [];
  const elements = document.querySelectorAll("h1, h2, h3, p, span, button, a");
  elements.forEach((el) => {
    if (!(el instanceof HTMLElement)) return;
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") return;
    if (el.scrollWidth > el.clientWidth + 2 && style.overflow !== "visible" && style.textOverflow === "ellipsis") {
      const text = el.textContent?.trim() || "";
      if (text.length > 3) {
        issues.push({
          id: `ux_trunc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          module: "ux_quality",
          severity: "medium",
          type: "text_truncation",
          route: window.location.pathname,
          message: `Text truncated: "${text.slice(0, 40)}..."`,
          autoFixable: false,
          suggestedAction: "Increase container width or use multiline layout",
        });
      }
    }
  });
  return issues.slice(0, 20);
}

function checkTinyTapTargets(): UnifiedIssue[] {
  const issues: UnifiedIssue[] = [];
  const interactive = document.querySelectorAll("button, a, [role='button'], input, select");
  interactive.forEach((el) => {
    if (!(el instanceof HTMLElement)) return;
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0 && (rect.width < 36 || rect.height < 36)) {
      issues.push({
        id: `ux_tap_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        module: "ux_quality",
        severity: "low",
        type: "tiny_tap_target",
        route: window.location.pathname,
        message: `Small tap target: ${el.tagName.toLowerCase()} (${Math.round(rect.width)}x${Math.round(rect.height)})`,
        autoFixable: false,
        suggestedAction: "Increase min-height/min-width to 44px",
      });
    }
  });
  return issues.slice(0, 15);
}

function checkMissingCTA(): UnifiedIssue[] {
  const buttons = document.querySelectorAll("button, a[href], [role='button']");
  const visibleCTAs = Array.from(buttons).filter((el) => {
    if (!(el instanceof HTMLElement)) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && rect.top < window.innerHeight;
  });
  if (visibleCTAs.length === 0) {
    return [{
      id: `ux_nocta_${Date.now()}`,
      module: "ux_quality",
      severity: "high",
      type: "missing_primary_cta",
      route: window.location.pathname,
      message: "No visible CTA above fold — conversion risk",
      autoFixable: false,
      suggestedAction: "Add a primary action button in the visible viewport",
    }];
  }
  return [];
}

const UX_RULES: UxRule[] = [
  { id: "overflow", name: "Horizontal Overflow", severity: "high", autoFixable: true, check: checkOverflow },
  { id: "truncation", name: "Text Truncation", severity: "medium", autoFixable: false, check: checkTruncation },
  { id: "tap_targets", name: "Tiny Tap Targets", severity: "low", autoFixable: false, check: checkTinyTapTargets },
  { id: "missing_cta", name: "Missing CTA", severity: "high", autoFixable: false, check: checkMissingCTA },
];

// ─── Lead Conversion Analysis ────────────────────────────────

function analyzeLeadConversion(): ConversionFriction[] {
  const frictions: ConversionFriction[] = [];
  const pathname = window.location.pathname;

  // Check if contact/quote buttons are visible
  const contactBtns = document.querySelectorAll("[data-lead], [data-contact], [data-quote]");
  if (contactBtns.length === 0 && (pathname.includes("/s/") || pathname.includes("/property"))) {
    frictions.push({
      id: `lead_no_contact_${Date.now()}`,
      module: "lead_conversion",
      stage: "intent",
      dropOffRate: 0,
      route: pathname,
      suggestedFix: "Add visible contact/quote CTA on listing pages",
    });
  }

  return frictions;
}

// ─── Payment Conversion Analysis ─────────────────────────────

function analyzePaymentConversion(): ConversionFriction[] {
  const frictions: ConversionFriction[] = [];
  const pathname = window.location.pathname;

  if (pathname.includes("/checkout") || pathname.includes("/pay")) {
    const payButtons = document.querySelectorAll("[data-pay], button");
    const visiblePay = Array.from(payButtons).filter((el) => {
      if (!(el instanceof HTMLElement)) return false;
      const text = el.textContent?.toLowerCase() || "";
      return text.includes("pay") || text.includes("confirm") || text.includes("complete");
    });

    if (visiblePay.length === 0) {
      frictions.push({
        id: `pay_no_btn_${Date.now()}`,
        module: "payment_conversion",
        stage: "purchase",
        dropOffRate: 0,
        route: pathname,
        suggestedFix: "Ensure pay/confirm button is prominently visible",
      });
    }
  }

  return frictions;
}

// ─── Country Event Detection ─────────────────────────────────

export function detectActiveEvents(country: string | null, now = new Date()): CountryEventActivation[] {
  if (!country) return [];
  const month = now.getMonth() + 1;
  const day = now.getDate();

  return WORLD_HOLIDAYS
    .filter((h) => {
      if (h.countries !== "all" && !h.countries.includes(country)) return false;
      if (h.monthHint === "dynamic") return false; // Dynamic holidays need external calendar
      if (h.monthHint !== month) return false;
      if (h.dayHint && (day < h.dayHint || day > h.dayHint + h.durationDays)) return false;
      return true;
    })
    .map((h) => ({
      eventKey: h.key,
      eventName: h.name,
      country,
      startDate: `${now.getFullYear()}-${String(h.monthHint).padStart(2, "0")}-${String(h.dayHint ?? 1).padStart(2, "0")}`,
      endDate: `${now.getFullYear()}-${String(h.monthHint).padStart(2, "0")}-${String((h.dayHint ?? 1) + h.durationDays).padStart(2, "0")}`,
      activatedModules: h.modules,
      bannerConfig: {
        gradient: h.bannerGradient,
        emoji: h.emoji,
        title: h.name,
        subtitle: `Special offers for ${h.name}`,
        cta: "Explore",
        route: "/radar",
      },
    }));
}

// ─── Main Engine Runner ──────────────────────────────────────

export function runUnifiedGlobalEngine(context: {
  country?: string | null;
  city?: string | null;
  timezone?: string | null;
}): UnifiedEngineReport {
  const now = new Date();
  let localHour: number | null = null;

  try {
    if (context.timezone) {
      localHour = parseInt(
        new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: context.timezone }).format(now),
      );
    } else {
      localHour = now.getHours();
    }
  } catch {
    localHour = now.getHours();
  }

  // Run UX checks
  const uxIssues = UX_RULES.flatMap((rule) => {
    try { return rule.check(); } catch { return []; }
  });

  // Analyze conversion frictions
  const leadFrictions = analyzeLeadConversion();
  const paymentFrictions = analyzePaymentConversion();
  const allFrictions = [...leadFrictions, ...paymentFrictions];

  // Detect country events
  const activeEvents = detectActiveEvents(context.country ?? null, now);

  // Compute scores
  const uxScore = Math.max(0, 100 - uxIssues.reduce((s, i) => {
    const w = i.severity === "critical" ? 20 : i.severity === "high" ? 14 : i.severity === "medium" ? 8 : 4;
    return s + w;
  }, 0));

  const digitalScore = Math.min(100, 60 + activeEvents.length * 10);
  const leadScore = Math.max(0, 100 - leadFrictions.length * 20);
  const paymentScore = Math.max(0, 100 - paymentFrictions.length * 25);
  const walletScore = 75; // Baseline — enriched by runtime wallet telemetry
  const orbitScore = 70; // Baseline — enriched by communication metrics
  const marketplaceScore = 80; // Baseline — enriched by listing quality data

  const overallHealth = Math.round(
    uxScore * 0.25 + digitalScore * 0.10 + leadScore * 0.15 +
    paymentScore * 0.20 + walletScore * 0.10 + orbitScore * 0.05 +
    marketplaceScore * 0.15,
  );

  // Automated actions
  const automatedActions: AutomatedAction[] = [];

  // Auto-fix overflow
  if (uxIssues.some((i) => i.type === "horizontal_overflow")) {
    try {
      document.documentElement.style.overflowX = "hidden";
      automatedActions.push({
        id: `auto_overflow_${Date.now()}`,
        module: "ux_quality",
        actionType: "fix_overflow",
        description: "Applied overflow-x: hidden to document",
        executed: true,
        executedAt: now.toISOString(),
      });
    } catch {}
  }

  // Event-based banner activation
  for (const ev of activeEvents) {
    automatedActions.push({
      id: `auto_event_${ev.eventKey}_${Date.now()}`,
      module: "digital_content",
      actionType: "activate_event_banner",
      description: `Activated ${ev.eventName} banner for ${ev.country}`,
      executed: true,
      executedAt: now.toISOString(),
    });
  }

  const report: UnifiedEngineReport = {
    generatedAt: now.toISOString(),
    country: context.country ?? null,
    city: context.city ?? null,
    timezone: context.timezone ?? null,
    localHour,
    scores: {
      uxQuality: uxScore,
      digitalPresence: digitalScore,
      leadConversion: leadScore,
      paymentConversion: paymentScore,
      walletUsage: walletScore,
      orbitEngagement: orbitScore,
      marketplaceHealth: marketplaceScore,
      overallHealth,
    },
    issues: uxIssues,
    frictions: allFrictions,
    activeEvents,
    automatedActions,
  };

  // Emit engine report event
  eventBus.emit("UNIFIED_ENGINE_REPORT", { report });

  return report;
}

// ─── Convenience: get active holiday banners for a country ───

export function getActiveHolidayBanners(country: string | null): CountryEventActivation[] {
  return detectActiveEvents(country).filter((e) => e.bannerConfig);
}
