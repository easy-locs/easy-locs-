/**
 * Save call transcripts with optional translation.
 */
import { supabase } from "@/integrations/supabase/client";

export async function saveCallTranscript(params: {
  callSessionId: string;
  speakerUserId?: string | null;
  sourceLocale?: string | null;
  transcriptText: string;
  translatedLocale?: string | null;
  translatedText?: string | null;
}) {
  const { error } = await supabase
    .from("call_transcripts" as any)
    .insert({
      call_session_id: params.callSessionId,
      speaker_user_id: params.speakerUserId ?? null,
      source_locale: params.sourceLocale ?? null,
      transcript_text: params.transcriptText,
      translated_locale: params.translatedLocale ?? null,
      translated_text: params.translatedText ?? null,
    } as any);

  if (error) throw error;
  return { ok: true };
}
