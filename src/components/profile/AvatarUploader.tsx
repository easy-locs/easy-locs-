import { useState } from "react";
import { useAvatarStore } from "@/stores/avatarStore";
import { useOrbitIdentity } from "@/hooks/useOrbitIdentity";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export function AvatarUploader() {
  const [file, setFile] = useState<File | null>(null);
  const uploadAvatar = useAvatarStore((s) => s.uploadAvatar);
  const uploading = useAvatarStore((s) => s.uploading);
  const avatarUrl = useOrbitIdentity()?.avatarUrl;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Avatar</h3>

      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt="Avatar"
          className="w-20 h-20 rounded-full object-cover border border-border"
        />
      ) : (
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
          No avatar
        </div>
      )}

      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="text-sm text-foreground"
      />

      <Button
        size="sm"
        disabled={!file || uploading}
        onClick={async () => {
          if (!file) return;
          await uploadAvatar(file);
          setFile(null);
        }}
      >
        {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
        {uploading ? "Uploading..." : "Upload Avatar"}
      </Button>
    </div>
  );
}
