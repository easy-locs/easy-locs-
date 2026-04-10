/**
 * Permission Center — shows permission status and provides smart request flows.
 * Never forces permissions. Explains why each is needed and provides fallbacks.
 */
import { useState, useEffect, useCallback } from "react";
import { MapPin, Camera, Mic, Bell, Shield, ChevronRight, Check, X, AlertTriangle, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type PermStatus = "granted" | "denied" | "prompt" | "unavailable";

interface PermState {
  geolocation: PermStatus;
  camera: PermStatus;
  microphone: PermStatus;
  notifications: PermStatus;
}

async function probePermission(name: string): Promise<PermStatus> {
  try {
    const status = await navigator.permissions.query({ name: name as PermissionName });
    return status.state as PermStatus;
  } catch {
    return "unavailable";
  }
}

async function probeAllPermissions(): Promise<PermState> {
  const [geolocation, camera, microphone] = await Promise.all([
    probePermission("geolocation"),
    probePermission("camera"),
    probePermission("microphone"),
  ]);

  const notifications: PermStatus =
    !("Notification" in window) ? "unavailable"
    : Notification.permission === "granted" ? "granted"
    : Notification.permission === "denied" ? "denied"
    : "prompt";

  return { geolocation, camera, microphone, notifications };
}

const PERM_CONFIG = [
  {
    key: "geolocation" as const,
    icon: MapPin,
    label: "Location",
    description: "Used for Radar, nearby discovery, and delivery tracking",
    whenNeeded: "When you open Radar, search nearby, or track a delivery",
    fallback: "You can search by city or enter your address manually",
  },
  {
    key: "camera" as const,
    icon: Camera,
    label: "Camera",
    description: "Used for QR scanning, photo capture, and document upload",
    whenNeeded: "When you scan a QR code or take a photo",
    fallback: "You can upload images from your gallery instead",
  },
  {
    key: "microphone" as const,
    icon: Mic,
    label: "Microphone",
    description: "Used for voice calls and audio messages",
    whenNeeded: "When you start a call or record a voice message",
    fallback: "You can use text messages instead",
  },
  {
    key: "notifications" as const,
    icon: Bell,
    label: "Notifications",
    description: "Used for order updates, messages, and important alerts",
    whenNeeded: "After your first order or when you enable alerts",
    fallback: "You'll still see notifications inside the app",
  },
];

function StatusBadge({ status }: { status: PermStatus }) {
  if (status === "granted") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 text-xs font-medium">
        <Check className="h-3 w-3" /> Allowed
      </span>
    );
  }
  if (status === "denied") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-xs font-medium">
        <X className="h-3 w-3" /> Blocked
      </span>
    );
  }
  if (status === "unavailable") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-medium">
        Not available
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 text-xs font-medium">
      <AlertTriangle className="h-3 w-3" /> Not set
    </span>
  );
}

export default function PermissionCenterPage() {
  const [perms, setPerms] = useState<PermState | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setPerms(await probeAllPermissions());
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  if (!perms) {
    return (
      <div className="app-mobile-page bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground text-sm">Loading permissions…</div>
      </div>
    );
  }

  const grantedCount = Object.values(perms).filter((v) => v === "granted").length;

  return (
    <div className="app-mobile-page bg-background">
      {/* Header */}
      <div className="bg-gradient-to-b from-primary/5 to-background px-4 pt-12 pb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Permission Center</h1>
            <p className="text-xs text-muted-foreground">
              {grantedCount}/4 permissions active
            </p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          We only request access when you need a feature. You can manage permissions anytime from your browser settings.
        </p>
      </div>

      {/* Permission Cards */}
      <div className="px-4 space-y-3 pb-24">
        {PERM_CONFIG.map((perm) => {
          const status = perms[perm.key];
          const isExpanded = expanded === perm.key;
          const Icon = perm.icon;

          return (
            <motion.div
              key={perm.key}
              layout
              className="rounded-xl border border-border/30 bg-card overflow-hidden"
            >
              <button
                onClick={() => setExpanded(isExpanded ? null : perm.key)}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
              >
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                  status === "granted" ? "bg-green-500/10 text-green-600" :
                  status === "denied" ? "bg-destructive/10 text-destructive" :
                  "bg-muted text-muted-foreground"
                }`}>
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{perm.label}</p>
                  <p className="text-xs text-muted-foreground truncate">{perm.description}</p>
                </div>
                <StatusBadge status={status} />
                <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`} />
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-3 border-t border-border/20 pt-3">
                      <div>
                        <p className="text-xs font-medium text-foreground mb-1">When is it requested?</p>
                        <p className="text-xs text-muted-foreground">{perm.whenNeeded}</p>
                      </div>

                      {status === "denied" && (
                        <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-3">
                          <p className="text-xs font-medium text-amber-700 mb-1">Permission was denied</p>
                          <p className="text-xs text-amber-600/80 mb-2">
                            To re-enable, open your browser's site settings and allow {perm.label.toLowerCase()} access for this site.
                          </p>
                          <button
                            onClick={() => {
                              // Can't programmatically open settings, but guide the user
                              window.alert(
                                `To change ${perm.label.toLowerCase()} permission:\n\n` +
                                `1. Tap the lock/info icon in your browser's address bar\n` +
                                `2. Find "${perm.label}" in the site permissions\n` +
                                `3. Change it to "Allow"\n` +
                                `4. Reload this page`
                              );
                            }}
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 hover:text-amber-800"
                          >
                            <ExternalLink className="h-3 w-3" />
                            How to re-enable
                          </button>
                        </div>
                      )}

                      <div>
                        <p className="text-xs font-medium text-foreground mb-1">Without this permission</p>
                        <p className="text-xs text-muted-foreground">{perm.fallback}</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}

        {/* Refresh button */}
        <button
          onClick={() => void refresh()}
          className="w-full py-3 rounded-xl border border-border/30 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-card transition-colors"
        >
          Refresh permission status
        </button>
      </div>
    </div>
  );
}
