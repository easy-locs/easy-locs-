/**
 * ViewOnceMedia — View-once photo/video display + open logic.
 * Once opened by recipient, the media is marked as viewed and cannot be re-opened.
 */
import { useState, useCallback } from "react";
import { Eye, EyeOff, Camera } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";

interface Props {
  messageId: string;
  attachmentUrl: string;
  isMe: boolean;
  viewOnceOpenedAt: string | null;
  viewOnceOpenedBy: string | null;
  currentUserId?: string;
}

export default function ViewOnceMedia({ messageId, attachmentUrl, isMe, viewOnceOpenedAt, viewOnceOpenedBy, currentUserId }: Props) {
  const [showMedia, setShowMedia] = useState(false);
  const [opening, setOpening] = useState(false);
  const isOpened = !!viewOnceOpenedAt;
  const openedByMe = viewOnceOpenedBy === currentUserId;

  const handleOpen = useCallback(async () => {
    if (isMe) {
      // Sender can see status but not re-view
      if (isOpened) {
        toast.info("Opened by recipient");
      } else {
        toast.info("Not yet opened");
      }
      return;
    }

    if (isOpened) {
      toast.info("This photo can only be viewed once");
      return;
    }

    setOpening(true);
    haptic("medium");

    // Mark as opened in DB
    await supabase.from("chat_messages_v2").update({
      view_once_opened_at: new Date().toISOString(),
      view_once_opened_by: currentUserId,
    } as any).eq("id", messageId);

    setShowMedia(true);
    setOpening(false);
  }, [isMe, isOpened, messageId, currentUserId]);

  const handleClose = useCallback(() => {
    setShowMedia(false);
    // After closing, the media can never be re-opened
  }, []);

  // Sender view: status indicator
  if (isMe) {
    return (
      <button onClick={handleOpen} className="flex items-center gap-2 py-2 px-3 rounded-xl" style={{
        background: "hsl(var(--hud-surface) / 0.5)",
        border: "1px solid hsl(var(--hud-border) / 0.1)",
      }}>
        <Camera className="h-4 w-4" style={{ color: "hsl(var(--hud-cyan))" }} />
        <span className="text-xs font-medium" style={{ color: "hsl(var(--hud-text))" }}>
          View-once photo
        </span>
        {isOpened ? (
          <Eye className="h-3.5 w-3.5 ml-1" style={{ color: "hsl(var(--hud-success))" }} />
        ) : (
          <EyeOff className="h-3.5 w-3.5 ml-1" style={{ color: "hsl(var(--hud-text-dim))" }} />
        )}
      </button>
    );
  }

  // Recipient view: unopened = tap to open, opened = can't view again
  if (isOpened) {
    return (
      <div className="flex items-center gap-2 py-2 px-3 rounded-xl" style={{
        background: "hsl(var(--hud-surface) / 0.3)",
        border: "1px solid hsl(var(--hud-border) / 0.08)",
      }}>
        <EyeOff className="h-4 w-4" style={{ color: "hsl(var(--hud-text-dim))" }} />
        <span className="text-xs italic" style={{ color: "hsl(var(--hud-text-dim))" }}>
          Photo viewed
        </span>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={handleOpen}
        disabled={opening}
        className="flex items-center gap-2 py-3 px-4 rounded-xl transition-all active:scale-95"
        style={{
          background: "linear-gradient(135deg, hsl(var(--hud-cyan) / 0.15), hsl(var(--hud-cyan) / 0.05))",
          border: "1px solid hsl(var(--hud-cyan) / 0.25)",
        }}
      >
        <Camera className="h-5 w-5" style={{ color: "hsl(var(--hud-cyan))" }} />
        <span className="text-sm font-medium" style={{ color: "hsl(var(--hud-cyan))" }}>
          {opening ? "Opening..." : "View-once photo · Tap to open"}
        </span>
      </button>

      <Dialog open={showMedia} onOpenChange={handleClose}>
        <DialogContent className="max-w-lg p-0 overflow-hidden bg-black border-0">
          <div className="relative">
            <img src={attachmentUrl} alt="View once" className="w-full h-auto max-h-[80vh] object-contain" />
            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: "rgba(0,0,0,0.6)" }}>
              <Eye className="h-3 w-3 text-white" />
              <span className="text-[11px] text-white font-medium">View once — closes permanently</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
