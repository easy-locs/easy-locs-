import { useRef } from "react";
import { Camera, X, Star, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";
const MAX_SIZE_MB = 10;

interface PendingPhoto {
  file: File;
  previewUrl: string;
}

interface Props {
  maxPhotos?: number;
  photos: PendingPhoto[];
  onPhotosChange: (photos: PendingPhoto[]) => void;
}

export default function ListingPhotoUploader({ maxPhotos = 8, photos, onPhotosChange }: Props) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const handleAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remaining = maxPhotos - photos.length;
    if (remaining <= 0) {
      toast({ title: `Maximum ${maxPhotos} photos`, variant: "destructive" });
      return;
    }

    const newPhotos: PendingPhoto[] = [];
    for (const file of Array.from(files).slice(0, remaining)) {
      if (!file.type.startsWith("image/")) {
        toast({ title: "Images uniquement", description: `${file.name} n'est pas une image`, variant: "destructive" });
        continue;
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        toast({ title: "Fichier trop lourd", description: `${file.name} dépasse ${MAX_SIZE_MB} Mo`, variant: "destructive" });
        continue;
      }
      newPhotos.push({ file, previewUrl: URL.createObjectURL(file) });
    }

    if (newPhotos.length > 0) {
      onPhotosChange([...photos, ...newPhotos]);
    }

    if (fileRef.current) fileRef.current.value = "";
  };

  const remove = (index: number) => {
    URL.revokeObjectURL(photos[index].previewUrl);
    const next = photos.filter((_, i) => i !== index);
    onPhotosChange(next);
  };

  const setAsMain = (index: number) => {
    const reordered = [...photos];
    const [moved] = reordered.splice(index, 1);
    reordered.unshift(moved);
    onPhotosChange(reordered);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {photos.length}/{maxPhotos} photo{photos.length !== 1 ? "s" : ""} — la première sera la couverture
        </span>
        {photos.length < maxPhotos && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 text-xs bg-accent/10 text-accent px-3 py-1.5 rounded-lg hover:bg-accent/20 transition-colors font-medium"
          >
            <Upload className="h-3.5 w-3.5" />
            Ajouter des photos
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept={IMAGE_ACCEPT}
          multiple
          onChange={handleAdd}
          className="hidden"
        />
      </div>

      {photos.length === 0 ? (
        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-accent/50 transition-colors"
        >
          <Camera className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground font-medium">Cliquez pour ajouter des photos</p>
          <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WebP — jusqu'à {MAX_SIZE_MB} Mo chacune</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {photos.map((photo, i) => (
            <div
              key={photo.previewUrl}
              className={`relative group rounded-lg overflow-hidden aspect-[4/3] bg-muted ${i === 0 ? "ring-2 ring-accent col-span-2 row-span-2" : ""}`}
            >
              <img loading="lazy" src={photo.previewUrl} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
              {i === 0 && (
                <span className="absolute top-1.5 left-1.5 bg-accent text-accent-foreground text-[0.625rem] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                  <Star className="h-2.5 w-2.5" /> Couverture
                </span>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
              <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {i !== 0 && (
                  <button
                    type="button"
                    onClick={() => setAsMain(i)}
                    className="bg-accent text-accent-foreground rounded-full p-1"
                    title="Définir comme couverture"
                  >
                    <Star className="h-3 w-3" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="bg-destructive text-destructive-foreground rounded-full p-1"
                  title="Supprimer"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
