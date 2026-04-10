import { useState, useEffect } from "react";
import { Shield, Loader2, Check, X, Smartphone } from "lucide-react";
import * as mfaRepo from "@/repositories/mfa.repository";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";

const MFASettings = () => {
  const { toast } = useToast();
  const { t } = useI18n();
  const [step, setStep] = useState<"idle" | "enrolling" | "verifying" | "enrolled">("idle");
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [factorId, setFactorId] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [factors, setFactors] = useState<any[]>([]);

  const loadFactors = async () => {
    const data = await mfaRepo.listFactors();
    if (data) {
      const verified = data.totp.filter((f: any) => f.status === "verified");
      setFactors(verified);
      if (verified.length > 0) setStep("enrolled");
    }
  };

  useEffect(() => { loadFactors(); }, []);

  const startEnroll = async () => {
    setLoading(true);
    const { data, error } = await mfaRepo.enrollTotp("Easy-Locs TOTP");
    if (error) {
      toast({ title: t("page.common.error") || "Error", description: error.message, variant: "destructive" });
    } else if (data) {
      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
      setFactorId(data.id);
      setStep("enrolling");
    }
    setLoading(false);
  };

  const verifyCode = async () => {
    if (code.length !== 6) return;
    setLoading(true);
    const challenge = await mfaRepo.challengeFactor(factorId);
    if (challenge.error) {
      toast({ title: t("page.common.error") || "Error", description: challenge.error.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    const { error } = await mfaRepo.verifyFactor(factorId, challenge.data.id, code);
    if (error) {
      toast({ title: t("page.settings.mfa_invalid_code") || "Invalid code", description: error.message, variant: "destructive" });
    } else {
      toast({ title: t("page.settings.mfa_activated") || "✅ 2FA activated", description: t("page.settings.mfa_activated_desc") || "Two-factor authentication is now active." });
      setStep("enrolled");
      loadFactors();
    }
    setLoading(false);
  };

  const unenroll = async (fId: string) => {
    setLoading(true);
    const { error } = await mfaRepo.unenrollFactor(fId);
    if (error) {
      toast({ title: t("page.common.error") || "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: t("page.settings.mfa_deactivated") || "2FA disabled" });
      setStep("idle");
      setFactors([]);
    }
    setLoading(false);
  };

  return (
    <div className="ui-card">
      <div className="flex items-center gap-3 mb-5">
        <Shield className="h-5 w-5 text-muted-foreground" />
        <h2 className="font-semibold text-foreground">{t("page.settings.mfa_title") || "Two-Factor Authentication (2FA)"}</h2>
      </div>

      {step === "idle" && (
        <div>
          <p className="text-sm text-muted-foreground mb-4">
            {t("page.settings.mfa_desc") || "Protect your account with an authenticator app (Google Authenticator, Authy, etc.)"}
          </p>
          <button onClick={startEnroll} disabled={loading}
            className="btn-primary flex items-center gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />}
            {t("page.settings.mfa_enable") || "Enable 2FA"}
          </button>
        </div>
      )}

      {step === "enrolling" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t("page.settings.mfa_scan") || "Scan this QR code with your authenticator app:"}
          </p>
          <div className="flex justify-center">
            <img src={qrCode} alt="QR Code TOTP" className="w-48 h-48 rounded-lg border border-border" />
          </div>
          <div className="bg-muted rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-1">{t("page.settings.mfa_secret") || "Secret key (manual entry):"}</p>
            <code className="text-xs font-mono text-foreground break-all">{secret}</code>
          </div>
          <div>
            <label className="form-label">{t("page.settings.mfa_code_label") || "Verification code (6 digits)"}</label>
            <input type="text" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className="form-input font-mono text-center tracking-widest" />
          </div>
          <div className="flex gap-3">
            <button onClick={verifyCode} disabled={loading || code.length !== 6}
              className="btn-primary flex items-center gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {t("page.settings.mfa_verify") || "Verify & activate"}
            </button>
            <button onClick={() => { setStep("idle"); setCode(""); }}
              className="btn-secondary flex items-center gap-2">
              <X className="h-4 w-4" /> {t("page.common.cancel") || "Cancel"}
            </button>
          </div>
        </div>
      )}

      {step === "enrolled" && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-full bg-accent/10 flex items-center justify-center">
              <Check className="h-4 w-4 text-accent" />
            </div>
            <p className="text-sm font-medium text-foreground">{t("page.settings.mfa_active") || "2FA is active on your account"}</p>
          </div>
          {factors.map(f => (
            <div key={f.id} className="flex items-center justify-between bg-muted rounded-lg p-3 mb-2">
              <span className="text-sm text-foreground">{f.friendly_name || "TOTP"}</span>
              <button onClick={() => unenroll(f.id)} disabled={loading}
                className="text-xs text-destructive hover:underline">
                {t("page.common.disable") || "Disable"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MFASettings;
