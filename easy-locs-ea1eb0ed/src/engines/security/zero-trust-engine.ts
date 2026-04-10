import { BaseEngine, type EngineTickResult } from "../core/base-engine";

export class ZeroTrustEngine extends BaseEngine {
  private violations: Array<{ type: string; detail: string; timestamp: number }> = [];

  constructor() {
    super({
      id: "sec-zero-trust",
      name: "Zero Trust Engine",
      category: "security",
      intervalMs: 30_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: string[] = [];

    const scripts = document.querySelectorAll("script[src]");
    const trustedDomains = ["supabase", "easy-locs", "googleapis", "gstatic", "cloudflare"];
    scripts.forEach(s => {
      const src = s.getAttribute("src") || "";
      if (src.startsWith("http") && !trustedDomains.some(d => src.includes(d))) {
        findings.push(`Untrusted script: ${src.substring(0, 80)}`);
        this.violations.push({ type: "untrusted-script", detail: src, timestamp: Date.now() });
      }
    });

    const iframes = document.querySelectorAll("iframe");
    iframes.forEach(iframe => {
      const src = iframe.getAttribute("src") || "";
      const sandbox = iframe.getAttribute("sandbox");
      if (src && !sandbox && !src.startsWith("about:")) {
        findings.push(`Unsandboxed iframe: ${src.substring(0, 60)}`);
      }
    });

    const forms = document.querySelectorAll("form[action]");
    forms.forEach(form => {
      const action = form.getAttribute("action") || "";
      if (action.startsWith("http:")) {
        findings.push(`Insecure form action: ${action}`);
        this.violations.push({ type: "insecure-form", detail: action, timestamp: Date.now() });
      }
    });

    if (this.violations.length > 300) this.violations = this.violations.slice(-300);

    return { level: findings.length > 0 ? "detect" : "observe", findings: findings.length, actions: [], duration: 0 };
  }
}
