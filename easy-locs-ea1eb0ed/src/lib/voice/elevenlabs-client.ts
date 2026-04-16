import { db } from "@/services/db";

export interface TTSOptions {
  text: string;
  voiceId?: string;
  modelId?: string;
  language?: string;
}

let currentAudio: HTMLAudioElement | null = null;

export async function generateSpeech(options: TTSOptions): Promise<Blob> {
  const { data: { session } } = await db.auth.getSession();
  if (!session?.access_token) {
    throw new Error("Authentication required for TTS");
  }

  const dbUrl = import.meta.env.VITE_SUPABASE_URL;
  const response = await fetch(`${dbUrl}/functions/v1/voice-tts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      text: options.text,
      voiceId: options.voiceId,
      modelId: options.modelId,
    }),
  });

  if (!response.ok) {
    throw new Error(`TTS failed: ${response.status}`);
  }

  return response.blob();
}

export async function speakWithElevenLabs(
  text: string,
  options?: {
    voiceId?: string;
    language?: string;
    onEnd?: () => void;
    onError?: (error: Error) => void;
  }
): Promise<void> {
  try {
    cancelElevenLabsSpeech();

    const audioBlob = await generateSpeech({
      text,
      voiceId: options?.voiceId,
      language: options?.language,
    });

    const url = URL.createObjectURL(audioBlob);
    const audio = new Audio(url);
    currentAudio = audio;

    audio.onended = () => {
      URL.revokeObjectURL(url);
      currentAudio = null;
      options?.onEnd?.();
    };

    audio.onerror = () => {
      URL.revokeObjectURL(url);
      currentAudio = null;
      options?.onError?.(new Error("Audio playback failed"));
    };

    await audio.play();
  } catch (err) {
    options?.onError?.(err instanceof Error ? err : new Error("TTS failed"));
  }
}

export function cancelElevenLabsSpeech(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
}

export function isElevenLabsSpeaking(): boolean {
  return currentAudio !== null && !currentAudio.paused;
}

export function isElevenLabsAvailable(): boolean {
  return !!import.meta.env.VITE_SUPABASE_URL;
}
