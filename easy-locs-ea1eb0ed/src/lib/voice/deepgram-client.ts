import { db } from "@/services/db";

export interface DeepgramConfig {
  model?: string;
  language?: string;
  punctuate?: boolean;
  interimResults?: boolean;
}

export interface TranscriptionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
  words: Array<{ word: string; start: number; end: number; confidence: number }>;
}

type TranscriptCallback = (result: TranscriptionResult) => void;
type ErrorCallback = (error: Error) => void;

const DEEPGRAM_WS_URL = "wss://api.deepgram.com/v1/listen";

async function fetchTemporaryToken(): Promise<string> {
  const { data: { session } } = await db.auth.getSession();
  if (!session?.access_token) {
    throw new Error("Authentication required for STT");
  }

  const dbUrl = import.meta.env.VITE_SUPABASE_URL;
  const response = await fetch(`${dbUrl}/functions/v1/voice-stt-token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get STT token: ${response.status}`);
  }

  const data = await response.json();
  return data.token;
}

export class DeepgramStreamClient {
  private ws: WebSocket | null = null;
  private config: DeepgramConfig;
  private onTranscript: TranscriptCallback;
  private onError: ErrorCallback;
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;

  constructor(
    config: DeepgramConfig,
    onTranscript: TranscriptCallback,
    onError: ErrorCallback
  ) {
    this.config = config;
    this.onTranscript = onTranscript;
    this.onError = onError;
  }

  async start(): Promise<void> {
    let token: string;
    try {
      token = await fetchTemporaryToken();
    } catch (err) {
      this.onError(err instanceof Error ? err : new Error("Failed to get STT token"));
      return;
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        },
      });
    } catch (micErr) {
      console.warn("[deepgram] Microphone access error:", micErr instanceof Error ? micErr.message : micErr);
      this.onError(new Error("Microphone access denied"));
      return;
    }

    const params = new URLSearchParams({
      model: this.config.model ?? "nova-2",
      language: this.config.language ?? "en",
      punctuate: String(this.config.punctuate ?? true),
      interim_results: String(this.config.interimResults ?? true),
      encoding: "opus",
      sample_rate: "16000",
      channels: "1",
    });

    this.ws = new WebSocket(`${DEEPGRAM_WS_URL}?${params}`, ["token", token]);

    this.ws.onopen = () => {
      this.startRecording();
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const alternative = data.channel?.alternatives?.[0];
        if (alternative) {
          this.onTranscript({
            transcript: alternative.transcript ?? "",
            confidence: alternative.confidence ?? 0,
            isFinal: data.is_final ?? false,
            words: alternative.words ?? [],
          });
        }
      } catch (parseErr) {
        console.warn("[deepgram] Failed to parse transcript message:", parseErr instanceof Error ? parseErr.message : parseErr);
      }
    };

    this.ws.onerror = () => {
      this.onError(new Error("Deepgram WebSocket connection error"));
    };

    this.ws.onclose = () => {
      this.cleanup();
    };
  }

  private startRecording(): void {
    if (!this.stream || !this.ws) return;

    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm";

    this.mediaRecorder = new MediaRecorder(this.stream, { mimeType });

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0 && this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(event.data);
      }
    };

    this.mediaRecorder.start(250);
  }

  stop(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "CloseStream" }));
    }
    this.cleanup();
  }

  private cleanup(): void {
    if (this.mediaRecorder?.state !== "inactive") {
      try { this.mediaRecorder?.stop(); } catch (e) { console.debug("[deepgram] MediaRecorder stop:", e); }
    }
    this.mediaRecorder = null;

    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;

    if (this.ws && this.ws.readyState !== WebSocket.CLOSED) {
      try { this.ws.close(); } catch (e) { console.debug("[deepgram] WebSocket close:", e); }
    }
    this.ws = null;
  }

  isActive(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export async function transcribeAudioFile(
  audioBlob: Blob,
  options?: { language?: string; model?: string }
): Promise<TranscriptionResult> {
  const token = await fetchTemporaryToken();

  const params = new URLSearchParams({
    model: options?.model ?? "nova-2",
    language: options?.language ?? "en",
    punctuate: "true",
    detect_language: "true",
  });

  const response = await fetch(
    `https://api.deepgram.com/v1/listen?${params}`,
    {
      method: "POST",
      headers: {
        Authorization: `Token ${token}`,
        "Content-Type": audioBlob.type || "audio/webm",
      },
      body: audioBlob,
    }
  );

  if (!response.ok) {
    throw new Error(`Deepgram transcription failed: ${response.status}`);
  }

  const data = await response.json();
  const alt = data.results?.channels?.[0]?.alternatives?.[0];

  return {
    transcript: alt?.transcript ?? "",
    confidence: alt?.confidence ?? 0,
    isFinal: true,
    words: alt?.words ?? [],
  };
}
