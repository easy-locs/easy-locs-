/**
 * AUTH DEPENDENCY: auth.repository.ts — Single source of truth for all Supabase Auth operations.
 * Contact points:
 *   - Login.tsx: signInWithPassword, signInWithOtp, verifyEmailOtp, getSession, onAuthStateChange, getUser
 *   - Signup.tsx: signUpWithEmail, signInWithOtp
 *   - SocialLoginButtons.tsx: (uses db.auth directly for OAuth — via provider-health dry-run)
 *   - AuthCallbackPage.tsx: exchangeCodeForSession
 *   - AuthContext.tsx: (uses db.auth.getSession/onAuthStateChange directly for lifecycle)
 *   - ForgotPassword/ResetPassword: resetPasswordForEmail, updateUserPassword
 * UI pages and components must call these functions instead of db.auth directly.
 */
import { db } from "@/services/db";

export async function signInWithPassword(email: string, password: string) {
  return db.auth.signInWithPassword({ email, password });
}

export async function signInWithOtp(email: string, options?: { shouldCreateUser?: boolean; emailRedirectTo?: string }) {
  return db.auth.signInWithOtp({ email, options });
}

export async function verifyEmailOtp(email: string, token: string) {
  return db.auth.verifyOtp({ email, token, type: "email" });
}

export async function signUpWithEmail(email: string, password: string, options?: { emailRedirectTo?: string; data?: Record<string, unknown> }) {
  return db.auth.signUp({ email, password, options });
}

export async function signOut() {
  try {
    const { data: { session } } = await db.auth.getSession();
    if (session?.access_token) {
      await db.functions.invoke("presence-heartbeat", {
        body: {
          action: "remove_session",
          session_id: session.access_token.slice(-16),
        },
      }).catch(() => {});
      await db.functions.invoke("presence-heartbeat", {
        body: { action: "offline" },
      }).catch(() => {});
    }
  } catch {}

  return db.auth.signOut();
}

export async function getSession() {
  return db.auth.getSession();
}

export async function getUser() {
  return db.auth.getUser();
}

export function onAuthStateChange(callback: Parameters<typeof db.auth.onAuthStateChange>[0]) {
  return db.auth.onAuthStateChange(callback);
}

export async function resendEmailVerification(email: string) {
  return db.auth.resend({ type: "signup", email });
}

export async function signInWithOAuth(provider: "google" | "apple" | "github", redirectTo?: string) {
  return db.auth.signInWithOAuth({
    provider,
    options: redirectTo ? { redirectTo } : undefined,
  });
}

export async function setSession(accessToken: string, refreshToken: string) {
  return db.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
}

export async function resetPasswordForEmail(email: string, redirectTo?: string) {
  return db.auth.resetPasswordForEmail(email, redirectTo ? { redirectTo } : undefined);
}

export async function updateUserPassword(password: string) {
  return db.auth.updateUser({ password });
}

export async function exchangeCodeForSession(code: string) {
  return db.auth.exchangeCodeForSession(code);
}
