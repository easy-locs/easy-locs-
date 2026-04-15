import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/services/db";
import { Shield, RefreshCw, AlertTriangle } from "lucide-react";

type RecoveryStatus = "idle" | "checking" | "needs_recovery" | "recovering" | "recovered" | "error";

export default function E2EERecoveryBanner() {
  const { user } = useAuth();
  const [status, setStatus] = useState<RecoveryStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    checkRatchetHealth();
  }, [user?.id]);

  async function checkRatchetHealth() {
    if (!user) return;
    setStatus("checking");
    try {
      const storageKey = `orbit:ratchet:${user.id}`;
      const stored = localStorage.getItem(storageKey);

      if (!stored) {
        const { data: sessions } = await db
          .from("orbit_e2ee_sessions")
          .select("id")
          .eq("user_id", user.id)
          .limit(1);

        if (sessions && sessions.length > 0) {
          setStatus("needs_recovery");
          return;
        }
      }

      setStatus("idle");
    } catch {
      setStatus("idle");
    }
  }

  async function recoverKeys() {
    if (!user) return;
    setStatus("recovering");
    setError(null);

    try {
      const { initRatchetAlice, serializeRatchetState } = await import("@/lib/orbit-double-ratchet");

      const seed = new Uint8Array(64);
      crypto.getRandomValues(seed);
      const newState = await initRatchetAlice(seed);
      const serialized = await serializeRatchetState(newState);

      const storageKey = `orbit:ratchet:${user.id}`;
      localStorage.setItem(storageKey, JSON.stringify(serialized));

      await db.from("orbit_e2ee_sessions").upsert({
        user_id: user.id,
        session_status: "active",
        recovered_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as Record<string, unknown>, { onConflict: "user_id" });

      setStatus("recovered");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Recovery failed");
      setStatus("error");
    }
  }

  if (status === "idle" || status === "checking" || status === "recovered") {
    return null;
  }

  return (
    <div className="mx-4 my-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">Encryption keys need recovery</p>
          <p className="text-xs text-muted-foreground">
            Your end-to-end encryption session needs to be re-established. Previous messages remain encrypted.
          </p>
        </div>
      </div>

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      <button
        onClick={recoverKeys}
        disabled={status === "recovering"}
        className="flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold disabled:opacity-50"
      >
        {status === "recovering" ? (
          <RefreshCw className="w-4 h-4 animate-spin" />
        ) : (
          <Shield className="w-4 h-4" />
        )}
        {status === "recovering" ? "Recovering..." : "Recover Encryption"}
      </button>
    </div>
  );
}
