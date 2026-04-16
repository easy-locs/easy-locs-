import { useState } from "react";
import { findUserByEmail } from "@/lib/orbit/findUserByEmail";
import { createOrGetDirectConversation } from "@/lib/orbit/createOrGetDirectConversation";
import { upsertOrbitContact } from "@/lib/orbit/orbit-contacts-service";
import { useOrbitIdentity } from "@/hooks/useOrbitIdentity";
import { useAuth } from "@/contexts/AuthContext";
import { Search, AlertCircle, MessageCircle, UserPlus, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import type { ConversationRow } from "@/lib/types/comms";
import { generatePublicId } from "@/lib/orbit/ensureOrbitProfile";

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
  const myOrbit = useOrbitIdentity();
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
        setError("User not found. Check the email address and try again.");
        return;
      }

      if (user && foundUser.id === user.id) {
        setError("You cannot add yourself");
        return;
      }

      if (myOrbit?.orbitId && foundUser.orbit_id === myOrbit.orbitId) {
        setError("You cannot add yourself");
        return;
      }

      setResult(foundUser as FoundUser);
      props.onSelect?.(foundUser as FoundUser);

      if (user) {
        try {
          await upsertOrbitContact({
            ownerUserId: user.id,
            peerUserId: foundUser.id,
            peerOrbitId: foundUser.orbit_id || null,
            displayName: foundUser.display_name || generatePublicId(foundUser.id),
            email: foundUser.email || null,
            avatarUrl: foundUser.avatar_url || null,
            source: "email_search",
          });
          setSaved(true);
        } catch (saveErr: any) {
          console.warn("[AddContactByEmail] auto-save failed", saveErr?.message);
        }
      }
    } catch {
      setError("Search error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFriend = async () => {
    if (!user || !result) return;
    setSaving(true);

    try {
      await upsertOrbitContact({
        ownerUserId: user.id,
        peerUserId: result.id,
        peerOrbitId: result.orbit_id || null,
        displayName: result.display_name || generatePublicId(result.id),
        email: result.email || null,
        avatarUrl: result.avatar_url || null,
        source: "email_search",
      });

      setSaved(true);
      toast.success("Contact added!");
      props.onSaved?.();
    } catch (err: any) {
      setError(err?.message || "Error adding contact");
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
      setError("Could not open conversation");
    } finally {
      setOpening(false);
    }
  };

  const initials = result
    ? (result.display_name ?? generatePublicId(result.id)).slice(0, 2).toUpperCase()
    : "";

  return (
    <div className="space-y-4">
      <p className="text-xs" style={{ color: "hsl(var(--hud-text-dim) / 0.6)" }}>
        Search by email address to start a conversation or add a contact.
      </p>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }} />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void handleSearch()}
            placeholder="Email address…"
            aria-label="Search by email address"
            className="w-full rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none transition-all"
            style={{
              background: "hsl(var(--hud-surface))",
              color: "hsl(var(--hud-text))",
              border: "1px solid hsl(var(--hud-border) / 0.15)",
            }}
          />
        </div>
        <button
          onClick={() => void handleSearch()}
          disabled={loading || !email.trim()}
          aria-label="Search contact"
          className="shrink-0 h-10 w-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-30"
          style={{ background: "hsl(var(--hud-cyan))", color: "hsl(var(--hud-bg))" }}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </button>
      </div>

      {error && (
        <div role="alert" className="flex items-center gap-2 text-xs px-1 py-2 rounded-lg" style={{ background: "hsl(var(--hud-danger) / 0.1)", color: "hsl(var(--hud-danger))" }}>
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div
          className="w-full rounded-2xl p-4 space-y-3 transition-all animate-in fade-in slide-in-from-bottom-2 duration-200"
          style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.12)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="h-12 w-12 rounded-full flex items-center justify-center text-sm font-bold shrink-0 overflow-hidden"
              style={{ background: "hsl(var(--hud-cyan) / 0.15)", color: "hsl(var(--hud-cyan))" }}
            >
              {result.avatar_url ? (
                <img loading="lazy" src={result.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate" style={{ color: "hsl(var(--hud-text))" }}>
                {result.display_name ?? "Unnamed"}
              </p>
              <p className="text-xs truncate" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
                {generatePublicId(result.id)}
              </p>
              {result.email && (
                <p className="text-[0.6875rem] truncate mt-0.5" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>
                  {result.email}
                </p>
              )}
            </div>
            {saved && (
              <div className="flex items-center gap-1 text-[0.625rem] shrink-0" style={{ color: "hsl(var(--hud-success))" }}>
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Saved</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 pt-1" style={{ borderTop: "1px solid hsl(var(--hud-border) / 0.08)" }}>
            {!saved && (
              <button
                onClick={() => void handleSaveFriend()}
                disabled={saving}
                className="flex-1 h-9 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-all active:scale-[0.97] disabled:opacity-40"
                style={{ background: "hsl(var(--hud-surface))", color: "hsl(var(--hud-text))", border: "1px solid hsl(var(--hud-border) / 0.15)" }}
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
                {saving ? "Adding…" : "Add Contact"}
              </button>
            )}
            {props.onConversationReady && (
              <button
                onClick={() => void handleOpenChat()}
                disabled={opening}
                className="flex-1 h-9 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-all active:scale-[0.97] disabled:opacity-40"
                style={{ background: "hsl(var(--hud-cyan))", color: "hsl(var(--hud-bg))" }}
              >
                {opening ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageCircle className="h-3.5 w-3.5" />}
                {opening ? "Opening…" : "Start Chat"}
              </button>
            )}
          </div>
        </div>
      )}

      {!result && !loading && !error && (
        <div className="text-center py-8">
          <div className="h-16 w-16 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: "hsl(var(--hud-surface))" }}>
            <MessageCircle className="h-7 w-7" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }} />
          </div>
          <p className="text-xs" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>
            Enter an email to find someone on Orbit
          </p>
        </div>
      )}
    </div>
  );
}
