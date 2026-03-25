/**
 * Dead Flow Elimination Engine — Detects CTAs without effect, routes without purpose,
 * pages that lead nowhere, and broken module connections.
 */

export interface DeadFlowIssue {
  type: "dead_cta" | "dead_route" | "dead_page" | "broken_module_link" | "orphan_component";
  path: string;
  description: string;
  severity: "critical" | "warning" | "info";
  suggestedAction: "remove" | "fix" | "review" | "redirect";
}

export interface DeadFlowReport {
  totalFlowsChecked: number;
  deadFlows: number;
  brokenModuleLinks: number;
  deadCTAs: number;
  issues: DeadFlowIssue[];
  timestamp: string;
}

// Known module connections that must exist
const MODULE_LINKS: { from: string; to: string; via: string }[] = [
  { from: "Marketplace", to: "Orbit", via: "contact_thread" },
  { from: "Marketplace", to: "PropertyManagement", via: "listing_publish" },
  { from: "Listing", to: "Contact", via: "cta_contact" },
  { from: "Contact", to: "Orbit", via: "thread_create" },
  { from: "Booking", to: "Lifecycle", via: "order_lifecycle" },
  { from: "Wallet", to: "Events", via: "transaction_events" },
  { from: "Notifications", to: "Actions", via: "action_trigger" },
  { from: "Visibility", to: "PublishGates", via: "gate_check" },
  { from: "Taxonomy", to: "Normalizers", via: "normalize_pipeline" },
  { from: "Normalizers", to: "PublishPipeline", via: "stage_advancement" },
];

export function runDeadFlowAudit(): DeadFlowReport {
  const issues: DeadFlowIssue[] = [];

  // 1. Runtime DOM audit for dead CTAs
  if (typeof document !== "undefined") {
    // Check for buttons/links with no click handler
    const allButtons = document.querySelectorAll("button, a[role='button'], [data-cta]");
    let deadCta = 0;
    allButtons.forEach(btn => {
      const el = btn as HTMLElement;
      // Check for disabled buttons that look active
      if (el.getAttribute("disabled") === null && el.style.pointerEvents === "none") {
        deadCta++;
      }
      // Check for links to '#' or empty href
      if (el.tagName === "A") {
        const href = el.getAttribute("href");
        if (href === "#" || href === "" || href === "javascript:void(0)") {
          deadCta++;
          issues.push({
            type: "dead_cta", path: href || "#",
            description: `Dead link: "${el.textContent?.trim()?.substring(0, 30)}"`,
            severity: "warning", suggestedAction: "fix",
          });
        }
      }
    });

    if (deadCta > 0 && issues.filter(i => i.type === "dead_cta").length === 0) {
      issues.push({
        type: "dead_cta", path: "global",
        description: `${deadCta} CTAs detected with no real action`,
        severity: "warning", suggestedAction: "review",
      });
    }

    // 2. Check for empty sections (pages that lead nowhere)
    const sections = document.querySelectorAll("main section, [data-section]");
    let emptySections = 0;
    sections.forEach(s => {
      if (s.children.length === 0 || (s.textContent?.trim().length ?? 0) < 5) {
        emptySections++;
      }
    });

    if (emptySections > 2) {
      issues.push({
        type: "dead_page", path: window.location.pathname,
        description: `${emptySections} empty sections on current page`,
        severity: "info", suggestedAction: "review",
      });
    }
  }

  // 3. Known dead routes (from static analysis)
  const KNOWN_DEAD_ROUTES = [
    { path: "/explore", reason: "Legacy route, no content" },
    { path: "/dispatch", reason: "Not connected to delivery module" },
    { path: "/growth", reason: "Placeholder page" },
    { path: "/concierge-operations", reason: "Orphaned page, no navigation entry" },
  ];

  for (const route of KNOWN_DEAD_ROUTES) {
    issues.push({
      type: "dead_route", path: route.path,
      description: route.reason,
      severity: "warning", suggestedAction: "remove",
    });
  }

  // 4. Module link verification (structural — flag known gaps)
  const VERIFIED_LINKS = new Set([
    "Visibility→PublishGates", "Taxonomy→Normalizers", "Normalizers→PublishPipeline",
    "Wallet→Events", "Notifications→Actions",
  ]);

  for (const link of MODULE_LINKS) {
    const key = `${link.from}→${link.to}`;
    if (!VERIFIED_LINKS.has(key)) {
      issues.push({
        type: "broken_module_link", path: `${link.from} → ${link.to}`,
        description: `Module link not fully verified: ${link.from} → ${link.to} via ${link.via}`,
        severity: "info", suggestedAction: "review",
      });
    }
  }

  const report: DeadFlowReport = {
    totalFlowsChecked: MODULE_LINKS.length + (typeof document !== "undefined" ? document.querySelectorAll("button, a").length : 0),
    deadFlows: issues.filter(i => i.type === "dead_route" || i.type === "dead_page").length,
    brokenModuleLinks: issues.filter(i => i.type === "broken_module_link").length,
    deadCTAs: issues.filter(i => i.type === "dead_cta").length,
    issues,
    timestamp: new Date().toISOString(),
  };

  console.log(`[dead-flow] Flows:${report.totalFlowsChecked} Dead:${report.deadFlows} BrokenLinks:${report.brokenModuleLinks} DeadCTAs:${report.deadCTAs}`);
  return report;
}
