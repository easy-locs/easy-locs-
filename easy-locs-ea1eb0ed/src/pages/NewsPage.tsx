import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Newspaper, Clock, Globe, ExternalLink, X, RefreshCw, AlertCircle, ArrowLeft, Calendar, Share2, Check, Loader2 } from "lucide-react";
import { BrandRefreshIndicator } from "@/components/brand/BrandRefreshIndicator";
import SEOHead from "@/components/SEOHead";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";
import { useNewsData, type NewsCategory } from "@/hooks/useNewsData";
import type { CanonicalGlobalFeedItem } from "@/domains/shared/canonical-types";
import { getReadingTime } from "@/lib/utils/reading-time";
import { fetchArticleContent } from "@/lib/utils/article-extractor";
import { ArticleBody } from "@/components/news/ArticleBody";
import { useI18n } from "@/lib/i18n";

const NAVY = "hsl(226 22% 14%)";
const GOLD = "hsl(var(--accent))";

const CATEGORY_KEYS: { key: NewsCategory; labelKey: string }[] = [
  { key: "all", labelKey: "page.news.categories.all" },
  { key: "immobilier", labelKey: "page.news.categories.immobilier" },
  { key: "finance", labelKey: "page.news.categories.finance" },
  { key: "economie", labelKey: "page.news.categories.economie" },
  { key: "local", labelKey: "page.news.categories.local" },
];

function formatRelativeTime(isoDate: string, t: (key: string, vars?: Record<string, string | number>) => string): string {
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return t("page.news.recently");
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return t("page.news.just_now");
  if (minutes < 60) return t("page.news.minutes_ago", { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("page.news.hours_ago", { count: hours });
  const days = Math.floor(hours / 24);
  return t("page.news.days_ago", { count: days });
}

function formatFullDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatLastUpdate(date: Date | null, t: (key: string, vars?: Record<string, string | number>) => string): string {
  if (!date) return "";
  const time = date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  return t("page.news.updated_at", { time });
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.25, 0.1, 0.25, 1] as const } },
};

function SkeletonCard() {
  return (
    <div
      className="rounded-2xl overflow-hidden animate-pulse"
      style={{
        background: "hsl(var(--card))",
        border: "1px solid hsl(var(--border))",
      }}
    >
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-16 h-4 rounded-md" style={{ background: "hsl(var(--muted)/0.3)" }} />
          <div className="w-12 h-3 rounded-md" style={{ background: "hsl(var(--muted)/0.2)" }} />
        </div>
        <div className="w-full h-4 rounded mb-1.5" style={{ background: "hsl(var(--muted)/0.3)" }} />
        <div className="w-3/4 h-4 rounded mb-2" style={{ background: "hsl(var(--muted)/0.2)" }} />
        <div className="w-full h-3 rounded mb-1" style={{ background: "hsl(var(--muted)/0.15)" }} />
        <div className="w-2/3 h-3 rounded" style={{ background: "hsl(var(--muted)/0.1)" }} />
        <div className="flex items-center justify-between mt-3 pt-2.5" style={{ borderTop: "1px solid hsl(var(--border)/0.5)" }}>
          <div className="w-20 h-3 rounded" style={{ background: "hsl(var(--muted)/0.2)" }} />
          <div className="w-10 h-3 rounded" style={{ background: "hsl(var(--muted)/0.2)" }} />
        </div>
      </div>
    </div>
  );
}


function ArticleReader({ item, onClose, t }: { item: CanonicalGlobalFeedItem; onClose: () => void; t: (key: string, vars?: Record<string, string | number>) => string }) {
  const articleUrl = item.deepLinkUrl;
  const [shareConfirm, setShareConfirm] = useState(false);
  const [fullHtml, setFullHtml] = useState<string | null>(null);
  const [isLoadingFull, setIsLoadingFull] = useState(false);
  const [paywallDetected, setPaywallDetected] = useState(false);
  const [paywallMessage, setPaywallMessage] = useState<string | undefined>();
  const [fromCache, setFromCache] = useState(false);
  const fetchedUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!articleUrl) return;
    if (fetchedUrlRef.current === articleUrl) return;

    fetchedUrlRef.current = articleUrl;
    setFullHtml(null);
    setPaywallDetected(false);
    setPaywallMessage(undefined);
    setFromCache(false);

    let cancelled = false;
    setIsLoadingFull(true);

    fetchArticleContent(articleUrl).then((result) => {
      if (cancelled) return;
      if (result) {
        setFromCache(!!result.fromCache);
        if (result.paywallDetected) {
          setPaywallDetected(true);
          setPaywallMessage(result.paywallMessage);
          if (result.html && result.textLength > 0) {
            setFullHtml(result.html);
          }
        } else {
          setFullHtml(result.html);
        }
      }
      setIsLoadingFull(false);
    }).catch(() => {
      if (!cancelled) setIsLoadingFull(false);
    });

    return () => { cancelled = true; };
  }, [articleUrl]);

  const normalizeText = (t: string) => t.replace(/\s+/g, " ").trim();
  const displayBody = fullHtml ?? item.body;
  const hasFullBody = !!displayBody && normalizeText(displayBody) !== normalizeText(item.summary || "");

  const openArticle = () => {
    if (articleUrl) {
      window.open(articleUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: item.title,
      text: item.summary,
      url: articleUrl || undefined,
    };

    const shareUrl = articleUrl || "";
    if (!shareUrl && !navigator.share) return;

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else if (shareUrl && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        setShareConfirm(true);
        setTimeout(() => setShareConfirm(false), 2000);
      }
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError" && shareUrl && navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(shareUrl);
          setShareConfirm(true);
          setTimeout(() => setShareConfirm(false), 2000);
        } catch {}
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: "100%" }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: "100%" }}
      transition={{ type: "spring", damping: 28, stiffness: 300 }}
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: NAVY }}
    >
      <div
        className="flex items-center gap-3 px-4 py-3 shrink-0"
        style={{ borderBottom: `1px solid ${GOLD}33` }}
      >
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: `${GOLD}18` }}
          aria-label={t("page.news.close")}
        >
          <ArrowLeft size={20} style={{ color: GOLD }} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold truncate" style={{ color: GOLD }}>
            {item.sourceName}
          </p>
          <p className="text-[10px] truncate" style={{ color: `${GOLD}77` }}>
            {formatRelativeTime(item.publishedAt, t)}
          </p>
        </div>
        <button
          onClick={handleShare}
          className="w-9 h-9 rounded-xl flex items-center justify-center relative"
          style={{ background: `${GOLD}18` }}
          aria-label={t("page.news.share")}
        >
          {shareConfirm ? (
            <Check size={18} style={{ color: GOLD }} />
          ) : (
            <Share2 size={18} style={{ color: GOLD }} />
          )}
        </button>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: `${GOLD}18` }}
          aria-label={t("page.news.close")}
        >
          <X size={18} style={{ color: GOLD }} />
        </button>
      </div>

      <AnimatePresence>
        {shareConfirm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-16 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 rounded-xl text-xs font-semibold"
            style={{ background: GOLD, color: NAVY }}
          >
            {t("page.news.link_copied")}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: "touch" }}>
        <div className="px-6 pt-6 pb-10 max-w-[680px] mx-auto">
          <h2
            className="text-xl font-bold mb-3 leading-snug"
            style={{ color: "hsl(var(--foreground))" }}
          >
            {item.title}
          </h2>

          <div className="flex items-center gap-3 mb-6 flex-wrap">
            <span
              className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide"
              style={{ background: `${GOLD}18`, color: GOLD }}
            >
              {item.sourceName}
            </span>
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Calendar size={10} />
              {formatFullDate(item.publishedAt)}
            </span>
            {displayBody && getReadingTime(displayBody) && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Clock size={10} />
                {t("page.news.read_time", { count: getReadingTime(displayBody) || 0 })}
              </span>
            )}
          </div>

          {item.mediaUrl && (
            <div className="w-full rounded-xl overflow-hidden mb-6">
              <img
                src={item.mediaUrl}
                alt=""
                className="w-full h-auto object-cover max-h-[300px]"
                loading="lazy"
              />
            </div>
          )}

          <ArticleBody body={item.body} summary={item.summary} fullHtml={fullHtml} isLoadingFull={isLoadingFull} paywallDetected={paywallDetected} paywallMessage={paywallMessage} fromCache={fromCache} />

          {!hasFullBody && !isLoadingFull && (
            <p
              className="text-xs italic mb-6"
              style={{ color: "hsl(var(--muted-foreground)/0.6)" }}
            >
              {paywallDetected ? t("page.news.rss_summary") : t("page.news.article_summary")}
            </p>
          )}
          {hasFullBody && fullHtml && !paywallDetected && (
            <p
              className="text-xs italic mb-6"
              style={{ color: "hsl(var(--muted-foreground)/0.6)" }}
            >
              {t("page.news.full_article")}
            </p>
          )}
          {hasFullBody && fullHtml && paywallDetected && (
            <p
              className="text-xs italic mb-6"
              style={{ color: "hsl(var(--muted-foreground)/0.6)" }}
            >
              {t("page.news.partial_extract")}
            </p>
          )}

          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-6 w-full">
              {item.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded-md text-[9px] font-medium"
                  style={{
                    background: "hsl(var(--muted)/0.3)",
                    color: "hsl(var(--muted-foreground))",
                  }}
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {articleUrl && (
            <button
              onClick={openArticle}
              className="w-full flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl text-xs font-semibold transition-transform active:scale-[0.97]"
              style={{
                background: "transparent",
                color: GOLD,
                border: `1px solid ${GOLD}44`,
              }}
            >
              <ExternalLink size={14} />
              {t("page.news.read_on_source")}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function NewsCard({ item, onRead, t }: { item: CanonicalGlobalFeedItem; onRead: (item: CanonicalGlobalFeedItem) => void; t: (key: string, vars?: Record<string, string | number>) => string }) {
  return (
    <motion.article
      variants={fadeUp}
      className="rounded-2xl overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
      style={{
        background: "hsl(var(--card))",
        border: "1px solid hsl(var(--border))",
      }}
      onClick={() => onRead(item)}
    >
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <span
            className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide"
            style={{ background: `${GOLD}18`, color: GOLD }}
          >
            {item.sourceName}
          </span>
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Clock size={10} />
            {formatRelativeTime(item.publishedAt, t)}
          </span>
          {item.body && getReadingTime(item.body) && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              · {getReadingTime(item.body)} min
            </span>
          )}
        </div>

        <h3 className="text-sm font-bold leading-snug mb-1.5" style={{ color: "hsl(var(--foreground))" }}>
          {item.title}
        </h3>

        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
          {item.summary}
        </p>

        <div className="flex items-center justify-between mt-3 pt-2.5" style={{ borderTop: "1px solid hsl(var(--border)/0.5)" }}>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Globe size={10} />
            <span>{item.sourceName}</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] font-semibold" style={{ color: GOLD }}>
            <span>{t("page.news.read")}</span>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

function EmptyState({ category, onReset, onRetry, t }: { category: NewsCategory; onReset: () => void; onRetry: () => void; t: (key: string, vars?: Record<string, string | number>) => string }) {
  return (
    <div className="text-center py-12">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
        style={{ background: "hsl(var(--muted)/0.2)" }}
      >
        <Newspaper size={32} className="text-muted-foreground" />
      </div>
      <p className="text-sm font-medium mb-1" style={{ color: "hsl(var(--foreground))" }}>
        {category === "all"
          ? t("page.news.no_news")
          : t("page.news.no_results_for", { label: t(CATEGORY_KEYS.find(c => c.key === category)?.labelKey || "") })}
      </p>
      <p className="text-xs text-muted-foreground mb-4">
        {category === "all"
          ? t("page.news.auto_update_soon")
          : t("page.news.try_other_category")}
      </p>
      <div className="flex items-center justify-center gap-2">
        {category !== "all" && (
          <button
            onClick={onReset}
            className="text-xs font-semibold px-4 py-2 rounded-lg"
            style={{ background: `${GOLD}22`, color: GOLD }}
          >
            {t("page.news.see_all")}
          </button>
        )}
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg"
          style={{ background: "hsl(var(--muted)/0.3)", color: "hsl(var(--muted-foreground))" }}
        >
          <RefreshCw size={10} />
          {t("page.news.retry")}
        </button>
      </div>
    </div>
  );
}

export default function NewsPage() {
  useUiEngine("newspage");
  const { t } = useI18n();
  const navigate = useNavigate();
  const [readingArticle, setReadingArticle] = useState<CanonicalGlobalFeedItem | null>(null);
  const [isPulling, setIsPulling] = useState(false);

  const { filteredItems, loading, error, lastRefreshedAt, category, setCategory, refresh, forceRetry, isStale, source, degraded, degradedReason } = useNewsData("FR");

  const handlePullRefresh = useCallback(async () => {
    setIsPulling(true);
    await refresh();
    setIsPulling(false);
  }, [refresh]);

  const handleForceRetry = useCallback(async () => {
    setIsPulling(true);
    await forceRetry();
    setIsPulling(false);
  }, [forceRetry]);

  return (
    <SubPageShell>
      <SEOHead
        title={t("page.news.seo_title")}
        description={t("page.news.seo_desc")}
      />

      <AnimatePresence>
        {readingArticle && (
          <ArticleReader
            item={readingArticle}
            onClose={() => setReadingArticle(null)}
            t={t}
          />
        )}
      </AnimatePresence>

      <div
        className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3"
        style={{ background: NAVY, borderBottom: `1px solid ${GOLD}33` }}
      >
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: `${GOLD}18` }}
          aria-label={t("page.news.back")}
        >
          <ChevronLeft size={20} style={{ color: GOLD }} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold truncate" style={{ color: GOLD }}>
              {t("page.news.title")}
            </h1>
            {error ? (
              <span
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider"
                style={{ background: "hsl(0 70% 50% / 0.15)", color: "hsl(0 70% 50%)" }}
                title={error}
              >
                {t("page.news.error_label")}
              </span>
            ) : degraded ? (
              <span
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider"
                style={{ background: "hsl(30 90% 50% / 0.15)", color: "hsl(30 90% 50%)" }}
                title={degradedReason || "News sources unavailable"}
              >
                DEGRADED
              </span>
            ) : source === "static" || source === "fallback" ? (
              <span
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider"
                style={{ background: "hsl(45 93% 47% / 0.15)", color: "hsl(45 93% 47%)" }}
              >
                FALLBACK
              </span>
            ) : isStale ? (
              <span
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider"
                style={{ background: "hsl(45 93% 47% / 0.15)", color: "hsl(45 93% 47%)" }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: "hsl(45 93% 47%)" }}
                />
                STALE
              </span>
            ) : (
              <span
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider"
                style={{ background: "#ef444422", color: "#ef4444" }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background: "#ef4444",
                    animation: "pulse-live 2s ease-in-out infinite",
                  }}
                />
                LIVE
              </span>
            )}
          </div>
          <p className="text-[11px] truncate" style={{ color: `${GOLD}99` }}>
            {lastRefreshedAt ? formatLastUpdate(lastRefreshedAt, t) : t("page.news.loading")}
          </p>
        </div>
        <button
          onClick={handlePullRefresh}
          disabled={isPulling}
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: "hsl(var(--brand-primary) / 0.08)" }}
          aria-label={t("page.news.refresh")}
        >
          <BrandRefreshIndicator spinning={isPulling} size={18} />
        </button>
      </div>

      <div className="px-4 py-4 space-y-4">
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
          {CATEGORY_KEYS.map(cat => (
            <button
              key={cat.key}
              onClick={() => setCategory(cat.key)}
              className="shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={{
                background: category === cat.key ? GOLD : "hsl(var(--muted)/0.4)",
                color: category === cat.key ? NAVY : "hsl(var(--muted-foreground))",
                border: category === cat.key ? `1px solid ${GOLD}` : "1px solid hsl(var(--border))",
              }}
            >
              {t(cat.labelKey)}
            </button>
          ))}
        </div>

        {error && (
          <div
            className="flex items-center gap-3 p-3 rounded-xl"
            style={{ background: "hsl(0 70% 50% / 0.1)", border: "1px solid hsl(0 70% 50% / 0.2)" }}
          >
            <AlertCircle size={16} style={{ color: "hsl(0 70% 50%)" }} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium" style={{ color: "hsl(0 70% 50%)" }}>
                {t("page.news.connection_interrupted")}
              </p>
              <p className="text-[10px]" style={{ color: "hsl(0 70% 50% / 0.7)" }}>
                {error}
              </p>
            </div>
            <button
              onClick={handleForceRetry}
              className="shrink-0 flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg"
              style={{ background: "hsl(var(--brand-primary) / 0.1)", color: "hsl(var(--brand-primary))" }}
            >
              <RefreshCw size={10} className={isPulling ? "animate-spin" : ""} />
              {t("page.news.retry")}
            </button>
          </div>
        )}

        {loading && !isPulling ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <EmptyState
            category={category}
            onReset={() => setCategory("all")}
            onRetry={handleForceRetry}
            t={t}
          />
        ) : (
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
            key={category}
            className="space-y-3"
          >
            {filteredItems.map(item => (
              <NewsCard key={item.id} item={item} onRead={setReadingArticle} t={t} />
            ))}
          </motion.div>
        )}

        <div className="text-center py-2">
          <p className="text-[10px] text-muted-foreground">
            {lastRefreshedAt
              ? `${t("page.news.articles_count", { count: filteredItems.length })} · ${formatLastUpdate(lastRefreshedAt, t)} · ${t("page.news.auto_refresh")}`
              : t("page.news.realtime_news")}
          </p>
        </div>
      </div>

      <style>{`
        @keyframes pulse-live {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.8); }
        }
      `}</style>
    </SubPageShell>
  );
}
