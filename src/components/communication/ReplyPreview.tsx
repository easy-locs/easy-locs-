/**
 * ReplyPreview — Shows the quoted message being replied to.
 */
import { X } from "lucide-react";

interface Props {
  replyContent: string;
  replyAuthor: string;
  onClear?: () => void;
  compact?: boolean;
}

export default function ReplyPreview({ replyContent, replyAuthor, onClear, compact }: Props) {
  return (
    <div className={`flex items-start gap-2 ${compact ? "px-3 py-1.5" : "px-4 py-2"} bg-muted/50 border-l-2 border-accent rounded-r-lg`}>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold text-accent break-words leading-snug">{replyAuthor}</p>
        <p className="text-xs text-muted-foreground line-clamp-2 break-words leading-snug">{replyContent}</p>
      </div>
      {onClear && (
        <button onClick={onClear} className="p-0.5 text-muted-foreground hover:text-foreground shrink-0">
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
