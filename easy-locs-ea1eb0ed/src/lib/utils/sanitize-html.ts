import DOMPurify from "dompurify";

const ALLOWED_TAGS = [
  "p", "br", "strong", "b", "em", "i", "u",
  "a", "ul", "ol", "li",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "blockquote", "pre", "code",
  "span", "div", "sub", "sup",
];

const ALLOWED_ATTR = ["href", "target", "rel", "title"];

const DANGEROUS_URI_PATTERN = /^(?:javascript|vbscript|data):/i;
const SVG_INJECTION_PATTERN = /<svg[\s>]/i;

DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (node.tagName === "A") {
    node.setAttribute("target", "_blank");
    node.setAttribute("rel", "noopener noreferrer");
    const href = node.getAttribute("href") || "";
    if (DANGEROUS_URI_PATTERN.test(href.trim())) {
      node.removeAttribute("href");
      node.setAttribute("href", "#");
    }
  }

  const allAttrs = node.attributes;
  if (allAttrs) {
    for (let i = allAttrs.length - 1; i >= 0; i--) {
      const attr = allAttrs[i];
      if (attr && DANGEROUS_URI_PATTERN.test((attr.value || "").trim())) {
        node.removeAttribute(attr.name);
      }
    }
  }
});

export function sanitizeHtml(dirty: string): string {
  let cleaned = dirty;
  if (SVG_INJECTION_PATTERN.test(cleaned)) {
    cleaned = cleaned.replace(/<svg[\s\S]*?<\/svg>/gi, "");
    cleaned = cleaned.replace(/<svg[\s\S]*?\/>/gi, "");
  }
  return DOMPurify.sanitize(cleaned, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ADD_ATTR: ["target", "rel"],
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form", "input", "textarea", "select", "svg", "math", "use", "foreignObject"],
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur", "onsubmit", "onreset", "onchange", "oninput", "onkeydown", "onkeyup", "onkeypress"],
    ALLOW_DATA_ATTR: false,
    ADD_URI_SAFE_ATTR: [],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  });
}

export function stripDataUris(input: string): string {
  return input.replace(/data:[^\s"'>]+/gi, "");
}

export function sanitizePlainText(input: string): string {
  if (!input) return "";
  let cleaned = DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
  cleaned = stripDataUris(cleaned);
  return cleaned.trim();
}

export function isHtmlContent(text: string): boolean {
  return /<(?:p|br|ul|ol|li|h[1-6]|strong|b|em|i|a|blockquote|div|span)\b/i.test(text);
}

const SAFE_DOM_FORBID_TAGS = [
  "script", "iframe", "object", "embed", "form",
  "input", "textarea", "select", "meta", "link",
];

const SAFE_DOM_FORBID_ATTR = [
  "onerror", "onload", "onclick", "onmouseover", "onmouseout",
  "onfocus", "onblur", "onsubmit", "onreset", "onchange",
  "oninput", "onkeydown", "onkeyup", "onkeypress",
  "onanimationstart", "onanimationend", "onanimationiteration",
  "ontransitionend", "onpointerdown", "onpointerup", "onpointermove",
];

export function sanitizeDomHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    USE_PROFILES: { html: true, svg: true, svgFilters: true },
    FORBID_TAGS: SAFE_DOM_FORBID_TAGS,
    FORBID_ATTR: SAFE_DOM_FORBID_ATTR,
    ALLOW_DATA_ATTR: false,
  });
}

export function safeSetHtml(el: Element, html: string): void {
  el.innerHTML = sanitizeDomHtml(html);
}

export function safeSetOuterHtml(el: Element, html: string): void {
  el.outerHTML = sanitizeDomHtml(html);
}
