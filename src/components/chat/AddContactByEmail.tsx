import { useState } from "react";
import { findUserByEmail } from "@/lib/orbit/findUserByEmail";
import { Search, UserCheck, AlertCircle } from "lucide-react";

type FoundUser = {
  id: string;
  orbit_id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

export function AddContactByEmail(props: {
  onSelect?: (user: FoundUser) => void;
}) {
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<FoundUser | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    const trimmed = email.trim();
    if (!trimmed) return;

    setError("");
    setResult(null);
    setLoading(true);

    try {
      const user = await findUserByEmail(trimmed);

      if (!user) {
        setError("Utilisateur introuvable");
        return;
      }

      setResult(user as FoundUser);
    } catch {
      setError("Erreur de recherche");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void handleSearch()}
          placeholder="Adresse email…"
          className="flex-1 rounded-xl border border-border/30 bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:ring-2 focus:ring-primary/20"
        />
        <button
          onClick={() => void handleSearch()}
          disabled={loading || !email.trim()}
          className="shrink-0 h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center active:scale-[0.95] transition-transform disabled:opacity-40"
        >
          <Search className="h-4 w-4" />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-destructive text-xs px-1">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <button
          onClick={() => props.onSelect?.(result)}
          className="w-full flex items-center gap-3 rounded-xl bg-card border border-border/20 px-3 py-3 active:scale-[0.98] transition-transform text-left"
        >
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
            {result.avatar_url ? (
              <img src={result.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
            ) : (
              (result.display_name ?? result.email ?? "?").slice(0, 2).toUpperCase()
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground truncate">
              {result.display_name ?? "Sans nom"}
            </p>
            <p className="text-xs text-muted-foreground truncate">{result.email}</p>
          </div>
          <UserCheck className="h-4 w-4 text-emerald-500 shrink-0" />
        </button>
      )}
    </div>
  );
}
