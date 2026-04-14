/**
 * SettingsSecurity — Standalone security settings page
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Fingerprint, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import MFASettings from "@/components/settings/MFASettings";
import PinManagement from "@/components/security/PinManagement";
import AppSecuritySettings from "@/components/security/AppSecuritySettings";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import * as settingsRepo from "@/repositories/settings.repository";
import { db } from "@/services/db";

type BiometricState = "idle" | "registering" | "success" | "error" | "unsupported";

function b64uDecode(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}

function b64uEncode(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  const b64 = btoa(String.fromCharCode(...bytes));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function serializeRegistrationResponse(credential: PublicKeyCredential) {
  const response = credential.response as AuthenticatorAttestationResponse;
  return {
    id: credential.id,
    rawId: b64uEncode(credential.rawId),
    response: {
      clientDataJSON: b64uEncode(response.clientDataJSON),
      attestationObject: b64uEncode(response.attestationObject),
      transports: (response.getTransports?.() ?? []) as string[],
    },
    authenticatorAttachment: credential.authenticatorAttachment ?? undefined,
    clientExtensionResults: credential.getClientExtensionResults(),
    type: "public-key" as const,
  };
}

async function registerWebAuthnCredential(): Promise<boolean> {
  if (!window.PublicKeyCredential) return false;

  // 1. Get server-generated registration options (challenge, rp, user settings)
  const { data: beginData, error: beginErr } = await db.functions.invoke("webauthn-begin-registration");
  if (beginErr || !beginData?.options) throw new Error(beginErr?.message ?? "Failed to get registration options from server");

  const serverOptions = beginData.options;

  // 2. Create credential using server challenge (convert JSON options to binary)
  const credential = await navigator.credentials.create({
    publicKey: {
      ...serverOptions,
      challenge: b64uDecode(serverOptions.challenge),
      user: {
        ...serverOptions.user,
        id: b64uDecode(serverOptions.user.id),
      },
      excludeCredentials: (serverOptions.excludeCredentials ?? []).map((ec: { id: string; type: string }) => ({
        ...ec,
        id: b64uDecode(ec.id),
      })),
    },
  }) as PublicKeyCredential | null;

  if (!credential) return false;

  // 3. Serialize and send to server for full @simplewebauthn verification
  const registrationResponse = serializeRegistrationResponse(credential);
  const { data: finishData, error: finishErr } = await db.functions.invoke("webauthn-finish-registration", {
    body: { registrationResponse, device_name: navigator.userAgent.slice(0, 200) },
  });

  if (finishErr || !finishData?.success) throw new Error(finishErr?.message ?? finishData?.error ?? "Server verification failed");
  return true;
}

export default function SettingsSecurity() {
  useUiEngine("settings-security");
  const navigate = useNavigate();
  const { t } = useI18n();
  const { toast } = useToast();
  const { user } = useAuth();
  const [biometricState, setBiometricState] = useState<BiometricState>("idle");

  useEffect(() => {
    if (!user?.id) return;
    settingsRepo.fetchSecuritySettings(user.id).then(data => {
      if (data?.biometric_enabled) setBiometricState("success");
    }).catch(() => {});
  }, [user?.id]);

  const enrollBiometric = async () => {
    if (!window.PublicKeyCredential) {
      setBiometricState("unsupported");
      toast({ title: "Biometric authentication not supported on this device", variant: "destructive" });
      return;
    }

    setBiometricState("registering");
    try {
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (!available) {
        setBiometricState("unsupported");
        toast({ title: "No platform authenticator available (Face ID / fingerprint required)", variant: "destructive" });
        return;
      }

      const success = await registerWebAuthnCredential();

      if (success) {
        setBiometricState("success");
        toast({ title: t("security.biometric_enrolled") || "Biometric authentication enabled" });
      } else {
        setBiometricState("error");
        toast({ title: "Biometric enrollment failed", variant: "destructive" });
      }
    } catch (err: any) {
      const isCancel = err?.name === "NotAllowedError";
      const msg = isCancel ? "User cancelled biometric enrollment" : err?.message ?? "Unknown error";
      setBiometricState(isCancel ? "idle" : "error");
      if (!isCancel) toast({ title: msg, variant: "destructive" });
    }
  };

  const BIOMETRIC_LABELS: Record<BiometricState, string> = {
    idle: t("security.enable_biometric") || "Enable biometric login",
    registering: "Waiting for biometric…",
    success: "Biometric enabled",
    error: "Try again",
    unsupported: "Not supported on this device",
  };

  return (
    <SubPageShell title={t("page.settings.security") || "Security"} onBack={() => navigate("/settings")} contentClassName="space-y-3">
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Fingerprint className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-bold">{t("security.biometric_title") || "Biometric Authentication"}</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-3">Use Face ID, fingerprint, or device PIN to log in securely via WebAuthn.</p>
        <button
          onClick={enrollBiometric}
          disabled={biometricState === "registering" || biometricState === "success" || biometricState === "unsupported"}
          className={`w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition-colors ${
            biometricState === "success" ? "bg-green-500/10 text-green-600 border border-green-500/30" :
            biometricState === "error" ? "bg-destructive/10 text-destructive border border-destructive/30" :
            biometricState === "unsupported" ? "bg-muted text-muted-foreground border border-border" :
            "btn-primary"
          }`}
        >
          {biometricState === "registering" ? <Loader2 className="w-4 h-4 animate-spin" /> :
           biometricState === "success" ? <CheckCircle2 className="w-4 h-4" /> :
           biometricState === "error" ? <AlertCircle className="w-4 h-4" /> :
           <Fingerprint className="w-4 h-4" />}
          {BIOMETRIC_LABELS[biometricState]}
        </button>
      </div>
      <div className="rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-bold mb-3">MFA</h2>
        <MFASettings />
      </div>
      <div className="rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-bold mb-3">PIN</h2>
        <PinManagement />
      </div>
      <div className="rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-bold mb-3">{t("page.settings.app_security") || "App Security"}</h2>
        <AppSecuritySettings />
      </div>
    </SubPageShell>
  );
}
