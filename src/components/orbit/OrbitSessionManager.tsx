/**
 * OrbitSessionManager — Device/session management UI (HUD-themed)
 * Shows active sessions with revoke capability
 */
import { useState, useEffect, useCallback } from "react";
import { Smartphone, Monitor, Tablet, Trash2, ShieldAlert, Loader2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getUserSessions,
  revokeSession,
  revokeAllOtherSessions,
  getSuspiciousLogins,
  type DeviceSession,
  type LoginEvent,
} from "@/lib/orbit-session-manager";
import { getDeviceFingerprint } from "@/lib/orbit-keystore";
import { toast } from "sonner";

interface OrbitSessionManagerProps {
  userId: string;
}

export default function OrbitSessionManager({ userId }: OrbitSessionManagerProps) {
  const [sessions, setSessions] = useState<DeviceSession[]>([]);
  const [suspiciousLogins, setSuspiciousLogins] = useState<LoginEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentFingerprint, setCurrentFingerprint] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    const [sessionsData, loginsData, fp] = await Promise.all([
      getUserSessions(userId),
      getSuspiciousLogins(userId, 5),
      getDeviceFingerprint(),
    ]);
    setSessions(sessionsData);
    setSuspiciousLogins(loginsData);
    setCurrentFingerprint(fp);
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const handleRevoke = async (sessionId: string) => {
    const ok = await revokeSession(sessionId);
    if (ok) {
      toast.success("Session révoquée");
      load();
    } else {
      toast.error("Échec de la révocation");
    }
  };

  const handleRevokeAll = async () => {
    await revokeAllOtherSessions(userId);
    toast.success("Toutes les autres sessions révoquées");
    load();
  };

  const getDeviceIcon = (os: string) => {
    if (os === "iOS" || os === "Android") return <Smartphone className="h-4 w-4" />;
    if (os === "iPadOS") return <Tablet className="h-4 w-4" />;
    return <Monitor className="h-4 w-4" />;
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return "À l'instant";
    if (diff < 3600000) return `Il y a ${Math.floor(diff / 60000)}min`;
    if (diff < 86400000) return `Il y a ${Math.floor(diff / 3600000)}h`;
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin" style={{ color: "hsl(var(--hud-cyan) / 0.4)" }} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Suspicious logins alert */}
      {suspiciousLogins.length > 0 && (
        <div className="rounded-xl p-3" style={{
          background: "hsl(var(--hud-warning) / 0.06)",
          border: "1px solid hsl(var(--hud-warning) / 0.15)",
        }}>
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert className="h-4 w-4" style={{ color: "hsl(var(--hud-warning))" }} />
            <span className="text-xs font-semibold" style={{ color: "hsl(var(--hud-warning))" }}>
              Connexions récentes depuis un nouvel appareil
            </span>
          </div>
          <div className="space-y-1">
            {suspiciousLogins.map((login) => (
              <p key={login.id} className="text-[11px]" style={{ color: "hsl(var(--hud-text-dim))" }}>
                {login.device_label} — {formatDate(login.created_at)}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Active sessions */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium" style={{ color: "hsl(var(--hud-text-dim))" }}>
            {sessions.length} appareil{sessions.length > 1 ? "s" : ""} connecté{sessions.length > 1 ? "s" : ""}
          </span>
          {sessions.length > 1 && (
            <Button variant="ghost" size="sm" className="text-[11px] h-7 px-2 gap-1" onClick={handleRevokeAll}
              style={{ color: "hsl(var(--hud-danger, 0 80% 60%))" }}>
              <LogOut className="h-3 w-3" /> Tout déconnecter
            </Button>
          )}
        </div>

        <div className="space-y-1.5">
          {sessions.map((session) => {
            const isCurrent = session.device_fingerprint === currentFingerprint;
            return (
              <div key={session.id} className="flex items-center gap-3 p-2.5 rounded-lg" style={{
                background: isCurrent ? "hsl(var(--hud-success) / 0.05)" : "hsl(var(--hud-surface) / 0.5)",
                border: `1px solid ${isCurrent ? "hsl(var(--hud-success) / 0.12)" : "hsl(var(--hud-border) / 0.08)"}`,
              }}>
                <div style={{ color: isCurrent ? "hsl(var(--hud-success))" : "hsl(var(--hud-text-dim))" }}>
                  {getDeviceIcon(session.os || "")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate" style={{ color: "hsl(var(--hud-text))" }}>
                      {session.device_label}
                    </span>
                    {isCurrent && (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 shrink-0" style={{
                        borderColor: "hsl(var(--hud-success) / 0.3)", color: "hsl(var(--hud-success))",
                        background: "hsl(var(--hud-success) / 0.08)",
                      }}>
                        Cet appareil
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px]" style={{ color: "hsl(var(--hud-text-dim) / 0.6)" }}>
                    {formatDate(session.last_active_at)}
                  </p>
                </div>
                {!isCurrent && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRevoke(session.id)}
                    style={{ color: "hsl(var(--hud-danger, 0 80% 60%))" }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            );
          })}
          {sessions.length === 0 && (
            <p className="text-xs text-center py-4" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>
              Aucune session active
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
