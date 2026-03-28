/**
 * OrbitSessionManager — Device/session management UI (HUD-themed)
 * Shows active sessions with real revoke capability via Supabase Auth.
 */
import { useState, useEffect, useCallback } from "react";
import { Smartphone, Monitor, Tablet, Trash2, ShieldAlert, Loader2, LogOut, Shield, CheckCircle } from "lucide-react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface OrbitSessionManagerProps {
  userId: string;
}

export default function OrbitSessionManager({ userId }: OrbitSessionManagerProps) {
  const [sessions, setSessions] = useState<DeviceSession[]>([]);
  const [suspiciousLogins, setSuspiciousLogins] = useState<LoginEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);
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
    setRevoking(sessionId);
    const ok = await revokeSession(sessionId);
    if (ok) {
      toast.success("Session révoquée — l'appareil sera déconnecté.");
      await load();
    } else {
      toast.error("Échec de la révocation");
    }
    setRevoking(null);
  };

  const handleRevokeAll = async () => {
    setRevokingAll(true);
    const ok = await revokeAllOtherSessions(userId);
    if (ok) {
      toast.success("✅ Toutes les autres sessions ont été révoquées. Les appareils seront déconnectés.");
    } else {
      toast.error("Échec de la révocation des sessions.");
    }
    await load();
    setRevokingAll(false);
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
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin" style={{ color: "hsl(var(--hud-cyan) / 0.4)" }} />
      </div>
    );
  }

  const otherSessions = sessions.filter(s => s.device_fingerprint !== currentFingerprint);

  return (
    <div className="space-y-4">
      {/* Security status */}
      <div className="rounded-xl p-3" style={{
        background: otherSessions.length === 0 ? "hsl(var(--hud-success) / 0.06)" : "hsl(var(--hud-cyan) / 0.04)",
        border: `1px solid ${otherSessions.length === 0 ? "hsl(var(--hud-success) / 0.15)" : "hsl(var(--hud-cyan) / 0.1)"}`,
      }}>
        <div className="flex items-center gap-2">
          {otherSessions.length === 0 ? (
            <>
              <CheckCircle className="h-4 w-4" style={{ color: "hsl(var(--hud-success))" }} />
              <span className="text-xs font-semibold" style={{ color: "hsl(var(--hud-success))" }}>
                Seul cet appareil est connecté
              </span>
            </>
          ) : (
            <>
              <Shield className="h-4 w-4" style={{ color: "hsl(var(--hud-cyan))" }} />
              <span className="text-xs font-semibold" style={{ color: "hsl(var(--hud-cyan))" }}>
                {otherSessions.length} autre{otherSessions.length > 1 ? "s" : ""} appareil{otherSessions.length > 1 ? "s" : ""} connecté{otherSessions.length > 1 ? "s" : ""}
              </span>
            </>
          )}
        </div>
      </div>

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
              <p key={login.id} className="text-token-xs" style={{ color: "hsl(var(--hud-text-dim))" }}>
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
            {sessions.length} session{sessions.length > 1 ? "s" : ""} active{sessions.length > 1 ? "s" : ""}
          </span>
          {otherSessions.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-token-xs h-7 px-2 gap-1"
                  disabled={revokingAll}
                  style={{ color: "hsl(var(--destructive))" }}>
                  {revokingAll ? <Loader2 className="h-3 w-3 animate-spin" /> : <LogOut className="h-3 w-3" />}
                  Tout déconnecter
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.15)" }}>
                <AlertDialogHeader>
                  <AlertDialogTitle style={{ color: "hsl(var(--hud-text))" }}>
                    Déconnecter tous les autres appareils ?
                  </AlertDialogTitle>
                  <AlertDialogDescription style={{ color: "hsl(var(--hud-text-dim))" }}>
                    Cette action va révoquer toutes les sessions actives sauf celle de cet appareil.
                    Les autres appareils seront immédiatement déconnectés et devront se reconnecter.
                    Cette action est irréversible.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel style={{ color: "hsl(var(--hud-text))" }}>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={handleRevokeAll}
                    style={{ background: "hsl(var(--destructive))", color: "hsl(var(--destructive-foreground))" }}>
                    Déconnecter tout
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        <div className="space-y-1.5">
          {sessions.map((session) => {
            const isCurrent = session.device_fingerprint === currentFingerprint;
            const isRevoking = revoking === session.id;
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
                     <span className="text-sm font-medium min-w-0 break-words leading-snug" style={{ color: "hsl(var(--hud-text))" }}>
                       {session.device_label}
                     </span>
                    {isCurrent && (
                      <Badge variant="outline" className="text-micro px-1.5 py-0 shrink-0" style={{
                        borderColor: "hsl(var(--hud-success) / 0.3)", color: "hsl(var(--hud-success))",
                        background: "hsl(var(--hud-success) / 0.08)",
                      }}>
                        Cet appareil
                      </Badge>
                    )}
                  </div>
                  <p className="text-token-xs" style={{ color: "hsl(var(--hud-text-dim) / 0.6)" }}>
                    Dernière activité : {formatDate(session.last_active_at)}
                  </p>
                </div>
                {!isCurrent && (
                  <Button variant="ghost" size="icon" className="h-8 w-8"
                    onClick={() => handleRevoke(session.id)}
                    disabled={isRevoking}
                    style={{ color: "hsl(var(--destructive))" }}>
                    {isRevoking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
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
