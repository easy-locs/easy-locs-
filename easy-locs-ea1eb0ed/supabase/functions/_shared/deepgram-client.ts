const DEEPGRAM_API_URL = "https://api.deepgram.com/v1";

function getDeepgramApiKey(): string {
  const key = Deno.env.get("DEEPGRAM_API_KEY");
  if (!key) throw new Error("DEEPGRAM_API_KEY is not configured");
  return key;
}

export function hasDeepgramKey(): boolean {
  return !!Deno.env.get("DEEPGRAM_API_KEY");
}

interface TranscriptionOptions {
  language?: string;
  model?: string;
  punctuate?: boolean;
  diarize?: boolean;
  smart_format?: boolean;
  utterances?: boolean;
}

interface TranscriptionResult {
  transcript: string;
  confidence: number;
  words: Array<{
    word: string;
    start: number;
    end: number;
    confidence: number;
    speaker?: number;
  }>;
  utterances?: Array<{
    transcript: string;
    start: number;
    end: number;
    speaker: number;
  }>;
  duration: number;
}

export async function transcribeAudio(
  audioData: ArrayBuffer | Uint8Array,
  contentType: string,
  options: TranscriptionOptions = {}
): Promise<TranscriptionResult> {
  const apiKey = getDeepgramApiKey();
  const params = new URLSearchParams();

  params.set("model", options.model ?? "nova-2");
  params.set("language", options.language ?? "en");
  params.set("punctuate", String(options.punctuate ?? true));
  params.set("smart_format", String(options.smart_format ?? true));
  if (options.diarize) params.set("diarize", "true");
  if (options.utterances) params.set("utterances", "true");

  const resp = await fetch(`${DEEPGRAM_API_URL}/listen?${params.toString()}`, {
    method: "POST",
    headers: {
      Authorization: `Token ${apiKey}`,
      "Content-Type": contentType,
    },
    body: audioData,
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Deepgram API error [${resp.status}]: ${err}`);
  }

  const data = await resp.json();
  const channel = data.results?.channels?.[0];
  const alternative = channel?.alternatives?.[0];

  return {
    transcript: alternative?.transcript ?? "",
    confidence: alternative?.confidence ?? 0,
    words: (alternative?.words ?? []).map((w: Record<string, unknown>) => ({
      word: w.word as string,
      start: w.start as number,
      end: w.end as number,
      confidence: w.confidence as number,
      speaker: w.speaker as number | undefined,
    })),
    utterances: data.results?.utterances?.map((u: Record<string, unknown>) => ({
      transcript: u.transcript as string,
      start: u.start as number,
      end: u.end as number,
      speaker: u.speaker as number,
    })),
    duration: data.metadata?.duration ?? 0,
  };
}

export async function transcribeUrl(
  audioUrl: string,
  options: TranscriptionOptions = {}
): Promise<TranscriptionResult> {
  const apiKey = getDeepgramApiKey();
  const params = new URLSearchParams();

  params.set("model", options.model ?? "nova-2");
  params.set("language", options.language ?? "en");
  params.set("punctuate", String(options.punctuate ?? true));
  params.set("smart_format", String(options.smart_format ?? true));
  if (options.diarize) params.set("diarize", "true");
  if (options.utterances) params.set("utterances", "true");

  const resp = await fetch(`${DEEPGRAM_API_URL}/listen?${params.toString()}`, {
    method: "POST",
    headers: {
      Authorization: `Token ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url: audioUrl }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Deepgram API error [${resp.status}]: ${err}`);
  }

  const data = await resp.json();
  const channel = data.results?.channels?.[0];
  const alternative = channel?.alternatives?.[0];

  return {
    transcript: alternative?.transcript ?? "",
    confidence: alternative?.confidence ?? 0,
    words: alternative?.words ?? [],
    utterances: data.results?.utterances,
    duration: data.metadata?.duration ?? 0,
  };
}
