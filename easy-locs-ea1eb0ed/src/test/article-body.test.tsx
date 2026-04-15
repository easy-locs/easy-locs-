import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ArticleBody } from "@/components/news/ArticleBody";

vi.mock("@/lib/utils/sanitize-html", () => ({
  sanitizeHtml: (html: string) => html,
  isHtmlContent: (text: string) => text.includes("<"),
}));

describe("ArticleBody", () => {
  describe("loading state", () => {
    it("shows loading indicator when isLoadingFull is true", () => {
      render(
        <ArticleBody
          body={null}
          summary="Summary text"
          fullHtml={null}
          isLoadingFull={true}
        />
      );

      expect(screen.getByText("Chargement de l'article complet…")).toBeInTheDocument();
    });

    it("hides loading indicator when isLoadingFull is false", () => {
      render(
        <ArticleBody
          body={null}
          summary="Summary text"
          fullHtml={null}
          isLoadingFull={false}
        />
      );

      expect(screen.queryByText("Chargement de l'article complet…")).not.toBeInTheDocument();
    });
  });

  describe("paywall state", () => {
    it("shows default paywall message when paywallDetected is true and no custom message", () => {
      render(
        <ArticleBody
          body={null}
          summary="Summary text"
          fullHtml={null}
          isLoadingFull={false}
          paywallDetected={true}
        />
      );

      expect(
        screen.getByText("Contenu protégé par un paywall — résumé RSS affiché")
      ).toBeInTheDocument();
    });

    it("shows custom paywall message when provided", () => {
      render(
        <ArticleBody
          body={null}
          summary="Summary text"
          fullHtml={null}
          isLoadingFull={false}
          paywallDetected={true}
          paywallMessage="Article réservé aux abonnés"
        />
      );

      expect(screen.getByText("Article réservé aux abonnés")).toBeInTheDocument();
    });

    it("hides paywall message when loading", () => {
      render(
        <ArticleBody
          body={null}
          summary="Summary text"
          fullHtml={null}
          isLoadingFull={true}
          paywallDetected={true}
        />
      );

      expect(
        screen.queryByText("Contenu protégé par un paywall — résumé RSS affiché")
      ).not.toBeInTheDocument();
    });

    it("does not show paywall message when paywallDetected is false", () => {
      render(
        <ArticleBody
          body={null}
          summary="Summary text"
          fullHtml={null}
          isLoadingFull={false}
          paywallDetected={false}
        />
      );

      expect(
        screen.queryByText("Contenu protégé par un paywall — résumé RSS affiché")
      ).not.toBeInTheDocument();
    });

    it("does not show paywall message when paywallDetected is undefined", () => {
      render(
        <ArticleBody
          body={null}
          summary="Summary text"
          fullHtml={null}
          isLoadingFull={false}
        />
      );

      expect(
        screen.queryByText("Contenu protégé par un paywall — résumé RSS affiché")
      ).not.toBeInTheDocument();
    });

    it("renders Lock icon when paywall is detected", () => {
      const { container } = render(
        <ArticleBody
          body={null}
          summary="Summary text"
          fullHtml={null}
          isLoadingFull={false}
          paywallDetected={true}
        />
      );

      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });
  });

  describe("content rendering", () => {
    it("renders summary as plain text when no HTML content", () => {
      render(
        <ArticleBody
          body={null}
          summary="This is a plain text summary"
          fullHtml={null}
          isLoadingFull={false}
        />
      );

      expect(screen.getByText("This is a plain text summary")).toBeInTheDocument();
    });

    it("renders fullHtml when provided", () => {
      const { container } = render(
        <ArticleBody
          body={null}
          summary="Summary"
          fullHtml="<p>Full article content</p>"
          isLoadingFull={false}
        />
      );

      const articleDiv = container.querySelector(".article-body");
      expect(articleDiv).toBeInTheDocument();
      expect(articleDiv!.innerHTML).toContain("Full article content");
    });

    it("prefers fullHtml over body", () => {
      const { container } = render(
        <ArticleBody
          body="<p>Body content</p>"
          summary="Summary"
          fullHtml="<p>Full HTML content</p>"
          isLoadingFull={false}
        />
      );

      const articleDiv = container.querySelector(".article-body");
      expect(articleDiv!.innerHTML).toContain("Full HTML content");
      expect(articleDiv!.innerHTML).not.toContain("Body content");
    });

    it("falls back to body when fullHtml is null", () => {
      const { container } = render(
        <ArticleBody
          body="<p>Body content here</p>"
          summary="Summary"
          fullHtml={null}
          isLoadingFull={false}
        />
      );

      const articleDiv = container.querySelector(".article-body");
      expect(articleDiv).toBeInTheDocument();
      expect(articleDiv!.innerHTML).toContain("Body content here");
    });

    it("shows summary text when both body and fullHtml are null", () => {
      render(
        <ArticleBody
          body={null}
          summary="Fallback summary text"
          fullHtml={null}
          isLoadingFull={false}
        />
      );

      expect(screen.getByText("Fallback summary text")).toBeInTheDocument();
    });

    it("renders paywall message alongside summary for paywalled articles", () => {
      render(
        <ArticleBody
          body={null}
          summary="Brief RSS summary"
          fullHtml={null}
          isLoadingFull={false}
          paywallDetected={true}
          paywallMessage="Contenu protégé par un paywall — résumé RSS affiché"
        />
      );

      expect(screen.getByText("Contenu protégé par un paywall — résumé RSS affiché")).toBeInTheDocument();
      expect(screen.getByText("Brief RSS summary")).toBeInTheDocument();
    });

    it("renders paywall message alongside full HTML for partially paywalled articles", () => {
      const { container } = render(
        <ArticleBody
          body={null}
          summary="Summary"
          fullHtml="<p>Partial article before paywall</p>"
          isLoadingFull={false}
          paywallDetected={true}
        />
      );

      expect(
        screen.getByText("Contenu protégé par un paywall — résumé RSS affiché")
      ).toBeInTheDocument();
      const articleDiv = container.querySelector(".article-body");
      expect(articleDiv!.innerHTML).toContain("Partial article before paywall");
    });
  });
});
