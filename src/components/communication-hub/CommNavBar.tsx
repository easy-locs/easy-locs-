/**
 * CommNavBar — Internal communication module navigation.
 * App-like bottom tab bar on mobile, compact sidebar strip on desktop.
 */
import { MessageCircle, Phone, Users, UsersRound, Video, FolderOpen, Settings } from "lucide-react";
import { motion } from "framer-motion";

export type CommSection = "chats" | "calls" | "contacts" | "groups" | "meetings" | "files" | "settings";

const TABS: { id: CommSection; icon: typeof MessageCircle; label: string }[] = [
  { id: "chats", icon: MessageCircle, label: "Chats" },
  { id: "calls", icon: Phone, label: "Calls" },
  { id: "contacts", icon: Users, label: "Contacts" },
  { id: "groups", icon: UsersRound, label: "Groups" },
  { id: "meetings", icon: Video, label: "Meetings" },
  { id: "files", icon: FolderOpen, label: "Files" },
  { id: "settings", icon: Settings, label: "Settings" },
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
        className="flex items-center justify-around shrink-0 safe-area-pb"
        style={{
          background: "hsl(var(--hud-surface) / 0.95)",
          borderTop: "1px solid hsl(var(--hud-border) / 0.1)",
          backdropFilter: "blur(12px)",
          height: 56,
        }}
      >
        {TABS.slice(0, 5).map((tab) => {
          const isActive = active === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className="flex flex-col items-center gap-0.5 relative px-3 py-1"
            >
              {isActive && (
                <motion.div
                  layoutId="comm-tab-indicator"
                  className="absolute -top-px left-2 right-2 h-0.5 rounded-full"
                  style={{ background: "hsl(var(--hud-cyan))" }}
                />
              )}
              <div className="relative">
                <Icon
                  className="h-5 w-5"
                  style={{ color: isActive ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim) / 0.5)" }}
                />
                {tab.id === "chats" && unreadCount > 0 && (
                  <span
                    className="absolute -top-1.5 -right-2 min-w-[16px] h-4 rounded-full flex items-center justify-center text-[9px] font-bold px-1"
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
                className="text-[9px] font-medium"
                style={{ color: isActive ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim) / 0.4)" }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    );
  }

  // Desktop: vertical icon strip
  return (
    <nav
      className="flex flex-col items-center py-3 gap-1 shrink-0"
      style={{
        width: 56,
        background: "hsl(var(--hud-surface) / 0.6)",
        borderRight: "1px solid hsl(var(--hud-border) / 0.08)",
      }}
    >
      {TABS.map((tab) => {
        const isActive = active === tab.id;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className="relative w-10 h-10 rounded-xl flex items-center justify-center transition-colors"
            style={{
              background: isActive ? "hsl(var(--hud-cyan) / 0.1)" : "transparent",
              border: isActive ? "1px solid hsl(var(--hud-cyan) / 0.2)" : "1px solid transparent",
            }}
            title={tab.label}
          >
            <Icon
              className="h-4 w-4"
              style={{ color: isActive ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim) / 0.5)" }}
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
