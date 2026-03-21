import { ArrowLeft, Phone, Video, MoreVertical } from "lucide-react";
import { useCall } from "@/components/call/CallProvider";

export function ConversationHeader(props: {
  title: string;
  subtitle?: string;
  peerOrbitId: string;
  conversationId?: string;
  onBack?: () => void;
}) {
  const { startCall } = useCall();

  const handleCall = (isVideo: boolean) => {
    void startCall({
      orgId: props.peerOrbitId,
      peerName: props.title,
      threadId: props.conversationId,
      isVideo,
    });
  };

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-10">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {props.onBack && (
          <button
            onClick={props.onBack}
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted/50 active:scale-[0.95] transition-transform"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
        )}

        <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-sm font-semibold text-muted-foreground shrink-0">
          {props.title.charAt(0).toUpperCase()}
        </div>

        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{props.title}</p>
          <p className="text-[11px] text-muted-foreground truncate">{props.subtitle ?? "online"}</p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => handleCall(true)}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted/50 active:scale-[0.95] transition-transform"
        >
          <Video className="w-[18px] h-[18px] text-foreground" />
        </button>
        <button
          onClick={() => handleCall(false)}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted/50 active:scale-[0.95] transition-transform"
        >
          <Phone className="w-[18px] h-[18px] text-foreground" />
        </button>
        <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted/50 active:scale-[0.95] transition-transform">
          <MoreVertical className="w-[18px] h-[18px] text-foreground" />
        </button>
      </div>
    </div>
  );
}