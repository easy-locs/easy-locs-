/**
 * AI Operating Layer — Core Types
 * Central type definitions for the 15-engine audit system.
 */

export type AuditSeverity = "critical" | "high" | "medium" | "low" | "info";
export type AuditStatus = "open" | "in_progress" | "fixed" | "dismissed";
export type AuditCategory =
  | "ui_ux" | "seo" | "technical" | "marketplace" | "international"
  | "conversion" | "communication" | "security" | "brand" | "data_quality"
  | "analytics" | "mobile" | "payment" | "booking" | "content";

export interface AuditIssue {
  id: string;
  category: AuditCategory;
  severity: AuditSeverity;
  title: string;
  description: string;
  location?: string; // page/component/route
  suggestedFix?: string;
  autoFixable: boolean;
  businessImpact: "revenue" | "trust" | "visibility" | "usability" | "compliance" | "performance";
  status: AuditStatus;
  detectedAt: string;
  resolvedAt?: string;
  metadata?: Record<string, unknown>;
}

export interface ModuleScore {
  category: AuditCategory;
  label: string;
  score: number; // 0-100
  issueCount: number;
  criticalCount: number;
  lastScan: string;
  trend: "up" | "down" | "stable";
}

export interface AuditReport {
  globalScore: number;
  modules: ModuleScore[];
  issues: AuditIssue[];
  scannedAt: string;
  scanType: "light" | "full" | "pre_deploy" | "post_release" | "mobile" | "seo" | "marketplace";
  totalPages: number;
  totalIssues: number;
  criticalIssues: number;
}

export interface AuditEngine {
  category: AuditCategory;
  label: string;
  icon: string;
  run: () => AuditIssue[];
}

export const SEVERITY_WEIGHTS: Record<AuditSeverity, number> = {
  critical: 25,
  high: 15,
  medium: 8,
  low: 3,
  info: 0,
};

export const CATEGORY_LABELS: Record<AuditCategory, string> = {
  ui_ux: "UI / UX",
  seo: "SEO",
  technical: "Technical",
  marketplace: "Marketplace",
  international: "International",
  conversion: "Conversion",
  communication: "Communication",
  security: "Security",
  brand: "Brand Consistency",
  data_quality: "Data Quality",
  analytics: "Analytics",
  mobile: "Mobile Quality",
  payment: "Payment Flow",
  booking: "Booking Flow",
  content: "Content Quality",
};

export const CATEGORY_ICONS: Record<AuditCategory, string> = {
  ui_ux: "Layout",
  seo: "Search",
  technical: "Cpu",
  marketplace: "Store",
  international: "Globe",
  conversion: "TrendingUp",
  communication: "MessageCircle",
  security: "Shield",
  brand: "Palette",
  data_quality: "Database",
  analytics: "BarChart3",
  mobile: "Smartphone",
  payment: "CreditCard",
  booking: "CalendarCheck",
  content: "FileText",
};
