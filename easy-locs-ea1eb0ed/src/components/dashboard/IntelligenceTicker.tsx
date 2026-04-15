import { memo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useIntelligenceTicker } from "@/hooks/useIntelligenceTicker";
import { TrendingUp, Cloud, Newspaper, AlertTriangle, Radio, Moon, ChevronRight } from "lucide-react";

const NAVY = "hsl(226 24% 14%)";
const GOLD = "hsl(var(--accent))";

const CATEGORY_CONFIG: Record<string, { icon: typeof TrendingUp; label: string; deepLink?: string }> = {
  finance: { icon: TrendingUp, label: "Finance" },
  forex: { icon: TrendingUp, label: "Forex" },
  weather: { icon: Cloud, label: "Météo" },
  news: { icon: Newspaper, label: "Actualités", deepLink: "/dashboard/news" },
  emergency: { icon: AlertTriangle, label: "Alerte" },
  traffic: { icon: Radio, label: "Trafic" },
  events: { icon: Radio, label: "Événements" },
  religious: { icon: Moon, label: "Prière", deepLink: "/dashboard/prayer-times" },
};

interface Props {
  country: string;
  city?: string;
}

function IntelligenceTickerInner({ country, city }: Props) {
  const navigate = useNavigate();
  const { currentItem, visible } = useIntelligenceTicker(country, city);

  const handleClick = useCallback(() => {
    if (!currentItem) return;
    const config = CATEGORY_CONFIG[currentItem.category];
    const link = config?.deepLink ?? currentItem.deepLinkUrl;
    if (!link) return;
    if (link.startsWith("http://") || link.startsWith("https://")) {
      window.open(link, "_blank", "noopener,noreferrer");
    } else {
      navigate(link);
    }
  }, [currentItem, navigate]);

  if (!visible || !currentItem) return null;

  const config = CATEGORY_CONFIG[currentItem.category] ?? { icon: Radio, label: "Info" };
  const Icon = config.icon;
  const isClickable = !!(config.deepLink ?? currentItem.deepLinkUrl);

  return (
    <div
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={isClickable ? handleClick : undefined}
      onKeyDown={isClickable ? (e) => { if (e.key === "Enter") handleClick(); } : undefined}
      className="home-card--gradient"
      style={{
        width: "100%",
        overflow: "hidden",
        padding: "10px 12px",
        marginBottom: "var(--section-gap-compact)",
        cursor: isClickable ? "pointer" : "default",
      }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={currentItem.id}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            minHeight: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 28,
              height: 28,
              borderRadius: 6,
              background: `${GOLD}22`,
              flexShrink: 0,
            }}
          >
            <Icon size={14} style={{ color: GOLD }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginBottom: 1,
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 9,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "#ef4444",
                }}
              >
                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    background: "#ef4444",
                    display: "inline-block",
                    animation: "ticker-pulse 2s ease-in-out infinite",
                  }}
                />
                LIVE
              </span>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: GOLD,
                  opacity: 0.8,
                }}
              >
                {config.label}
              </span>
              {currentItem.source && (
                <span
                  style={{
                    fontSize: 8,
                    fontWeight: 500,
                    color: "hsl(0 0% 100% / 0.4)",
                    marginLeft: "auto",
                  }}
                >
                  {currentItem.source}
                </span>
              )}
            </div>
            <p
              style={{
                fontSize: 12,
                lineHeight: 1.4,
                color: "hsl(0 0% 100% / 0.75)",
                margin: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontWeight: 500,
              }}
            >
              {currentItem.text}
            </p>
          </div>
          {isClickable && (
            <ChevronRight size={14} style={{ color: `${GOLD}88`, flexShrink: 0 }} />
          )}
        </motion.div>
      </AnimatePresence>
      <style>{`
        @keyframes ticker-pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(239,68,68,0.5); }
          50% { opacity: 0.5; box-shadow: 0 0 6px 2px rgba(239,68,68,0.3); }
        }
      `}</style>
    </div>
  );
}

export default memo(IntelligenceTickerInner);
