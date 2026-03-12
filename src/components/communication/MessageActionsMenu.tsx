/**
 * MessageActionsMenu — WhatsApp-style context menu for messages.
 * Long-press on mobile, right-click on desktop.
 */
import { useState, useRef, useEffect, type ReactNode } from "react";
import {
  ContextMenu, ContextMenuContent, ContextMenuItem,
  ContextMenuSeparator, ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Reply, Copy, Trash2, Forward, Star, StarOff,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  children: ReactNode;
  messageId: string;
  content: string;
  isMe: boolean;
  isStarred: boolean;
  /** Elapsed minutes since message was sent — delete-for-all only within 60min */
  minutesSinceSent?: number;
  onReply: () => void;
  onForward: () => void;
  onDeleted: (type: "for_me" | "for_all") => void;
  onStarToggle: (starred: boolean) => void;
}

const DELETE_FOR_ALL_LIMIT_MIN = 60;

export default function MessageActionsMenu({
  children, messageId, content, isMe, isStarred,
  minutesSinceSent, onReply, onForward, onDeleted, onStarToggle,
}: Props) {
  const [longPressTimer, setLongPressTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [showMobile, setShowMobile] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMobile) return;
    const handler = (e: Event) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMobile(false);
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [showMobile]);

  const close = () => setShowMobile(false);

  const handleCopy = () => { navigator.clipboard.writeText(content); toast.success("Copied"); close(); };

  const handleStar = async () => {
    const v = !isStarred;
    await supabase.from("messages").update({ starred: v } as any).eq("id", messageId);
    onStarToggle(v);
    toast.success(v ? "Starred" : "Unstarred");
    close();
  };

  const handleDeleteForMe = async () => {
    await supabase.from("messages").update({ deleted_for_sender: true } as any).eq("id", messageId);
    onDeleted();
    toast.success("Deleted for you");
    close();
  };

  const canDeleteForAll = isMe && (minutesSinceSent === undefined || minutesSinceSent <= DELETE_FOR_ALL_LIMIT_MIN);

  const handleDeleteForAll = async () => {
    await supabase.from("messages").update({
      deleted_for_all: true,
      content: "🚫 This message was deleted",
    } as any).eq("id", messageId);
    onDeleted();
    toast.success("Deleted for everyone");
    close();
  };

  const handleReply = () => { onReply(); close(); };
  const handleForward = () => { onForward(); close(); };

  const onTouchStart = () => { setLongPressTimer(setTimeout(() => setShowMobile(true), 500)); };
  const onTouchEnd = () => { if (longPressTimer) clearTimeout(longPressTimer); setLongPressTimer(null); };

  const items = (onClick: (fn: () => void) => () => void) => (
    <>
      <button onClick={onClick(handleReply)} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs hover:bg-muted transition-colors">
        <Reply className="h-3.5 w-3.5" /> Reply
      </button>
      <button onClick={onClick(handleForward)} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs hover:bg-muted transition-colors">
        <Forward className="h-3.5 w-3.5" /> Forward
      </button>
      <button onClick={onClick(handleCopy)} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs hover:bg-muted transition-colors">
        <Copy className="h-3.5 w-3.5" /> Copy
      </button>
      <button onClick={onClick(handleStar)} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs hover:bg-muted transition-colors">
        {isStarred ? <StarOff className="h-3.5 w-3.5" /> : <Star className="h-3.5 w-3.5" />}
        {isStarred ? "Unstar" : "Star"}
      </button>
      <div className="h-px bg-border my-0.5" />
      <button onClick={onClick(handleDeleteForMe)} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-destructive hover:bg-muted transition-colors">
        <Trash2 className="h-3.5 w-3.5" /> Delete for me
      </button>
      {canDeleteForAll && (
        <button onClick={onClick(handleDeleteForAll)} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-destructive hover:bg-muted transition-colors">
          <Trash2 className="h-3.5 w-3.5" /> Delete for everyone
        </button>
      )}
    </>
  );

  return (
    <div className="relative" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} onTouchCancel={onTouchEnd}>
      <ContextMenu>
        <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
        <ContextMenuContent className="w-48">
          <ContextMenuItem onClick={handleReply} className="gap-2 text-xs"><Reply className="h-3.5 w-3.5" /> Reply</ContextMenuItem>
          <ContextMenuItem onClick={handleForward} className="gap-2 text-xs"><Forward className="h-3.5 w-3.5" /> Forward</ContextMenuItem>
          <ContextMenuItem onClick={handleCopy} className="gap-2 text-xs"><Copy className="h-3.5 w-3.5" /> Copy</ContextMenuItem>
          <ContextMenuItem onClick={handleStar} className="gap-2 text-xs">
            {isStarred ? <StarOff className="h-3.5 w-3.5" /> : <Star className="h-3.5 w-3.5" />}
            {isStarred ? "Unstar" : "Star"}
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={handleDeleteForMe} className="gap-2 text-xs text-destructive"><Trash2 className="h-3.5 w-3.5" /> Delete for me</ContextMenuItem>
          {canDeleteForAll && (
            <ContextMenuItem onClick={handleDeleteForAll} className="gap-2 text-xs text-destructive"><Trash2 className="h-3.5 w-3.5" /> Delete for everyone</ContextMenuItem>
          )}
        </ContextMenuContent>
      </ContextMenu>

      {showMobile && (
        <div ref={menuRef}
          className="absolute z-50 bg-popover border border-border rounded-xl shadow-xl py-1 w-48 animate-in fade-in zoom-in-95 duration-150"
          style={{ bottom: "100%", [isMe ? "right" : "left"]: 0, marginBottom: 4 }}
        >
          {items((fn) => fn)}
        </div>
      )}
    </div>
  );
}
