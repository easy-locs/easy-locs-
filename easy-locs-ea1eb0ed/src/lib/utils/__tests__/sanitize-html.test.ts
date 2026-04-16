import { describe, it, expect } from "vitest";
import { sanitizeHtml, sanitizePlainText, stripDataUris, isHtmlContent } from "../sanitize-html";

describe("sanitizeHtml", () => {
  describe("script injection", () => {
    it("strips <script> tags entirely", () => {
      const result = sanitizeHtml('<p>Hello</p><script>alert("xss")</script>');
      expect(result).not.toContain("<script");
      expect(result).not.toContain("alert");
      expect(result).toContain("<p>Hello</p>");
    });

    it("strips nested script tags", () => {
      const result = sanitizeHtml(
        '<div><script><script>alert("nested")</script></script></div>'
      );
      expect(result).not.toContain("<script");
      expect(result).not.toContain("alert");
    });

    it("strips script tags with attributes", () => {
      const result = sanitizeHtml(
        '<script type="text/javascript" src="https://evil.com/xss.js"></script>'
      );
      expect(result).not.toContain("<script");
      expect(result).not.toContain("evil.com");
    });

    it("strips script tags with mixed case", () => {
      const result = sanitizeHtml('<ScRiPt>alert("xss")</ScRiPt>');
      expect(result).not.toContain("alert");
    });
  });

  describe("event handler attributes", () => {
    it("strips onerror attribute", () => {
      const result = sanitizeHtml('<div onerror="alert(1)">test</div>');
      expect(result).not.toContain("onerror");
      expect(result).toContain("test");
    });

    it("strips onclick attribute", () => {
      const result = sanitizeHtml('<p onclick="alert(1)">click me</p>');
      expect(result).not.toContain("onclick");
      expect(result).toContain("click me");
    });

    it("strips onload attribute", () => {
      const result = sanitizeHtml('<div onload="alert(1)">content</div>');
      expect(result).not.toContain("onload");
    });

    it("strips onmouseover attribute", () => {
      const result = sanitizeHtml(
        '<span onmouseover="alert(1)">hover</span>'
      );
      expect(result).not.toContain("onmouseover");
    });

    it("strips onfocus attribute", () => {
      const result = sanitizeHtml('<div onfocus="alert(1)">focus</div>');
      expect(result).not.toContain("onfocus");
    });

    it("strips onblur attribute", () => {
      const result = sanitizeHtml('<div onblur="alert(1)">blur</div>');
      expect(result).not.toContain("onblur");
    });

    it("strips on* attributes not in explicit forbid list (DOMPurify default)", () => {
      const result = sanitizeHtml(
        '<div onkeydown="alert(1)" onsubmit="alert(2)">test</div>'
      );
      expect(result).not.toContain("onkeydown");
      expect(result).not.toContain("onsubmit");
    });
  });

  describe("javascript: URLs", () => {
    it("strips javascript: href on anchor tags", () => {
      const result = sanitizeHtml(
        '<a href="javascript:alert(1)">click</a>'
      );
      expect(result).not.toContain("javascript:");
      expect(result).toContain("click");
    });

    it("strips javascript: with mixed case and whitespace", () => {
      const result = sanitizeHtml(
        '<a href="  JaVaScRiPt:alert(1)">click</a>'
      );
      expect(result).not.toContain("alert");
    });

    it("strips javascript: with encoded entities", () => {
      const result = sanitizeHtml(
        '<a href="&#106;avascript:alert(1)">click</a>'
      );
      expect(result).not.toContain("javascript");
    });

    it("strips javascript: with tab/newline obfuscation", () => {
      const result = sanitizeHtml(
        '<a href="java\tscri\npt:alert(1)">click</a>'
      );
      expect(result).not.toContain("alert");
    });

    it("results in anchor without dangerous href after stripping javascript:", () => {
      const result = sanitizeHtml(
        '<a href="javascript:alert(1)">click</a>'
      );
      const parser = new DOMParser();
      const doc = parser.parseFromString(result, "text/html");
      const anchor = doc.querySelector("a");
      expect(anchor).not.toBeNull();
      const href = anchor!.getAttribute("href") ?? "";
      expect(href).not.toMatch(/^javascript:/i);
    });
  });

  describe("forbidden tags", () => {
    it("strips style tags", () => {
      const result = sanitizeHtml(
        "<style>body { display: none }</style><p>safe</p>"
      );
      expect(result).not.toContain("<style");
      expect(result).toContain("<p>safe</p>");
    });

    it("strips iframe tags", () => {
      const result = sanitizeHtml(
        '<iframe src="https://evil.com"></iframe><p>safe</p>'
      );
      expect(result).not.toContain("<iframe");
      expect(result).toContain("<p>safe</p>");
    });

    it("strips object tags", () => {
      const result = sanitizeHtml(
        '<object data="https://evil.com"></object>'
      );
      expect(result).not.toContain("<object");
    });

    it("strips embed tags", () => {
      const result = sanitizeHtml(
        '<embed src="https://evil.com"></embed>'
      );
      expect(result).not.toContain("<embed");
    });

    it("strips form/input/textarea/select tags", () => {
      const result = sanitizeHtml(
        '<form><input type="text"><textarea></textarea><select><option>1</option></select></form>'
      );
      expect(result).not.toContain("<form");
      expect(result).not.toContain("<input");
      expect(result).not.toContain("<textarea");
      expect(result).not.toContain("<select");
    });
  });

  describe("safe tags pass-through", () => {
    it("preserves paragraph tags", () => {
      const result = sanitizeHtml("<p>Hello world</p>");
      expect(result).toBe("<p>Hello world</p>");
    });

    it("preserves formatting tags", () => {
      const result = sanitizeHtml(
        "<strong>bold</strong> <em>italic</em> <u>underline</u>"
      );
      expect(result).toContain("<strong>bold</strong>");
      expect(result).toContain("<em>italic</em>");
      expect(result).toContain("<u>underline</u>");
    });

    it("preserves list tags", () => {
      const result = sanitizeHtml(
        "<ul><li>item 1</li><li>item 2</li></ul>"
      );
      expect(result).toContain("<ul>");
      expect(result).toContain("<li>item 1</li>");
    });

    it("preserves heading tags", () => {
      const result = sanitizeHtml("<h1>Title</h1><h3>Subtitle</h3>");
      expect(result).toContain("<h1>Title</h1>");
      expect(result).toContain("<h3>Subtitle</h3>");
    });

    it("preserves blockquote and code tags", () => {
      const result = sanitizeHtml(
        "<blockquote>quote</blockquote><pre><code>code</code></pre>"
      );
      expect(result).toContain("<blockquote>quote</blockquote>");
      expect(result).toContain("<code>code</code>");
    });

    it("preserves br tags", () => {
      const result = sanitizeHtml("line 1<br>line 2");
      expect(result).toContain("<br>");
    });

    it("strips disallowed tags but keeps their text content", () => {
      const result = sanitizeHtml("<img src='x'><p>safe</p>");
      expect(result).not.toContain("<img");
      expect(result).toContain("<p>safe</p>");
    });
  });

  describe("link rewriting (target/rel)", () => {
    it("adds target=_blank to anchor tags", () => {
      const result = sanitizeHtml('<a href="https://example.com">link</a>');
      expect(result).toContain('target="_blank"');
    });

    it("adds rel=noopener noreferrer to anchor tags", () => {
      const result = sanitizeHtml('<a href="https://example.com">link</a>');
      expect(result).toContain('rel="noopener noreferrer"');
    });

    it("overwrites existing target/rel with safe values", () => {
      const result = sanitizeHtml(
        '<a href="https://example.com" target="_self" rel="opener">link</a>'
      );
      expect(result).toContain('target="_blank"');
      expect(result).toContain('rel="noopener noreferrer"');
      expect(result).not.toContain("_self");
      expect(result).not.toContain('"opener"');
    });

    it("preserves href attribute on links", () => {
      const result = sanitizeHtml(
        '<a href="https://example.com">link</a>'
      );
      expect(result).toContain('href="https://example.com"');
    });
  });

  describe("malformed HTML", () => {
    it("handles unclosed tags gracefully", () => {
      const result = sanitizeHtml("<p>unclosed paragraph");
      expect(result).toContain("unclosed paragraph");
    });

    it("handles deeply nested malformed markup", () => {
      const result = sanitizeHtml(
        "<div><div><div><p>deep</p></div></div></div>"
      );
      expect(result).toContain("deep");
    });

    it("handles empty input", () => {
      const result = sanitizeHtml("");
      expect(result).toBe("");
    });

    it("handles input with only whitespace", () => {
      const result = sanitizeHtml("   ");
      expect(result).toBe("   ");
    });
  });
});

describe("isHtmlContent", () => {
  it("returns true for text containing HTML tags", () => {
    expect(isHtmlContent("<p>paragraph</p>")).toBe(true);
    expect(isHtmlContent("<strong>bold</strong>")).toBe(true);
    expect(isHtmlContent("<ul><li>list</li></ul>")).toBe(true);
    expect(isHtmlContent("<h1>heading</h1>")).toBe(true);
    expect(isHtmlContent("<a href='#'>link</a>")).toBe(true);
    expect(isHtmlContent("<br>")).toBe(true);
    expect(isHtmlContent("<div>block</div>")).toBe(true);
    expect(isHtmlContent("<blockquote>quote</blockquote>")).toBe(true);
  });

  it("returns false for plain text without HTML", () => {
    expect(isHtmlContent("just plain text")).toBe(false);
    expect(isHtmlContent("no html here < but close >")).toBe(false);
    expect(isHtmlContent("")).toBe(false);
  });

  it("returns false for non-allowed HTML tags only", () => {
    expect(isHtmlContent("<script>alert(1)</script>")).toBe(false);
    expect(isHtmlContent("<img src='x'>")).toBe(false);
  });
});

describe("XSS sanitization — data: URI vectors", () => {
  it("strips data:text/html payloads from href", () => {
    const result = sanitizeHtml(
      '<a href="data:text/html,<script>alert(1)</script>">click</a>'
    );
    expect(result).not.toContain("data:");
    expect(result).not.toContain("alert");
  });

  it("strips data:text/html with base64 encoding", () => {
    const result = sanitizeHtml(
      '<a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">click</a>'
    );
    expect(result).not.toContain("data:");
  });

  it("strips data: URIs in non-href attributes", () => {
    const result = sanitizeHtml(
      '<div style="background:url(data:image/svg+xml,<svg onload=alert(1)>)">test</div>'
    );
    expect(result).not.toContain("data:");
    expect(result).not.toContain("onload");
    expect(result).toContain("test");
  });

  it("strips data: URIs with mixed case", () => {
    const result = sanitizeHtml(
      '<a href="DaTa:text/html,<script>alert(1)</script>">click</a>'
    );
    expect(result).not.toContain("alert");
  });

  it("allows normal https: href links", () => {
    const result = sanitizeHtml(
      '<a href="https://example.com">safe link</a>'
    );
    expect(result).toContain('href="https://example.com"');
    expect(result).toContain("safe link");
  });

  it("strips vbscript: URIs", () => {
    const result = sanitizeHtml(
      '<a href="vbscript:MsgBox(1)">click</a>'
    );
    expect(result).not.toContain("vbscript:");
  });
});

describe("XSS sanitization — SVG-based vectors", () => {
  it("strips inline SVG with onload handler", () => {
    const result = sanitizeHtml(
      '<svg onload="alert(1)"><circle r="10"/></svg>'
    );
    expect(result).not.toContain("<svg");
    expect(result).not.toContain("onload");
    expect(result).not.toContain("alert");
  });

  it("strips SVG with embedded script tag", () => {
    const result = sanitizeHtml(
      '<svg><script>alert(1)</script></svg>'
    );
    expect(result).not.toContain("<svg");
    expect(result).not.toContain("<script");
    expect(result).not.toContain("alert");
  });

  it("strips SVG with foreignObject XSS", () => {
    const result = sanitizeHtml(
      '<svg><foreignObject><body onload="alert(1)"></body></foreignObject></svg>'
    );
    expect(result).not.toContain("<svg");
    expect(result).not.toContain("foreignObject");
    expect(result).not.toContain("alert");
  });

  it("strips SVG with use element for external reference", () => {
    const result = sanitizeHtml(
      '<svg><use href="https://evil.com/xss.svg#payload"/></svg>'
    );
    expect(result).not.toContain("<svg");
    expect(result).not.toContain("<use");
    expect(result).not.toContain("evil.com");
  });

  it("strips SVG with animate handler", () => {
    const result = sanitizeHtml(
      '<svg><animate onbegin="alert(1)"/></svg>'
    );
    expect(result).not.toContain("<svg");
    expect(result).not.toContain("onbegin");
  });

  it("strips self-closing SVG tags", () => {
    const result = sanitizeHtml(
      '<svg onload="alert(1)"/><p>safe</p>'
    );
    expect(result).not.toContain("<svg");
    expect(result).toContain("<p>safe</p>");
  });

  it("strips SVG embedded in div content", () => {
    const result = sanitizeHtml(
      '<div><p>Hello</p><svg><script>alert("xss")</script></svg><p>World</p></div>'
    );
    expect(result).not.toContain("<svg");
    expect(result).not.toContain("alert");
    expect(result).toContain("Hello");
    expect(result).toContain("World");
  });

  it("strips math tags (MathML injection)", () => {
    const result = sanitizeHtml(
      '<math><mtext><table><mglyph><style><!--</style><img src=x onerror=alert(1)></table></mtext></math>'
    );
    expect(result).not.toContain("<math");
    expect(result).not.toContain("onerror");
  });
});

describe("stripDataUris", () => {
  it("removes data: URIs from text", () => {
    const result = stripDataUris('Check this: data:text/html,<script>alert(1)</script>');
    expect(result).not.toContain("data:");
    expect(result).toContain("Check this:");
  });

  it("removes multiple data: URIs", () => {
    const result = stripDataUris('data:image/png;base64,abc data:text/html,xss');
    expect(result).not.toContain("data:");
  });

  it("preserves text without data: URIs", () => {
    const result = stripDataUris("Normal text without data URIs");
    expect(result).toBe("Normal text without data URIs");
  });
});

describe("sanitizePlainText", () => {
  it("strips all HTML tags", () => {
    const result = sanitizePlainText("<p>Hello <b>World</b></p>");
    expect(result).toBe("Hello World");
  });

  it("strips data: URIs from plain text", () => {
    const result = sanitizePlainText("Visit data:text/html,<script>alert(1)</script> for info");
    expect(result).not.toContain("data:");
    expect(result).not.toContain("alert");
  });

  it("returns empty string for empty input", () => {
    expect(sanitizePlainText("")).toBe("");
  });

  it("trims whitespace", () => {
    const result = sanitizePlainText("  hello  ");
    expect(result).toBe("hello");
  });
});
