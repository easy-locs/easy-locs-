/**
 * DINO Engine — Core type definitions for the autonomous experience engine.
 */

export type DinoMode = "manual" | "semi_auto" | "full_auto";

export type DinoSeverity = "critical" | "major" | "medium" | "low";

export type DinoIssueType =
  | "ui"
  | "ux"
  | "routing"
  | "onboarding"
  | "media"
  | "i18n"
  | "branding"
  | "performance"
  | "stability"
  | "data"
  | "category";

export type DinoFixability = "safe_auto_fix" | "patch_required" | "manual_review";

export interface DinoIssue {
  id: string;
  route: string;
  component?: string;
  severity: DinoSeverity;
  issueType: DinoIssueType;
  fixability: DinoFixability;
  summary: string;
  details: Record<string, unknown>;
  detectedAt: string;
  resolvedAt?: string | null;
  status: "open" | "fixed" | "ignored";
}

export interface JourneyEvent {
  actorType: "user" | "pro" | "anonymous";
  actorId?: string | null;
  eventName: string;
  route: string;
  country?: string | null;
  language?: string | null;
  deviceType?: string | null;
  context?: Record<string, unknown>;
  createdAt: string;
}

export type MediaProfileName =
  | "restaurant_cover"
  | "restaurant_logo"
  | "product_card"
  | "property_card"
  | "travel_card"
  | "service_provider_card"
  | "avatar"
  | "banner"
  | "radar_preview";

export interface MediaProfile {
  name: MediaProfileName;
  width: number;
  height: number;
  crop: "fill" | "fit" | "thumb";
  quality: "auto" | number;
}

export interface DinoScanTarget {
  route: string;
  title?: string;
  componentName?: string;
  tags?: string[];
}

export interface DinoRunSummary {
  runType: string;
  startedAt: string;
  endedAt?: string;
  scannedPages: number;
  issuesFound: number;
  issuesFixed: number;
  status: "running" | "done" | "failed";
}
