import { useState, useRef } from "react";
import * as photoRepo from "@/repositories/photo-uploader.repository";
import { useToast } from "@/hooks/use-toast";
import { Camera, X, Upload, Loader2, Star, Video } from "lucide-react";
import { isVideoUrl, isVideoFile, validateMediaFile, MEDIA_ACCEPT, IMAGE_ONLY_ACCEPT } from "@/lib/media-utils";

interface Props {
  listingId: string | null;
  orgId: string;
  photos: string[];
  onPhotosChange: (urls: string[]) => void;
  mainIndex?: number;
  onMainIndexChange?: (index: number) => void;
  allowVideo?: boolean;
}

const RealEstatePhotoUploader = ({ listingId, orgId, photos, onPhotosChange, mainIndex = 0, onMainIndexChange, allowVideo = false }: Props) => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (!listingId) {
      const previews: string[] = [];
      for (const file of Array.from(files)) {
        const url = URL.createObjectURL(file);
        previews.push(url);
      }
      onPhotosChange([...photos, ...previews]);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    setUploading(true);
    const newUrls: string[] = [];
    for (const file of Array.from(files)) {
      const validationError = validateMediaFile(file);
      if (validationError) { toast({ title: validationError, variant: "destructive" }); continue; }
      if (isVideoFile(file) && !allowVideo) { toast({ title: "Video requires a paid plan", variant: "destructive" }); continue; }

      const ext = file.name.split(".").pop();
      const path = `${orgId}/real-estate/${listingId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      try {
        await photoRepo.uploadPropertyPhoto(path, file);
        newUrls.push(photoRepo.getPublicUrl(path));
      } catch (err: any) { toast({ title: "Upload error", description: err.message, variant: "destructive" }); continue; }
    }

    const updated = [...photos, ...newUrls];
    onPhotosChange(updated);
    await photoRepo.updateListingPhotos(listingId, updated);
    toast({ title: `${newUrls.length} media added` });
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const removePhoto = async (url: string, index: number) => {
    const updated = photos.filter((_, i) => i !== index);
    onPhotosChange(updated);
    if (onMainIndexChange) {
      if (index === mainIndex) onMainIndexChange(0);
      else if (index < mainIndex) onMainIndexChange(mainIndex - 1);
    }
    if (!listingId) return;
    await photoRepo.updateListingPhotos(listingId, updated);
    const path = url.split("/property-photos/")[1];
    if (path) await photoRepo.removeStorageFile(path);
    toast({ title: "Media removed" });
  };

  const setAsMain = (index: number) => {
    if (!onMainIndexChange) return;
    const reordered = [...photos];
    const [moved] = reordered.splice(index, 1);
    reordered.unshift(moved);
    onPhotosChange(reordered);
    onMainIndexChange(0);
    if (listingId) {
      photoRepo.updateListingPhotos(listingId, reordered);
    }
  };

  const renderThumb = (url: string, i: number) => {
    const isVideo = isVideoUrl(url);
    return (
      <div
        key={`${url}-${i}`}
        className={`relative group rounded-lg overflow-hidden aspect-[4/3] bg-muted ${i === 0 ? "ring-2 ring-accent col-span-2 row-span-2 sm:col-span-2 sm:row-span-2" : ""}`}
      >
        {isVideo ? (
          <>
            <video src={url} className="w-full h-full object-cover" muted preload="metadata" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <Video className="h-6 w-6 text-white drop-shadow-lg" />
            </div>
          </>
        ) : (
          <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
        )}
        {i === 0 && (
          <span className="absolute top-1.5 left-1.5 bg-accent text-accent-foreground text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
            <Star className="h-2.5 w-2.5" /> Cover
          </span>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
        <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {i !== 0 && onMainIndexChange && (
            <button type="button" onClick={() => setAsMain(i)} className="bg-accent text-accent-foreground rounded-full p-1" title="Set as cover">
              <Star className="h-3 w-3" />
            </button>
          )}
          <button type="button" onClick={() => removePhoto(url, i)} className="bg-destructive text-destructive-foreground rounded-full p-1">
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{photos.length} media — first = cover</span>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 text-xs bg-accent/10 text-accent px-3 py-1.5 rounded-lg hover:bg-accent/20 transition-colors font-medium"
        >
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {allowVideo ? "Add media" : "Add photos"}
        </button>
        <input ref={fileRef} type="file" accept={allowVideo ? MEDIA_ACCEPT : IMAGE_ONLY_ACCEPT} multiple onChange={handleUpload} className="hidden" />
      </div>

      {photos.length === 0 ? (
        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-accent/50 transition-colors"
        >
          <Camera className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground font-medium">Click or drag media here</p>
          <p className="text-xs text-muted-foreground mt-1">
            {allowVideo ? "JPG, PNG, WebP, MP4, WebM — photos 10 MB, videos 50 MB" : "JPG, PNG, WebP — up to 10 MB each"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {photos.map((url, i) => renderThumb(url, i))}
        </div>
      )}
    </div>
  );
};

export default RealEstatePhotoUploader;
