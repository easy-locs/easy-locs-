import { useRef } from "react";
import { useCall } from "@/components/call/CallProvider";
import { Phone, Video } from "lucide-react";
import { toast } from "sonner";

export function CallButton(props: {
  orbitId: string;
  type?: "audio" | "video";
  conversationId?: string;
  peerName?: string;
}) {
  const { startCall, isInCall, isStartingCall } = useCall();
  const callType = props.type ?? "audio";
  const lockRef = useRef(false);

  const handleClick = async () => {
    if (lockRef.current || isInCall || isStartingCall) return;
    lockRef.current = true;
    try {
      const success = await startCall({
        targetId: props.orbitId,
        peerName: props.peerName || "Contact",
        conversationId: props.conversationId,
        isVideo: callType === "video",
      });
      if (!success) {
        toast.error(callType === "video" ? "Video call could not be started" : "Call could not be started");
      }
    } catch {
      toast.error(callType === "video" ? "Video call failed" : "Call failed");
    } finally {
      setTimeout(() => { lockRef.current = false; }, 500);
    }
  };

  return (
    <button
      className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-accent/10 active:scale-[0.95] transition-all text-foreground/60"
      onClick={handleClick}
      disabled={isInCall || isStartingCall}
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
