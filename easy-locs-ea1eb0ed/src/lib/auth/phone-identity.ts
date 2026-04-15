/**
 * AUTH DEPENDENCY: phone-identity.ts — Phone OTP verification via custom edge functions.
 * Contact points:
 *   - PhoneOTPFlow.tsx: sendPhoneVerification, verifyPhoneCode
 *   - identity-activation-pipeline.ts: normalizePhone
 *   - Calls: edge function send-otp (server-side OTP gen + Twilio SMS/WhatsApp)
 *   - Calls: edge function verify-otp (server-side verification + user creation + session)
 *   - OTP is NEVER generated or visible client-side — all OTP logic is server-only.
 */
import { db } from "@/services/db";
import { normalizePhone } from "@/lib/security/otp-hardened";

export type OtpChannel = "sms" | "whatsapp";

export interface PhoneOtpResult {
  success: boolean;
  channel?: OtpChannel;
  fallback?: boolean;
  error?: string;
  errorCode?: string;
}

export interface PhoneVerifyResult {
  valid: boolean;
  userId?: string;
  isNewUser?: boolean;
  reason?: string;
}

export async function sendPhoneVerification(
  phone: string,
  channel: OtpChannel = "sms"
): Promise<PhoneOtpResult> {
  const normalized = normalizePhone(phone);
  if (!normalized || normalized.length < 8) {
    throw new Error("Invalid phone number");
  }

  const { data, error: invokeErr } = await db.functions.invoke("send-otp", {
    body: { phone: normalized, channel },
  });

  if (invokeErr) {
    const errMsg = typeof invokeErr === "string" ? invokeErr : invokeErr?.message || "";
    if (errMsg.includes("Too Many Requests") || errMsg.includes("429")) {
      throw new Error("Trop de tentatives. Veuillez patienter quelques minutes.");
    }
    throw new Error("Impossible d'envoyer le code de vérification. Réessayez.");
  }

  if (data && !data.success) {
    const code = data.error_code || "";
    if (code === "SMS_NOT_CONFIGURED") {
      throw new Error("Le service de vérification est en cours de configuration. Veuillez réessayer plus tard.");
    }
    if (code === "RATE_LIMITED") {
      throw new Error("Trop de tentatives de vérification. Veuillez patienter avant de réessayer.");
    }
    if (code === "SMS_SEND_FAILED") {
      throw new Error(
        channel === "whatsapp"
          ? "Impossible d'envoyer le message WhatsApp. Réessayez par SMS."
          : "Impossible d'envoyer le SMS. Veuillez réessayer."
      );
    }
    throw new Error(data.message || "Erreur lors de l'envoi du code.");
  }

  return {
    success: true,
    channel: data?.channel || channel,
    fallback: data?.fallback || false,
  };
}

export async function verifyPhoneCode(phone: string, code: string): Promise<PhoneVerifyResult> {
  const normalized = normalizePhone(phone);

  try {
    const { data, error: invokeErr } = await db.functions.invoke("verify-otp", {
      body: { phone: normalized, code },
    });

    if (invokeErr) {
      return { valid: false, reason: "Erreur de vérification. Réessayez." };
    }

    if (!data) {
      return { valid: false, reason: "Réponse vide du service de vérification." };
    }

    if (!data.valid) {
      const errorCode = data.error_code || "";
      let reason: string;

      switch (errorCode) {
        case "EXPIRED":
          reason = "Le code de vérification a expiré.";
          break;
        case "INVALID_CODE":
          reason = "Code de vérification incorrect.";
          break;
        case "BLOCKED":
          reason = "Trop de tentatives incorrectes. Veuillez demander un nouveau code.";
          break;
        case "NO_SESSION":
          reason = "Aucune session de vérification en cours. Veuillez demander un nouveau code.";
          break;
        default:
          reason = data.reason || "La vérification a échoué.";
      }

      return { valid: false, reason };
    }

    if (!data.userId) {
      return { valid: false, reason: "Vérification réussie mais aucun utilisateur créé." };
    }

    if (data.hashed_token) {
      try {
        const { data: sessionData, error: verifyErr } = await db.auth.verifyOtp({
          token_hash: data.hashed_token,
          type: "magiclink",
        });

        if (verifyErr) {
          console.error("[phone-identity] Session via hashed_token failed:", verifyErr.message);
          return { valid: false, reason: "Impossible de créer la session. Veuillez réessayer." };
        }

        if (!sessionData?.session) {
          console.error("[phone-identity] No session returned after verifyOtp");
          return { valid: false, reason: "Impossible de créer la session. Veuillez réessayer." };
        }

        if (sessionData.session.user?.id !== data.userId) {
          console.error("[phone-identity] Session user mismatch:", sessionData.session.user?.id, "vs", data.userId);
          await db.auth.signOut();
          return { valid: false, reason: "Erreur d'identité. Veuillez réessayer." };
        }
      } catch (sessionErr: unknown) {
        const msg = sessionErr instanceof Error ? sessionErr.message : String(sessionErr);
        console.error("[phone-identity] Session creation exception:", msg);
        return { valid: false, reason: "Erreur de session. Veuillez réessayer." };
      }
    } else {
      console.error("[phone-identity] No hashed_token in verify-otp response");
      return { valid: false, reason: "Impossible d'établir la session. Veuillez réessayer." };
    }

    const { data: currentSession } = await db.auth.getSession();

    if (!currentSession?.session) {
      return { valid: false, reason: "La session n'a pas pu être établie. Veuillez réessayer." };
    }

    const { data: existingProfile } = await db
      .from("profiles")
      .select("id")
      .eq("id", data.userId)
      .maybeSingle();

    return {
      valid: true,
      userId: data.userId,
      isNewUser: data.isNewUser ?? !existingProfile,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[phone-identity] verifyPhoneCode error:", msg);
    return { valid: false, reason: "Erreur de vérification. Réessayez." };
  }
}

export { normalizePhone };
