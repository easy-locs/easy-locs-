/**
 * OrbitPermissionsDiag — Diagnostic widget showing mic/camera/notification status.
 * Displays actionable state for each communication permission.
 */
import { useEffect, useState } from "react";
import { Mic, Camera, Bell, Wifi, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

type PermStatus = "granted" | "denied" | "prompt" | "unavailable" | "checking";

interface PermState {
  microphone: PermStatus;
  camera: PermStatus;
  notifications: PermStatus;
}

function statusIcon(s: PermStatus) {
  if (s === "granted") return <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "hsl(var(--hud-success))" }} />;
  if (s === "denied") return <XCircle className="w-3.5 h-3.5" style={{ color: "hsl(var(--hud-danger))" }} />;
  if (s === "prompt") return <AlertTriangle className="w-3.5 h-3.5" style={{ color: "hsl(var(--hud-warning, 45 100% 60%))" }} />;
  return <AlertTriangle className="w-3.5 h-3.5" style={{ color: "hsl(var(--hud-text-dim))" }} />;
}

function statusLabel(s: PermStatus): string {
  if (s === "granted") return "Autorisé";
  if (s === "denied") return "Refusé";
  if (s === "prompt") return "Non demandé";
  if (s === "checking") return "Vérification…";
  return "Non disponible";
}

async function checkPermission(name: PermissionName): Promise<PermStatus> {
  try {
    const result = await navigator.permissions.query({ name });
    return result.state as PermStatus;
  } catch {
    return "unavailable";
  }
}

export default function OrbitPermissionsDiag() {
  const [perms, setPerms] = useState<PermState>({
    microphone: "checking",
    camera: "checking",
    notifications: "checking",
  });

  useEffect(() => {
    async function check() {
      const [mic, cam] = await Promise.all([
        checkPermission("microphone" as PermissionName),
        checkPermission("camera" as PermissionName),
      ]);

      let notif: PermStatus = "unavailable";
      if ("Notification" in window) {
        const p = Notification.permission;
        notif = p === "granted" ? "granted" : p === "denied" ? "denied" : "prompt";
      }

      setPerms({ microphone: mic, camera: cam, notifications: notif });
    }
    check();
  }, []);

  const allOk = perms.microphone === "granted" && perms.camera === "granted" && perms.notifications === "granted";
  const hasDenied = perms.microphone === "denied" || perms.camera === "denied" || perms.notifications === "denied";

  const items = [
    { icon: Mic, label: "Microphone", status: perms.microphone },
    { icon: Camera, label: "Caméra", status: perms.camera },
    { icon: Bell, label: "Notifications", status: perms.notifications },
  ];

  return (
    <div className="w-full max-w-md">
      <div className="flex items-center justify-between mb-2 px-1">
        <h2
          className="text-[11px] font-bold uppercase tracking-widest"
          style={{ color: "hsl(var(--hud-text-dim))" }}
        >
          Diagnostic système
        </h2>
        {allOk && (
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: "hsl(var(--hud-success) / 0.15)", color: "hsl(var(--hud-success))" }}
          >
            Opérationnel
          </span>
        )}
        {hasDenied && (
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: "hsl(var(--hud-danger) / 0.15)", color: "hsl(var(--hud-danger))" }}
          >
            Attention requise
          </span>
        )}
      </div>

      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: "hsl(var(--hud-surface))",
          border: `1px solid ${hasDenied ? "hsl(var(--hud-danger) / 0.2)" : "hsl(var(--hud-border) / 0.12)"}`,
        }}
      >
        {items.map((item, i) => (
          <div
            key={item.label}
            className="flex items-center gap-3 px-4 py-2.5"
            style={{
              borderBottom: i < items.length - 1 ? "1px solid hsl(var(--hud-border) / 0.08)" : "none",
            }}
          >
            <item.icon className="w-4 h-4 shrink-0" style={{ color: "hsl(var(--hud-text-dim))" }} />
            <span className="flex-1 text-[12px] font-medium" style={{ color: "hsl(var(--hud-text))" }}>
              {item.label}
            </span>
            {statusIcon(item.status)}
            <span
              className="text-[10px] font-medium min-w-[70px] text-right"
              style={{
                color: item.status === "granted"
                  ? "hsl(var(--hud-success))"
                  : item.status === "denied"
                    ? "hsl(var(--hud-danger))"
                    : "hsl(var(--hud-text-dim))",
              }}
            >
              {statusLabel(item.status)}
            </span>
          </div>
        ))}
      </div>

      {hasDenied && (
        <p className="text-[10px] mt-1.5 px-1" style={{ color: "hsl(var(--hud-danger) / 0.8)" }}>
          Certaines permissions sont refusées. Les appels pourraient ne pas fonctionner. Autorisez-les dans les paramètres de votre navigateur.
        </p>
      )}
    </div>
  );
}
