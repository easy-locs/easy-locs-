import { useState, useRef, useCallback } from "react";
import { uploadChatMedia, signChatMediaUrl } from "@/repositories/communication.repository";
import { Paperclip, Image, Video, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { isVideoFile, validateMediaFile, MEDIA_ACCEPT } from "@/lib/media-utils";

interface Props {
  orgId: string;
  threadId: string;
  onUploaded: (urls: string[], fileNames: string[]) => void;
  disabled?: boolean;
}

export default function ChatMediaUploader({ orgId, threadId, onUploaded, disabled }: Props) {
  const [uploading, setUploading] = useState(false);
  const [previews, setPreviews] = useState<{ file: File; url: string }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    const newPreviews: { file: File; url: string }[] = [];
    for (let i = 0; i < Math.min(files.length, 5); i++) {
      const file = files[i];
      const err = validateMediaFile(file);
      if (err) { toast.error(err); continue; }
      newPreviews.push({ file, url: URL.createObjectURL(file) });
    }
    setPreviews(prev => [...prev, ...newPreviews].slice(0, 5));
  }, []);

  const removePreview = (idx: number) => {
    setPreviews(prev => {
      URL.revokeObjectURL(prev[idx].url);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const upload = async () => {
    if (previews.length === 0) return;
    setUploading(true);
    const urls: string[] = [];
    const names: string[] = [];
    try {
      for (const { file } of previews) {
        const ext = file.name.split(".").pop() || "bin";
        const path = `${orgId}/${threadId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        await uploadChatMedia(path, file);
        const signedUrl = await signChatMediaUrl(path);
        urls.push(signedUrl);
        names.push(file.name);
      }
      onUploaded(urls, names);
      previews.forEach(p => URL.revokeObjectURL(p.url));
      setPreviews([]);
    } catch (e: any) {
      toast.error("Upload failed: " + e.message);
    }
    setUploading(false);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  return (
    <div onDrop={handleDrop} onDragOver={e => e.preventDefault()}>
      <input ref={inputRef} type="file" multiple className="hidden" accept={MEDIA_ACCEPT + ",.pdf,.doc,.docx"}
        onChange={e => { handleFiles(e.target.files); e.target.value = ""; }} />

      {previews.length > 0 && (
        <div className="flex gap-2 p-2 border-t border-border/30 overflow-x-auto">
          {previews.map((p, i) => (
            <div key={i} className="relative shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-border bg-muted">
              {isVideoFile(p.file) ? (
                <div className="w-full h-full flex items-center justify-center bg-muted">
                  <Video className="h-6 w-6 text-muted-foreground" />
                </div>
              ) : p.file.type.startsWith("image/") ? (
                <img src={p.url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted">
                  <Paperclip className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <button onClick={() => removePreview(i)} className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          <Button size="sm" onClick={upload} disabled={uploading} className="self-center shrink-0">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send"}
          </Button>
        </div>
      )}

      <Button variant="ghost" size="icon" className="shrink-0 h-10 w-10" onClick={() => inputRef.current?.click()} disabled={disabled || uploading}>
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Image className="h-4 w-4" />}
      </Button>
    </div>
  );
}
