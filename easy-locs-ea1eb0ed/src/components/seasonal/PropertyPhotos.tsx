import { useState, useRef } from "react";
import * as seasonalRepo from "@/repositories/seasonal.repository";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { Camera, X, Upload, Loader2, Video } from "lucide-react";
import { isVideoUrl, isVideoFile, validateMediaFile, MEDIA_ACCEPT, IMAGE_ONLY_ACCEPT } from "@/lib/media-utils";

interface PropertyPhotosProps {
  propertyId: string;
  orgId: string;
  photos: string[];
  onPhotosChange: (urls: string[]) => void;
  /** Allow video uploads (enterprise only) */
  allowVideo?: boolean;
}

const PropertyPhotos = ({ propertyId, orgId, photos, onPhotosChange, allowVideo = false }: PropertyPhotosProps) => {
  const { toast } = useToast();
  const { t } = useI18n();
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);

    const newUrls: string[] = [];
    for (const file of Array.from(files)) {
      const validationError = validateMediaFile(file);
      if (validationError) {
        toast({ title: validationError, variant: "destructive" });
        continue;
      }
      if (isVideoFile(file) && !allowVideo) {
        toast({ title: "Video upload requires a paid plan", variant: "destructive" });
        continue;
      }
      const ext = file.name.split(".").pop();
      const path = `${orgId}/${propertyId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      try {
        const publicUrl = await seasonalRepo.uploadPropertyPhoto(orgId, propertyId, file);
        newUrls.push(publicUrl);
      } catch (error: any) {
        toast({ title: t("page.photos.upload_error"), description: error.message, variant: "destructive" });
        continue;
      }
    }

    const updated = [...photos, ...newUrls];
    onPhotosChange(updated);

    await seasonalRepo.upsertListing({ photo_urls: updated }, propertyId);
    toast({ title: `${newUrls.length} ${t("page.photos.added")}` });
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const removePhoto = async (url: string) => {
    const updated = photos.filter(p => p !== url);
    onPhotosChange(updated);
    // Note: property update uses supabase directly via repository pattern
    await seasonalRepo.deletePropertyPhoto(url);
    toast({ title: t("page.photos.deleted") });
  };

  const renderMediaThumb = (url: string, i: number) => {
    if (isVideoUrl(url)) {
      return (
        <div key={i} className="relative group rounded-lg overflow-hidden aspect-[4/3] bg-muted">
          <video src={url} className="w-full h-full object-cover" muted preload="metadata" />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Video className="h-6 w-6 text-white drop-shadow-lg" />
          </div>
          <button
            onClick={() => removePhoto(url)}
            className="absolute top-1.5 right-1.5 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      );
    }
    return (
      <div key={i} className="relative group rounded-lg overflow-hidden aspect-[4/3] bg-muted">
        <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
        <button
          onClick={() => removePhoto(url)}
          className="absolute top-1.5 right-1.5 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Camera className="h-4 w-4 text-accent" /> {t("page.photos.title")}
        </h3>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 text-xs bg-accent/10 text-accent px-3 py-1.5 rounded-lg hover:bg-accent/20 transition-colors font-medium"
        >
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {t("page.photos.add")}
        </button>
        <input ref={fileRef} type="file" accept={allowVideo ? MEDIA_ACCEPT : IMAGE_ONLY_ACCEPT} multiple onChange={handleUpload} className="hidden" />
      </div>

      {photos.length === 0 ? (
        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-accent/50 transition-colors"
        >
          <Camera className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">{t("page.photos.click_add")}</p>
          {allowVideo && <p className="text-xs text-muted-foreground mt-1">Photos & vidéos acceptées</p>}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {photos.map((url, i) => renderMediaThumb(url, i))}
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-border rounded-lg aspect-[4/3] flex items-center justify-center cursor-pointer hover:border-accent/50 transition-colors"
          >
            <Upload className="h-6 w-6 text-muted-foreground/40" />
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertyPhotos;
