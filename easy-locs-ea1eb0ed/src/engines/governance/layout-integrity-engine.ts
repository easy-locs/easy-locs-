import { BaseEngine, type EngineTickResult } from "../core/base-engine";
import type {
  GovernanceViolation,
  CanonicalVertical,
  PageFamily,
} from "@/domains/shared/canonical-types";

export interface LayoutToken {
  spaceXs: string;
  spaceSm: string;
  spaceSmMd: string;
  spaceMd: string;
  spaceLg: string;
  spaceXl: string;
  space2xl: string;
}

export const SPACING_TOKENS: LayoutToken = {
  spaceXs: "0.25rem",
  spaceSm: "0.5rem",
  spaceSmMd: "0.75rem",
  spaceMd: "1rem",
  spaceLg: "1.5rem",
  spaceXl: "2rem",
  space2xl: "3rem",
};

export const TYPOGRAPHY_SCALE = {
  display: { size: "2rem", leading: "1.15", weight: 800 },
  headline: { size: "1.5rem", leading: "1.2", weight: 700 },
  title: { size: "1.125rem", leading: "1.3", weight: 600 },
  subtitle: { size: "1rem", leading: "1.4", weight: 600 },
  body: { size: "0.875rem", leading: "1.5", weight: 400 },
  caption: { size: "0.75rem", leading: "1.4", weight: 500 },
  micro: { size: "0.625rem", leading: "1.3", weight: 500 },
} as const;

export const CONTAINER_RULES = {
  maxWidth: 1200,
  pageContent: 1120,
  cardMinWidth: 170,
  cardMaxWidth: 240,
  gridMinCol: 170,
  touchTarget: 44,
  safeAreaPadding: "max(0.75rem, env(safe-area-inset-left))",
} as const;

export const CARD_SIZE_POLICY = {
  shell: { minHeight: 120 },
  carousel: { minWidth: 170, maxWidth: 240 },
  grid: { minCol: 280, maxCol: "1fr" },
  titleClamp: 2,
  descriptionClamp: 3,
  imageAspectRatio: "16/9",
} as const;

export const RESPONSIVE_BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1200,
  "2xl": 1400,
} as const;

export const PAGE_FAMILY_RULES: Record<PageFamily, {
  maxWidth: number;
  padding: string;
  titlePosition: "top" | "sticky" | "none";
  allowBanner: boolean;
  allowFAB: boolean;
}> = {
  list: { maxWidth: 1200, padding: "1rem", titlePosition: "sticky", allowBanner: true, allowFAB: true },
  detail: { maxWidth: 1120, padding: "1rem", titlePosition: "top", allowBanner: false, allowFAB: true },
  dashboard: { maxWidth: 1200, padding: "1rem", titlePosition: "sticky", allowBanner: true, allowFAB: false },
  composer: { maxWidth: 800, padding: "1.5rem", titlePosition: "top", allowBanner: false, allowFAB: false },
  checkout: { maxWidth: 600, padding: "1.5rem", titlePosition: "top", allowBanner: false, allowFAB: false },
  chat: { maxWidth: 1200, padding: "0", titlePosition: "sticky", allowBanner: false, allowFAB: false },
  settings: { maxWidth: 800, padding: "1rem", titlePosition: "top", allowBanner: false, allowFAB: false },
  admin: { maxWidth: 1400, padding: "1rem", titlePosition: "sticky", allowBanner: false, allowFAB: true },
  auth: { maxWidth: 480, padding: "2rem", titlePosition: "none", allowBanner: false, allowFAB: false },
  onboarding: { maxWidth: 600, padding: "2rem", titlePosition: "none", allowBanner: false, allowFAB: false },
  search: { maxWidth: 1200, padding: "1rem", titlePosition: "sticky", allowBanner: true, allowFAB: false },
  map: { maxWidth: 1400, padding: "0", titlePosition: "none", allowBanner: false, allowFAB: true },
};

export const MEDIA_ASPECT_RATIOS = {
  card: "16/9",
  hero: "21/9",
  avatar: "1/1",
  thumbnail: "4/3",
  banner: "3/1",
  story: "9/16",
} as const;

export const CTA_HIERARCHY = [
  "primary",
  "secondary",
  "tertiary",
  "ghost",
  "destructive",
  "link",
] as const;

const layoutViolations: GovernanceViolation[] = [];

export type LayoutIssueType =
  | "overflow"
  | "clipping"
  | "overlap"
  | "broken_alignment"
  | "inconsistent_padding"
  | "title_collision"
  | "card_height_instability"
  | "scroll_trap"
  | "sticky_header_failure"
  | "safe_area_violation"
  | "touch_target_violation";

export interface LayoutIssue {
  type: LayoutIssueType;
  element: string;
  message: string;
  severity: "warning" | "error" | "critical";
  pageFamily: PageFamily | null;
}

export function reportLayoutIssue(issue: LayoutIssue): GovernanceViolation {
  const v: GovernanceViolation = {
    id: `layout-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: "layout_overflow",
    severity: issue.severity === "critical" ? "critical" : issue.severity === "error" ? "error" : "warning",
    source: `layout:${issue.element}`,
    target: issue.pageFamily ?? "unknown",
    message: `[${issue.type}] ${issue.message}`,
    ownerDomain: "platform",
    vertical: "platform" as unknown as CanonicalVertical,
    detectedAt: new Date().toISOString(),
    resolvedAt: null,
    autoRemediated: false,
    metadata: { issueType: issue.type, element: issue.element },
  };
  layoutViolations.push(v);
  return v;
}

export function getLayoutViolations(): GovernanceViolation[] {
  return [...layoutViolations];
}

export function getPageFamilyRules(family: PageFamily) {
  return PAGE_FAMILY_RULES[family];
}

export class LayoutIntegrityEngine extends BaseEngine {
  constructor() {
    super({
      id: "layout-integrity",
      name: "Layout Integrity Engine",
      category: "governance",
      intervalMs: 30_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const recent = layoutViolations.filter(
      (v) => Date.now() - new Date(v.detectedAt).getTime() < this.intervalMs
    );

    const findings: string[] = [];

    if (typeof document !== "undefined") {
      const overflowing = document.querySelectorAll("[data-card]");
      overflowing.forEach((el) => {
        const htmlEl = el as HTMLElement;
        if (htmlEl.scrollWidth > htmlEl.clientWidth + 2) {
          findings.push(`Horizontal overflow: ${htmlEl.dataset.card ?? "unknown"} card`);
          reportLayoutIssue({
            type: "overflow",
            element: htmlEl.dataset.card ?? "card",
            message: `Card overflow detected: scrollWidth=${htmlEl.scrollWidth}, clientWidth=${htmlEl.clientWidth}`,
            severity: "warning",
            pageFamily: null,
          });
        }
      });

      const buttons = document.querySelectorAll("button, a, [role='button']");
      buttons.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.height > 0 && rect.height < CONTAINER_RULES.touchTarget && rect.width > 0) {
          findings.push(`Touch target too small: ${rect.height}px (min ${CONTAINER_RULES.touchTarget}px)`);
        }
      });
    }

    return {
      level: recent.length > 0 || findings.length > 0 ? "detect" : "observe",
      findings: recent.length + findings.length,
      actions: findings.slice(0, 5),
      duration: 0,
    };
  }
}
