/**
 * MessageTranslateButton — Inline translate toggle for messages.
 */
import { useState } from "react";
import { translateMessageAI } from "@/lib/orbit/translate-message";

export default function MessageTranslateButton({
  messageId,
  text,
  sourceLocale,
  targetLocale,
}: {
  messageId: string;
  text: string;
  sourceLocale?: string | null;
  targetLocale: string;
}) {
  const [translated, setTranslated] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      const result = await translateMessageAI({ messageId, text, sourceLocale, targetLocale });
      setTranslated(result);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-1">
      <button
        onClick={run}
        disabled={loading}
        className="text-xs text-muted-foreground hover:text-foreground underline"
      >
        {loading ? "Translating..." : "Translate"}
      </button>
      {translated && (
        <p className="mt-1 text-xs italic text-muted-foreground">{translated}</p>
      )}
    </div>
  );
}
