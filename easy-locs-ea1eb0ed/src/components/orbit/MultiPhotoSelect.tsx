/**
 * MultiPhotoSelect — Multi-image/video selection, preview, caption and send.
 * Uses the canonical useMediaGroupBuilder from families/media/media-group.
 */
import { useCallback, useRef } from "react";
import { X, Plus, Image, Send, GripVertical } from "lucide-react";
import { useMediaGroupBuilder, buildGroupMeta, getGroupPreviewLabel } from "@/families/media/media-group";
import { useI18n } from "@/lib/i18n";
import { motion, AnimatePresence } from "framer-motion";

interface MultiPhotoSelectProps {
  open: boolean;
  onClose: () => void;
  onSend: (attachments: Array<{
    file: File;
    localUrl: string;
    kind: string;
    order: number;
  }>, caption: string) => void;
}

export function MultiPhotoSelect({ open, onClose, onSend }: MultiPhotoSelectProps) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const { items, caption, add, remove, setCaption, clear } = useMediaGroupBuilder();

  const handleFilePick = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const kind = file.type.startsWith("video/") ? "video" : "image";
      add({
        file,
        localUrl: URL.createObjectURL(file),
        mimeType: file.type,
        sizeBytes: file.size,
        kind,
      });
    });
    if (inputRef.current) inputRef.current.value = "";
  }, [add]);

  const handleSend = useCallback(() => {
    if (items.length === 0) return;
    const attachments = items.map(item => ({
      file: item.media.file,
      localUrl: item.media.localUrl,
      kind: item.media.kind,
      order: item.order,
    }));
    onSend(attachments, caption);
    clear();
    onClose();
  }, [items, caption, onSend, clear, onClose]);

  const handleClose = useCallback(() => {
    clear();
    onClose();
  }, [clear, onClose]);

  const meta = buildGroupMeta(items);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="multi-photo"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="fixed inset-0 z-fullscreen flex flex-col"
        style={{ background: "hsl(var(--background))" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: "1px solid hsl(var(--border) / 0.1)" }}>
          <button onClick={handleClose} className="p-2 -ml-2">
            <X className="h-5 w-5" style={{ color: "hsl(var(--foreground))" }} />
          </button>
          <span className="text-sm font-bold" style={{ color: "hsl(var(--foreground))" }}>
            {items.length > 0 ? getGroupPreviewLabel(meta) : (t("media.select"))}
          </span>
          <button
            onClick={handleSend}
            disabled={items.length === 0}
            className="p-2 -mr-2 disabled:opacity-30"
          >
            <Send className="h-5 w-5" style={{ color: "hsl(var(--primary))" }} />
          </button>
        </div>

        {/* Preview grid */}
        <div className="flex-1 overflow-y-auto p-3">
          {items.length === 0 ? (
            <button
              onClick={() => inputRef.current?.click()}
              className="w-full h-64 flex flex-col items-center justify-center rounded-2xl gap-3"
              style={{ background: "hsl(var(--muted) / 0.3)", border: "2px dashed hsl(var(--border) / 0.3)" }}
            >
              <Image className="h-12 w-12" style={{ color: "hsl(var(--muted-foreground) / 0.4)" }} />
              <span className="text-sm font-medium" style={{ color: "hsl(var(--muted-foreground))" }}>
                {t("media.tap_to_select")}
              </span>
            </button>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {items.map((item) => (
                <div key={item.id} className="relative aspect-square rounded-xl overflow-hidden group">
                  {item.media.kind === "video" ? (
                    <video
                      src={item.media.localUrl}
                      className="w-full h-full object-cover"
                      muted
                    />
                  ) : (
                    <img
                      src={item.media.localUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  )}
                  {/* Order badge */}
                  <div className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[0.625rem] font-bold"
                    style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>
                    {item.order + 1}
                  </div>
                  {/* Remove button */}
                  <button
                    onClick={() => remove(item.id)}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: "hsl(var(--destructive))", color: "hsl(var(--destructive-foreground))" }}
                  >
                    <X className="h-3 w-3" />
                  </button>
                  {/* Video indicator */}
                  {item.media.kind === "video" && (
                    <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded text-[0.625rem] font-bold"
                      style={{ background: "hsl(var(--background) / 0.8)", color: "hsl(var(--foreground))" }}>
                      VIDEO
                    </div>
                  )}
                </div>
              ))}

              {/* Add more button */}
              <button
                onClick={() => inputRef.current?.click()}
                className="aspect-square rounded-xl flex items-center justify-center"
                style={{ background: "hsl(var(--muted) / 0.3)", border: "2px dashed hsl(var(--border) / 0.2)" }}
              >
                <Plus className="h-8 w-8" style={{ color: "hsl(var(--muted-foreground) / 0.4)" }} />
              </button>
            </div>
          )}
        </div>

        {/* Caption input */}
        {items.length > 0 && (
          <div className="px-4 py-3" style={{ borderTop: "1px solid hsl(var(--border) / 0.1)" }}>
            <input
              value={caption}
              onChange={e => setCaption(e.target.value)}
              placeholder={t("media.caption_placeholder")}
              className="w-full px-4 py-2.5 rounded-xl text-sm bg-transparent outline-none"
              style={{
                background: "hsl(var(--muted) / 0.3)",
                color: "hsl(var(--foreground))",
              }}
            />
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={handleFilePick}
        />
      </motion.div>
    </AnimatePresence>
  );
}
