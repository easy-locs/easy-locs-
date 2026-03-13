/**
 * OrbitSecuritySettings — Privacy & security settings panel for Orbit
 * Includes session management, 2FA toggle, privacy controls
 */
import { useState } from "react";
import {
  Shield, Fingerprint, Eye, EyeOff, Clock,
  Lock, KeyRound, Smartphone,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import OrbitSessionManager from "./OrbitSessionManager";
import OrbitPrivacyBadge from "./OrbitPrivacyBadge";

interface OrbitSecuritySettingsProps {
  userId: string;
}

export default function OrbitSecuritySettings({ userId }: OrbitSecuritySettingsProps) {
  const [readReceipts, setReadReceipts] = useState(true);
  const [onlineStatus, setOnlineStatus] = useState(true);
  const [autoDeletePeriod, setAutoDeletePeriod] = useState("off");
  const [enrolling2FA, setEnrolling2FA] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);

  const handle2FAEnroll = async () => {
    setEnrolling2FA(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
      if (error) throw error;
      if (data?.totp?.qr_code) {
        setQrCode(data.totp.qr_code);
        toast.info("Scan the QR code with your authenticator app");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to set up 2FA");
    } finally {
      setEnrolling2FA(false);
    }
  };

  return (
    <div className="space-y-8 max-w-lg">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center">
          <Shield className="h-5 w-5 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Orbit Privacy & Security</h2>
          <p className="text-xs text-muted-foreground">Signal-inspired privacy standard</p>
        </div>
        <OrbitPrivacyBadge encrypted />
      </div>

      {/* E2E Status */}
      <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Lock className="h-4 w-4 text-emerald-600" />
          <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-400">
            End-to-End Encryption Active
          </span>
        </div>
        <p className="text-xs text-emerald-700 dark:text-emerald-300">
          Messages, calls, and shared media are encrypted on your device before being sent.
          The server cannot read your content.
        </p>
      </div>

      <Separator />

      {/* Two-Factor Authentication */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Fingerprint className="h-4 w-4 text-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Two-Factor Authentication</h3>
        </div>
        {qrCode ? (
          <div className="text-center space-y-3">
            <img src={qrCode} alt="2FA QR Code" className="mx-auto w-48 h-48 rounded-lg" />
            <p className="text-xs text-muted-foreground">
              Scan with Google Authenticator, Authy, or any TOTP app
            </p>
            <Button size="sm" variant="outline" onClick={() => setQrCode(null)}>
              Done
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={handle2FAEnroll}
            disabled={enrolling2FA}
            className="gap-2"
          >
            <KeyRound className="h-4 w-4" />
            {enrolling2FA ? "Setting up..." : "Enable 2FA"}
          </Button>
        )}
      </div>

      <Separator />

      {/* Privacy Controls */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Privacy Controls</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {readReceipts ? <Eye className="h-4 w-4 text-muted-foreground" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
              <Label className="text-sm">Read receipts</Label>
            </div>
            <Switch checked={readReceipts} onCheckedChange={setReadReceipts} />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm">Show online status</Label>
            </div>
            <Switch checked={onlineStatus} onCheckedChange={setOnlineStatus} />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm">Auto-delete messages</Label>
            </div>
            <Select value={autoDeletePeriod} onValueChange={setAutoDeletePeriod}>
              <SelectTrigger className="w-28 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="off">Off</SelectItem>
                <SelectItem value="24h">24 hours</SelectItem>
                <SelectItem value="7d">7 days</SelectItem>
                <SelectItem value="30d">30 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Separator />

      {/* Session Management */}
      <OrbitSessionManager userId={userId} />
    </div>
  );
}
