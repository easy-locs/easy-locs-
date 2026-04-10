/**
 * AppLockGuard — Wraps the app and shows lock screen when app security is enabled.
 * 
 * GHOST MODE SECURITY:
 * When ghost PIN is entered, {children} is NEVER mounted.
 * This means zero React components, zero Supabase queries, zero data in memory.
 * Document title is neutralized. Browser notifications are suppressed.
 */
import { useState, useEffect, useCallback } from "react";
import { isAppLocked, setupAutoLock, getSecurityConfig, activateGhostMode, deactivateGhostMode } from "@/lib/app-security";
import AppLockScreen from "./AppLockScreen";
import { MessageCircle, Search, Users, Settings, MoreHorizontal } from "lucide-react";

interface Props {
  children: React.ReactNode;
}

/**
 * GhostShell — Convincing fake messaging interface.
 * No real data is loaded. Pure static UI.
 */
function GhostShell() {
  // Neutralize document title to hide app identity
  useEffect(() => {
    document.title = "Messages";
    // Suppress any favicon badge if possible
    const link = document.querySelector("link[rel='icon']") as HTMLLinkElement;
    if (link) link.href = "/favicon.ico";
  }, []);

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: "hsl(var(--hud-bg))" }}>
      {/* Fake top bar */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: "1px solid hsl(var(--hud-border) / 0.1)" }}
      >
        <h1 className="text-base font-semibold" style={{ color: "hsl(var(--hud-text))" }}>
          Messages
        </h1>
        <div className="flex items-center gap-3">
          <Search className="h-4.5 w-4.5" style={{ color: "hsl(var(--hud-text-dim))" }} />
          <MoreHorizontal className="h-4.5 w-4.5" style={{ color: "hsl(var(--hud-text-dim))" }} />
        </div>
      </div>

      {/* Empty state */}
      <div className="flex-1 flex flex-col items-center justify-center gap-3 px-8">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: "hsl(var(--hud-surface))" }}
        >
          <MessageCircle className="h-7 w-7" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }} />
        </div>
        <p className="text-sm text-center" style={{ color: "hsl(var(--hud-text-dim))" }}>
          No conversations
        </p>
        <p className="text-xs text-center" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
          Messages you send and receive will appear here
        </p>
      </div>

      {/* Fake bottom nav */}
      <div
        className="flex items-center justify-around py-2.5 shrink-0"
        style={{ borderTop: "1px solid hsl(var(--hud-border) / 0.1)" }}
      >
        {[
          { icon: MessageCircle, label: "Chats", active: true },
          { icon: Users, label: "Contacts", active: false },
          { icon: Settings, label: "Settings", active: false },
        ].map((item) => (
          <button
            key={item.label}
            className="flex flex-col items-center gap-0.5 px-4 py-1"
            onClick={() => {}} // No-op
          >
            <item.icon
              className="h-5 w-5"
              style={{
                color: item.active
                  ? "hsl(var(--hud-cyan))"
                  : "hsl(var(--hud-text-dim) / 0.4)",
              }}
            />
            <span
              className="text-[10px]"
              style={{
                color: item.active
                  ? "hsl(var(--hud-cyan))"
                  : "hsl(var(--hud-text-dim) / 0.4)",
              }}
            >
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function AppLockGuard({ children }: Props) {
  const [locked, setLocked] = useState(() => isAppLocked());
  const [ghostMode, setGhostMode] = useState(false);

  // Re-check lock state on visibility change (handles auto-lock)
  useEffect(() => {
    const check = () => {
      if (document.hidden) return;
      setLocked(isAppLocked());
    };
    document.addEventListener("visibilitychange", check);
    return () => document.removeEventListener("visibilitychange", check);
  }, []);

  // Setup auto-lock on background
  useEffect(() => {
    const cleanup = setupAutoLock();
    return cleanup;
  }, [locked]);

  const handleUnlock = useCallback(() => {
    setLocked(false);
    setGhostMode(false);
    deactivateGhostMode();
  }, []);

  const handleGhostMode = useCallback(() => {
    setLocked(false);
    setGhostMode(true);
    activateGhostMode();
  }, []);

  if (locked) {
    return <AppLockScreen onUnlock={handleUnlock} onGhostMode={handleGhostMode} />;
  }

  // Ghost mode: convincing fake UI, ZERO real data mounted
  if (ghostMode) {
    return <GhostShell />;
  }

  return <>{children}</>;
}
