/**
 * ViewOnceMedia — View-once photo/video display + open logic.
 * DB calls delegated to communication.repository.
 */
import { useState, useCallback } from "react";
import { Eye, EyeOff, Camera } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { markViewOnceOpened } from "@/repositories/communication.repository";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";

interface Props {
  messageId: string;
  attachmentUrl: string;
  isMe: boolean;
  viewOnceOpenedAt: string | null;
  viewOnceOpenedBy: string | null;
  currentUserId?: string;
}

export default function ViewOnceMedia({ messageId, attachmentUrl, isMe, viewOnceOpenedAt, viewOnceOpenedBy, currentUserId }: Props) {
  const { t } = useI18n();
  const [showMedia, setShowMedia] = useState(false);
  const [opening, setOpening] = useState(false);
  const isOpened = !!viewOnceOpenedAt;
  const openedByMe = viewOnceOpenedBy === currentUserId;

  const handleOpen = useCallback(async () => {
    if (isMe) {
      if (isOpened) {
        toast.info(t("orbit.view_once.opened_by_recipient") || "Opened by recipient");
      } else {
        toast.info(t("orbit.view_once.not_yet_opened") || "Not yet opened");
      }
      return;
    }

    if (isOpened) {
      toast.info(t("orbit.view_once.already_viewed") || "This photo can only be viewed once");
      return;
    }

    setOpening(true);
    haptic("medium");

    await markViewOnceOpened(messageId, currentUserId!);

    setShowMedia(true);
    setOpening(false);
  }, [isMe, isOpened, messageId, currentUserId]);

  const handleClose = useCallback(() => {
    setShowMedia(false);
  }, []);

  if (isMe) {
    return (
      <button onClick={handleOpen} className="flex items-center gap-2 py-2 px-3 rounded-xl" style={{
        background: "hsl(var(--card) / 0.5)",
        border: "1px solid hsl(var(--border) / 0.1)",
      }}>
        <Camera className="h-4 w-4" style={{ color: "hsl(var(--primary))" }} />
        <span className="text-xs font-medium" style={{ color: "hsl(var(--foreground))" }}>
          {t("orbit.view_once.label") || "View-once photo"}
        </span>
        {isOpened ? (
          <Eye className="h-3.5 w-3.5 ml-1" style={{ color: "hsl(var(--hud-success))" }} />
        ) : (
          <EyeOff className="h-3.5 w-3.5 ml-1" style={{ color: "hsl(var(--muted-foreground))" }} />
        )}
      </button>
    );
  }

  if (isOpened) {
    return (
      <div className="flex items-center gap-2 py-2 px-3 rounded-xl" style={{
        background: "hsl(var(--card) / 0.3)",
        border: "1px solid hsl(var(--border) / 0.08)",
      }}>
        <EyeOff className="h-4 w-4" style={{ color: "hsl(var(--muted-foreground))" }} />
        <span className="text-xs italic" style={{ color: "hsl(var(--muted-foreground))" }}>
          {t("orbit.view_once.photo_viewed") || "Photo viewed"}
        </span>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={handleOpen}
        disabled={opening}
        className="relative flex items-center gap-3 py-3 px-4 rounded-xl transition-all active:scale-95 overflow-hidden"
        style={{
          background: "linear-gradient(135deg, hsl(var(--primary) / 0.15), hsl(var(--primary) / 0.05))",
          border: "1px solid hsl(var(--primary) / 0.25)",
          minWidth: 200,
        }}
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <img
            src={attachmentUrl}
            alt=""
            className="w-full h-full object-cover"
            style={{ filter: "blur(28px) brightness(0.4) saturate(0.5)", transform: "scale(1.3)" }}
          />
        </div>
        <Camera className="h-5 w-5 relative z-10" style={{ color: "hsl(var(--primary))" }} />
        <span className="text-sm font-medium relative z-10" style={{ color: "hsl(var(--primary))" }}>
          {opening ? (t("orbit.view_once.opening") || "Opening...") : (t("orbit.view_once.tap_to_open") || "View-once photo · Tap to open")}
        </span>
      </button>

      <Dialog open={showMedia} onOpenChange={handleClose}>
        <DialogContent className="max-w-lg p-0 overflow-hidden bg-black border-0">
          <div className="relative">
            <img src={attachmentUrl} alt="" className="w-full h-auto max-h-[80vh] object-contain" />
            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: "rgba(0,0,0,0.6)" }}>
              <Eye className="h-3 w-3 text-white" />
              <span className="text-[11px] text-white font-medium">{t("orbit.view_once.closes_permanently") || "View once — closes permanently"}</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
