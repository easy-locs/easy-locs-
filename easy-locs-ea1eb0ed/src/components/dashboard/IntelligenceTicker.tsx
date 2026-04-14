import { memo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useIntelligenceTicker } from "@/hooks/useIntelligenceTicker";
import { TrendingUp, Cloud, Newspaper, AlertTriangle, Radio, Moon, ChevronRight } from "lucide-react";

const NAVY = "hsl(220 40% 18%)";
const GOLD = "hsl(38 65% 56%)";

const CATEGORY_CONFIG: Record<string, { icon: typeof TrendingUp; label: string; deepLink?: string }> = {
  finance: { icon: TrendingUp, label: "Finance" },
  forex: { icon: TrendingUp, label: "Forex" },
  weather: { icon: Cloud, label: "Météo" },
  news: { icon: Newspaper, label: "Actualités" },
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
    const link = config?.deepLink;
    if (link) navigate(link);
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
      style={{
        width: "100%",
        overflow: "hidden",
        borderRadius: 10,
        background: NAVY,
        border: `1px solid ${GOLD}33`,
        padding: "8px 12px",
        marginBottom: 8,
        cursor: isClickable ? "pointer" : "default",
      }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={currentItem.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35 }}
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
            </div>
            <p
              style={{
                fontSize: 12,
                lineHeight: 1.4,
                color: "hsl(220 20% 85%)",
                margin: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
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
    </div>
  );
}

export default memo(IntelligenceTickerInner);
