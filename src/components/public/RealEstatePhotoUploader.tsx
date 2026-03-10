import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Camera, X, Upload, Loader2 } from "lucide-react";

interface Props {
  listingId: string | null;
  orgId: string;
  photos: string[];
  onPhotosChange: (urls: string[]) => void;
}

const RealEstatePhotoUploader = ({ listingId, orgId, photos, onPhotosChange }: Props) => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !listingId) return;
    setUploading(true);

    const newUrls: string[] = [];
    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop();
      const path = `${orgId}/real-estate/${listingId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("property-photos").upload(path, file);
      if (error) {
        toast({ title: "Upload error", description: error.message, variant: "destructive" });
        continue;
      }
      const { data: urlData } = supabase.storage.from("property-photos").getPublicUrl(path);
      newUrls.push(urlData.publicUrl);
    }

    const updated = [...photos, ...newUrls];
    onPhotosChange(updated);

    // Save to DB
    await supabase.from("real_estate_listings").update({ photo_urls: updated } as any).eq("id", listingId);
    toast({ title: `${newUrls.length} photo(s) added` });
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const removePhoto = async (url: string) => {
    if (!listingId) return;
    const updated = photos.filter(p => p !== url);
    onPhotosChange(updated);
    await supabase.from("real_estate_listings").update({ photo_urls: updated } as any).eq("id", listingId);

    const path = url.split("/property-photos/")[1];
    if (path) await supabase.storage.from("property-photos").remove([path]);
    toast({ title: "Photo removed" });
  };

  if (!listingId) {
    return (
      <p className="text-xs text-muted-foreground italic">
        Save the listing first, then add photos.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{photos.length} photo(s)</span>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 text-xs bg-accent/10 text-accent px-3 py-1.5 rounded-lg hover:bg-accent/20 transition-colors font-medium"
        >
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          Add photos
        </button>
        <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleUpload} className="hidden" />
      </div>

      {photos.length === 0 ? (
        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-accent/50 transition-colors"
        >
          <Camera className="h-6 w-6 text-muted-foreground/40 mx-auto mb-1" />
          <p className="text-xs text-muted-foreground">Click to add photos</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {photos.map((url, i) => (
            <div key={i} className="relative group rounded-lg overflow-hidden aspect-[4/3] bg-muted">
              <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removePhoto(url)}
                className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RealEstatePhotoUploader;
