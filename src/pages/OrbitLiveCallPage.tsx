/**
 * OrbitLiveCallPage — Encrypted voice/video session control.
 */
import { useOrbitCallSession } from "@/hooks/useOrbitCallSession";
import OrbitCallBar from "@/components/orbit/OrbitCallBar";
import { BackCard } from "@/components/ui/back-card";
import { useAuth } from "@/contexts/AuthContext";
import { useParams } from "react-router-dom";

export default function OrbitLiveCallPage() {
  const { user } = useAuth();
  const { threadId } = useParams();

  const { session, create, accept, end, decline } = useOrbitCallSession({
    threadId: threadId ?? null,
    initiatorId: user?.id ?? "",
    recipientId: null,
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <BackCard />
        <div>
          <h1 className="text-xl font-bold text-foreground">Orbit live call</h1>
          <p className="text-sm text-muted-foreground">Encrypted voice/video session control</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 flex flex-col items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-3xl">
            {session?.call_type === "video" ? "🎥" : "📞"}
          </div>
          <p className="text-sm font-medium text-foreground">
            Status: <span className="text-muted-foreground">{session?.status ?? "idle"}</span>
          </p>
          {session?.duration_seconds > 0 && (
            <p className="text-xs text-muted-foreground">Duration: {session.duration_seconds}s</p>
          )}
        </div>

        <OrbitCallBar
          status={session?.status}
          onVoice={() => create("voice")}
          onVideo={() => create("video")}
          onAccept={accept}
          onEnd={end}
          onDecline={decline}
        />
      </div>
    </div>
  );
}
