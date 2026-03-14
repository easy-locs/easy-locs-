/**
 * AppLockGuard — Wraps the app and shows lock screen when app security is enabled.
 * Integrates with auto-lock on background via setupAutoLock.
 */
import { useState, useEffect, useCallback } from "react";
import { isAppLocked, setupAutoLock, getSecurityConfig } from "@/lib/app-security";
import AppLockScreen from "./AppLockScreen";

interface Props {
  children: React.ReactNode;
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
  }, [locked]); // Re-init when lock state changes (config may have changed)

  const handleUnlock = useCallback(() => {
    setLocked(false);
    setGhostMode(false);
  }, []);

  const handleGhostMode = useCallback(() => {
    setLocked(false);
    setGhostMode(true);
  }, []);

  if (locked) {
    return <AppLockScreen onUnlock={handleUnlock} onGhostMode={handleGhostMode} />;
  }

  // In ghost mode, show a minimal clean interface
  if (ghostMode) {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center"
        style={{ background: "hsl(var(--hud-bg))" }}
      >
        <p className="text-sm" style={{ color: "hsl(var(--hud-text-dim))" }}>
          No conversations
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
