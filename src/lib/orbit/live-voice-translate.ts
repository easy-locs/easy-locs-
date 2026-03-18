/**
 * Live voice translation placeholder — will be wired to AI model later.
 */
export async function liveVoiceTranslate(params: {
  text: string;
  sourceLocale?: string | null;
  targetLocale: string;
}) {
  return {
    translatedText: `[${params.targetLocale}] ${params.text}`,
  };
}
