import { BaseEngine, type EngineTickResult } from "../core/base-engine";

interface SEOFinding {
  type: "missing_title" | "missing_description" | "missing_h1" | "duplicate_h1" | "missing_canonical" | "missing_og" | "weak_title" | "noindex_needed";
  severity: "low" | "medium" | "high";
  page: string;
  detail: string;
  recommendation: string;
}

export class SEOEngine extends BaseEngine {
  private findings: SEOFinding[] = [];
  private score = 100;

  constructor() {
    super({
      id: "quality-seo",
      name: "SEO Quality Engine",
      category: "quality",
      intervalMs: 120_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: SEOFinding[] = [];
    const page = window.location.pathname;

    const title = document.title;
    if (!title || title.trim() === "") {
      findings.push({ type: "missing_title", severity: "high", page, detail: "Page has no <title>", recommendation: "Add SEOHead component with title" });
    } else if (title.length < 15) {
      findings.push({ type: "weak_title", severity: "medium", page, detail: `Title too short (${title.length} chars): "${title}"`, recommendation: "Title should be 30-60 characters with relevant keywords" });
    } else if (title.length > 70) {
      findings.push({ type: "weak_title", severity: "low", page, detail: `Title too long (${title.length} chars)`, recommendation: "Keep title under 60 characters" });
    }

    const metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc || !metaDesc.getAttribute("content")) {
      findings.push({ type: "missing_description", severity: "high", page, detail: "No meta description", recommendation: "Add meta description (120-160 chars) via SEOHead" });
    } else {
      const desc = metaDesc.getAttribute("content") || "";
      if (desc.length < 50) {
        findings.push({ type: "missing_description", severity: "medium", page, detail: `Meta description too short (${desc.length} chars)`, recommendation: "Meta description should be 120-160 characters" });
      }
    }

    const h1s = document.querySelectorAll("h1");
    if (h1s.length === 0) {
      findings.push({ type: "missing_h1", severity: "medium", page, detail: "No <h1> tag found", recommendation: "Add a single H1 heading to the page" });
    } else if (h1s.length > 1) {
      findings.push({ type: "duplicate_h1", severity: "low", page, detail: `${h1s.length} H1 tags found`, recommendation: "Use only one H1 per page" });
    }

    const canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      findings.push({ type: "missing_canonical", severity: "low", page, detail: "No canonical URL", recommendation: "Add canonical link to prevent duplicate content issues" });
    }

    const ogTitle = document.querySelector('meta[property="og:title"]');
    const ogDesc = document.querySelector('meta[property="og:description"]');
    const ogImage = document.querySelector('meta[property="og:image"]');
    if (!ogTitle || !ogDesc || !ogImage) {
      const missing = [!ogTitle && "og:title", !ogDesc && "og:description", !ogImage && "og:image"].filter(Boolean);
      findings.push({ type: "missing_og", severity: "low", page, detail: `Missing Open Graph tags: ${missing.join(", ")}`, recommendation: "Add OG tags for social sharing" });
    }

    this.findings = findings;
    this.score = Math.max(0, 100 - findings.filter(f => f.severity === "high").length * 20 - findings.filter(f => f.severity === "medium").length * 8 - findings.filter(f => f.severity === "low").length * 3);

    this.emit("report", { score: this.score, page, totalFindings: findings.length });
    return { level: findings.length > 0 ? "detect" : "observe", findings: findings.length, actions: [], duration: 0 };
  }

  getFindings() { return [...this.findings]; }
  getScore() { return this.score; }
  getReport() { return { score: this.score, findings: this.findings }; }
}
