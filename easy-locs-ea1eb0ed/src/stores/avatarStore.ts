import { create } from "zustand";
import { uploadFile, getPublicFileUrl } from "@/lib/storage/uploadFile";
import { db } from "@/services/db";
import { requireOrbitIdentity } from "@/hooks/useOrbitIdentity";
import { useOrbitProfileStore } from "@/stores/orbitStore";
import { propagateIdentityChange } from "@/families/identity/identity-propagation";

 


type AvatarStore = {
  uploading: boolean;
  uploadAvatar: (file: File) => Promise<string>;
};

export const useAvatarStore = create<AvatarStore>((set) => ({
  uploading: false,

  uploadAvatar: async (file) => {
    const orbit = requireOrbitIdentity();
    const fullProfile = useOrbitProfileStore.getState().profile;
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
      useOrbitProfileStore.setState({
        profile: { ...fullProfile, avatarUrl: publicUrl },
      });

      // Propagate to ALL surfaces
      propagateIdentityChange({
        userId: orbit.userId,
        orbitId: orbit.orbitId,
        displayName: fullProfile.displayName,
        avatarUrl: publicUrl,
      });
    }

    set({ uploading: false });
    return publicUrl;
  },
}));
