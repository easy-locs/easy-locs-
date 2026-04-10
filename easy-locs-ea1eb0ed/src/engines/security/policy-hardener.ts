import { BaseEngine, type EngineTickResult } from "../core/base-engine";

export class PolicyHardener extends BaseEngine {
  constructor() {
    super({
      id: "sec-policy-hardener",
      name: "Policy Hardener",
      category: "security",
      intervalMs: 120_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: string[] = [];

    const meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    if (!meta) {
      findings.push("No CSP meta tag detected");
    }

    const links = document.querySelectorAll('a[target="_blank"]');
    let unsafeLinks = 0;
    links.forEach(a => {
      const rel = a.getAttribute("rel") || "";
      if (!rel.includes("noopener")) unsafeLinks++;
    });
    if (unsafeLinks > 0) {
      findings.push(`${unsafeLinks} external links missing rel="noopener"`);
    }

    const inputs = document.querySelectorAll('input[type="password"]');
    inputs.forEach(input => {
      if (input.getAttribute("autocomplete") === "on") {
        findings.push("Password field with autocomplete=on detected");
      }
    });

    return { level: findings.length > 0 ? "detect" : "observe", findings: findings.length, actions: [], duration: 0 };
  }
}
