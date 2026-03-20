/**
 * NewConversationDialog — Create a new direct conversation from the hub.
 * Searches users by name/email and creates a direct thread.
 * HUD-themed styling consistent with Orbit design system.
 */
import { useState } from "react";
import { Search, MessageCircle, Loader2, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getOrCreateDirectThread } from "@/lib/direct-thread";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onThreadCreated: (contextId: string) => void;
}

interface UserResult {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
}

export default function NewConversationDialog({ open, onOpenChange, onThreadCreated }: Props) {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState<string | null>(null);

  const handleSearch = async (q: string) => {
    setQuery(q);
    if (q.length < 2) { setResults([]); return; }
    setSearching(true);
    try {
      // Search orbit_profiles_v2 which has open SELECT for authenticated users
      const { data } = await (supabase as any)
        .from("orbit_profiles_v2")
        .select("id, display_name, email, avatar_url")
        .or(`display_name.ilike.%${q}%,email.ilike.%${q}%`)
        .neq("id", user?.id || "")
        .limit(10);
      setResults((data || []).map((r: any) => ({
        id: r.id,
        name: r.display_name || "",
        email: r.email || "",
        avatar_url: r.avatar_url,
      })));
    } catch {
      setResults([]);
    }
    setSearching(false);
  };

  const handleStartConversation = async (target: UserResult) => {
    if (!user) return;
    setCreating(target.id);
    try {
      const result = await getOrCreateDirectThread({
        currentUserId: user.id,
        targetUserId: target.id,
        targetName: target.name || target.email,
      });
      if (result) {
        onThreadCreated(result.contextId);
        onOpenChange(false);
        setQuery("");
        setResults([]);
        toast.success(`Conversation avec ${target.name || target.email} ouverte`);
      } else {
        toast.error("Impossible de créer la conversation");
      }
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de la création");
    }
    setCreating(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden" style={{
        background: "hsl(var(--hud-bg))",
        borderColor: "hsl(var(--hud-border) / 0.15)",
        borderRadius: 16,
      }}>
        <DialogHeader className="px-5 pt-5 pb-2">
          <DialogTitle className="flex items-center gap-2 text-sm" style={{ color: "hsl(var(--hud-text))" }}>
            <MessageCircle className="h-4 w-4" style={{ color: "hsl(var(--hud-cyan))" }} />
            Nouvelle conversation
          </DialogTitle>
          <DialogDescription className="text-xs" style={{ color: "hsl(var(--hud-text-dim) / 0.6)" }}>
            Recherchez un utilisateur pour démarrer une conversation directe
          </DialogDescription>
        </DialogHeader>
        <div className="px-5 pb-5 space-y-3">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }} />
            <Input
              value={query}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Nom ou email..."
              className="ps-9 h-10"
              style={{
                background: "hsl(var(--hud-surface))",
                borderColor: "hsl(var(--hud-border) / 0.15)",
                color: "hsl(var(--hud-text))",
              }}
              autoFocus
            />
          </div>
          <div className="max-h-64 overflow-y-auto space-y-0.5">
            {searching && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin" style={{ color: "hsl(var(--hud-cyan))" }} />
              </div>
            )}
            {!searching && results.length === 0 && query.length >= 2 && (
              <p className="text-center text-xs py-6" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
                Aucun utilisateur trouvé
              </p>
            )}
            {results.map(u => (
              <button
                key={u.id}
                onClick={() => handleStartConversation(u)}
                disabled={creating === u.id}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors text-left"
                style={{ color: "hsl(var(--hud-text))" }}
                onMouseEnter={e => (e.currentTarget.style.background = "hsl(var(--hud-surface) / 0.6)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold" style={{
                  background: "hsl(var(--hud-surface-2))",
                  border: "1px solid hsl(var(--hud-border) / 0.15)",
                  color: "hsl(var(--hud-cyan))",
                }}>
                  {(u.name || u.email || "?")[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: "hsl(var(--hud-text))" }}>
                    {u.name || "User"}
                  </p>
                  <p className="text-xs truncate" style={{ color: "hsl(var(--hud-text-dim))" }}>
                    {u.email}
                  </p>
                </div>
                {creating === u.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" style={{ color: "hsl(var(--hud-cyan))" }} />
                ) : (
                  <Plus className="h-4 w-4" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }} />
                )}
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
