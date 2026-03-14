/**
 * AppSecuritySettings — Configure PIN, ghost PIN, panic PIN, auto-lock.
 */
import { useState, useEffect } from "react";
import { Lock, Ghost, AlertTriangle, Shield, Clock, Smartphone, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  getSecurityConfig, saveSecurityConfig, hashPin, auditPlatformCapabilities,
  type AppSecurityConfig, type PlatformSecurityAudit,
} from "@/lib/app-security";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";

export default function AppSecuritySettings() {
  const [config, setConfig] = useState<AppSecurityConfig>(getSecurityConfig());
  const [audit] = useState<PlatformSecurityAudit>(auditPlatformCapabilities());
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [pinType, setPinType] = useState<"main" | "ghost" | "panic">("main");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showPin, setShowPin] = useState(false);

  const save = (updates: Partial<AppSecurityConfig>) => {
    const next = { ...config, ...updates };
    setConfig(next);
    saveSecurityConfig(updates);
    haptic("light");
  };

  const handleSetPin = async () => {
    if (newPin.length < 4) { toast.error("PIN must be at least 4 digits"); return; }
    if (newPin !== confirmPin) { toast.error("PINs don't match"); return; }
    if (!/^\d+$/.test(newPin)) { toast.error("PIN must be digits only"); return; }

    const hash = await hashPin(newPin);

    // Check no collision with other PINs
    if (pinType === "main" && (hash === config.ghost_pin_hash || hash === config.panic_pin_hash)) {
      toast.error("This PIN is already used for ghost or panic mode"); return;
    }
    if (pinType === "ghost" && (hash === config.pin_hash || hash === config.panic_pin_hash)) {
      toast.error("This PIN is already used for main or panic unlock"); return;
    }
    if (pinType === "panic" && (hash === config.pin_hash || hash === config.ghost_pin_hash)) {
      toast.error("This PIN is already used for main or ghost unlock"); return;
    }

    const field = pinType === "main" ? "pin_hash" : pinType === "ghost" ? "ghost_pin_hash" : "panic_pin_hash";
    save({ [field]: hash, enabled: true });
    setShowPinSetup(false);
    setNewPin("");
    setConfirmPin("");
    toast.success(`${pinType === "main" ? "Main" : pinType === "ghost" ? "Ghost" : "Panic"} PIN set`);
  };

  const handleRemovePin = (type: "main" | "ghost" | "panic") => {
    const field = type === "main" ? "pin_hash" : type === "ghost" ? "ghost_pin_hash" : "panic_pin_hash";
    const updates: Partial<AppSecurityConfig> = { [field]: null };
    if (type === "main") updates.enabled = false;
    save(updates);
    toast.success("PIN removed");
  };

  const pinLabels = {
    main: { icon: Lock, label: "Main PIN", desc: "Unlock the app", color: "hsl(var(--hud-cyan))" },
    ghost: { icon: Ghost, label: "Ghost PIN", desc: "Opens a clean empty interface", color: "hsl(var(--hud-warning))" },
    panic: { icon: AlertTriangle, label: "Panic PIN", desc: "Wipes all local data immediately", color: "hsl(var(--hud-danger))" },
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: "hsl(var(--hud-text))" }}>
          <Shield className="h-4 w-4" style={{ color: "hsl(var(--hud-cyan))" }} />
          App Security
        </h3>
        <p className="text-xs mt-1" style={{ color: "hsl(var(--hud-text-dim))" }}>
          Lock your app with PIN codes and advanced security modes
        </p>
      </div>

      {/* PIN Sections */}
      {(["main", "ghost", "panic"] as const).map(type => {
        const { icon: Icon, label, desc, color } = pinLabels[type];
        const field = type === "main" ? "pin_hash" : type === "ghost" ? "ghost_pin_hash" : "panic_pin_hash";
        const isSet = !!config[field];

        return (
          <div key={type} className="flex items-center justify-between p-3 rounded-xl" style={{
            background: "hsl(var(--hud-surface))",
            border: "1px solid hsl(var(--hud-border) / 0.1)",
          }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{
                background: `${color}15`,
              }}>
                <Icon className="h-4 w-4" style={{ color }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: "hsl(var(--hud-text))" }}>{label}</p>
                <p className="text-[11px]" style={{ color: "hsl(var(--hud-text-dim))" }}>{desc}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isSet && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{
                  background: `${color}15`, color,
                }}>
                  Active
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (isSet) { handleRemovePin(type); }
                  else { setPinType(type); setShowPinSetup(true); }
                }}
                className="text-xs h-7"
              >
                {isSet ? "Remove" : "Set"}
              </Button>
            </div>
          </div>
        );
      })}

      {/* PIN Setup Dialog */}
      {showPinSetup && (
        <div className="p-4 rounded-xl space-y-3" style={{
          background: "hsl(var(--hud-surface))",
          border: "1px solid hsl(var(--hud-border) / 0.15)",
        }}>
          <p className="text-sm font-medium" style={{ color: "hsl(var(--hud-text))" }}>
            Set {pinLabels[pinType].label}
          </p>
          <div className="relative">
            <Input
              type={showPin ? "text" : "password"}
              value={newPin}
              onChange={e => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="Enter 4-6 digit PIN"
              className="text-sm pr-10"
              inputMode="numeric"
              autoFocus
            />
            <button
              onClick={() => setShowPin(!showPin)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1"
            >
              {showPin ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
            </button>
          </div>
          <Input
            type={showPin ? "text" : "password"}
            value={confirmPin}
            onChange={e => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="Confirm PIN"
            className="text-sm"
            inputMode="numeric"
          />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { setShowPinSetup(false); setNewPin(""); setConfirmPin(""); }}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSetPin} disabled={newPin.length < 4 || newPin !== confirmPin}>
              Confirm
            </Button>
          </div>
        </div>
      )}

      {/* Auto-lock settings */}
      {config.enabled && (
        <>
          <div className="flex items-center justify-between p-3 rounded-xl" style={{
            background: "hsl(var(--hud-surface))",
            border: "1px solid hsl(var(--hud-border) / 0.1)",
          }}>
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4" style={{ color: "hsl(var(--hud-text-dim))" }} />
              <div>
                <p className="text-sm font-medium" style={{ color: "hsl(var(--hud-text))" }}>Auto-lock on background</p>
                <p className="text-[11px]" style={{ color: "hsl(var(--hud-text-dim))" }}>
                  Lock after {config.auto_lock_delay_seconds}s in background
                </p>
              </div>
            </div>
            <Switch
              checked={config.auto_lock_on_background}
              onCheckedChange={v => save({ auto_lock_on_background: v })}
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl" style={{
            background: "hsl(var(--hud-surface))",
            border: "1px solid hsl(var(--hud-border) / 0.1)",
          }}>
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-4 w-4" style={{ color: "hsl(var(--hud-danger))" }} />
              <div>
                <p className="text-sm font-medium" style={{ color: "hsl(var(--hud-text))" }}>Wipe after max attempts</p>
                <p className="text-[11px]" style={{ color: "hsl(var(--hud-text-dim))" }}>
                  Erase data after {config.max_attempts} wrong PINs
                </p>
              </div>
            </div>
            <Switch
              checked={config.wipe_on_max_attempts}
              onCheckedChange={v => save({ wipe_on_max_attempts: v })}
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl" style={{
            background: "hsl(var(--hud-surface))",
            border: "1px solid hsl(var(--hud-border) / 0.1)",
          }}>
            <div className="flex items-center gap-3">
              <Smartphone className="h-4 w-4" style={{ color: "hsl(var(--hud-warning))" }} />
              <div>
                <p className="text-sm font-medium" style={{ color: "hsl(var(--hud-text))" }}>Revoke sessions on panic</p>
                <p className="text-[11px]" style={{ color: "hsl(var(--hud-text-dim))" }}>
                  Disconnect all devices on panic wipe
                </p>
              </div>
            </div>
            <Switch
              checked={config.revoke_sessions_on_panic}
              onCheckedChange={v => save({ revoke_sessions_on_panic: v })}
            />
          </div>

          <div className="p-3 rounded-xl" style={{
            background: "hsl(var(--hud-surface))",
            border: "1px solid hsl(var(--hud-border) / 0.1)",
          }}>
            <Label className="text-sm" style={{ color: "hsl(var(--hud-text))" }}>Max wrong attempts</Label>
            <Select
              value={String(config.max_attempts)}
              onValueChange={v => save({ max_attempts: parseInt(v) })}
            >
              <SelectTrigger className="mt-1.5 h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[3, 5, 10, 15, 20].map(n => (
                  <SelectItem key={n} value={String(n)}>{n} attempts</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      {/* Platform Audit */}
      <div className="p-3 rounded-xl space-y-2" style={{
        background: "hsl(var(--hud-surface))",
        border: "1px solid hsl(var(--hud-border) / 0.1)",
      }}>
        <p className="text-xs font-semibold" style={{ color: "hsl(var(--hud-text-dim))" }}>
          Platform Security Audit
        </p>
        {audit.notes.map((note, i) => (
          <p key={i} className="text-[11px] leading-[1.4]" style={{ color: "hsl(var(--hud-text-dim) / 0.7)" }}>
            • {note}
          </p>
        ))}
      </div>
    </div>
  );
}
