/**
 * useTranslation — Extracted from HudChatPanel.
 * Handles per-message translation toggle and updates local message state canonically.
 */
import { useState, useCallback } from "react";
import * as commRepo from "@/repositories/communication.repository";
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
        const { data } = await import("@/repositories/ai.repository").then(m => m.invokeTranslateMessage({
          text: msg.content, from_locale: msg.language_detected || "auto", to_locale: locale,
        }).then(d => ({ data: d })));
        if (data?.translated) {
          await commRepo.updateMessageFields(msg.id, {
            translated_content: data.translated, translated_locale: locale,
          });

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

