/**
 * OrbitSessionManager — Device/session management UI
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
      toast.success("Session revoked");
      load();
    } else {
      toast.error("Failed to revoke session");
    }
  };

  const handleRevokeAll = async () => {
    await revokeAllOtherSessions(userId);
    toast.success("All other sessions revoked");
    load();
  };

  const getDeviceIcon = (os: string) => {
    if (os === "iOS" || os === "Android") return <Smartphone className="h-5 w-5" />;
    if (os === "iPadOS") return <Tablet className="h-5 w-5" />;
    return <Monitor className="h-5 w-5" />;
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Suspicious logins alert */}
      {suspiciousLogins.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-4">
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-semibold text-amber-800 dark:text-amber-400">
              Recent new device logins
            </span>
          </div>
          <div className="space-y-1">
            {suspiciousLogins.map((login) => (
              <p key={login.id} className="text-xs text-amber-700 dark:text-amber-300">
                {login.device_label} — {formatDate(login.created_at)}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Active sessions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">Active Sessions</h3>
          {sessions.length > 1 && (
            <Button variant="ghost" size="sm" className="text-xs text-destructive" onClick={handleRevokeAll}>
              <LogOut className="h-3 w-3 mr-1" /> Log out all others
            </Button>
          )}
        </div>

        <div className="space-y-2">
          {sessions.map((session) => {
            const isCurrent = session.device_fingerprint === currentFingerprint;
            return (
              <div
                key={session.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card"
              >
                <div className="text-muted-foreground">
                  {getDeviceIcon(session.os || "")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground truncate">
                      {session.device_label}
                    </span>
                    {isCurrent && (
                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                        This device
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Last active: {formatDate(session.last_active_at)}
                  </p>
                </div>
                {!isCurrent && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleRevoke(session.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
