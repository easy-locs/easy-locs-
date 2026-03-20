import { useCallStore } from "@/stores/callStore";
import { useCallSignalingStore } from "@/stores/callSignalingStore";
import { Phone } from "lucide-react";

export function CallButton(props: { orbitId: string }) {
  const startCall = useCallStore((s) => s.startCall);
  const createSession = useCallSignalingStore((s) => s.createCallSession);

  return (
    <button
      className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors active:scale-[0.97]"
      onClick={async () => {
        startCall(props.orbitId, "audio");
        await createSession(props.orbitId, "audio");
      }}
    >
      <Phone className="w-4 h-4" />
      Call
    </button>
  );
}
