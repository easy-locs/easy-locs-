/**
 * GhostInboxPage — Ghost V2/V3 encrypted thread inbox.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Plus, RotateCw, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { getOrCreateGhostProfile, getGhostThreads, createGhostSession, getLocalGhostSession, type GhostTier } from "@/lib/ghost";
import { PageLoadingState } from "@/components/page-states";

export default function GhostInboxPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [threads, setThreads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const p = await getOrCreateGhostProfile(user.id);
        setProfile(p);

        // Ensure session
        const local = getLocalGhostSession();
        if (!local) {
          await createGhostSession(p.id, p.tier as GhostTier);
        }

        const t = await getGhostThreads(p.id);
        setThreads(t);
      } catch (e: any) {
        setError(e.message);
        console.error("[ghost] inbox_load_failed", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id]);

  if (loading) return <PageLoadingState message="Loading Ghost inbox..." />;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 border-b border-border/40 bg-card/95 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold text-foreground">Ghost</h1>
          {profile && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium uppercase">
              {profile.tier}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate("/ghost/settings")}>
            <Lock className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => navigate("/ghost/contacts")}>
            <RotateCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Alias bar */}
      {profile && (
        <div className="px-4 py-2 text-xs text-muted-foreground border-b border-border/20 flex items-center gap-2">
          <span className="font-mono text-primary">{profile.current_alias}</span>
          <span>·</span>
          <span>v{profile.alias_version}</span>
        </div>
      )}

      {error && (
        <div className="mx-4 mt-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>
      )}

      {/* Thread list */}
      <div className="p-4 space-y-2">
        {threads.length === 0 ? (
          <div className="text-center py-12">
            <Shield className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground text-sm">No ghost threads yet</p>
            <p className="text-muted-foreground/60 text-xs mt-1">Start an encrypted conversation</p>
          </div>
        ) : (
          threads.map((t) => (
            <button
              key={t.thread_id}
              onClick={() => navigate(`/ghost/thread/${t.thread_id}`)}
              className="w-full text-left p-3 rounded-lg bg-card border border-border/30 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm text-foreground">{t.alias_at_join}</span>
                <span className="text-[10px] text-muted-foreground uppercase">
                  {(t as any).ghost_threads?.tier ?? "v2"}
                </span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {(t as any).ghost_threads?.burn_after_read && "🔥 Burn after read · "}
                {(t as any).ghost_threads?.is_ephemeral && "⏱ Ephemeral"}
              </div>
            </button>
          ))
        )}
      </div>

      {/* FAB */}
      <Button
        className="fixed bottom-20 right-4 rounded-full w-14 h-14 shadow-lg"
        onClick={() => {
          // TODO: Create new ghost thread flow
          console.log("[ghost] new_thread_pressed");
        }}
      >
        <Plus className="w-6 h-6" />
      </Button>
    </div>
  );
}
