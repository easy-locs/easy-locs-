import { CallButton } from "@/components/call/CallButton";
import { Phone, Video } from "lucide-react";

export function ChatHeader(props: { otherUserOrbitId: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/30 bg-card/80">
      <h2 className="text-sm font-semibold text-foreground truncate">Chat</h2>
      <div className="flex items-center gap-1">
        <CallButton orbitId={props.otherUserOrbitId} type="audio" />
        <CallButton orbitId={props.otherUserOrbitId} type="video" />
      </div>
    </div>
  );
}
