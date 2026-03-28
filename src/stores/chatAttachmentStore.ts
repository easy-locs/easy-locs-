import { create } from "zustand";
import { uploadFile } from "@/lib/storage/uploadFile";
import { supabase } from "@/integrations/supabase/client";
import { requireOrbitIdentity } from "@/hooks/useOrbitIdentity";

type ChatAttachment = {
  id: string;
  conversation_id: string;
  message_id: string | null;
  sender_orbit_id: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
};

type ChatAttachmentStore = {
  items: ChatAttachment[];
  uploading: boolean;
  uploadAttachment: (conversationId: string, file: File) => Promise<ChatAttachment>;
  hydrateConversationAttachments: (conversationId: string) => Promise<void>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export const useChatAttachmentStore = create<ChatAttachmentStore>((set) => ({
  items: [],
  uploading: false,

  uploadAttachment: async (conversationId, file) => {
    const orbit = requireOrbitIdentity();

    set({ uploading: true });

    const ext = file.name.split(".").pop() || "bin";
    const path = `${orbit.orbitId}/${conversationId}/${Date.now()}.${ext}`;

    await uploadFile({
      bucket: "lease-documents",
      path,
      file,
      upsert: true,
    });

    const row: ChatAttachment = {
      id: `attach_${Math.random().toString(36).slice(2, 11)}`,
      conversation_id: conversationId,
      message_id: null,
      sender_orbit_id: orbit.orbitId,
      file_name: file.name,
      file_path: path,
      file_type: file.type || null,
      file_size: file.size ?? null,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await db
      .from("chat_attachments")
      .insert(row)
      .select()
      .single();

    if (error) throw error;

    set((state) => ({
      items: [data as ChatAttachment, ...state.items],
      uploading: false,
    }));

    return data as ChatAttachment;
  },

  hydrateConversationAttachments: async (conversationId) => {
    const { data, error } = await db
      .from("chat_attachments")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    set((state) => ({
      items: [
        ...(data as ChatAttachment[]),
        ...state.items.filter((x) => x.conversation_id !== conversationId),
      ],
    }));
  },
}));
