export type UiIssueType =
  | "overflow_x"
  | "overflow_y_clip"
  | "text_clipping"
  | "element_overlap"
  | "z_index_collision"
  | "tiny_tap_targets"
  | "dotted_labels"
  | "untranslated_keys"
  | "image_shift"
  | "empty_section"
  | "missing_primary_cta"
  | "duplicate_heading"
  | "duplicate_content"
  | "broken_card_layout"
  | "broken_settings_grouping"
  | "inconsistent_height"
  | "wrapper_strangling";

export type UiSeverity = "low" | "medium" | "high" | "critical";

export interface UiIssue {
  id: string;
  type: UiIssueType;
  severity: UiSeverity;
  route: string;
  message: string;
  selector?: string;
  patchable: boolean;
  meta?: Record<string, unknown>;
}

export interface UiScore {
  clarity: number;
  consistency: number;
  mobile: number;
  conversion: number;
  accessibility: number;
  total: number;
}

export interface UiEngineReport {
  route: string;
  pageType: string;
  generatedAt: string;
  issues: UiIssue[];
  score: UiScore;
  patchedCount: number;
}

export interface PageExpectation {
  routePattern: RegExp;
  pageType:
    | "marketplace_home"
    | "category_list"
    | "merchant_page"
    | "cart"
    | "checkout"
    | "settings"
    | "wallet"
    | "orders"
    | "generic";
  requiredSelectors?: string[];
  primaryCtaSelectors?: string[];
  emptyStateSelectors?: string[];
  cardSelectors?: string[];
}

export interface SafePatchResult {
  issueId: string;
  patched: boolean;
  message: string;
}
