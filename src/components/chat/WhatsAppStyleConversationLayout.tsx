import { WhatsAppStyleChatMenu } from "@/components/chat/WhatsAppStyleChatMenu";
import { Phone, Video, Send, Plus, Mic } from "lucide-react";
import { useState } from "react";

export function WhatsAppStyleConversationLayout(props: {
  title: string;
  subtitle?: string;
  onCall?: (type: "audio" | "video") => void;
  children: React.ReactNode;
}) {
  const [message, setMessage] = useState("");

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header — WhatsApp-style */}
      <div className="flex items-center gap-3 px-3 py-2.5 border-b border-border/30 bg-card/80 backdrop-blur-sm shrink-0">
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-foreground truncate leading-tight">
            {props.title}
          </h2>
          <p className="text-xs text-muted-foreground/70 truncate">
            {props.subtitle ?? "online"}
          </p>
        </div>

        <div className="flex items-center gap-0.5">
          <button
            onClick={() => props.onCall?.("video")}
            className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-accent/10 active:scale-[0.95]"
            aria-label="Video call"
          >
            <Video className="h-5 w-5 text-foreground/70" />
          </button>
          <button
            onClick={() => props.onCall?.("audio")}
            className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-accent/10 active:scale-[0.95]"
            aria-label="Voice call"
          >
            <Phone className="h-5 w-5 text-foreground/70" />
          </button>
          <WhatsAppStyleChatMenu />
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {props.children}
      </div>

      {/* Input bar — WhatsApp-style */}
      <div className="flex items-end gap-2 px-2 py-2 border-t border-border/20 bg-card/60 backdrop-blur-sm shrink-0">
        <button
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-accent/10 active:scale-[0.95]"
          aria-label="Attach"
        >
          <Plus className="h-5 w-5 text-foreground/60" />
        </button>

        <div className="flex-1 flex items-center rounded-full bg-muted/40 border border-border/20 px-4 min-h-[40px]">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Message"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none py-2"
          />
        </div>

        <button
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.95]"
          aria-label={message ? "Send" : "Voice note"}
        >
          {message ? (
            <Send className="h-4.5 w-4.5" />
          ) : (
            <Mic className="h-5 w-5" />
          )}
        </button>
      </div>
    </div>
  );
}
