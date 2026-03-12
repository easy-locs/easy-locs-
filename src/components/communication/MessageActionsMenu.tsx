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
  onReply: () => void;
  onDeleted: () => void;
  onStarToggle: (starred: boolean) => void;
}

export default function MessageActionsMenu({
  children, messageId, content, isMe, isStarred, onReply, onDeleted, onStarToggle,
}: Props) {
  const [longPressTimer, setLongPressTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [showMobile, setShowMobile] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close mobile menu on outside click
  useEffect(() => {
    if (!showMobile) return;
    const handler = (e: Event) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMobile(false);
      }
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [showMobile]);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    toast.success("Copied");
    setShowMobile(false);
  };

  const handleStar = async () => {
    const newVal = !isStarred;
    await supabase.from("messages").update({ starred: newVal } as any).eq("id", messageId);
    onStarToggle(newVal);
    toast.success(newVal ? "Starred" : "Unstarred");
    setShowMobile(false);
  };

  const handleDeleteForMe = async () => {
    await supabase.from("messages").update({ deleted_for_sender: true } as any).eq("id", messageId);
    onDeleted();
    toast.success("Deleted for you");
    setShowMobile(false);
  };

  const handleDeleteForAll = async () => {
    await supabase.from("messages").update({ deleted_for_all: true, content: "🚫 This message was deleted" } as any).eq("id", messageId);
    onDeleted();
    toast.success("Deleted for everyone");
    setShowMobile(false);
  };

  const handleReply = () => {
    onReply();
    setShowMobile(false);
  };

  // Long-press handlers for mobile
  const onTouchStart = () => {
    const timer = setTimeout(() => setShowMobile(true), 500);
    setLongPressTimer(timer);
  };

  const onTouchEnd = () => {
    if (longPressTimer) clearTimeout(longPressTimer);
    setLongPressTimer(null);
  };

  const menuItems = (
    <>
      <ContextMenuItem onClick={handleReply} className="gap-2 text-xs">
        <Reply className="h-3.5 w-3.5" /> Reply
      </ContextMenuItem>
      <ContextMenuItem onClick={handleCopy} className="gap-2 text-xs">
        <Copy className="h-3.5 w-3.5" /> Copy
      </ContextMenuItem>
      <ContextMenuItem onClick={handleStar} className="gap-2 text-xs">
        {isStarred ? <StarOff className="h-3.5 w-3.5" /> : <Star className="h-3.5 w-3.5" />}
        {isStarred ? "Unstar" : "Star"}
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem onClick={handleDeleteForMe} className="gap-2 text-xs text-destructive">
        <Trash2 className="h-3.5 w-3.5" /> Delete for me
      </ContextMenuItem>
      {isMe && (
        <ContextMenuItem onClick={handleDeleteForAll} className="gap-2 text-xs text-destructive">
          <Trash2 className="h-3.5 w-3.5" /> Delete for everyone
        </ContextMenuItem>
      )}
    </>
  );

  return (
    <div className="relative" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} onTouchCancel={onTouchEnd}>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          {children}
        </ContextMenuTrigger>
        <ContextMenuContent className="w-48">
          {menuItems}
        </ContextMenuContent>
      </ContextMenu>

      {/* Mobile long-press menu */}
      {showMobile && (
        <div
          ref={menuRef}
          className="absolute z-50 bg-popover border border-border rounded-xl shadow-lg py-1 w-48 animate-in fade-in zoom-in-95 duration-150"
          style={{ bottom: "100%", [isMe ? "right" : "left"]: 0, marginBottom: 4 }}
        >
          <button onClick={handleReply} className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted transition-colors">
            <Reply className="h-3.5 w-3.5" /> Reply
          </button>
          <button onClick={handleCopy} className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted transition-colors">
            <Copy className="h-3.5 w-3.5" /> Copy
          </button>
          <button onClick={handleStar} className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted transition-colors">
            {isStarred ? <StarOff className="h-3.5 w-3.5" /> : <Star className="h-3.5 w-3.5" />}
            {isStarred ? "Unstar" : "Star"}
          </button>
          <div className="h-px bg-border my-1" />
          <button onClick={handleDeleteForMe} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-destructive hover:bg-muted transition-colors">
            <Trash2 className="h-3.5 w-3.5" /> Delete for me
          </button>
          {isMe && (
            <button onClick={handleDeleteForAll} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-destructive hover:bg-muted transition-colors">
              <Trash2 className="h-3.5 w-3.5" /> Delete for everyone
            </button>
          )}
        </div>
      )}
    </div>
  );
}
