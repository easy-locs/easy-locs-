import type { AuditIssue } from "../types";

const now = () => new Date().toISOString();

/** Conversion audit */
export function runConversionAudit(): AuditIssue[] {
  const issues: AuditIssue[] = [];
  if (typeof document === "undefined") return issues;
  let id = 0;
  const uid = () => `conv-${++id}`;

  // Check CTAs above the fold
  const ctas = document.querySelectorAll("a[href*='signup'], a[href*='book'], button[class*='primary']");
  if (ctas.length === 0) {
    issues.push({ id: uid(), category: "conversion", severity: "high", title: "No primary CTA found", description: "No signup/booking CTA detected on the current page.", suggestedFix: "Add a prominent CTA button above the fold.", autoFixable: false, businessImpact: "revenue", status: "open", detectedAt: now() });
  }

  // Check forms without labels
  const inputs = document.querySelectorAll("input:not([type='hidden']):not([type='submit'])");
  let unlabeled = 0;
  inputs.forEach((i) => {
    const input = i as HTMLInputElement;
    if (!input.labels?.length && !input.placeholder && !input.getAttribute("aria-label")) unlabeled++;
  });
  if (unlabeled > 0) {
    issues.push({ id: uid(), category: "conversion", severity: "medium", title: `${unlabeled} form input(s) without labels`, description: "Inputs without labels reduce form completion rates.", suggestedFix: "Add visible labels or aria-labels to all form inputs.", autoFixable: false, businessImpact: "revenue", status: "open", detectedAt: now() });
  }

  return issues;
}

/** Communication audit */
export function runCommunicationAudit(): AuditIssue[] {
  return []; // Async data-dependent — run via AI copilot
}

/** Security audit (client-side checks) */
export function runSecurityAudit(): AuditIssue[] {
  const issues: AuditIssue[] = [];
  let id = 0;
  const uid = () => `sec-${++id}`;

  if (typeof document === "undefined") return issues;

  // Check for inline scripts (XSS vector)
  const inlineScripts = document.querySelectorAll("script:not([src])");
  const suspiciousCount = Array.from(inlineScripts).filter(
    (s) => s.textContent?.includes("eval(") || s.textContent?.includes("document.write(")
  ).length;
  if (suspiciousCount > 0) {
    issues.push({ id: uid(), category: "security", severity: "critical", title: "Suspicious inline scripts detected", description: `${suspiciousCount} script(s) using eval() or document.write().`, suggestedFix: "Remove eval/document.write calls and use safe alternatives.", autoFixable: false, businessImpact: "compliance", status: "open", detectedAt: now() });
  }

  // Check for password inputs without autocomplete
  const pwInputs = document.querySelectorAll("input[type='password']");
  pwInputs.forEach((input) => {
    if (!input.getAttribute("autocomplete")) {
      issues.push({ id: uid(), category: "security", severity: "low", title: "Password input missing autocomplete", description: "Password inputs should have autocomplete='current-password' or 'new-password'.", suggestedFix: "Add appropriate autocomplete attribute.", autoFixable: true, businessImpact: "compliance", status: "open", detectedAt: now() });
    }
  });

  // Check for mixed content
  if (window.location.protocol === "https:") {
    const httpResources = document.querySelectorAll("[src^='http:'], [href^='http:']");
    if (httpResources.length > 0) {
      issues.push({ id: uid(), category: "security", severity: "high", title: `${httpResources.length} mixed content resource(s)`, description: "HTTP resources on an HTTPS page create security warnings.", suggestedFix: "Update all resource URLs to use HTTPS.", autoFixable: true, businessImpact: "trust", status: "open", detectedAt: now() });
    }
  }

  return issues;
}

/** Brand consistency audit */
export function runBrandAudit(): AuditIssue[] {
  const issues: AuditIssue[] = [];
  if (typeof document === "undefined") return issues;
  let id = 0;
  const uid = () => `brand-${++id}`;

  const text = document.body?.innerText || "";
  const misspellings = ["Easy Locs", "Easylocs", "easy locs", "EASYLOCS", "EasyLoc"];
  const found = misspellings.filter((m) => text.includes(m));
  if (found.length > 0) {
    issues.push({ id: uid(), category: "brand", severity: "medium", title: "Inconsistent brand name usage", description: `Found non-standard spellings: ${found.join(", ")}. Use "Easy-Locs" or "EASY-LOCS®".`, suggestedFix: "Standardize all brand references to 'Easy-Locs' or 'EASY-LOCS®'.", autoFixable: true, businessImpact: "trust", status: "open", detectedAt: now() });
  }

  return issues;
}

/** Data quality audit */
export function runDataQualityAudit(): AuditIssue[] {
  return []; // Requires DB access — run via AI copilot
}

/** Analytics audit */
export function runAnalyticsAudit(): AuditIssue[] {
  const issues: AuditIssue[] = [];
  if (typeof document === "undefined") return issues;
  let id = 0;
  const uid = () => `analytics-${++id}`;

  // Check for analytics scripts
  const gaScript = document.querySelector("script[src*='google-analytics'], script[src*='gtag']");
  if (!gaScript) {
    issues.push({ id: uid(), category: "analytics", severity: "medium", title: "No analytics tracking detected", description: "No Google Analytics or similar tracking found.", suggestedFix: "Add Google Analytics or Plausible for traffic insights.", autoFixable: false, businessImpact: "visibility", status: "open", detectedAt: now() });
  }

  return issues;
}

/** Mobile quality audit */
export function runMobileAudit(): AuditIssue[] {
  const issues: AuditIssue[] = [];
  if (typeof document === "undefined") return issues;
  let id = 0;
  const uid = () => `mobile-${++id}`;

  // Check viewport meta
  const viewport = document.querySelector('meta[name="viewport"]');
  if (!viewport) {
    issues.push({ id: uid(), category: "mobile", severity: "critical", title: "Missing viewport meta tag", description: "Without viewport meta, mobile rendering is broken.", suggestedFix: 'Add <meta name="viewport" content="width=device-width, initial-scale=1">.', autoFixable: true, businessImpact: "usability", status: "open", detectedAt: now() });
  }

  // Check touch targets
  const clickTargets = document.querySelectorAll("button, a, input, select, textarea");
  let smallTargets = 0;
  clickTargets.forEach((el) => {
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44)) {
      smallTargets++;
    }
  });
  if (smallTargets > 5) {
    issues.push({ id: uid(), category: "mobile", severity: "medium", title: `${smallTargets} small touch target(s)`, description: "Interactive elements smaller than 44x44px are hard to tap on mobile.", suggestedFix: "Increase minimum touch target size to 44x44px.", autoFixable: false, businessImpact: "usability", status: "open", detectedAt: now() });
  }

  // Check horizontal scroll
  if (document.body.scrollWidth > window.innerWidth + 10) {
    issues.push({ id: uid(), category: "mobile", severity: "high", title: "Horizontal scroll detected", description: "Page content overflows horizontally, causing poor mobile experience.", suggestedFix: "Fix overflow-x issues with 'overflow-x: hidden' or responsive widths.", autoFixable: false, businessImpact: "usability", status: "open", detectedAt: now() });
  }

  return issues;
}

/** Payment flow audit */
export function runPaymentAudit(): AuditIssue[] {
  return []; // Async data-dependent — covered by marketplace engine
}

/** Booking flow audit */
export function runBookingAudit(): AuditIssue[] {
  return []; // Async data-dependent — covered by marketplace engine
}

/** Content quality audit */
export function runContentAudit(): AuditIssue[] {
  const issues: AuditIssue[] = [];
  if (typeof document === "undefined") return issues;
  let id = 0;
  const uid = () => `content-${++id}`;

  // Check for very short page content
  const mainContent = document.querySelector("main");
  const textLength = (mainContent?.innerText || "").trim().length;
  if (textLength < 100 && textLength > 0) {
    issues.push({ id: uid(), category: "content", severity: "medium", title: "Thin page content", description: `Main content is only ${textLength} characters. Thin content hurts SEO.`, suggestedFix: "Add more substantive content — aim for 300+ words on key pages.", autoFixable: false, businessImpact: "visibility", status: "open", detectedAt: now() });
  }

  // Check for lorem ipsum
  const bodyText = document.body?.innerText || "";
  if (/lorem ipsum/i.test(bodyText)) {
    issues.push({ id: uid(), category: "content", severity: "high", title: "Placeholder text (Lorem Ipsum) detected", description: "Production pages should not contain Lorem Ipsum text.", suggestedFix: "Replace placeholder text with real content.", autoFixable: false, businessImpact: "trust", status: "open", detectedAt: now() });
  }

  return issues;
}
