/**
 * CommNavBar — Lightweight internal communication navigation.
 * Clean, native-feeling bottom tabs (mobile) / slim sidebar (desktop).
 */
import { MessageCircle, Phone, Users, CreditCard, UsersRound } from "lucide-react";
import { motion } from "framer-motion";

export type CommSection = "chats" | "calls" | "contacts" | "payments" | "groups" | "meetings" | "files" | "settings";

const TABS: { id: CommSection; icon: typeof MessageCircle; label: string }[] = [
  { id: "chats", icon: MessageCircle, label: "Chats" },
  { id: "calls", icon: Phone, label: "Calls" },
  { id: "contacts", icon: Users, label: "Contacts" },
  { id: "payments", icon: CreditCard, label: "Pay" },
  { id: "groups", icon: UsersRound, label: "Groups" },
];

interface Props {
  active: CommSection;
  onChange: (section: CommSection) => void;
  isMobile: boolean;
  unreadCount?: number;
}

export default function CommNavBar({ active, onChange, isMobile, unreadCount = 0 }: Props) {
  if (isMobile) {
    return (
      <nav
        className="flex items-end justify-around shrink-0"
        style={{
          background: "hsl(var(--hud-bg))",
          borderTop: "1px solid hsl(var(--hud-border) / 0.06)",
          paddingBottom: "max(env(safe-area-inset-bottom, 0px), 4px)",
          paddingTop: 6,
        }}
      >
        {TABS.map((tab) => {
          const isActive = active === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className="flex flex-col items-center gap-1 relative min-w-[48px] py-1"
            >
              {isActive && (
                <motion.div
                  layoutId="comm-tab-active"
                  className="absolute -top-[6px] left-3 right-3 h-[2px] rounded-full"
                  style={{ background: "hsl(var(--hud-cyan))" }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <div className="relative">
                <Icon
                  className="h-[22px] w-[22px]"
                  strokeWidth={isActive ? 2.2 : 1.5}
                  style={{
                    color: isActive
                      ? "hsl(var(--hud-cyan))"
                      : "hsl(var(--hud-text-dim) / 0.4)",
                  }}
                />
                {tab.id === "chats" && unreadCount > 0 && (
                  <span
                    className="absolute -top-1 -right-2.5 min-w-[16px] h-[16px] rounded-full flex items-center justify-center text-[9px] font-bold px-1"
                    style={{
                      background: "hsl(var(--hud-cyan))",
                      color: "hsl(var(--hud-bg))",
                    }}
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </div>
              <span
                className="text-[10px] leading-none"
                style={{
                  color: isActive
                    ? "hsl(var(--hud-cyan))"
                    : "hsl(var(--hud-text-dim) / 0.35)",
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    );
  }

  // Desktop: slim vertical strip
  return (
    <nav
      className="flex flex-col items-center py-4 gap-1.5 shrink-0"
      style={{
        width: 52,
        background: "hsl(var(--hud-surface) / 0.4)",
        borderRight: "1px solid hsl(var(--hud-border) / 0.06)",
      }}
    >
      {TABS.map((tab) => {
        const isActive = active === tab.id;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
            style={{
              background: isActive ? "hsl(var(--hud-cyan) / 0.08)" : "transparent",
            }}
            title={tab.label}
          >
            {isActive && (
              <motion.div
                layoutId="comm-desk-indicator"
                className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-full"
                style={{ background: "hsl(var(--hud-cyan))" }}
              />
            )}
            <Icon
              className="h-[18px] w-[18px]"
              strokeWidth={isActive ? 2 : 1.5}
              style={{
                color: isActive
                  ? "hsl(var(--hud-cyan))"
                  : "hsl(var(--hud-text-dim) / 0.4)",
              }}
            />
            {tab.id === "chats" && unreadCount > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold px-0.5"
                style={{
                  background: "hsl(var(--hud-cyan))",
                  color: "hsl(var(--hud-bg))",
                }}
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
