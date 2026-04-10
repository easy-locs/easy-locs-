import type { AuditIssue } from "../types";

/** Static SEO audit — title, meta, headings, structured data, internal links */
export function runSEOAudit(): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const now = new Date().toISOString();
  let id = 0;
  const uid = () => `seo-${++id}`;

  if (typeof document === "undefined") return issues;

  // Title tag
  const title = document.title;
  if (!title || title.length < 10) {
    issues.push({
      id: uid(), category: "seo", severity: "critical",
      title: "Missing or too short page title",
      description: `Title tag is "${title || "(empty)"}". Should be 30-60 characters with target keywords.`,
      suggestedFix: "Add a descriptive title tag under 60 characters.",
      autoFixable: true, businessImpact: "visibility", status: "open", detectedAt: now,
    });
  } else if (title.length > 65) {
    issues.push({
      id: uid(), category: "seo", severity: "medium",
      title: "Title tag too long",
      description: `Title is ${title.length} characters. Google truncates after ~60 chars.`,
      suggestedFix: "Shorten the title to under 60 characters.",
      autoFixable: true, businessImpact: "visibility", status: "open", detectedAt: now,
    });
  }

  // Meta description
  const metaDesc = document.querySelector('meta[name="description"]');
  const descContent = metaDesc?.getAttribute("content") || "";
  if (!descContent || descContent.length < 50) {
    issues.push({
      id: uid(), category: "seo", severity: "high",
      title: "Missing or short meta description",
      description: "Meta description is missing or too short. Aim for 120-160 characters.",
      suggestedFix: "Write a compelling meta description with primary keywords.",
      autoFixable: true, businessImpact: "visibility", status: "open", detectedAt: now,
    });
  } else if (descContent.length > 165) {
    issues.push({
      id: uid(), category: "seo", severity: "low",
      title: "Meta description too long",
      description: `Meta description is ${descContent.length} chars. May be truncated in search results.`,
      suggestedFix: "Shorten to 120-160 characters.",
      autoFixable: true, businessImpact: "visibility", status: "open", detectedAt: now,
    });
  }

  // Canonical tag
  const canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    issues.push({
      id: uid(), category: "seo", severity: "medium",
      title: "Missing canonical tag",
      description: "No canonical URL defined. This can cause duplicate content issues.",
      suggestedFix: "Add a <link rel='canonical'> tag pointing to the preferred URL.",
      autoFixable: true, businessImpact: "visibility", status: "open", detectedAt: now,
    });
  }

  // Structured data (JSON-LD)
  const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
  if (jsonLdScripts.length === 0) {
    issues.push({
      id: uid(), category: "seo", severity: "medium",
      title: "No structured data (JSON-LD)",
      description: "No JSON-LD found. Rich snippets improve click-through rates.",
      suggestedFix: "Add Organization, Product, or LocalBusiness JSON-LD schema.",
      autoFixable: true, businessImpact: "visibility", status: "open", detectedAt: now,
    });
  }

  // Internal links analysis
  const links = document.querySelectorAll("a[href]");
  let internalCount = 0;
  let brokenAnchors = 0;
  links.forEach((a) => {
    const href = a.getAttribute("href") || "";
    if (href.startsWith("/") || href.includes(window.location.hostname)) internalCount++;
    if (href === "#" || href === "") brokenAnchors++;
  });

  if (internalCount < 3) {
    issues.push({
      id: uid(), category: "seo", severity: "medium",
      title: "Too few internal links",
      description: `Only ${internalCount} internal links found. Internal linking improves crawlability.`,
      suggestedFix: "Add contextual internal links to related pages.",
      autoFixable: false, businessImpact: "visibility", status: "open", detectedAt: now,
    });
  }

  if (brokenAnchors > 2) {
    issues.push({
      id: uid(), category: "seo", severity: "low",
      title: `${brokenAnchors} empty/anchor-only links`,
      description: "Links with href='#' or empty href waste crawl budget.",
      suggestedFix: "Replace placeholder links with real destinations or remove them.",
      autoFixable: false, businessImpact: "visibility", status: "open", detectedAt: now,
    });
  }

  // Open Graph tags
  const ogTitle = document.querySelector('meta[property="og:title"]');
  const ogDesc = document.querySelector('meta[property="og:description"]');
  const ogImage = document.querySelector('meta[property="og:image"]');
  const missingOg = [];
  if (!ogTitle) missingOg.push("og:title");
  if (!ogDesc) missingOg.push("og:description");
  if (!ogImage) missingOg.push("og:image");
  if (missingOg.length > 0) {
    issues.push({
      id: uid(), category: "seo", severity: "medium",
      title: `Missing Open Graph tags: ${missingOg.join(", ")}`,
      description: "Social sharing will lack rich previews without proper OG tags.",
      suggestedFix: "Add the missing Open Graph meta tags for better social sharing.",
      autoFixable: true, businessImpact: "visibility", status: "open", detectedAt: now,
    });
  }

  // Heading hierarchy check
  const headings = document.querySelectorAll("h1, h2, h3, h4, h5, h6");
  let prevLevel = 0;
  let skippedLevels = 0;
  headings.forEach((h) => {
    const level = parseInt(h.tagName[1]);
    if (prevLevel > 0 && level > prevLevel + 1) skippedLevels++;
    prevLevel = level;
  });
  if (skippedLevels > 0) {
    issues.push({
      id: uid(), category: "seo", severity: "low",
      title: `Heading hierarchy has ${skippedLevels} skipped level(s)`,
      description: "Headings skip levels (e.g. H1 -> H3). This weakens semantic structure.",
      suggestedFix: "Ensure headings follow proper order: H1 → H2 → H3.",
      autoFixable: false, businessImpact: "visibility", status: "open", detectedAt: now,
    });
  }

  return issues;
}
