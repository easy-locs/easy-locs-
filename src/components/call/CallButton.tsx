import { useCallStore } from "@/stores/callStore";
import { Phone, Video } from "lucide-react";

export function CallButton(props: {
  orbitId: string;
  type?: "audio" | "video";
  conversationId?: string;
}) {
  const createCall = useCallStore((s) => s.createCall);
  const callType = props.type ?? "audio";

  return (
    <button
      className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-accent/10 active:scale-[0.95] transition-all text-foreground/60"
      onClick={() => void createCall(props.orbitId, callType, props.conversationId)}
      aria-label={callType === "video" ? "Video call" : "Voice call"}
    >
      {callType === "video" ? (
        <Video className="h-[18px] w-[18px]" />
      ) : (
        <Phone className="h-[18px] w-[18px]" />
      )}
    </button>
  );
}
