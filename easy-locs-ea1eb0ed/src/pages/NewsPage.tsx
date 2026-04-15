import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Newspaper, Clock, Globe, ExternalLink, X, RefreshCw, AlertCircle, ArrowLeft, Calendar, Share2, Check } from "lucide-react";
import { BrandRefreshIndicator } from "@/components/brand/BrandRefreshIndicator";
import SEOHead from "@/components/SEOHead";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";
import { useNewsData, type NewsCategory } from "@/hooks/useNewsData";
import type { CanonicalGlobalFeedItem } from "@/domains/shared/canonical-types";

const NAVY = "hsl(226 22% 14%)";
const GOLD = "hsl(var(--accent))";

const CATEGORIES: { key: NewsCategory; label: string }[] = [
  { key: "all", label: "Tout" },
  { key: "immobilier", label: "Immobilier" },
  { key: "finance", label: "Finance" },
  { key: "economie", label: "Économie" },
  { key: "local", label: "Local" },
];

function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return "récemment";
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days}j`;
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

function getReadingTime(text: string): number | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const wordCount = trimmed.split(/\s+/).length;
  return Math.max(1, Math.ceil(wordCount / 200));
}

function formatLastUpdate(date: Date | null): string {
  if (!date) return "";
  return `Mis à jour à ${date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
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

function ArticleReader({ item, onClose }: { item: CanonicalGlobalFeedItem; onClose: () => void }) {
  const articleUrl = item.deepLinkUrl;
  const [shareConfirm, setShareConfirm] = useState(false);

  const normalizeText = (t: string) => t.replace(/\s+/g, " ").trim();
  const hasFullBody = !!item.body && normalizeText(item.body) !== normalizeText(item.summary || "");

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

  const renderBody = (text: string) => {
    const paragraphs = text.split(/\n\n+|\n/).filter(p => p.trim().length > 0);
    if (paragraphs.length <= 1) {
      return (
        <p
          className="text-[15px] leading-[1.8]"
          style={{ color: "hsl(var(--foreground)/0.88)" }}
        >
          {text}
        </p>
      );
    }
    return paragraphs.map((p, i) => (
      <p
        key={i}
        className="text-[15px] leading-[1.8] mb-4 last:mb-0"
        style={{ color: "hsl(var(--foreground)/0.88)" }}
      >
        {p.trim()}
      </p>
    ));
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
          aria-label="Fermer"
        >
          <ArrowLeft size={20} style={{ color: GOLD }} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold truncate" style={{ color: GOLD }}>
            {item.sourceName}
          </p>
          <p className="text-[10px] truncate" style={{ color: `${GOLD}77` }}>
            {formatRelativeTime(item.publishedAt)}
          </p>
        </div>
        <button
          onClick={handleShare}
          className="w-9 h-9 rounded-xl flex items-center justify-center relative"
          style={{ background: `${GOLD}18` }}
          aria-label="Partager"
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
          aria-label="Fermer"
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
            Lien copié !
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
            {item.body && getReadingTime(item.body) && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Clock size={10} />
                {getReadingTime(item.body)} min de lecture
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

          {item.summary && (
            <div className="w-full mb-6">
              <p
                className="text-[15px] leading-[1.8] font-medium italic"
                style={{ color: "hsl(var(--foreground)/0.75)" }}
              >
                {item.summary}
              </p>
            </div>
          )}

          {hasFullBody ? (
            <>
              <div
                className="w-full mb-6"
                style={{ borderTop: `1px solid hsl(var(--border)/0.3)` }}
              >
                <div className="pt-6">
                  {renderBody(item.body!)}
                </div>
              </div>
            </>
          ) : (
            <p
              className="text-xs italic mb-6"
              style={{ color: "hsl(var(--muted-foreground)/0.6)" }}
            >
              Résumé de l'article
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
              Lire sur le site source
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function NewsCard({ item, onRead }: { item: CanonicalGlobalFeedItem; onRead: (item: CanonicalGlobalFeedItem) => void }) {
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
            {formatRelativeTime(item.publishedAt)}
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
            <span>Lire</span>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

function EmptyState({ category, onReset, onRetry }: { category: NewsCategory; onReset: () => void; onRetry: () => void }) {
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
          ? "Aucune actualité disponible"
          : `Aucun résultat pour "${CATEGORIES.find(c => c.key === category)?.label}"`}
      </p>
      <p className="text-xs text-muted-foreground mb-4">
        {category === "all"
          ? "Le flux se mettra à jour automatiquement dans quelques instants."
          : "Essayez une autre catégorie ou consultez toutes les actualités."}
      </p>
      <div className="flex items-center justify-center gap-2">
        {category !== "all" && (
          <button
            onClick={onReset}
            className="text-xs font-semibold px-4 py-2 rounded-lg"
            style={{ background: `${GOLD}22`, color: GOLD }}
          >
            Voir tout
          </button>
        )}
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg"
          style={{ background: "hsl(var(--muted)/0.3)", color: "hsl(var(--muted-foreground))" }}
        >
          <RefreshCw size={10} />
          Réessayer
        </button>
      </div>
    </div>
  );
}

export default function NewsPage() {
  useUiEngine("newspage");
  const navigate = useNavigate();
  const [readingArticle, setReadingArticle] = useState<CanonicalGlobalFeedItem | null>(null);
  const [isPulling, setIsPulling] = useState(false);

  const { filteredItems, loading, error, lastRefreshedAt, category, setCategory, refresh, forceRetry, isStale, source } = useNewsData("FR");

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
        title="Actualités — Easy-Locs"
        description="Suivez les dernières actualités immobilières, financières et économiques."
      />

      <AnimatePresence>
        {readingArticle && (
          <ArticleReader
            item={readingArticle}
            onClose={() => setReadingArticle(null)}
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
          aria-label="Retour"
        >
          <ChevronLeft size={20} style={{ color: GOLD }} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold truncate" style={{ color: GOLD }}>
              Actualités
            </h1>
            {error ? (
              <span
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider"
                style={{ background: "hsl(0 70% 50% / 0.15)", color: "hsl(0 70% 50%)" }}
              >
                ERREUR
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
            {lastRefreshedAt ? formatLastUpdate(lastRefreshedAt) : "Chargement..."}
          </p>
        </div>
        <button
          onClick={handlePullRefresh}
          disabled={isPulling}
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: "hsl(var(--brand-primary) / 0.08)" }}
          aria-label="Rafraîchir"
        >
          <BrandRefreshIndicator spinning={isPulling} size={18} />
        </button>
      </div>

      <div className="px-4 py-4 space-y-4">
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
          {CATEGORIES.map(cat => (
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
              {cat.label}
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
                Connexion interrompue
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
              Réessayer
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
              <NewsCard key={item.id} item={item} onRead={setReadingArticle} />
            ))}
          </motion.div>
        )}

        <div className="text-center py-2">
          <p className="text-[10px] text-muted-foreground">
            {lastRefreshedAt
              ? `${filteredItems.length} article${filteredItems.length > 1 ? "s" : ""} · ${formatLastUpdate(lastRefreshedAt)} · Rafraîchissement auto toutes les 5 min`
              : "Actualités en temps réel via Google News"}
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
