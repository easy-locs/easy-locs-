import { create } from "zustand";
import { uploadFile, getPublicFileUrl } from "@/lib/storage/uploadFile";
import { supabase } from "@/integrations/supabase/client";
import { requireOrbitIdentity } from "@/hooks/useOrbitIdentity";
import { useOrbitStore } from "@/stores/orbitStore";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

type AvatarStore = {
  uploading: boolean;
  uploadAvatar: (file: File) => Promise<string>;
};

export const useAvatarStore = create<AvatarStore>((set) => ({
  uploading: false,

  uploadAvatar: async (file) => {
    const orbit = requireOrbitIdentity();
    const fullProfile = useOrbitStore.getState().profile;
    if (!fullProfile) throw new Error("Missing orbit profile");

    set({ uploading: true });

    const ext = file.name.split(".").pop() || "jpg";
    const path = `${orbit.orbitId}/avatar.${ext}`;

    await uploadFile({
      bucket: "avatars",
      path,
      file,
      upsert: true,
    });

    const publicUrl = getPublicFileUrl("avatars", path);

    const { error } = await db
      .from("orbit_profiles_v2")
      .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
      .eq("id", orbit.userId);

    if (!error) {
      useOrbitStore.setState({
        profile: { ...fullProfile, avatarUrl: publicUrl },
      });
    }

    set({ uploading: false });
    return publicUrl;
  },
}));
