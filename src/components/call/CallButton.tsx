import { useCallStore } from "@/stores/callStore";
import { useCallSignalingStore } from "@/stores/callSignalingStore";
import { Phone, Video } from "lucide-react";

export function CallButton(props: { orbitId: string; type?: "audio" | "video" }) {
  const startCall = useCallStore((s) => s.startCall);
  const createSession = useCallSignalingStore((s) => s.createCallSession);
  const callType = props.type ?? "audio";
  const Icon = callType === "video" ? Video : Phone;

  return (
    <button
      className="inline-flex items-center justify-center h-9 w-9 rounded-full text-foreground/70 hover:bg-accent/10 transition-colors active:scale-[0.95]"
      onClick={async () => {
        startCall(props.orbitId, callType);
        await createSession(props.orbitId, callType);
      }}
      aria-label={callType === "video" ? "Video call" : "Voice call"}
    >
      <Icon className="h-[18px] w-[18px]" />
    </button>
  );
}
