import { normalizeMessageAttachments, formatBytes } from "@/lib/orbit/orbit-attachment-utils";

type Props = {
  message: any;
  isOwn: boolean;
  onOpenAttachment: (message: any, attachment: any) => void;
};

export function OrbitMediaMessage({ message, isOwn, onOpenAttachment }: Props) {
  const attachments = normalizeMessageAttachments(message.attachments);
  if (!attachments.length) return null;

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"} px-2`}>
      <div className={`max-w-[85%] space-y-1.5 rounded-2xl p-2 ${isOwn ? "bg-primary/10" : "bg-muted/40"}`}>
        {message.body && message.body !== message.attachment_summary && (
          <p className="text-sm px-1">{message.body}</p>
        )}
        <div className="space-y-1.5">
          {attachments.map((att) => {
            const isImage = att.kind === "image";
            const isVideo = att.kind === "video";
            const isPdf = att.kind === "pdf";

            return (
              <button
                key={att.id}
                onClick={() => onOpenAttachment(message, att)}
                className="w-full text-left rounded-xl border overflow-hidden hover:opacity-90 transition-opacity"
              >
                {isImage && (
                  <img
                    src={att.url}
                    alt={att.name}
                    className="w-full max-h-60 object-cover rounded-xl"
                    loading="lazy"
                  />
                )}
                {isVideo && (
                  <div className="p-3 flex items-center gap-2">
                    <span>🎬</span>
                     <span className="text-xs min-w-0 break-words leading-snug">{att.name}</span>
                  </div>
                )}
                {!isImage && !isVideo && (
                  <div className="p-3 flex items-center gap-2">
                    <span>{isPdf ? "📄" : "📎"}</span>
                    <span className="text-xs min-w-0 break-words leading-snug">{att.name}</span>
                  </div>
                )}
                <div className="px-3 pb-2 text-[10px] text-muted-foreground">
                  {att.kind} {att.sizeBytes ? `· ${formatBytes(att.sizeBytes)}` : ""}
                  {att.viewOnce ? " · view once" : ""}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
