import { MessageCircle, Phone, Users, Settings } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { motion } from "framer-motion";

export type CommSection = "chats" | "calls" | "contacts" | "payments" | "groups" | "nearby" | "meetings" | "files" | "settings" | "you" | "updates" | "status";

const TAB_IDS: { id: CommSection; icon: typeof MessageCircle; labelKey: string; fallback: string }[] = [
  { id: "chats", icon: MessageCircle, labelKey: "orbit.nav.chats", fallback: "Chats" },
  { id: "calls", icon: Phone, labelKey: "orbit.nav.calls", fallback: "Calls" },
  { id: "groups", icon: Users, labelKey: "orbit.nav.communities", fallback: "Communities" },
  { id: "you", icon: Settings, labelKey: "orbit.nav.settings", fallback: "Settings" },
];

const ACTIVE_COLOR = "hsl(38 65% 56%)";
const INACTIVE_COLOR = "hsl(var(--muted-foreground) / 0.5)";
const BADGE_BG = "hsl(38 65% 56%)";

interface Props {
  active: CommSection;
  onChange: (section: CommSection) => void;
  isMobile: boolean;
  unreadCount?: number;
}

export default function CommNavBar({ active, onChange, isMobile, unreadCount = 0 }: Props) {
  const { t } = useI18n();

  if (isMobile) {
    return (
      <nav
        className="flex items-stretch shrink-0"
        style={{
          background: "hsl(220 40% 12% / 0.98)",
          borderTop: "1px solid hsl(220 30% 20% / 0.4)",
          height: 64,
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        }}
      >
        {TAB_IDS.map((tab) => {
          const isActive = active === tab.id;
          const Icon = tab.icon;
          const label = t(tab.labelKey) || tab.fallback;
          return (
            <button
              key={tab.id}
              onClick={(e) => { e.stopPropagation(); onChange(tab.id); }}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 relative"
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              <div className="relative">
                <Icon
                  className="h-[22px] w-[22px]"
                  strokeWidth={isActive ? 2.4 : 1.6}
                  style={{ color: isActive ? ACTIVE_COLOR : INACTIVE_COLOR }}
                />
                {tab.id === "chats" && unreadCount > 0 && (
                  <span
                    className="absolute -top-1.5 -right-3 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-bold px-1"
                    style={{ background: BADGE_BG, color: "hsl(220 40% 12%)", boxShadow: `0 0 6px hsl(38 65% 56% / 0.4)` }}
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </div>
              <span
                className="text-[11px] leading-tight whitespace-nowrap"
                style={{
                  color: isActive ? ACTIVE_COLOR : INACTIVE_COLOR,
                  fontWeight: isActive ? 700 : 500,
                }}
              >
                {label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="orbit-tab-indicator"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-full"
                  style={{ background: ACTIVE_COLOR }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </nav>
    );
  }

  return (
    <nav
      className="flex flex-col items-center py-4 gap-2 shrink-0"
      style={{
        width: 60,
        background: "hsl(220 40% 12% / 0.5)",
        borderRight: "1px solid hsl(220 30% 20% / 0.2)",
      }}
    >
      {TAB_IDS.map((tab) => {
        const isActive = active === tab.id;
        const Icon = tab.icon;
        const label = t(tab.labelKey) || tab.fallback;
        return (
          <button
            key={tab.id}
            onClick={(e) => { e.stopPropagation(); onChange(tab.id); }}
            className="relative flex flex-col items-center justify-center w-11 h-11 rounded-2xl transition-all duration-200"
            style={{
              background: isActive ? "hsl(38 65% 56% / 0.12)" : "transparent",
              transform: isActive ? "scale(1.05)" : "scale(1)",
            }}
            title={label}
          >
            <Icon
              className="h-[18px] w-[18px]"
              strokeWidth={isActive ? 2.2 : 1.5}
              style={{ color: isActive ? ACTIVE_COLOR : INACTIVE_COLOR }}
            />
            {tab.id === "chats" && unreadCount > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full flex items-center justify-center text-[10px] font-bold px-0.5"
                style={{ background: BADGE_BG, color: "hsl(220 40% 12%)", boxShadow: `0 0 6px hsl(38 65% 56% / 0.4)` }}
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
            {isActive && (
              <div
                className="absolute -left-[1px] top-2 bottom-2 w-[3px] rounded-r-full"
                style={{ background: ACTIVE_COLOR }}
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}
