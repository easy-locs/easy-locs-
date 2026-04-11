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
  { id: "SF-001", issue: "Horizontal overflow on all pages", component: "html, body", fixType: "CSS global rule", status: "fixed", cssRule: "overflow-x: hidden; max-width: 100vw" },
  { id: "SF-002", issue: "Button text clipping from whitespace-nowrap", component: "Button (ui/button.tsx)", fixType: "Component fix", status: "fixed", cssRule: "Removed whitespace-nowrap from base variant" },
  { id: "SF-003", issue: "Card content clipped by overflow-hidden", component: "CardShell", fixType: "Component fix", status: "fixed", cssRule: "overflow-hidden only on img children" },
  { id: "SF-004", issue: "Tiny tap targets below 44px", component: "Global buttons", fixType: "CSS global rule", status: "fixed", cssRule: "min-height + min-width: 2.25rem/2.75rem" },
  { id: "SF-005", issue: "Card titles overflowing container", component: "[data-card] h3/h4", fixType: "CSS global rule", status: "fixed", cssRule: "-webkit-line-clamp: 2 + overflow-wrap" },
  { id: "SF-006", issue: "Card descriptions uncontrolled", component: "[data-card] .text-muted-foreground", fixType: "CSS global rule", status: "fixed", cssRule: "-webkit-line-clamp: 3" },
  { id: "SF-007", issue: "Icon buttons without padding", component: "button:has(> svg:only-child)", fixType: "CSS global rule", status: "fixed", cssRule: "padding: 0.5rem; centered flex" },
  { id: "SF-008", issue: "Card internal layout inconsistent", component: "[data-card=merchant/listing/shell]", fixType: "CSS global rule", status: "fixed", cssRule: "flex column + min-height: 120px" },
  { id: "SF-009", issue: "Text clipping in overflow-hidden containers", component: "p, span, label, headings", fixType: "CSS global rule", status: "fixed", cssRule: "overflow: visible; text-overflow: unset (Layout Protection Engine)" },
  { id: "SF-010", issue: "Tab label clipping on small screens", component: "[role=tablist] [role=tab]", fixType: "CSS global rule", status: "fixed", cssRule: "white-space: normal; min-height: 36px" },
  { id: "SF-011", issue: "Badge/chip text overflow", component: ".badge, [data-badge]", fixType: "CSS global rule", status: "fixed", cssRule: "nowrap + ellipsis + max-width: 100%" },
  { id: "SF-012", issue: "RTL text clipping", component: "[dir=rtl] text elements", fixType: "CSS global rule", status: "fixed", cssRule: "overflow: visible; direction: inherit" },
  { id: "SF-013", issue: "i18n long-text overflow (DE/FI/NL)", component: ":lang(de/fi/nl) headings", fixType: "CSS global rule", status: "fixed", cssRule: "overflow-wrap: break-word; hyphens: auto" },
  { id: "SF-014", issue: "CJK word breaking", component: ":lang(ja/ko/zh)", fixType: "CSS global rule", status: "fixed", cssRule: "word-break: keep-all; line-break: strict" },
  { id: "SF-015", issue: "Dotted i18n keys in UI", component: "Various", fixType: "Runtime safety net", status: "runtime_only", cssRule: "titleize() in UI Engine (needs i18n file fixes)" },
  { id: "SF-016", issue: "Empty sections without placeholder", component: "Various pages", fixType: "Component pattern", status: "fixed", cssRule: "EmptyState component + .empty-state/.state-container CSS" },
];

export const RUNTIME_PATCH_TYPES: RuntimePatchType[] = [
  { type: "overflow_x", permanent: true, note: "Covered by global CSS rule" },
  { type: "overflow_y_clip", permanent: true, note: "Covered by Layout Protection Engine rules" },
  { type: "text_clipping", permanent: true, note: "Covered by DS-4c text element visibility rules" },
  { type: "element_overlap", permanent: false, note: "Requires per-component layout fixes" },
  { type: "wrapper_strangling", permanent: true, note: "Covered by Layout Protection Engine" },
  { type: "tiny_tap_targets", permanent: true, note: "Covered by DS-14 min-height/min-width" },
  { type: "dotted_labels", permanent: false, note: "Needs i18n translation file updates" },
  { type: "untranslated_keys", permanent: false, note: "Needs i18n translation file updates" },
  { type: "broken_card_layout", permanent: true, note: "Covered by DS-14c card layout enforcement" },
  { type: "empty_section", permanent: true, note: "Covered by EmptyState component + DS-7/DS-20" },
  { type: "text_truncated_no_ellipsis", permanent: true, note: "Covered by text visibility rules" },
  { type: "whitespace_nowrap_dangerous", permanent: true, note: "Button nowrap removed, tab labels normalized" },
  { type: "title_too_long_for_card", permanent: true, note: "Covered by DS-14d line-clamp rules" },
  { type: "label_doesnt_fit", permanent: true, note: "Covered by button/tab CSS fixes" },
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
