/**
 * AI Operating Layer — Auto-Fix Engine
 * 
 * Applies automatic corrections for common issues detected by audit engines.
 * Only fixes issues marked as autoFixable: true.
 */

import type { AuditIssue } from "./types";
import { APP_BASE_URL } from "@/lib/app-domain";

export interface AutoFixResult {
  issueId: string;
  fixed: boolean;
  action: string;
  details?: string;
}

/**
 * Attempt to auto-fix a specific issue.
 * Returns the fix result — UI should update the issue status accordingly.
 */
export function autoFixIssue(issue: AuditIssue): AutoFixResult {
  if (!issue.autoFixable) {
    return { issueId: issue.id, fixed: false, action: "skipped", details: "Issue is not auto-fixable." };
  }

  try {
    switch (issue.category) {
      case "seo":
        return fixSEOIssue(issue);
      case "brand":
        return fixBrandIssue(issue);
      case "security":
        return fixSecurityIssue(issue);
      case "mobile":
        return fixMobileIssue(issue);
      case "international":
        return fixInternationalIssue(issue);
      case "ui_ux":
        return fixUIUXIssue(issue);
      default:
        return { issueId: issue.id, fixed: false, action: "no-handler", details: `No auto-fix handler for category: ${issue.category}` };
    }
  } catch (err) {
    return { issueId: issue.id, fixed: false, action: "error", details: String(err) };
  }
}

/**
 * Attempt to auto-fix all fixable issues in a report.
 */
export function autoFixAll(issues: AuditIssue[]): AutoFixResult[] {
  return issues
    .filter(i => i.autoFixable && i.status === "open")
    .map(i => autoFixIssue(i));
}

// ═══════════════════════════════════════════════════════
// SEO Auto-Fixes
// ═══════════════════════════════════════════════════════

function fixSEOIssue(issue: AuditIssue): AutoFixResult {
  if (typeof document === "undefined") {
    return { issueId: issue.id, fixed: false, action: "ssr-skip", details: "Cannot fix in SSR context." };
  }

  // Fix missing/short title
  if (issue.title.includes("page title")) {
    const currentTitle = document.title;
    if (!currentTitle || currentTitle.length < 10) {
      const path = window.location.pathname;
      const slug = path.split("/").filter(Boolean).pop() || "Home";
      const readable = slug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
      document.title = `${readable} — Easy-Locs® | Super App`;
      return { issueId: issue.id, fixed: true, action: "title-generated", details: `Set title to: ${document.title}` };
    }
  }

  // Fix long title
  if (issue.title.includes("Title tag too long")) {
    const t = document.title;
    if (t.length > 65) {
      document.title = t.slice(0, 57) + "…";
      return { issueId: issue.id, fixed: true, action: "title-truncated", details: `Truncated to: ${document.title}` };
    }
  }

  // Fix missing meta description
  if (issue.title.includes("meta description")) {
    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    if (!meta.content || meta.content.length < 50) {
      const path = window.location.pathname;
      meta.content = `Easy-Locs® — Super app for food, services, taxi, hotel and more. Order, book and manage everything in one platform across 190+ countries.`;
      return { issueId: issue.id, fixed: true, action: "meta-desc-generated", details: `Set meta description (${meta.content.length} chars)` };
    }
  }

  // Fix missing canonical
  if (issue.title.includes("canonical")) {
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      canonical.href = window.location.href.split("?")[0];
      document.head.appendChild(canonical);
      return { issueId: issue.id, fixed: true, action: "canonical-added", details: `Canonical set to: ${canonical.href}` };
    }
  }

  // Fix missing OG tags
  if (issue.title.includes("Open Graph")) {
    const ogTags = [
      { property: "og:title", content: document.title },
      { property: "og:description", content: document.querySelector('meta[name="description"]')?.getAttribute("content") || "Easy-Locs® — Super app for food, services, taxi, hotel and more in 190+ countries" },
      { property: "og:image", content: `${APP_BASE_URL}/og-default.jpg` },
      { property: "og:url", content: window.location.href },
      { property: "og:type", content: "website" },
    ];
    let added = 0;
    ogTags.forEach(({ property, content }) => {
      if (!document.querySelector(`meta[property="${property}"]`)) {
        const meta = document.createElement("meta");
        meta.setAttribute("property", property);
        meta.content = content;
        document.head.appendChild(meta);
        added++;
      }
    });
    if (added > 0) {
      return { issueId: issue.id, fixed: true, action: "og-tags-added", details: `Added ${added} Open Graph tag(s)` };
    }
  }

  return { issueId: issue.id, fixed: false, action: "no-match", details: "No matching SEO fix." };
}

// ═══════════════════════════════════════════════════════
// Brand Auto-Fixes
// ═══════════════════════════════════════════════════════

function fixBrandIssue(issue: AuditIssue): AutoFixResult {
  if (issue.title.includes("favicon")) {
    if (typeof document !== "undefined") {
      let favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
      if (!favicon) {
        favicon = document.createElement("link");
        favicon.rel = "icon";
        favicon.href = "/favicon.png";
        document.head.appendChild(favicon);
        return { issueId: issue.id, fixed: true, action: "favicon-added", details: "Added favicon link" };
      }
    }
  }

  // Brand name auto-fix is informational — we can't replace in rendered React DOM
  return { issueId: issue.id, fixed: false, action: "manual-required", details: "Brand name consistency requires code-level changes." };
}

// ═══════════════════════════════════════════════════════
// Security Auto-Fixes
// ═══════════════════════════════════════════════════════

function fixSecurityIssue(issue: AuditIssue): AutoFixResult {
  if (typeof document === "undefined") {
    return { issueId: issue.id, fixed: false, action: "ssr-skip" };
  }

  // Fix password autocomplete
  if (issue.title.includes("autocomplete")) {
    const pwInputs = document.querySelectorAll("input[type='password']:not([autocomplete])");
    pwInputs.forEach(input => {
      input.setAttribute("autocomplete", "current-password");
    });
    if (pwInputs.length > 0) {
      return { issueId: issue.id, fixed: true, action: "autocomplete-added", details: `Fixed ${pwInputs.length} password input(s)` };
    }
  }

  // Fix mixed content — upgrade http to https
  if (issue.title.includes("mixed content")) {
    const httpElements = document.querySelectorAll("[src^='http:'], [href^='http:']");
    let fixed = 0;
    httpElements.forEach(el => {
      const src = el.getAttribute("src");
      const href = el.getAttribute("href");
      if (src?.startsWith("http:")) {
        el.setAttribute("src", src.replace("http:", "https:"));
        fixed++;
      }
      if (href?.startsWith("http:")) {
        el.setAttribute("href", href.replace("http:", "https:"));
        fixed++;
      }
    });
    if (fixed > 0) {
      return { issueId: issue.id, fixed: true, action: "https-upgraded", details: `Upgraded ${fixed} resource(s) to HTTPS` };
    }
  }

  return { issueId: issue.id, fixed: false, action: "no-match" };
}

// ═══════════════════════════════════════════════════════
// Mobile Auto-Fixes
// ═══════════════════════════════════════════════════════

function fixMobileIssue(issue: AuditIssue): AutoFixResult {
  if (typeof document === "undefined") {
    return { issueId: issue.id, fixed: false, action: "ssr-skip" };
  }

  // Fix missing viewport
  if (issue.title.includes("viewport")) {
    let viewport = document.querySelector('meta[name="viewport"]') as HTMLMetaElement | null;
    if (!viewport) {
      viewport = document.createElement("meta");
      viewport.name = "viewport";
      viewport.content = "width=device-width, initial-scale=1";
      document.head.appendChild(viewport);
      return { issueId: issue.id, fixed: true, action: "viewport-added", details: "Added viewport meta tag" };
    }
  }

  return { issueId: issue.id, fixed: false, action: "no-match" };
}

// ═══════════════════════════════════════════════════════
// International Auto-Fixes
// ═══════════════════════════════════════════════════════

function fixInternationalIssue(issue: AuditIssue): AutoFixResult {
  if (typeof document === "undefined") {
    return { issueId: issue.id, fixed: false, action: "ssr-skip" };
  }

  // Fix HTML lang
  if (issue.title.includes("lang attribute")) {
    const savedLocale = localStorage.getItem("app_locale") || "fr";
    document.documentElement.lang = savedLocale;
    return { issueId: issue.id, fixed: true, action: "lang-set", details: `Set lang="${savedLocale}"` };
  }

  // Fix RTL direction
  if (issue.title.includes("RTL")) {
    document.documentElement.dir = "rtl";
    return { issueId: issue.id, fixed: true, action: "dir-set", details: 'Set dir="rtl"' };
  }

  return { issueId: issue.id, fixed: false, action: "no-match" };
}

// ═══════════════════════════════════════════════════════
// UI/UX Auto-Fixes
// ═══════════════════════════════════════════════════════

function fixUIUXIssue(issue: AuditIssue): AutoFixResult {
  if (typeof document === "undefined") {
    return { issueId: issue.id, fixed: false, action: "ssr-skip" };
  }

  // Fix missing alt text on images
  if (issue.title.includes("alt text")) {
    const imgs = document.querySelectorAll("img:not([alt]), img[alt='']");
    imgs.forEach((img, i) => {
      const src = img.getAttribute("src") || "";
      const filename = src.split("/").pop()?.split(".")[0]?.replace(/-/g, " ") || `Image ${i + 1}`;
      img.setAttribute("alt", filename);
    });
    if (imgs.length > 0) {
      return { issueId: issue.id, fixed: true, action: "alt-text-added", details: `Added alt text to ${imgs.length} image(s)` };
    }
  }

  // Fix icon-only buttons
  if (issue.title.includes("accessible label")) {
    const buttons = document.querySelectorAll("button");
    let fixed = 0;
    buttons.forEach(btn => {
      if (!btn.textContent?.trim() && !btn.getAttribute("aria-label")) {
        const icon = btn.querySelector("svg");
        const className = icon?.getAttribute("class") || "";
        const label = className.includes("trash") ? "Delete" :
                      className.includes("edit") ? "Edit" :
                      className.includes("close") ? "Close" :
                      className.includes("search") ? "Search" :
                      "Action";
        btn.setAttribute("aria-label", label);
        fixed++;
      }
    });
    if (fixed > 0) {
      return { issueId: issue.id, fixed: true, action: "aria-labels-added", details: `Added aria-label to ${fixed} button(s)` };
    }
  }

  return { issueId: issue.id, fixed: false, action: "no-match" };
}
