import {
  speakWithElevenLabs,
  cancelElevenLabsSpeech,
  isElevenLabsSpeaking,
  isElevenLabsAvailable,
} from "@/lib/voice/elevenlabs-client";

let currentUtterance: SpeechSynthesisUtterance | null = null;
let useElevenLabs = false;

export function setTTSProvider(provider: "web" | "elevenlabs"): void {
  useElevenLabs = provider === "elevenlabs";
}

export function getTTSProvider(): "web" | "elevenlabs" {
  return useElevenLabs && isElevenLabsAvailable() ? "elevenlabs" : "web";
}

const LANG_MAP: Record<string, string> = {
  "fr.hamidullah": "fr-FR",
  "en.sahih": "en-US",
  "en.yusufali": "en-US",
  "de.aburida": "de-DE",
  "es.cortes": "es-ES",
  "tr.ates": "tr-TR",
  "ur.jalandhry": "ur-PK",
  "id.indonesian": "id-ID",
  "bn.bengali": "bn-BD",
  "ru.kuliev": "ru-RU",
  "zh.majian": "zh-CN",
  "fa.makarem": "fa-IR",
  "ms.basmeih": "ms-MY",
  "nl.keyzer": "nl-NL",
  "it.piccardo": "it-IT",
  "pt.elhayek": "pt-BR",
  "sw.barwani": "sw-KE",
  "bs.mlivo": "bs-BA",
  "sq.nahi": "sq-AL",
  "az.musayev": "az-AZ",
  "so.abduh": "so-SO",
  "ha.gumi": "ha-NG",
  "ko.korean": "ko-KR",
  "ja.japanese": "ja-JP",
  "th.thai": "th-TH",
  "hi.hindi": "hi-IN",
  "ta.tamil": "ta-IN",
};

export function getTTSLang(quranLangCode: string): string {
  return LANG_MAP[quranLangCode] ?? "fr-FR";
}

export function isTTSSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function speakText(
  text: string,
  lang: string,
  opts?: { rate?: number; onEnd?: () => void; onError?: () => void }
): void {
  if (useElevenLabs && isElevenLabsAvailable()) {
    cancelTTS();
    speakWithElevenLabs(text, {
      language: lang,
      onEnd: opts?.onEnd,
      onError: (err) => {
        console.warn("[TTS] ElevenLabs failed, falling back to Web Speech:", err.message);
        speakTextWebSpeech(text, lang, opts);
      },
    });
    return;
  }

  speakTextWebSpeech(text, lang, opts);
}

function speakTextWebSpeech(
  text: string,
  lang: string,
  opts?: { rate?: number; onEnd?: () => void; onError?: () => void }
): void {
  if (!isTTSSupported()) {
    opts?.onError?.();
    return;
  }

  cancelTTS();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = opts?.rate ?? 0.9;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;

  const voices = window.speechSynthesis.getVoices();
  const langPrefix = lang.split("-")[0];
  const match = voices.find((v) => v.lang === lang) ?? voices.find((v) => v.lang.startsWith(langPrefix));
  if (match) utterance.voice = match;

  utterance.onend = () => {
    currentUtterance = null;
    opts?.onEnd?.();
  };
  utterance.onerror = () => {
    currentUtterance = null;
    opts?.onError?.();
  };

  currentUtterance = utterance;
  window.speechSynthesis.speak(utterance);
}

export function speakArabic(
  text: string,
  opts?: { onEnd?: () => void; onError?: () => void }
): void {
  speakText(text, "ar-SA", opts);
}

export function cancelTTS(): void {
  cancelElevenLabsSpeech();
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  currentUtterance = null;
}

export function isTTSSpeaking(): boolean {
  if (isElevenLabsSpeaking()) return true;
  return typeof window !== "undefined" && window.speechSynthesis?.speaking === true;
}

export function speakSequence(
  items: Array<{ text: string; lang: string }>,
  opts?: { gapMs?: number; onComplete?: () => void; onError?: () => void }
): { cancel: () => void } {
  let cancelled = false;
  let idx = 0;
  const gap = opts?.gapMs ?? 400;

  function next() {
    if (cancelled || idx >= items.length) {
      if (!cancelled) opts?.onComplete?.();
      return;
    }
    const item = items[idx++];
    speakText(item.text, item.lang, {
      onEnd: () => setTimeout(next, gap),
      onError: () => {
        if (!cancelled) opts?.onError?.();
      },
    });
  }

  next();
  return {
    cancel: () => {
      cancelled = true;
      cancelTTS();
    },
  };
}
