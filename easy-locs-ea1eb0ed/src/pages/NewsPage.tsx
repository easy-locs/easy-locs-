import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Newspaper, Clock, Globe, ExternalLink, X, RefreshCw, AlertCircle, ArrowLeft } from "lucide-react";
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
  const [iframeError, setIframeError] = useState(false);

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
        {articleUrl && (
          <a
            href={articleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold"
            style={{ background: `${GOLD}18`, color: GOLD }}
          >
            <ExternalLink size={10} />
            Navigateur
          </a>
        )}
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: `${GOLD}18` }}
          aria-label="Fermer"
        >
          <X size={18} style={{ color: GOLD }} />
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        {articleUrl && !iframeError ? (
          <iframe
            src={articleUrl}
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin allow-popups"
            title={item.title}
            style={{ background: "#fff" }}
            onError={() => setIframeError(true)}
            onLoad={(e) => {
              try {
                const frame = e.currentTarget;
                if (frame.contentDocument?.title === "") {
                  setIframeError(true);
                }
              } catch {
                setIframeError(true);
              }
            }}
          />
        ) : (
          <div className="p-6 flex flex-col items-center justify-center h-full">
            <Newspaper size={48} className="mb-4" style={{ color: `${GOLD}55` }} />
            <h2 className="text-lg font-bold mb-2 text-center" style={{ color: "hsl(var(--foreground))" }}>
              {item.title}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed text-center max-w-md">
              {item.summary}
            </p>
            <p className="text-xs text-muted-foreground mt-4">
              Source : {item.sourceName}
            </p>
            {articleUrl && (
              <a
                href={articleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: GOLD, color: NAVY }}
              >
                <ExternalLink size={14} />
                Ouvrir dans le navigateur
              </a>
            )}
          </div>
        )}
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

export default function NewsPage() {
  useUiEngine("newspage");
  const navigate = useNavigate();
  const [readingArticle, setReadingArticle] = useState<CanonicalGlobalFeedItem | null>(null);
  const [isPulling, setIsPulling] = useState(false);

  const { filteredItems, loading, error, lastRefreshedAt, category, setCategory, refresh } = useNewsData("FR");

  const handlePullRefresh = useCallback(async () => {
    setIsPulling(true);
    await refresh();
    setIsPulling(false);
  }, [refresh]);

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
          </div>
          <p className="text-[11px] truncate" style={{ color: `${GOLD}99` }}>
            {lastRefreshedAt ? formatLastUpdate(lastRefreshedAt) : "Chargement..."}
          </p>
        </div>
        <button
          onClick={handlePullRefresh}
          disabled={isPulling}
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: `${GOLD}18` }}
          aria-label="Rafraîchir"
        >
          <RefreshCw
            size={18}
            style={{ color: GOLD }}
            className={isPulling ? "animate-spin" : ""}
          />
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
            <p className="text-xs" style={{ color: "hsl(0 70% 50%)" }}>{error}</p>
            <button
              onClick={handlePullRefresh}
              className="ml-auto text-xs font-semibold px-3 py-1 rounded-lg"
              style={{ background: `${GOLD}22`, color: GOLD }}
            >
              Réessayer
            </button>
          </div>
        )}

        {loading && !isPulling ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <Newspaper size={32} className="mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {category === "all"
                ? "Aucune actualité disponible pour le moment."
                : `Aucune actualité trouvée pour "${CATEGORIES.find(c => c.key === category)?.label}".`}
            </p>
            <button
              onClick={() => setCategory("all")}
              className="mt-3 text-xs font-semibold px-4 py-2 rounded-lg"
              style={{ background: `${GOLD}22`, color: GOLD }}
            >
              Voir toutes les actualités
            </button>
          </div>
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
