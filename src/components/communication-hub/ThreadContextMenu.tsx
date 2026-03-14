/**
 * ThreadContextMenu — WhatsApp-style bottom sheet "More" menu for a conversation thread.
 * Options: Mute, Contact info, Lock chat, Add to Favourites, Clear chat, Block, Delete chat.
 */
import { X, BellOff, Bell, Info, Lock, Heart, XCircle, Ban, Trash2 } from "lucide-react";
import type { ConversationThread } from "./types";

interface Props {
  thread: ConversationThread;
  open: boolean;
  onClose: () => void;
  onMute?: () => void;
  onContactInfo?: () => void;
  onFavorite?: () => void;
  onClearChat?: () => void;
  onBlock?: () => void;
  onDelete?: () => void;
}

export default function ThreadContextMenu({
  thread, open, onClose,
  onMute, onContactInfo, onFavorite, onClearChat, onBlock, onDelete,
}: Props) {
  if (!open) return null;

  const items = [
    { icon: thread.muted ? Bell : BellOff, label: thread.muted ? "Unmute" : "Mute", onClick: onMute, color: "hsl(var(--foreground))" },
    { icon: Info, label: "Contact info", onClick: onContactInfo, color: "hsl(var(--foreground))" },
    { icon: Lock, label: "Lock chat", onClick: undefined, color: "hsl(var(--foreground))" },
    { icon: Heart, label: "Add to Favourites", onClick: onFavorite, color: "hsl(var(--foreground))" },
    { icon: XCircle, label: "Clear chat", onClick: onClearChat, color: "hsl(var(--foreground))" },
  ];

  const dangerItems = [
    { icon: Ban, label: `Block ${thread.name}`, onClick: onBlock, color: "hsl(var(--destructive))" },
    { icon: Trash2, label: "Delete chat", onClick: onDelete, color: "hsl(var(--destructive))" },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Bottom sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl pb-8 animate-in slide-in-from-bottom duration-300"
        style={{
          background: "hsl(var(--card))",
          maxHeight: "80vh",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "hsl(var(--border) / 0.1)" }}>
          <div className="flex items-center gap-3">
            {thread.avatarUrl ? (
              <img src={thread.avatarUrl} alt={thread.name} className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ background: "hsl(var(--muted))" }}>
                <span className="text-sm font-bold" style={{ color: "hsl(var(--muted-foreground))" }}>
                  {thread.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <span className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>
              {thread.name}
            </span>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full flex items-center justify-center"
            style={{ background: "hsl(var(--muted))" }}
          >
            <X className="h-4 w-4" style={{ color: "hsl(var(--muted-foreground))" }} />
          </button>
        </div>

        {/* Menu items */}
        <div className="px-2 py-1">
          {items.map((item) => (
            <button
              key={item.label}
              onClick={() => { item.onClick?.(); onClose(); }}
              className="w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-colors hover:bg-muted/30 active:bg-muted/50"
            >
              <item.icon className="h-5 w-5" style={{ color: item.color }} />
              <span className="text-sm font-medium" style={{ color: item.color }}>
                {item.label}
              </span>
            </button>
          ))}
        </div>

        {/* Separator */}
        <div className="mx-4 border-t" style={{ borderColor: "hsl(var(--border) / 0.1)" }} />

        {/* Danger items */}
        <div className="px-2 py-1">
          {dangerItems.map((item) => (
            <button
              key={item.label}
              onClick={() => { item.onClick?.(); onClose(); }}
              className="w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-colors hover:bg-destructive/10 active:bg-destructive/20"
            >
              <item.icon className="h-5 w-5" style={{ color: item.color }} />
              <span className="text-sm font-medium" style={{ color: item.color }}>
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
