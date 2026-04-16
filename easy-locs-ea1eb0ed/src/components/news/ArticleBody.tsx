import { useMemo } from "react";
import { Loader2, Lock, Zap } from "lucide-react";
import { sanitizeHtml, isHtmlContent } from "@/lib/utils/sanitize-html";

export function ArticleBody({
  body,
  summary,
  fullHtml,
  isLoadingFull,
  paywallDetected,
  paywallMessage,
  fromCache,
}: {
  body: string | null;
  summary: string;
  fullHtml: string | null;
  isLoadingFull: boolean;
  paywallDetected?: boolean;
  paywallMessage?: string;
  fromCache?: boolean;
}) {
  const htmlContent = useMemo(() => {
    if (fullHtml) {
      return sanitizeHtml(fullHtml);
    }
    const raw = body ?? summary;
    if (isHtmlContent(raw)) {
      return sanitizeHtml(raw);
    }
    return null;
  }, [body, summary, fullHtml]);

  return (
    <div
      className="w-full rounded-xl p-4 mb-6"
      style={{
        background: "hsl(var(--card))",
        border: "1px solid hsl(var(--border))",
      }}
    >
      {isLoadingFull && (
        <div className="flex items-center gap-2 mb-3 pb-3" style={{ borderBottom: "1px solid hsl(var(--border)/0.5)" }}>
          <Loader2 size={14} className="animate-spin text-accent" />
          <span className="text-xs text-muted-foreground">
            Chargement de l'article complet…
          </span>
        </div>
      )}
      {paywallDetected && !isLoadingFull && (
        <div
          className="flex items-center gap-2 mb-3 pb-3"
          style={{ borderBottom: "1px solid hsl(var(--border)/0.5)" }}
        >
          <Lock size={14} className="text-warning" />
          <span className="text-xs text-warning">
            {paywallMessage ?? "Contenu protégé par un paywall — résumé RSS affiché"}
          </span>
        </div>
      )}
      {fromCache && !isLoadingFull && (
        <div
          className="flex items-center gap-1.5 mb-3 pb-3"
          style={{ borderBottom: "1px solid hsl(var(--border)/0.5)" }}
        >
          <Zap size={12} className="text-success" />
          <span className="text-[0.6875rem] font-medium text-success/85">
            Chargement instantané
          </span>
        </div>
      )}
      {htmlContent ? (
        <div
          className="article-body text-sm leading-relaxed text-foreground/85"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      ) : (
        <p className="text-sm leading-relaxed text-foreground/85">
          {summary}
        </p>
      )}

      <style>{`
        .article-body strong, .article-body b { font-weight: 700; }
        .article-body a { color: hsl(var(--accent)); text-decoration: underline; text-underline-offset: 2px; }
        .article-body a:hover { opacity: 0.8; }
        .article-body ul, .article-body ol { padding-left: 1.25rem; margin: 0.75rem 0; }
        .article-body ul { list-style-type: disc; }
        .article-body ol { list-style-type: decimal; }
        .article-body li { margin-bottom: 0.25rem; }
        .article-body p { margin-bottom: 0.75rem; }
        .article-body p:last-child { margin-bottom: 0; }
        .article-body h2, .article-body h3, .article-body h4 { font-weight: 700; margin: 1rem 0 0.5rem; }
        .article-body h2 { font-size: 1.125rem; }
        .article-body h3 { font-size: 1rem; }
        .article-body blockquote { border-left: 3px solid hsl(var(--accent) / 0.4); padding-left: 1rem; margin: 0.75rem 0; font-style: italic; opacity: 0.85; }
      `}</style>
    </div>
  );
}
