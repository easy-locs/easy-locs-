type Props = {
  open: boolean;
  attachment: any | null;
  onClose: () => void;
};

export function OrbitAttachmentViewer({ open, attachment, onClose }: Props) {
  if (!open || !attachment) return null;

  const isImage = attachment.kind === "image";
  const isVideo = attachment.kind === "video";
  const isPdf = attachment.kind === "pdf";

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative max-w-3xl w-full max-h-[90vh] flex flex-col rounded-2xl overflow-hidden bg-background" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <p className="text-sm font-medium truncate">{attachment.name}</p>
          <button onClick={onClose} className="rounded-lg border px-3 py-1.5 text-xs hover:bg-muted transition-colors">
            Close
          </button>
        </div>

        <div className="flex-1 min-h-0 flex items-center justify-center p-4 overflow-auto">
          {isImage && (
            <img src={attachment.url} alt={attachment.name} className="max-w-full max-h-full object-contain rounded-lg" />
          )}
          {isVideo && (
            <video src={attachment.url} controls className="max-w-full max-h-full rounded-lg" />
          )}
          {isPdf && (
            <iframe src={attachment.url} className="w-full h-[70vh] rounded-lg border" title={attachment.name} />
          )}
          {!isImage && !isVideo && !isPdf && (
            <div className="space-y-3 text-center">
              <div className="text-sm text-muted-foreground">Document ready</div>
              <a
                href={attachment.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex rounded-xl border px-4 py-2 text-sm hover:bg-muted transition-colors"
              >
                Download
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
