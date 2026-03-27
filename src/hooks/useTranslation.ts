/**
 * useTranslation — Extracted from HudChatPanel.
 * Handles per-message translation toggle and API call.
 */
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ChatMessage } from "@/components/communication-hub/types";

export function useTranslation(locale: string) {
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
          // Mutate local state via returned value — caller must update rawMessages
          msg.translated_content = data.translated;
          msg.translated_locale = locale;
        }
      } catch (e) {
        console.error("Translation error:", e);
        toast.error("Translation failed");
      }
      setTranslatingMsgId(null);
    }
    setShowOriginal(prev => ({ ...prev, [msg.id]: true }));
  }, [locale, translatingMsgId, showOriginal]);

  return { showOriginal, translatingMsgId, handleTranslateMessage };
}
