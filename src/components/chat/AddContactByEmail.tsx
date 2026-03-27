import { useState } from "react";
import { findUserByEmail } from "@/lib/orbit/findUserByEmail";
import { createOrGetDirectConversation } from "@/lib/orbit/createOrGetDirectConversation";
import { useOrbitStore } from "@/stores/orbitStore";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Search, AlertCircle, MessageCircle, UserPlus } from "lucide-react";
import { toast } from "sonner";
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
  onSaved?: () => void;
}) {
  const myOrbit = useOrbitStore((s) => s.profile);
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<FoundUser | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [opening, setOpening] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSearch = async () => {
    const trimmed = email.trim();
    if (!trimmed) return;

    setError("");
    setResult(null);
    setSaved(false);
    setLoading(true);

    try {
      const foundUser = await findUserByEmail(trimmed);

      if (!foundUser) {
        setError("Utilisateur introuvable");
        return;
      }

      if (myOrbit?.email && foundUser.email === myOrbit.email) {
        setError("Tu ne peux pas t'ajouter toi-même");
        return;
      }

      // Also check by orbit_id to catch edge cases
      if (myOrbit?.orbitId && foundUser.orbit_id === myOrbit.orbitId) {
        setError("Tu ne peux pas t'ajouter toi-même");
        return;
      }

      setResult(foundUser as FoundUser);
      props.onSelect?.(foundUser as FoundUser);
    } catch {
      setError("Erreur de recherche");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFriend = async () => {
    if (!user || !result) return;
    setSaving(true);

    try {
      // Check if contact already exists
      const { data: existing } = await supabase
        .from("contacts")
        .select("id")
        .eq("owner_id", user.id)
        .eq("contact_user_id", result.id)
        .maybeSingle();

      if (existing) {
        toast.info("Ce contact existe déjà");
        setSaved(true);
        setSaving(false);
        return;
      }

      const { error: insertErr } = await supabase.from("contacts").insert({
        owner_id: user.id,
        name: result.display_name || result.email || "Contact",
        email: result.email || null,
        contact_user_id: result.id,
        category: "friend",
      });

      if (insertErr) {
        console.error("[AddContactByEmail] insert error", insertErr.message, insertErr.details, insertErr.code);
        // If it's a duplicate key error, treat as success
        if (insertErr.code === "23505") {
          toast.info("Ce contact existe déjà");
          setSaved(true);
          return;
        }
        setError(`Impossible d'ajouter le contact: ${insertErr.message}`);
        return;
      }

      setSaved(true);
      toast.success("Contact ajouté !");
      props.onSaved?.();
    } catch {
      setError("Erreur lors de l'ajout");
    } finally {
      setSaving(false);
    }
  };

  const handleOpenChat = async () => {
    if (!myOrbit || !result || !user) return;
    setOpening(true);

    try {
      const conversation = await createOrGetDirectConversation({
        myOrbitId: myOrbit.orbitId,
        myUserId: user.id,
        myEmail: myOrbit.email ?? null,
        myDisplayName: myOrbit.displayName ?? null,
        peerOrbitId: result.orbit_id,
        peerUserId: result.id,
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
            {!saved && (
              <button
                onClick={() => void handleSaveFriend()}
                disabled={saving}
                className="h-9 px-3 rounded-lg bg-accent text-accent-foreground text-xs font-medium flex items-center gap-1.5 active:scale-[0.95] transition-transform disabled:opacity-40"
              >
                <UserPlus className="h-3.5 w-3.5" />
                {saving ? "…" : "Ajouter"}
              </button>
            )}
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
