export interface SourceFix {
  id: string;
  issue: string;
  component: string;
  fixType: string;
  status: "fixed" | "runtime_only";
  cssRule: string;
}

export interface RuntimePatchType {
  type: string;
  permanent: boolean;
  note: string;
}

export interface UiEnginePage {
  route: string;
  name: string;
}

export const SOURCE_FIX_REGISTRY: SourceFix[] = [
  { id: "SF-001", issue: "Horizontal overflow on all pages", component: "html, body", fixType: "Component fix", status: "fixed", cssRule: "overflow-x: hidden; max-width: 100vw on root element" },
  { id: "SF-002", issue: "Button text clipping from whitespace-nowrap", component: "Button (ui/button.tsx)", fixType: "Component fix", status: "fixed", cssRule: "Removed whitespace-nowrap from base variant" },
  { id: "SF-003", issue: "Card content clipped by overflow-hidden", component: "AppCard (ui/card.tsx)", fixType: "Component fix", status: "fixed", cssRule: "overflow-hidden only on img children via CardShell" },
  { id: "SF-004", issue: "Tiny tap targets below 44px", component: "Button (ui/button.tsx)", fixType: "Component fix", status: "fixed", cssRule: "min-height on button size variants" },
  { id: "SF-005", issue: "Card titles overflowing container", component: "CardTitle (ui/card.tsx)", fixType: "Component fix", status: "fixed", cssRule: "line-clamp-2 + overflow-wrap on CardTitle" },
  { id: "SF-006", issue: "Card descriptions uncontrolled", component: "CardDescription (ui/card.tsx)", fixType: "Component fix", status: "fixed", cssRule: "line-clamp-3 on CardDescription" },
  { id: "SF-007", issue: "Icon buttons without padding", component: "Button icon variant", fixType: "Component fix", status: "fixed", cssRule: "Icon size variant with centered flex in button.tsx" },
  { id: "SF-008", issue: "Card internal layout inconsistent", component: "AppCard variants", fixType: "Component fix", status: "fixed", cssRule: "AppCard variant system (base/interactive/kpi) with consistent padding" },
  { id: "SF-009", issue: "Text clipping in overflow-hidden containers", component: "p, span, label, headings", fixType: "Component fix", status: "fixed", cssRule: "overflow-wrap: break-word; min-w-0 on flex/grid children; line-clamp on text elements" },
  { id: "SF-010", issue: "Tab label clipping on small screens", component: "Tabs (ui/tabs.tsx)", fixType: "Component fix", status: "fixed", cssRule: "white-space: normal; min-height on tab trigger" },
  { id: "SF-011", issue: "Badge/chip text overflow", component: "Badge (ui/badge.tsx)", fixType: "Component fix", status: "fixed", cssRule: "nowrap + ellipsis + max-width: 100% on badge component" },
  { id: "SF-012", issue: "RTL text clipping", component: "Root layout", fixType: "Component fix", status: "fixed", cssRule: "direction: inherit on root; component-level overflow handling" },
  { id: "SF-013", issue: "i18n long-text overflow (DE/FI/NL)", component: "i18n text wrapper", fixType: "Component fix", status: "fixed", cssRule: "overflow-wrap: break-word; hyphens: auto via lang attribute" },
  { id: "SF-014", issue: "CJK word breaking", component: "i18n text wrapper", fixType: "Component fix", status: "fixed", cssRule: "word-break: keep-all; line-break: strict via lang attribute" },
  { id: "SF-015", issue: "Dotted i18n keys in UI", component: "i18n t() function", fixType: "Component fix", status: "fixed", cssRule: "t() extracts last segment + titleize fallback" },
  { id: "SF-016", issue: "Empty sections without placeholder", component: "EmptyState (ui/empty-state.tsx)", fixType: "Component fix", status: "fixed", cssRule: "EmptyState component with icon/title/description" },
];

export const RUNTIME_PATCH_TYPES: RuntimePatchType[] = [
  { type: "overflow_x", permanent: true, note: "Root element overflow-x: hidden" },
  { type: "overflow_y_clip", permanent: true, note: "Handled by layout component overflow rules" },
  { type: "text_clipping", permanent: true, note: "Component-level min-w-0 and overflow-wrap" },
  { type: "element_overlap", permanent: true, note: "Component-level z-index stacking" },
  { type: "wrapper_strangling", permanent: true, note: "min-w-0 on flex/grid children" },
  { type: "tiny_tap_targets", permanent: true, note: "Button size variants enforce min-height" },
  { type: "dotted_labels", permanent: true, note: "i18n t() lastSegment extraction" },
  { type: "untranslated_keys", permanent: true, note: "i18n t() titleize fallback + trackMissingKey" },
  { type: "broken_card_layout", permanent: true, note: "AppCard variant system with consistent structure" },
  { type: "empty_section", permanent: true, note: "EmptyState component" },
  { type: "text_truncated_no_ellipsis", permanent: true, note: "Component-level line-clamp + ellipsis" },
  { type: "whitespace_nowrap_dangerous", permanent: true, note: "Removed from button base; tab triggers use normal wrap" },
  { type: "title_too_long_for_card", permanent: true, note: "CardTitle line-clamp-2" },
  { type: "label_doesnt_fit", permanent: true, note: "Button/tab component size enforcement" },
];

export const UI_ENGINE_PAGES: UiEnginePage[] = [
  { route: "/dashboard", name: "Dashboard" },
  { route: "/radar", name: "Radar" },
  { route: "/orbit", name: "Orbit" },
  { route: "/wallet", name: "Wallet" },
  { route: "/me", name: "Me" },
  { route: "/onboarding", name: "Onboarding" },
  { route: "/shop/:id", name: "Shop" },
  { route: "/listing/:id", name: "Public Listing" },
  { route: "/merchant/dashboard", name: "Merchant Dashboard" },
  { route: "/property/:id", name: "Property Detail" },
];
