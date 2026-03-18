/**
 * LiveCallOverlay — shows call participants and live translation during a call.
 */
import { useCallParticipants } from "@/hooks/useCallParticipants";
import { useLiveTranslationStream } from "@/hooks/useLiveTranslationStream";

export function LiveCallOverlay({ callSessionId }: { callSessionId?: string }) {
  const participants = useCallParticipants(callSessionId);
  const chunks = useLiveTranslationStream(callSessionId);
  const lastChunks = chunks.slice(-8);

  if (!callSessionId) return null;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-xs font-semibold text-muted-foreground mb-2">Participants</p>
        <div className="space-y-1">
          {participants.map((p: any) => (
            <p key={p.id} className="text-xs text-foreground">
              {p.role} · {p.status}
            </p>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-xs font-semibold text-muted-foreground mb-2">Live translation</p>
        <div className="space-y-2">
          {lastChunks.map((c: any) => (
            <div key={c.id}>
              <p className="text-xs text-muted-foreground">{c.source_text}</p>
              <p className="text-xs font-medium text-foreground">{c.translated_text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
