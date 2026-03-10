import type { AuditIssue } from "../types";

const now = () => new Date().toISOString();

/** Conversion audit — Enhanced with funnel analysis */
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

  // NEW: Check for social proof elements
  const testimonials = document.querySelectorAll("[class*='testimonial'], [class*='review'], [class*='rating'], [class*='trust']");
  const isLanding = window.location.pathname === "/" || window.location.pathname === "/index";
  if (isLanding && testimonials.length === 0) {
    issues.push({ id: uid(), category: "conversion", severity: "medium", title: "No social proof on landing page", description: "Landing page lacks testimonials, reviews, or trust badges.", suggestedFix: "Add customer testimonials, ratings, or trust badges to increase conversions.", autoFixable: false, businessImpact: "revenue", status: "open", detectedAt: now() });
  }

  // NEW: Check pricing visibility
  if (isLanding) {
    const pricing = document.querySelectorAll("[class*='pricing'], [class*='price'], [id*='pricing']");
    if (pricing.length === 0) {
      issues.push({ id: uid(), category: "conversion", severity: "low", title: "No visible pricing on landing", description: "Transparent pricing increases signup rates.", suggestedFix: "Display pricing plans or a pricing CTA on the landing page.", autoFixable: false, businessImpact: "revenue", status: "open", detectedAt: now() });
    }
  }

  // NEW: Check for exit-intent or engagement elements
  const modals = document.querySelectorAll("[class*='newsletter'], [class*='popup'], [class*='exit']");
  if (isLanding && modals.length === 0) {
    issues.push({ id: uid(), category: "conversion", severity: "info", title: "No lead capture mechanism", description: "No newsletter signup or engagement popup detected.", suggestedFix: "Consider adding a newsletter signup or lead capture form.", autoFixable: false, businessImpact: "revenue", status: "open", detectedAt: now() });
  }

  return issues;
}

/** Communication audit — Enhanced with real checks */
export function runCommunicationAudit(): AuditIssue[] {
  const issues: AuditIssue[] = [];
  if (typeof document === "undefined") return issues;
  let id = 0;
  const uid = () => `comm-${++id}`;

  // Check for contact methods on public pages
  const path = window.location.pathname;
  const isPublic = path.startsWith("/listing/") || path.startsWith("/service/") || path.startsWith("/store/");
  if (isPublic) {
    const contactElements = document.querySelectorAll("a[href^='mailto:'], a[href^='tel:'], a[href*='whatsapp'], [class*='contact']");
    if (contactElements.length === 0) {
      issues.push({ id: uid(), category: "communication", severity: "high", title: "No contact method on public page", description: "Public listing/service pages should have visible contact options.", suggestedFix: "Add email, phone, or WhatsApp contact buttons.", autoFixable: false, businessImpact: "revenue", status: "open", detectedAt: now() });
    }
  }

  // Check for notification bell in dashboard
  const isDashboard = path.startsWith("/dashboard");
  if (isDashboard) {
    const notifBell = document.querySelector("[class*='notification'], [aria-label*='notification']");
    if (!notifBell) {
      issues.push({ id: uid(), category: "communication", severity: "medium", title: "No notification indicator in dashboard", description: "Users should see unread notification count.", suggestedFix: "Ensure NotificationBell component is visible in the dashboard header.", autoFixable: false, businessImpact: "usability", status: "open", detectedAt: now() });
    }
  }

  return issues;
}

/** Security audit (client-side checks) — Enhanced */
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

  // NEW: Check for localStorage with sensitive data patterns
  try {
    const storageKeys = Object.keys(localStorage);
    const sensitivePatterns = ["password", "secret", "token", "api_key", "credit_card"];
    const risky = storageKeys.filter(k => sensitivePatterns.some(p => k.toLowerCase().includes(p) && !k.includes("supabase")));
    if (risky.length > 0) {
      issues.push({ id: uid(), category: "security", severity: "high", title: `Potentially sensitive data in localStorage`, description: `Keys matching sensitive patterns found: ${risky.join(", ")}`, suggestedFix: "Move sensitive data to server-side sessions or encrypted storage.", autoFixable: false, businessImpact: "compliance", status: "open", detectedAt: now() });
    }
  } catch {}

  // NEW: Check for forms without CSRF protection / action attributes
  const forms = document.querySelectorAll("form[action^='http']");
  if (forms.length > 0) {
    issues.push({ id: uid(), category: "security", severity: "medium", title: `${forms.length} form(s) posting to external URLs`, description: "Forms posting data to external URLs should be verified.", suggestedFix: "Ensure external form submissions are intentional and secured.", autoFixable: false, businessImpact: "compliance", status: "open", detectedAt: now() });
  }

  return issues;
}

/** Brand consistency audit — Enhanced */
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

  // NEW: Check favicon presence
  const favicon = document.querySelector("link[rel='icon'], link[rel='shortcut icon']");
  if (!favicon) {
    issues.push({ id: uid(), category: "brand", severity: "medium", title: "Missing favicon", description: "No favicon detected. This hurts brand recognition in browser tabs.", suggestedFix: "Add a favicon link in index.html.", autoFixable: true, businessImpact: "trust", status: "open", detectedAt: now() });
  }

  // NEW: Check logo presence on page
  const logo = document.querySelector("[class*='logo'], img[alt*='logo'], img[alt*='Logo'], img[alt*='Easy-Locs']");
  if (!logo) {
    issues.push({ id: uid(), category: "brand", severity: "low", title: "No logo visible on page", description: "Brand logo should be visible, especially on public pages.", suggestedFix: "Add the Easy-Locs logo in the header or navigation.", autoFixable: false, businessImpact: "trust", status: "open", detectedAt: now() });
  }

  return issues;
}

/** Data quality audit — Enhanced with client-side checks */
export function runDataQualityAudit(): AuditIssue[] {
  const issues: AuditIssue[] = [];
  if (typeof document === "undefined") return issues;
  let id = 0;
  const uid = () => `dq-${++id}`;

  // Check for empty table rows (indicates missing data)
  const tableRows = document.querySelectorAll("table tbody tr");
  let emptyRows = 0;
  tableRows.forEach((row) => {
    const cells = row.querySelectorAll("td");
    const emptyCells = Array.from(cells).filter(c => !c.textContent?.trim()).length;
    if (cells.length > 0 && emptyCells / cells.length > 0.5) emptyRows++;
  });
  if (emptyRows > 3) {
    issues.push({ id: uid(), category: "data_quality", severity: "medium", title: `${emptyRows} table rows with mostly empty data`, description: "Data tables have rows with >50% empty cells, indicating incomplete records.", suggestedFix: "Review data completeness and fill in missing fields.", autoFixable: false, businessImpact: "trust", status: "open", detectedAt: now() });
  }

  // Check for "N/A", "undefined", "null" displayed in UI
  const bodyText = document.body?.innerText || "";
  const badPatterns = [
    { pattern: /\bundefined\b/g, label: "undefined" },
    { pattern: /\bnull\b/gi, label: "null" },
    { pattern: /\bNaN\b/g, label: "NaN" },
  ];
  badPatterns.forEach(({ pattern, label }) => {
    const matches = bodyText.match(pattern);
    if (matches && matches.length > 2) {
      issues.push({ id: uid(), category: "data_quality", severity: "high", title: `"${label}" displayed ${matches.length} time(s) in UI`, description: `Raw "${label}" values are visible to users, indicating data handling issues.`, suggestedFix: `Add null checks and fallback display values for "${label}".`, autoFixable: false, businessImpact: "trust", status: "open", detectedAt: now() });
    }
  });

  return issues;
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

  // NEW: Check for event tracking on CTAs
  const ctaButtons = document.querySelectorAll("a[href*='signup'], button[class*='primary']");
  let untracked = 0;
  ctaButtons.forEach((btn) => {
    if (!btn.getAttribute("data-track") && !btn.getAttribute("data-analytics")) untracked++;
  });
  if (untracked > 0) {
    issues.push({ id: uid(), category: "analytics", severity: "low", title: `${untracked} CTA(s) without event tracking`, description: "CTA buttons should have analytics tracking attributes.", suggestedFix: "Add data-track attributes to measure CTA performance.", autoFixable: false, businessImpact: "visibility", status: "open", detectedAt: now() });
  }

  return issues;
}

/** Mobile quality audit — Enhanced */
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

  // NEW: Check for PWA manifest
  const manifest = document.querySelector('link[rel="manifest"]');
  if (!manifest) {
    issues.push({ id: uid(), category: "mobile", severity: "low", title: "No PWA manifest detected", description: "A web app manifest improves mobile install experience.", suggestedFix: "Add a link to manifest.json for PWA capabilities.", autoFixable: true, businessImpact: "usability", status: "open", detectedAt: now() });
  }

  // NEW: Check font size readability on mobile
  if (window.innerWidth < 768) {
    const textElements = document.querySelectorAll("p, span, li, td");
    let tooSmall = 0;
    textElements.forEach(el => {
      const fontSize = parseFloat(getComputedStyle(el).fontSize);
      if (fontSize > 0 && fontSize < 12) tooSmall++;
    });
    if (tooSmall > 5) {
      issues.push({ id: uid(), category: "mobile", severity: "medium", title: `${tooSmall} text element(s) too small for mobile`, description: "Text smaller than 12px is hard to read on mobile devices.", suggestedFix: "Increase minimum font size to 14px for mobile readability.", autoFixable: false, businessImpact: "usability", status: "open", detectedAt: now() });
    }
  }

  return issues;
}

/** Payment flow audit — Enhanced with real checks */
export function runPaymentAudit(): AuditIssue[] {
  const issues: AuditIssue[] = [];
  if (typeof document === "undefined") return issues;
  let id = 0;
  const uid = () => `pay-${++id}`;

  // Check for SSL indicator on payment pages
  const path = window.location.pathname;
  const isPaymentPage = path.includes("payment") || path.includes("checkout") || path.includes("billing");
  if (isPaymentPage && window.location.protocol !== "https:") {
    issues.push({ id: uid(), category: "payment", severity: "critical", title: "Payment page not on HTTPS", description: "Payment pages must be served over HTTPS for security.", suggestedFix: "Ensure all payment pages use HTTPS.", autoFixable: false, businessImpact: "compliance", status: "open", detectedAt: now() });
  }

  // Check for payment method visibility on booking forms
  const isBookingPage = path.includes("booking") || path.includes("service/");
  if (isBookingPage) {
    const paymentMethodEl = document.querySelector("[class*='payment-method'], [class*='PaymentMethod'], [data-payment]");
    if (!paymentMethodEl) {
      issues.push({ id: uid(), category: "payment", severity: "medium", title: "No payment method selector on booking page", description: "Booking pages should clearly show available payment methods.", suggestedFix: "Add PaymentMethodSelector component to the booking flow.", autoFixable: false, businessImpact: "revenue", status: "open", detectedAt: now() });
    }
  }

  return issues;
}

/** Booking flow audit — Enhanced with real checks */
export function runBookingAudit(): AuditIssue[] {
  const issues: AuditIssue[] = [];
  if (typeof document === "undefined") return issues;
  let id = 0;
  const uid = () => `book-${++id}`;

  const path = window.location.pathname;
  const isServicePage = path.includes("service/") || path.includes("listing/");

  if (isServicePage) {
    // Check for booking CTA
    const bookingCta = document.querySelector("button[class*='book'], a[href*='book'], [data-booking-cta]");
    if (!bookingCta) {
      issues.push({ id: uid(), category: "booking", severity: "high", title: "No booking CTA on service/listing page", description: "Service and listing pages must have a clear booking button.", suggestedFix: "Add a prominent booking button above the fold.", autoFixable: false, businessImpact: "revenue", status: "open", detectedAt: now() });
    }

    // Check for calendar/date picker
    const calendar = document.querySelector("[class*='calendar'], [class*='date-picker'], input[type='date']");
    if (!calendar) {
      issues.push({ id: uid(), category: "booking", severity: "medium", title: "No date selection on booking page", description: "Booking pages should have a date picker or availability calendar.", suggestedFix: "Add ServiceBookingCalendar or date selection component.", autoFixable: false, businessImpact: "usability", status: "open", detectedAt: now() });
    }
  }

  return issues;
}

/** Content quality audit — Enhanced */
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

  // NEW: Check for broken image placeholders
  const images = document.querySelectorAll("img");
  let brokenImages = 0;
  images.forEach(img => {
    if (img.naturalWidth === 0 && img.complete && img.src) brokenImages++;
  });
  if (brokenImages > 0) {
    issues.push({ id: uid(), category: "content", severity: "high", title: `${brokenImages} broken image(s) detected`, description: "Images that failed to load create a poor user experience.", suggestedFix: "Fix image URLs or add fallback placeholders.", autoFixable: false, businessImpact: "trust", status: "open", detectedAt: now() });
  }

  // NEW: Check for duplicate content blocks
  const paragraphs = document.querySelectorAll("p");
  const seen = new Set<string>();
  let dupes = 0;
  paragraphs.forEach(p => {
    const text = p.textContent?.trim() || "";
    if (text.length > 50) {
      if (seen.has(text)) dupes++;
      seen.add(text);
    }
  });
  if (dupes > 2) {
    issues.push({ id: uid(), category: "content", severity: "medium", title: `${dupes} duplicate content block(s)`, description: "Duplicate paragraphs detected on the page.", suggestedFix: "Remove or rewrite duplicate content blocks.", autoFixable: false, businessImpact: "visibility", status: "open", detectedAt: now() });
  }

  return issues;
}
