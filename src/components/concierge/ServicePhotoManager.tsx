import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ImagePlus, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  photos: string[];
  onChange: (urls: string[]) => void;
  serviceId?: string;
  orgId: string;
}

const ServicePhotoManager = ({ photos, onChange, orgId }: Props) => {
  const [uploading, setUploading] = useState(false);

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    const newUrls: string[] = [];
    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop();
      const path = `concierge/${orgId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("property-photos").upload(path, file, { upsert: true });
      if (error) {
        toast.error(`Upload failed: ${error.message}`);
        continue;
      }
      const { data: urlData } = supabase.storage.from("property-photos").getPublicUrl(path);
      newUrls.push(urlData.publicUrl);
    }
    onChange([...photos, ...newUrls]);
    setUploading(false);
    if (newUrls.length > 0) toast.success(`${newUrls.length} photo(s) uploaded`);
  };

  const remove = (idx: number) => {
    onChange(photos.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs text-muted-foreground mb-1">Photos</label>
      <div className="grid grid-cols-3 gap-2">
        {photos.map((url, i) => (
          <div key={i} className="relative aspect-[4/3] rounded-lg overflow-hidden border border-border group">
            <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
            <button onClick={() => remove(i)}
              className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        <label className={`aspect-[4/3] rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-accent transition-colors ${uploading ? "pointer-events-none opacity-50" : ""}`}>
          {uploading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : <ImagePlus className="h-5 w-5 text-muted-foreground" />}
          <span className="text-[10px] text-muted-foreground mt-1">{uploading ? "Uploading..." : "Add photos"}</span>
          <input type="file" multiple accept="image/*" onChange={upload} className="hidden" />
        </label>
      </div>
    </div>
  );
};

export default ServicePhotoManager;
