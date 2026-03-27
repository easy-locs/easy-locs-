/**
 * useTranslation — Extracted from HudChatPanel.
 * Handles per-message translation toggle and updates local message state canonically.
 */
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ChatMessage } from "@/components/communication-hub/types";

export function useTranslation(
  locale: string,
  setRawMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
) {
  const [showOriginal, setShowOriginal] = useState<Record<string, boolean>>({});
  const [translatingMsgId, setTranslatingMsgId] = useState<string | null>(null);

  const handleTranslateMessage = useCallback(async (msg: ChatMessage) => {
    if (translatingMsgId) return;
    if (showOriginal[msg.id]) {
      setShowOriginal(prev => ({ ...prev, [msg.id]: false }));
      return;
    }

    if (!msg.translated_content) {
      setTranslatingMsgId(msg.id);
      try {
        const { data } = await supabase.functions.invoke("translate-message", {
          body: { text: msg.content, from_locale: msg.language_detected || "auto", to_locale: locale },
        });
        if (data?.translated) {
          await supabase.from("messages").update({
            translated_content: data.translated,
            translated_locale: locale,
          } as any).eq("id", msg.id);

          setRawMessages(prev => prev.map(m => m.id === msg.id ? {
            ...m,
            translated_content: data.translated,
            translated_locale: locale,
          } : m));
        }
      } catch (e) {
        console.error("Translation error:", e);
        toast.error("Translation failed");
      } finally {
        setTranslatingMsgId(null);
      }
    }

    setShowOriginal(prev => ({ ...prev, [msg.id]: true }));
  }, [locale, translatingMsgId, showOriginal, setRawMessages]);

  return { showOriginal, translatingMsgId, handleTranslateMessage };
}

