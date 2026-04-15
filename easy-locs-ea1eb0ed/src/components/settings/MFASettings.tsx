import { useState, useEffect } from "react";
import { Shield, Loader2, Check, X, Smartphone } from "lucide-react";
import * as mfaRepo from "@/repositories/mfa.repository";
import { useToast } from "@/hooks/use-toast";
import { tc } from "@/lib/i18n-canonical";
import { CSS } from "@/config/ui";

const MFASettings = () => {
  const { toast } = useToast();
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
      toast({ title: tc("common.error"), description: tc("mfa.error_generic"), variant: "destructive" });
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
      toast({ title: tc("common.error"), description: challenge.error.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    const { error } = await mfaRepo.verifyFactor(factorId, challenge.data.id, code);
    if (error) {
      toast({ title: tc("mfa.invalid_code"), description: tc("mfa.error_generic"), variant: "destructive" });
    } else {
      toast({ title: tc("mfa.activated"), description: tc("mfa.activated_desc") });
      setStep("enrolled");
      loadFactors();
    }
    setLoading(false);
  };

  const unenroll = async (fId: string) => {
    setLoading(true);
    const { error } = await mfaRepo.unenrollFactor(fId);
    if (error) {
      toast({ title: tc("common.error"), description: tc("mfa.error_generic"), variant: "destructive" });
    } else {
      toast({ title: tc("mfa.deactivated") });
      setStep("idle");
      setFactors([]);
    }
    setLoading(false);
  };

  return (
    <div className={CSS.uiCard}>
      <div className="flex items-center gap-3 mb-5">
        <Shield className="h-5 w-5 text-muted-foreground" />
        <h2 className="font-semibold text-foreground">{tc("mfa.title")}</h2>
      </div>

      {step === "idle" && (
        <div>
          <p className="text-sm text-muted-foreground mb-4">
            {tc("mfa.desc")}
          </p>
          <button onClick={startEnroll} disabled={loading}
            className="btn-primary flex items-center gap-2 active:scale-[0.98] transition-transform">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />}
            {tc("mfa.enable")}
          </button>
        </div>
      )}

      {step === "enrolling" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {tc("mfa.scan")}
          </p>
          <div className="flex justify-center">
            <img loading="eager" src={qrCode} alt={tc("mfa.scan")} className="w-48 h-48 rounded-2xl border border-border" />
          </div>
          <div className="bg-muted rounded-2xl p-3">
            <p className="text-xs text-muted-foreground mb-1">{tc("mfa.secret")}</p>
            <code className="text-xs font-mono text-foreground break-words">{secret}</code>
          </div>
          <div>
            <label className="form-label">{tc("mfa.code_label")}</label>
            <input type="text" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="123456"
              aria-label={tc("mfa.code_label")}
              className={`${CSS.formInput} font-mono text-center tracking-widest`} />
          </div>
          <div className="flex gap-3">
            <button onClick={verifyCode} disabled={loading || code.length !== 6}
              className="btn-primary flex items-center gap-2 active:scale-[0.98] transition-transform">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {tc("mfa.verify")}
            </button>
            <button onClick={() => { setStep("idle"); setCode(""); }}
              className="btn-secondary flex items-center gap-2 active:scale-[0.98] transition-transform">
              <X className="h-4 w-4" /> {tc("common.cancel")}
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
            <p className="text-sm font-medium text-foreground">{tc("mfa.active")}</p>
          </div>
          {factors.map(f => (
            <div key={f.id} className="flex items-center justify-between bg-muted rounded-2xl p-3 mb-2">
              <span className="text-sm text-foreground">{f.friendly_name || tc("mfa.title")}</span>
              <button onClick={() => unenroll(f.id)} disabled={loading}
                className="text-xs text-destructive hover:underline transition-colors active:scale-[0.98]">
                {tc("mfa.disable")}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MFASettings;
