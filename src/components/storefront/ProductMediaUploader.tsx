/**
 * ProductMediaUploader — Real media upload for product creation/editing.
 * PASS GO LIVE 1: Supports multi-image, video, preview, remove, cover selection.
 * Uses Supabase Storage bucket "products".
 */
import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ImagePlus, Video, X, Star, Loader2, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const MAX_IMAGES = 8;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
const ACCEPTED_IMAGES = "image/jpeg,image/png,image/webp,image/avif";
const ACCEPTED_VIDEO = "video/mp4,video/webm,video/quicktime";

interface Props {
  images: string[];
  videoUrl: string;
  coverIndex: number;
  onImagesChange: (urls: string[]) => void;
  onVideoChange: (url: string) => void;
  onCoverChange: (index: number) => void;
}

export default function ProductMediaUploader({
  images,
  videoUrl,
  coverIndex,
  onImagesChange,
  onVideoChange,
  onCoverChange,
}: Props) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(
    async (file: File, subfolder: string): Promise<string | null> => {
      if (!user) return null;
      const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
      const path = `${user.id}/${subfolder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const { error } = await supabase.storage.from("products").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (error) throw error;

      const { data: urlData } = supabase.storage.from("products").getPublicUrl(path);
      return urlData.publicUrl;
    },
    [user]
  );

  const handleImageUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (!files.length) return;

      const remaining = MAX_IMAGES - images.length;
      if (remaining <= 0) {
        toast.error(`Maximum ${MAX_IMAGES} images`);
        return;
      }

      const validFiles = files.slice(0, remaining).filter((f) => {
        if (f.size > MAX_IMAGE_SIZE) {
          toast.error(`${f.name}: too large (max 5MB)`);
          return false;
        }
        return true;
      });

      if (!validFiles.length) return;
      setUploading(true);

      try {
        const urls = await Promise.all(validFiles.map((f) => uploadFile(f, "images")));
        const newUrls = urls.filter(Boolean) as string[];
        onImagesChange([...images, ...newUrls]);
        toast.success(`${newUrls.length} photo${newUrls.length > 1 ? "s" : ""} uploaded`);
      } catch (err: any) {
        toast.error(err.message || "Upload failed");
      } finally {
        setUploading(false);
        if (imageInputRef.current) imageInputRef.current.value = "";
      }
    },
    [images, onImagesChange, uploadFile]
  );

  const handleVideoUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.size > MAX_VIDEO_SIZE) {
        toast.error("Video too large (max 50MB)");
        return;
      }

      setUploadingVideo(true);
      try {
        const url = await uploadFile(file, "videos");
        if (url) {
          onVideoChange(url);
          toast.success("Video uploaded");
        }
      } catch (err: any) {
        toast.error(err.message || "Video upload failed");
      } finally {
        setUploadingVideo(false);
        if (videoInputRef.current) videoInputRef.current.value = "";
      }
    },
    [onVideoChange, uploadFile]
  );

  const removeImage = useCallback(
    (index: number) => {
      const updated = images.filter((_, i) => i !== index);
      onImagesChange(updated);
      // Adjust cover index
      if (coverIndex === index) onCoverChange(0);
      else if (coverIndex > index) onCoverChange(coverIndex - 1);
    },
    [images, coverIndex, onImagesChange, onCoverChange]
  );

  const removeVideo = useCallback(() => {
    onVideoChange("");
  }, [onVideoChange]);

  const setCover = useCallback(
    (index: number) => {
      onCoverChange(index);
    },
    [onCoverChange]
  );

  return (
    <div className="space-y-3">
      {/* Image grid */}
      <div>
        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          Photos ({images.length}/{MAX_IMAGES})
        </label>
        <div className="grid grid-cols-4 gap-2 mt-1.5">
          {images.map((url, i) => (
            <div
              key={url}
              className={cn(
                "relative aspect-square rounded-lg overflow-hidden border-2 transition-colors group",
                i === coverIndex ? "border-accent" : "border-border"
              )}
            >
              <img src={url} alt={`Product ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />

              {/* Cover badge */}
              {i === coverIndex && (
                <span className="absolute top-0.5 left-0.5 bg-accent text-accent-foreground text-[8px] font-bold px-1 py-0.5 rounded">
                  Cover
                </span>
              )}

              {/* Overlay actions */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                {i !== coverIndex && (
                  <button
                    type="button"
                    onClick={() => setCover(i)}
                    className="p-1.5 bg-white/90 rounded-full text-accent hover:bg-white transition-colors"
                    aria-label="Set as cover"
                  >
                    <Star className="h-3 w-3" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="p-1.5 bg-white/90 rounded-full text-destructive hover:bg-white transition-colors"
                  aria-label="Remove"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}

          {/* Add button */}
          {images.length < MAX_IMAGES && (
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={uploading}
              className={cn(
                "aspect-square rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-accent hover:text-accent transition-colors",
                uploading && "opacity-50 pointer-events-none"
              )}
            >
              {uploading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <ImagePlus className="h-5 w-5" />
                  <span className="text-[9px] font-medium">Add</span>
                </>
              )}
            </button>
          )}
        </div>
        <input
          ref={imageInputRef}
          type="file"
          accept={ACCEPTED_IMAGES}
          multiple
          className="hidden"
          onChange={handleImageUpload}
        />
      </div>

      {/* Video */}
      <div>
        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          Video (optional)
        </label>
        <div className="mt-1.5">
          {videoUrl ? (
            <div className="relative rounded-lg overflow-hidden border border-border bg-muted">
              <video
                src={videoUrl}
                className="w-full h-28 object-cover"
                muted
                playsInline
                preload="metadata"
              />
              <button
                type="button"
                onClick={removeVideo}
                className="absolute top-1 right-1 p-1.5 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors"
                aria-label="Remove video"
              >
                <X className="h-3 w-3" />
              </button>
              <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded">
                Video ✓
              </span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => videoInputRef.current?.click()}
              disabled={uploadingVideo}
              className={cn(
                "w-full h-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center gap-2 text-muted-foreground hover:border-accent hover:text-accent transition-colors",
                uploadingVideo && "opacity-50 pointer-events-none"
              )}
            >
              {uploadingVideo ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Video className="h-4 w-4" />
                  <span className="text-xs">Add short video</span>
                </>
              )}
            </button>
          )}
        </div>
        <input
          ref={videoInputRef}
          type="file"
          accept={ACCEPTED_VIDEO}
          className="hidden"
          onChange={handleVideoUpload}
        />
      </div>
    </div>
  );
}
