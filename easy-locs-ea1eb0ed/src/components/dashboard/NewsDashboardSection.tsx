import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Newspaper, Clock, ChevronRight, RefreshCw } from "lucide-react";
import { useNewsData } from "@/hooks/useNewsData";
import type { CanonicalGlobalFeedItem } from "@/domains/shared/canonical-types";

const GOLD = "hsl(var(--accent))";
const NAVY = "hsl(226 22% 14%)";
const MAX_DASHBOARD_ITEMS = 5;

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

function formatLastUpdated(date: Date | null): string {
  if (!date) return "";
  const age = Date.now() - date.getTime();
  const minutes = Math.floor(age / 60000);
  if (minutes < 1) return "il y a < 1 min";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `il y a ${hours}h`;
}

function DashboardNewsCard({ item }: { item: CanonicalGlobalFeedItem }) {
  const handleClick = () => {
    if (item.deepLinkUrl) {
      window.open(item.deepLinkUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      onClick={handleClick}
      className="flex gap-3 p-3 rounded-xl cursor-pointer active:scale-[0.98] transition-transform"
      style={{
        background: "hsl(var(--card))",
        border: "1px solid hsl(var(--border))",
      }}
    >
      <div className="flex-1 min-w-0">
        <h4
          className="text-xs font-semibold leading-snug line-clamp-2 mb-1"
          style={{ color: "hsl(var(--foreground))" }}
        >
          {item.title}
        </h4>
        <div className="flex items-center gap-2">
          <span
            className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
            style={{ background: `${GOLD}18`, color: GOLD }}
          >
            {item.sourceName}
          </span>
          <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
            <Clock size={9} />
            {formatRelativeTime(item.publishedAt)}
          </span>
        </div>
      </div>
      <div
        className="flex items-center justify-center w-7 h-7 rounded-lg shrink-0 self-center"
        style={{ background: `${GOLD}15` }}
      >
        <ChevronRight size={14} style={{ color: GOLD }} />
      </div>
    </motion.div>
  );
}

function SkeletonNewsCard() {
  return (
    <div
      className="flex gap-3 p-3 rounded-xl animate-pulse"
      style={{
        background: "hsl(var(--card))",
        border: "1px solid hsl(var(--border))",
      }}
    >
      <div className="flex-1 min-w-0">
        <div className="w-full h-3 rounded mb-1.5" style={{ background: "hsl(var(--muted)/0.3)" }} />
        <div className="w-2/3 h-3 rounded mb-2" style={{ background: "hsl(var(--muted)/0.2)" }} />
        <div className="flex items-center gap-2">
          <div className="w-14 h-3 rounded" style={{ background: "hsl(var(--muted)/0.2)" }} />
          <div className="w-10 h-2.5 rounded" style={{ background: "hsl(var(--muted)/0.15)" }} />
        </div>
      </div>
      <div className="w-7 h-7 rounded-lg shrink-0 self-center" style={{ background: "hsl(var(--muted)/0.15)" }} />
    </div>
  );
}

function FreshnessIndicator({ lastRefreshedAt, isStale, source }: { lastRefreshedAt: Date | null; isStale: boolean; source: string }) {
  if (source === "static" || source === "fallback") {
    return (
      <span
        className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[7px] font-bold uppercase tracking-wider"
        style={{ background: "hsl(45 93% 47% / 0.15)", color: "hsl(45 93% 47%)" }}
      >
        INDICATIF
      </span>
    );
  }

  if (isStale) {
    return (
      <span
        className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[7px] font-bold uppercase tracking-wider"
        style={{ background: "hsl(45 93% 47% / 0.15)", color: "hsl(45 93% 47%)" }}
      >
        <span
          className="w-1 h-1 rounded-full"
          style={{ background: "hsl(45 93% 47%)" }}
        />
        {formatLastUpdated(lastRefreshedAt)}
      </span>
    );
  }

  return (
    <span
      className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[7px] font-bold uppercase tracking-wider"
      style={{ background: "#ef444422", color: "#ef4444" }}
    >
      <span
        className="w-1 h-1 rounded-full"
        style={{
          background: "#ef4444",
          animation: "news-pulse 2s ease-in-out infinite",
        }}
      />
      LIVE
    </span>
  );
}

interface Props {
  country?: string;
  city?: string;
}

function NewsDashboardSectionInner({ country = "FR", city }: Props) {
  const navigate = useNavigate();
  const { items, loading, error, lastRefreshedAt, isStale, source, refresh } = useNewsData(country, city);
  const displayItems = items.slice(0, MAX_DASHBOARD_ITEMS);

  return (
    <div style={{ marginBottom: "var(--section-gap-compact)" }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Newspaper size={16} style={{ color: GOLD }} />
          <h3
            className="text-sm font-bold"
            style={{ color: "hsl(var(--foreground))" }}
          >
            Actualités
          </h3>
          <FreshnessIndicator lastRefreshedAt={lastRefreshedAt} isStale={isStale} source={source} />
        </div>
        <button
          onClick={() => navigate("/dashboard/news")}
          className="flex items-center gap-1 text-[11px] font-semibold"
          style={{ color: GOLD }}
        >
          Voir tout
          <ChevronRight size={12} />
        </button>
      </div>

      {lastRefreshedAt && (
        <p className="text-[9px] text-muted-foreground mb-1.5">
          Mis à jour {formatLastUpdated(lastRefreshedAt)}
        </p>
      )}

      <div className="space-y-2">
        {loading && items.length === 0 ? (
          <>
            <SkeletonNewsCard />
            <SkeletonNewsCard />
            <SkeletonNewsCard />
          </>
        ) : error && items.length === 0 ? (
          <div
            className="flex flex-col items-center gap-2 py-6 rounded-xl"
            style={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
            }}
          >
            <Newspaper size={24} className="text-muted-foreground" />
            <p className="text-xs text-muted-foreground text-center">
              Actualités temporairement indisponibles
            </p>
            <button
              onClick={() => refresh()}
              className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg"
              style={{ background: `${GOLD}22`, color: GOLD }}
            >
              <RefreshCw size={10} />
              Réessayer
            </button>
          </div>
        ) : displayItems.length === 0 ? (
          <div
            className="flex flex-col items-center gap-2 py-6 rounded-xl"
            style={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
            }}
          >
            <Newspaper size={24} className="text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Aucune actualité disponible</p>
          </div>
        ) : (
          displayItems.map((item) => (
            <DashboardNewsCard key={item.id} item={item} />
          ))
        )}
      </div>

      <style>{`
        @keyframes news-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.8); }
        }
      `}</style>
    </div>
  );
}

export default memo(NewsDashboardSectionInner);
