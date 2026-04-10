import { BaseEngine, type EngineTickResult } from "../core/base-engine";
import { CATEGORY_TREE } from "@/lib/taxonomy/category-tree";

interface RoutingFinding {
  type: "dead_route" | "missing_guard" | "duplicate_route" | "orphan_page" | "context_loss" | "navigation_loop";
  severity: "low" | "medium" | "high";
  route: string;
  detail: string;
  recommendation: string;
}

const PROTECTED_ROUTES = [
  "/wallet", "/pay", "/checkout", "/settings", "/me", "/messages",
  "/merchant", "/admin", "/property/manage", "/accounting",
];

const PUBLIC_ROUTES = [
  "/", "/login", "/signup", "/explore", "/browse", "/search",
];

export class RoutingQualityEngine extends BaseEngine {
  private findings: RoutingFinding[] = [];
  private score = 100;

  constructor() {
    super({
      id: "quality-routing",
      name: "Routing Quality Engine",
      category: "quality",
      intervalMs: 300_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: RoutingFinding[] = [];

    const categoryRoutes = CATEGORY_TREE.map(c => c.route).filter(Boolean);
    const routeSet = new Set(categoryRoutes);
    if (routeSet.size !== categoryRoutes.length) {
      const dupes = categoryRoutes.filter((r, i) => categoryRoutes.indexOf(r) !== i);
      for (const dupe of new Set(dupes)) {
        findings.push({
          type: "duplicate_route",
          severity: "high",
          route: dupe,
          detail: `Route "${dupe}" is assigned to multiple categories`,
          recommendation: `Ensure each category has a unique route in category-tree.ts`,
        });
      }
    }

    const allLinks = document.querySelectorAll("a[href]");
    const hrefMap = new Map<string, number>();
    allLinks.forEach(a => {
      const href = a.getAttribute("href") || "";
      if (href.startsWith("/")) {
        hrefMap.set(href, (hrefMap.get(href) || 0) + 1);
      }
    });

    for (const [href] of hrefMap) {
      const isProtected = PROTECTED_ROUTES.some(p => href.startsWith(p));
      const isPublic = PUBLIC_ROUTES.some(p => href === p || href.startsWith(p + "/"));

      if (!isProtected && !isPublic && !href.startsWith("/browse/") && !href.startsWith("/food/") && !href.startsWith("/shop/") && !href.startsWith("/service/")) {
        const isKnown = categoryRoutes.some(r => href.startsWith(r));
        if (!isKnown && !href.includes(":") && href.split("/").length <= 3) {
          findings.push({
            type: "orphan_page",
            severity: "low",
            route: href,
            detail: `Route "${href}" found in DOM but not in category tree or known routes`,
            recommendation: `Verify "${href}" is intentional and properly guarded`,
          });
        }
      }
    }

    const buttons = document.querySelectorAll("button[data-action], [role='button'][data-action]");
    let deadButtons = 0;
    buttons.forEach(btn => {
      const action = btn.getAttribute("data-action");
      if (action && btn.getAttribute("disabled") !== null) {
        deadButtons++;
      }
    });

    if (deadButtons > 10) {
      findings.push({
        type: "dead_route",
        severity: "medium",
        route: "buttons",
        detail: `${deadButtons} disabled action buttons found — possible dead flows`,
        recommendation: `Review disabled buttons for unfinished or dead features`,
      });
    }

    this.findings = findings;
    this.score = Math.max(0, 100 - findings.filter(f => f.severity === "high").length * 15 - findings.filter(f => f.severity === "medium").length * 5 - findings.filter(f => f.severity === "low").length * 2);

    this.emit("report", { score: this.score, totalFindings: findings.length });
    return { level: findings.length > 0 ? "detect" : "observe", findings: findings.length, actions: [], duration: 0 };
  }

  getFindings() { return [...this.findings]; }
  getScore() { return this.score; }
  getReport() {
    return { score: this.score, findings: this.findings, summary: { high: this.findings.filter(f => f.severity === "high").length, medium: this.findings.filter(f => f.severity === "medium").length, low: this.findings.filter(f => f.severity === "low").length } };
  }
}
