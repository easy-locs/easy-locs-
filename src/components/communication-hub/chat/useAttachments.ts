/**
 * useAttachments — File upload, view-once, and voice message logic.
 * Extracted from HudChatPanel monolith.
 */
import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { platformBus } from "@/lib/shared/platform-bus";
import type { ConversationThread } from "../types";

interface AttachmentOptions {
  thread: ConversationThread | null;
  orgId: string | null;
  userId: string | undefined;
  myOrbitId: string | null;
  locale: string;
  e2eReady: boolean;
  encrypt: (content: string, peerId: string) => Promise<string | null>;
  resolveAuthUserId: () => Promise<string | null>;
}

export function useAttachments(opts: AttachmentOptions) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadToStorage = async (file: File | Blob, path: string) => {
    const buckets = ["chat-media", "property-photos", "avatars"];
    for (const bucket of buckets) {
      const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
      if (error) continue;
      const { data: signedData } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 365);
      return signedData?.signedUrl || null;
    }
    return null;
  };

  const handleFileUpload = async (file: File) => {
    const { thread, orgId, myOrbitId, locale, e2eReady, resolveAuthUserId } = opts;
    if (!thread) return;
    const authUserId = await resolveAuthUserId();
    if (!authUserId || !orgId) { toast.error("Workspace required"); return; }

    setUploading(true);
    try {
      const { validateMediaFile } = await import("@/lib/media-utils");
      const err = validateMediaFile(file);
      if (err) { toast.error(err); setUploading(false); return; }

      const isMedia = file.type.startsWith("image/") || file.type.startsWith("video/");
      let uploadFile: File | Blob = file;
      let uploadExt = file.name.split(".").pop() || "bin";
      let fileMetaJson: Record<string, string> | null = null;

      // E2E file encryption
      const peerId = thread.tenantId || thread.contextId || thread.id;
      if (e2eReady && peerId) {
        try {
          const { encryptFileForUpload } = await import("@/lib/orbit-file-encryption");
          const { getPrivateKey } = await import("@/lib/orbit-keystore");
          const { importPublicKey, deriveSharedKey: deriveKey } = await import("@/lib/orbit-crypto");
          const privateKey = await getPrivateKey(authUserId);
          if (privateKey) {
            const { data: peerKeyData } = await supabase
              .from("user_key_bundles" as any)
              .select("identity_public_key")
              .eq("user_id", peerId)
              .maybeSingle();
            const peerPubBase64 = (peerKeyData as any)?.identity_public_key;
            if (peerPubBase64) {
              const peerPubKey = await importPublicKey(peerPubBase64);
              const sharedKey = await deriveKey(privateKey, peerPubKey);
              const result = await encryptFileForUpload(file, sharedKey);
              uploadFile = result.encryptedBlob;
              uploadExt = "enc";
              fileMetaJson = { iv: result.iv, originalName: result.originalName, originalType: result.originalType };
            }
          }
        } catch (err) {
          console.warn("[Orbit] File encryption failed, uploading unencrypted:", err);
        }
      }

      const path = `${orgId}/${thread.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${uploadExt}`;
      const finalUrl = await uploadToStorage(uploadFile, path);
      if (!finalUrl) throw new Error("File upload failed. Please try again.");

      let content = isMedia ? `📷 ${file.name}` : `📎 ${file.name}`;
      if (fileMetaJson) {
        const { buildEncryptedFileRef } = await import("@/lib/orbit-file-encryption");
        content = buildEncryptedFileRef({ url: finalUrl, iv: fileMetaJson.iv, originalName: fileMetaJson.originalName, originalType: fileMetaJson.originalType });
      }

      if (thread.isV2 && thread.v2ConversationId) {
        const { error: v2Err } = await (supabase as any).from("chat_messages_v2").insert({
          conversation_id: thread.v2ConversationId,
          sender_user_id: authUserId,
          sender_orbit_id: myOrbitId || `orbit_${authUserId.slice(0, 12)}`,
          receiver_orbit_id: thread.peerOrbitId ?? null,
          type: isMedia ? "media" : "file",
          body: content,
          metadata: fileMetaJson ? { encrypted_file: fileMetaJson, url: finalUrl } : { url: finalUrl },
        });
        if (v2Err) throw v2Err;
        await (supabase as any).from("conversations_v2").update({ last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", thread.v2ConversationId);
      } else if (thread.v2ConversationId) {
        // V2 fallback — same as V2 primary path
        const { error: v2FallbackErr } = await (supabase as any).from("chat_messages_v2").insert({
          conversation_id: thread.v2ConversationId,
          sender_user_id: authUserId,
          sender_orbit_id: `orbit_${authUserId.slice(0, 12)}`,
          type: "file",
          body: content,
          metadata: fileMetaJson ? { encrypted_file: fileMetaJson, url: finalUrl } : { url: finalUrl },
        });
        if (v2FallbackErr) throw v2FallbackErr;
        await (supabase as any).from("conversations_v2").update({ last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", thread.v2ConversationId);
      } else {
        throw new Error("No V2 conversation found for file upload");
      }

      platformBus.emit("orbit:message_sent", { threadId: thread.threadId || thread.id, contextId: thread.contextId, type: "file" }, "orbit", { userId: opts.userId, orgId });
      toast.success(fileMetaJson ? "🔒 Encrypted file sent" : "File sent");
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    }
    setUploading(false);
  };

  return { uploading, setUploading, fileInputRef, handleFileUpload, uploadToStorage };
}
