import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { ArticleBody } from "@/components/news/ArticleBody";

describe("ArticleBody integration", () => {
  it("renders sanitized HTML when body contains HTML content", () => {
    const { container } = render(
      <ArticleBody
        body="<p>Rich <strong>text</strong> content</p>"
        summary="fallback"
        fullHtml={null}
        isLoadingFull={false}
      />
    );
    const articleBody = container.querySelector(".article-body");
    expect(articleBody).not.toBeNull();
    expect(articleBody!.innerHTML).toContain("<p>");
    expect(articleBody!.innerHTML).toContain("<strong>text</strong>");
  });

  it("renders plain text fallback when body is plain text", () => {
    const { container } = render(
      <ArticleBody body="Just a plain text body" summary="summary text" fullHtml={null} isLoadingFull={false} />
    );
    const plainText = container.querySelector("p.text-sm");
    expect(plainText).not.toBeNull();
    expect(plainText!.textContent).toBe("summary text");
  });

  it("renders plain text fallback when body is null", () => {
    const { container } = render(
      <ArticleBody body={null} summary="Only summary available" fullHtml={null} isLoadingFull={false} />
    );
    const plainText = container.querySelector("p.text-sm");
    expect(plainText).not.toBeNull();
    expect(plainText!.textContent).toBe("Only summary available");
  });

  it("falls back to summary when body is null and summary has HTML", () => {
    const { container } = render(
      <ArticleBody body={null} summary="<p>HTML summary</p>" fullHtml={null} isLoadingFull={false} />
    );
    const articleBody = container.querySelector(".article-body");
    expect(articleBody).not.toBeNull();
    expect(articleBody!.innerHTML).toContain("<p>HTML summary</p>");
  });

  it("strips dangerous content from HTML body before rendering", () => {
    const maliciousBody =
      '<p>Safe</p><script>alert("xss")</script><img onerror="alert(1)" src="x">';
    const { container } = render(
      <ArticleBody body={maliciousBody} summary="fallback" fullHtml={null} isLoadingFull={false} />
    );
    const articleBody = container.querySelector(".article-body");
    expect(articleBody).not.toBeNull();
    expect(articleBody!.innerHTML).not.toContain("<script");
    expect(articleBody!.innerHTML).not.toContain("onerror");
    expect(articleBody!.innerHTML).not.toContain("<img");
    expect(articleBody!.innerHTML).toContain("<p>Safe</p>");
  });

  it("adds safe link attributes to anchor tags in rendered HTML", () => {
    const { container } = render(
      <ArticleBody
        body='<p><a href="https://example.com">link</a></p>'
        summary="fallback"
        fullHtml={null}
        isLoadingFull={false}
      />
    );
    const anchor = container.querySelector("a");
    expect(anchor).not.toBeNull();
    expect(anchor!.getAttribute("target")).toBe("_blank");
    expect(anchor!.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("prefers fullHtml over body when provided", () => {
    const { container } = render(
      <ArticleBody
        body="<p>body content</p>"
        summary="summary"
        fullHtml="<p>Full article content</p>"
        isLoadingFull={false}
      />
    );
    const articleBody = container.querySelector(".article-body");
    expect(articleBody).not.toBeNull();
    expect(articleBody!.innerHTML).toContain("Full article content");
    expect(articleBody!.innerHTML).not.toContain("body content");
  });

  it("sanitizes fullHtml content", () => {
    const { container } = render(
      <ArticleBody
        body={null}
        summary="summary"
        fullHtml='<p>Safe</p><script>alert("xss")</script>'
        isLoadingFull={false}
      />
    );
    const articleBody = container.querySelector(".article-body");
    expect(articleBody).not.toBeNull();
    expect(articleBody!.innerHTML).not.toContain("<script");
    expect(articleBody!.innerHTML).toContain("<p>Safe</p>");
  });

  it("shows loading indicator when isLoadingFull is true", () => {
    const { container } = render(
      <ArticleBody body={null} summary="summary" fullHtml={null} isLoadingFull={true} />
    );
    expect(container.textContent).toContain("Chargement");
  });
});
