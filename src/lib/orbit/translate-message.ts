/**
 * AI message translation — save translations and invoke the translate-message edge function.
 */
import { supabase } from "@/integrations/supabase/client";

export async function saveMessageTranslation(params: {
  messageId: string;
  sourceLocale?: string | null;
  targetLocale: string;
  translatedText: string;
}) {
  const { error } = await supabase
    .from("message_translations" as any)
    .insert({
      message_id: params.messageId,
      source_locale: params.sourceLocale ?? null,
      target_locale: params.targetLocale,
      translated_text: params.translatedText,
      provider: "ai",
    } as any);
  if (error) throw error;
  return { ok: true };
}

export async function translateMessageAI(params: {
  messageId: string;
  text: string;
  sourceLocale?: string | null;
  targetLocale: string;
}) {
  try {
    const { data, error } = await supabase.functions.invoke("translate-message", {
      body: {
        text: params.text,
        from_locale: params.sourceLocale ?? "en",
        to_locale: params.targetLocale,
      },
    });

    if (error) throw error;

    const translatedText = data?.translated ?? `[${params.targetLocale}] ${params.text}`;

    await saveMessageTranslation({
      messageId: params.messageId,
      sourceLocale: params.sourceLocale,
      targetLocale: params.targetLocale,
      translatedText,
    });

    return translatedText;
  } catch {
    const fallback = `[${params.targetLocale}] ${params.text}`;
    await saveMessageTranslation({
      messageId: params.messageId,
      sourceLocale: params.sourceLocale,
      targetLocale: params.targetLocale,
      translatedText: fallback,
    });
    return fallback;
  }
}
