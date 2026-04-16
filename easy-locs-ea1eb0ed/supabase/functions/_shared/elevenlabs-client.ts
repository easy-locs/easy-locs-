const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1";

function getElevenLabsApiKey(): string {
  const key = Deno.env.get("ELEVENLABS_API_KEY");
  if (!key) throw new Error("ELEVENLABS_API_KEY is not configured");
  return key;
}

export function hasElevenLabsKey(): boolean {
  return !!Deno.env.get("ELEVENLABS_API_KEY");
}

interface TTSOptions {
  text: string;
  voiceId?: string;
  modelId?: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
  speakerBoost?: boolean;
  outputFormat?: string;
}

interface VoiceInfo {
  voice_id: string;
  name: string;
  category: string;
  labels: Record<string, string>;
}

const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";
const DEFAULT_MODEL_ID = "eleven_multilingual_v2";

export async function textToSpeech(options: TTSOptions): Promise<ArrayBuffer> {
  const apiKey = getElevenLabsApiKey();
  const voiceId = options.voiceId ?? DEFAULT_VOICE_ID;
  const outputFormat = options.outputFormat ?? "mp3_44100_128";

  const resp = await fetch(
    `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}?output_format=${outputFormat}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text: options.text,
        model_id: options.modelId ?? DEFAULT_MODEL_ID,
        voice_settings: {
          stability: options.stability ?? 0.5,
          similarity_boost: options.similarityBoost ?? 0.75,
          style: options.style ?? 0,
          use_speaker_boost: options.speakerBoost ?? true,
        },
      }),
    }
  );

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`ElevenLabs TTS error [${resp.status}]: ${err}`);
  }

  return resp.arrayBuffer();
}

export async function textToSpeechStream(options: TTSOptions): Promise<ReadableStream> {
  const apiKey = getElevenLabsApiKey();
  const voiceId = options.voiceId ?? DEFAULT_VOICE_ID;
  const outputFormat = options.outputFormat ?? "mp3_44100_128";

  const resp = await fetch(
    `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}/stream?output_format=${outputFormat}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text: options.text,
        model_id: options.modelId ?? DEFAULT_MODEL_ID,
        voice_settings: {
          stability: options.stability ?? 0.5,
          similarity_boost: options.similarityBoost ?? 0.75,
          style: options.style ?? 0,
          use_speaker_boost: options.speakerBoost ?? true,
        },
      }),
    }
  );

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`ElevenLabs TTS stream error [${resp.status}]: ${err}`);
  }

  return resp.body!;
}

export async function listVoices(): Promise<VoiceInfo[]> {
  const apiKey = getElevenLabsApiKey();

  const resp = await fetch(`${ELEVENLABS_API_URL}/voices`, {
    headers: { "xi-api-key": apiKey },
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`ElevenLabs voices error [${resp.status}]: ${err}`);
  }

  const data = await resp.json();
  return data.voices ?? [];
}
