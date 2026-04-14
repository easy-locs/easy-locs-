import { MessageCircle, Phone, Users, Settings } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { motion, AnimatePresence } from "framer-motion";

export type CommSection = "chats" | "calls" | "contacts" | "payments" | "groups" | "nearby" | "meetings" | "files" | "settings" | "you" | "updates" | "status";

const TAB_IDS: { id: CommSection; icon: typeof MessageCircle; labelKey: string; fallback: string }[] = [
  { id: "chats", icon: MessageCircle, labelKey: "orbit.nav.chats", fallback: "Chats" },
  { id: "calls", icon: Phone, labelKey: "orbit.nav.calls", fallback: "Calls" },
  { id: "groups", icon: Users, labelKey: "orbit.nav.communities", fallback: "Communities" },
  { id: "you", icon: Settings, labelKey: "orbit.nav.settings", fallback: "Settings" },
];

const ACTIVE_COLOR = "hsl(var(--accent))";
const INACTIVE_COLOR = "hsl(var(--muted-foreground) / 0.45)";
const BADGE_BG = "hsl(var(--accent))";

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
          background: "hsl(var(--card) / 0.92)",
          borderTop: "1px solid hsl(var(--border) / 0.12)",
          height: 62,
          backdropFilter: "blur(24px) saturate(1.6)",
          WebkitBackdropFilter: "blur(24px) saturate(1.6)",
          boxShadow: "0 -2px 20px hsl(var(--background) / 0.4)",
          contain: "layout style",
        }}
      >
        {TAB_IDS.map((tab) => {
          const isActive = active === tab.id;
          const Icon = tab.icon;
          const label = t(tab.labelKey) || tab.fallback;
          return (
            <motion.button
              key={tab.id}
              onClick={(e) => { e.stopPropagation(); onChange(tab.id); }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 relative
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              {isActive && (
                <motion.div
                  layoutId="orbit-tab-pill"
                  className="absolute top-0 left-3 right-3 h-[2.5px] rounded-full"
                  style={{ background: ACTIVE_COLOR }}
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
              {isActive && (
                <motion.div
                  layoutId="orbit-tab-glow"
                  className="absolute top-0 left-1 right-1 h-8 rounded-b-2xl pointer-events-none"
                  style={{
                    background: "radial-gradient(ellipse at top, hsl(var(--accent) / 0.1) 0%, transparent 70%)",
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <div className="relative">
                <motion.div
                  animate={{ y: isActive ? -2 : 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  <Icon
                    className="h-[21px] w-[21px] transition-colors duration-200"
                    strokeWidth={isActive ? 2.4 : 1.7}
                    style={{ color: isActive ? ACTIVE_COLOR : INACTIVE_COLOR }}
                  />
                </motion.div>
                {tab.id === "chats" && unreadCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1.5 -right-3 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-bold leading-none px-1"
                    style={{
                      background: BADGE_BG,
                      color: "hsl(225 25% 10%)",
                      boxShadow: `0 0 8px hsl(var(--accent) / 0.35)`,
                      border: "2px solid hsl(var(--card))",
                    }}
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </motion.span>
                )}
              </div>
              <span
                className="leading-tight transition-all duration-200"
                style={{
                  fontSize: "10px",
                  color: isActive ? ACTIVE_COLOR : INACTIVE_COLOR,
                  fontWeight: isActive ? 700 : 500,
                  letterSpacing: isActive ? "0.01em" : "0",
                }}
              >
                {label}
              </span>
            </motion.button>
          );
        })}
      </nav>
    );
  }

  return (
    <nav
      className="flex flex-col items-center py-4 gap-1.5 shrink-0"
      style={{
        width: 62,
        background: "hsl(var(--card) / 0.6)",
        borderRight: "1px solid hsl(var(--border) / 0.1)",
        backdropFilter: "blur(20px) saturate(1.4)",
        WebkitBackdropFilter: "blur(20px) saturate(1.4)",
        boxShadow: "1px 0 16px hsl(var(--background) / 0.3)",
      }}
    >
      {TAB_IDS.map((tab) => {
        const isActive = active === tab.id;
        const Icon = tab.icon;
        const label = t(tab.labelKey) || tab.fallback;
        return (
          <motion.button
            key={tab.id}
            onClick={(e) => { e.stopPropagation(); onChange(tab.id); }}
            whileHover={{ scale: 1.08, backgroundColor: isActive ? "hsl(var(--accent) / 0.14)" : "hsl(var(--muted) / 0.5)" }}
            whileTap={{ scale: 0.92 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="relative flex flex-col items-center justify-center w-11 h-11 rounded-xl"
            style={{
              background: isActive ? "hsl(var(--accent) / 0.12)" : "transparent",
            }}
            title={label}
          >
            <Icon
              className="h-[18px] w-[18px] transition-colors duration-200"
              strokeWidth={isActive ? 2.3 : 1.6}
              style={{ color: isActive ? ACTIVE_COLOR : INACTIVE_COLOR }}
            />
            {tab.id === "chats" && unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full flex items-center justify-center text-[10px] font-bold leading-none px-0.5"
                style={{
                  background: BADGE_BG,
                  color: "hsl(225 25% 10%)",
                  boxShadow: `0 0 6px hsl(var(--accent) / 0.35)`,
                  border: "1.5px solid hsl(var(--card))",
                }}
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </motion.span>
            )}
            <AnimatePresence>
              {isActive && (
                <motion.div
                  initial={{ scaleY: 0, opacity: 0 }}
                  animate={{ scaleY: 1, opacity: 1 }}
                  exit={{ scaleY: 0, opacity: 0 }}
                  className="absolute -left-[1px] top-1.5 bottom-1.5 w-[3px] rounded-r-full origin-center"
                  style={{
                    background: ACTIVE_COLOR,
                    boxShadow: `0 0 8px hsl(var(--accent) / 0.4)`,
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                />
              )}
            </AnimatePresence>
          </motion.button>
        );
      })}
    </nav>
  );
}
