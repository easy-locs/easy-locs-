import { useState } from "react";
import { findUserByEmail } from "@/lib/orbit/findUserByEmail";
import { createOrGetDirectConversation } from "@/lib/chat/conversationService";
import { useOrbitStore } from "@/stores/orbitStore";
import { Search, AlertCircle, MessageCircle } from "lucide-react";
import type { ConversationRow } from "@/lib/types/comms";

type FoundUser = {
  id: string;
  orbit_id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

export function AddContactByEmail(props: {
  onConversationReady?: (conversation: ConversationRow, peer: FoundUser) => void;
  onSelect?: (user: FoundUser) => void;
}) {
  const myOrbit = useOrbitStore((s) => s.profile);
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<FoundUser | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [opening, setOpening] = useState(false);

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

      if (myOrbit?.email && user.email === myOrbit.email) {
        setError("Tu ne peux pas t'ajouter toi-même");
        return;
      }

      setResult(user as FoundUser);
      props.onSelect?.(user as FoundUser);
    } catch {
      setError("Erreur de recherche");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChat = async () => {
    if (!myOrbit || !result) return;
    setOpening(true);

    try {
      const conversation = await createOrGetDirectConversation({
        myOrbitId: myOrbit.orbitId,
        myEmail: myOrbit.email ?? null,
        myDisplayName: myOrbit.displayName ?? null,
        peerOrbitId: result.orbit_id,
        peerEmail: result.email,
        peerDisplayName: result.display_name,
      });

      props.onConversationReady?.(conversation, result);
    } catch {
      setError("Impossible d'ouvrir la conversation");
    } finally {
      setOpening(false);
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
        <div className="w-full flex items-center gap-3 rounded-xl bg-card border border-border/20 px-3 py-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
            {result.avatar_url ? (
              <img
                src={result.avatar_url}
                alt=""
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              (result.display_name ?? result.email ?? "?")
                .slice(0, 2)
                .toUpperCase()
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground truncate">
              {result.display_name ?? "Sans nom"}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {result.email}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {props.onConversationReady && (
              <button
                onClick={() => void handleOpenChat()}
                disabled={opening}
                className="h-9 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-medium flex items-center gap-1.5 active:scale-[0.95] transition-transform disabled:opacity-40"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                {opening ? "…" : "Chat"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
