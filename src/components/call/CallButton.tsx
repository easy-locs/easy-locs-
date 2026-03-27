import { useCall } from "@/components/call/CallProvider";
import { Phone, Video } from "lucide-react";

export function CallButton(props: {
  orbitId: string;
  type?: "audio" | "video";
  conversationId?: string;
  peerName?: string;
}) {
  const { startCall } = useCall();
  const callType = props.type ?? "audio";

  return (
    <button
      className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-accent/10 active:scale-[0.95] transition-all text-foreground/60"
      onClick={() => {
        console.log("[CallButton] clicked", {
          orbitId: props.orbitId,
          type: callType,
          conversationId: props.conversationId,
          peerName: props.peerName,
        });
        void startCall({
          targetId: props.orbitId,
          peerName: props.peerName || "User",
          threadId: props.conversationId,
          isVideo: callType === "video",
        });
      }}
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