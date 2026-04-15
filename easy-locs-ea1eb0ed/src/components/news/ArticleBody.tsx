import { useMemo } from "react";
import { Loader2 } from "lucide-react";
import { sanitizeHtml, isHtmlContent } from "@/lib/utils/sanitize-html";

const GOLD = "hsl(var(--accent))";

export function ArticleBody({ body, summary, fullHtml, isLoadingFull }: { body: string | null; summary: string; fullHtml: string | null; isLoadingFull: boolean }) {
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
          <Loader2 size={14} className="animate-spin" style={{ color: GOLD }} />
          <span className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
            Chargement de l'article complet…
          </span>
        </div>
      )}
      {htmlContent ? (
        <div
          className="article-body text-sm leading-relaxed"
          style={{ color: "hsl(var(--foreground)/0.85)" }}
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      ) : (
        <p
          className="text-sm leading-relaxed"
          style={{ color: "hsl(var(--foreground)/0.85)" }}
        >
          {summary}
        </p>
      )}
    </div>
  );
}
