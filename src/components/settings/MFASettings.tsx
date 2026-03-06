import { useState } from "react";
import { Shield, Loader2, Check, X, Smartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
    const { data } = await supabase.auth.mfa.listFactors();
    if (data) {
      const verified = data.totp.filter((f: any) => f.status === "verified");
      setFactors(verified);
      if (verified.length > 0) setStep("enrolled");
    }
  };

  useState(() => { loadFactors(); });

  const startEnroll = async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Easy-Locs TOTP" });
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
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
    const challenge = await supabase.auth.mfa.challenge({ factorId });
    if (challenge.error) {
      toast({ title: "Erreur", description: challenge.error.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    const { error } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.data.id, code });
    if (error) {
      toast({ title: "Code invalide", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "✅ 2FA activé", description: "L'authentification à deux facteurs est maintenant active." });
      setStep("enrolled");
      loadFactors();
    }
    setLoading(false);
  };

  const unenroll = async (fId: string) => {
    setLoading(true);
    const { error } = await supabase.auth.mfa.unenroll({ factorId: fId });
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "2FA désactivé" });
      setStep("idle");
      setFactors([]);
    }
    setLoading(false);
  };

  return (
    <div className="bg-card rounded-xl shadow-card border border-border/50 p-6">
      <div className="flex items-center gap-3 mb-5">
        <Shield className="h-5 w-5 text-muted-foreground" />
        <h2 className="font-semibold text-foreground">Authentification à deux facteurs (2FA)</h2>
      </div>

      {step === "idle" && (
        <div>
          <p className="text-sm text-muted-foreground mb-4">
            Protégez votre compte avec une application d'authentification (Google Authenticator, Authy, etc.)
          </p>
          <button onClick={startEnroll} disabled={loading}
            className="bg-accent text-accent-foreground font-medium px-5 py-2 rounded-lg text-sm hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />}
            Activer le 2FA
          </button>
        </div>
      )}

      {step === "enrolling" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Scannez ce QR code avec votre application d'authentification :
          </p>
          <div className="flex justify-center">
            <img src={qrCode} alt="QR Code TOTP" className="w-48 h-48 rounded-lg border border-border" />
          </div>
          <div className="bg-muted rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-1">Clé secrète (saisie manuelle) :</p>
            <code className="text-xs font-mono text-foreground break-all">{secret}</code>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Code de vérification (6 chiffres)</label>
            <input type="text" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm font-mono text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div className="flex gap-3">
            <button onClick={verifyCode} disabled={loading || code.length !== 6}
              className="bg-accent text-accent-foreground font-medium px-5 py-2 rounded-lg text-sm hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Vérifier et activer
            </button>
            <button onClick={() => { setStep("idle"); setCode(""); }}
              className="bg-muted text-foreground font-medium px-5 py-2 rounded-lg text-sm hover:bg-muted/80 flex items-center gap-2">
              <X className="h-4 w-4" /> Annuler
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
            <p className="text-sm font-medium text-foreground">2FA est activé sur votre compte</p>
          </div>
          {factors.map(f => (
            <div key={f.id} className="flex items-center justify-between bg-muted rounded-lg p-3 mb-2">
              <span className="text-sm text-foreground">{f.friendly_name || "TOTP"}</span>
              <button onClick={() => unenroll(f.id)} disabled={loading}
                className="text-xs text-destructive hover:underline">
                Désactiver
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MFASettings;
