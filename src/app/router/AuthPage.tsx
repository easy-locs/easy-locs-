import { useState } from "react";
import { useV2AuthStore } from "@/stores/v2AuthStore";

export default function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const signIn = useV2AuthStore((s) => s.signIn);
  const signUp = useV2AuthStore((s) => s.signUp);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    try {
      if (mode === "signin") {
        await signIn(email, password);
      } else {
        await signUp(email, password);
        setSuccess("Vérifiez votre email pour confirmer votre inscription.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-lg">
        <h1 className="text-2xl font-bold text-foreground text-center mb-6">
          {mode === "signin" ? "Connexion" : "Créer un compte"}
        </h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="votre@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Mot de passe</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {success && <p className="text-sm text-primary">{success}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {submitting ? "..." : mode === "signin" ? "Se connecter" : "Créer un compte"}
          </button>
        </form>

        <div className="mt-4 flex items-center justify-between">
          {mode === "signin" && (
            <button
              onClick={() => navigate("/forgot-password")}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Mot de passe oublié ?
            </button>
          )}
          <button
            onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); setSuccess(null); }}
            className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors ml-auto"
          >
            {mode === "signin" ? "Créer un compte" : "Se connecter"}
          </button>
        </div>
      </div>
    </div>
  );
}
