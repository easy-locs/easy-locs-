/**
 * Live translation stream — push translated chunks during a call with rate limiting.
 */
import { supabase } from "@/integrations/supabase/client";
import { liveVoiceTranslate } from "@/lib/orbit/live-voice-translate";

const translationDebounceMap = new Map<string, number>();

export async function pushTranslationChunk(params: {
  callSessionId: string;
  workspaceId?: string;
  speakerId?: string;
  text: string;
  sourceLang?: string;
  targetLang: string;
  confidence?: number;
  segmentIndex?: number;
}) {
  const key = `${params.callSessionId}:${params.speakerId ?? "anon"}`;
  const now = Date.now();
  const last = translationDebounceMap.get(key) ?? 0;
  if (now - last < 400) return { translatedText: "", skipped: true };
  translationDebounceMap.set(key, now);

  const cleanedText = params.text.trim();
  if (!cleanedText) return { translatedText: "", skipped: true };

  const { translatedText } = await liveVoiceTranslate({
    text: cleanedText,
    sourceLocale: params.sourceLang,
    targetLocale: params.targetLang,
  });

  await supabase.from("live_translation_stream" as any).insert({
    call_session_id: params.callSessionId,
    workspace_id: params.workspaceId ?? null,
    speaker_id: params.speakerId ?? null,
    source_text: cleanedText,
    translated_text: translatedText,
    source_lang: params.sourceLang ?? null,
    target_lang: params.targetLang,
    confidence: params.confidence ?? null,
    segment_index: params.segmentIndex ?? 0,
  } as any);

  return { translatedText, skipped: false };
}
