import { OrbitReadState } from "@/components/orbit/OrbitReadState";
import { Reply, Pencil, Trash2, Pin } from "lucide-react";

type Props = {
  id: string;
  body: string;
  createdAt: string;
  deliveredAt?: string | null;
  readAt?: string | null;
  editedAt?: string | null;
  deletedAt?: string | null;
  isOwn: boolean;
  onReply?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onPin?: () => void;
};

export function OrbitMessageBubble(props: Props) {
  const {
    body,
    createdAt,
    deliveredAt,
    readAt,
    editedAt,
    deletedAt,
    isOwn,
    onReply,
    onEdit,
    onDelete,
    onPin,
  } = props;

  const content = deletedAt ? "This message was deleted" : body;

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"} group`}>
      <div
        className={[
          "max-w-[82%] rounded-2xl px-3 py-2 shadow-sm relative",
          isOwn
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-muted rounded-bl-md",
          deletedAt ? "opacity-50 italic" : "",
        ].join(" ")}
      >
        <div className="whitespace-pre-wrap break-words text-sm leading-5">
          {content}
        </div>

        <div className="mt-1 flex items-center justify-end gap-1.5 text-[11px] opacity-70">
          <span>
            {new Date(createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
            {editedAt && !deletedAt ? " · edited" : ""}
          </span>

          <OrbitReadState deliveredAt={deliveredAt} readAt={readAt} isOwn={isOwn} />
        </div>

        {!deletedAt && (
          <div className="absolute -top-8 right-0 hidden group-hover:flex items-center gap-0.5 bg-popover border border-border rounded-lg shadow-md px-1 py-0.5">
            <button
              onClick={onReply}
              className="p-1 rounded hover:bg-muted/60 transition-colors"
              title="Reply"
            >
              <Reply className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            {isOwn && (
              <>
                <button
                  onClick={onEdit}
                  className="p-1 rounded hover:bg-muted/60 transition-colors"
                  title="Edit"
                >
                  <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                <button
                  onClick={onDelete}
                  className="p-1 rounded hover:bg-muted/60 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </button>
              </>
            )}
            <button
              onClick={onPin}
              className="p-1 rounded hover:bg-muted/60 transition-colors"
              title="Pin"
            >
              <Pin className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
