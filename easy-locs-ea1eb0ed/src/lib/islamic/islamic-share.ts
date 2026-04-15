import { APP_BASE_URL } from "@/lib/app-domain";

function whatsappLink(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function shareIslamicContent(opts: {
  text: string;
  title?: string;
  url?: string;
}): void {
  if (navigator.share) {
    navigator.share({ title: opts.title, text: opts.text, url: opts.url }).catch(() => {
      copyToClipboard(opts.text);
    });
  } else {
    copyToClipboard(opts.text);
  }
}

async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {}
}

export function buildQuranVerseShareText(opts: {
  arabic: string;
  translation: string;
  transliteration?: string;
  surahName: string;
  surahNumber: number;
  ayahNumber: number;
  reciter?: string;
}): string {
  let text = `📖 ${opts.surahName} (${opts.surahNumber}:${opts.ayahNumber})\n\n`;
  text += `${opts.arabic}\n\n`;
  if (opts.transliteration) text += `${opts.transliteration}\n\n`;
  text += `${opts.translation}\n\n`;
  text += `— Coran ${opts.surahNumber}:${opts.ayahNumber}`;
  if (opts.reciter) text += ` | ${opts.reciter}`;
  const url = `${APP_BASE_URL}/dashboard/islamic?tab=quran&surah=${opts.surahNumber}&ayah=${opts.ayahNumber}`;
  text += `\n${url}`;
  return text;
}

export function buildSurahShareText(opts: {
  surahName: string;
  surahNameAr: string;
  surahNumber: number;
  reciter?: string;
}): string {
  let text = `📖 ${opts.surahName} — ${opts.surahNameAr}\n`;
  if (opts.reciter) text += `🎙️ ${opts.reciter}\n`;
  text += `\n${APP_BASE_URL}/dashboard/islamic?tab=quran&surah=${opts.surahNumber}`;
  return text;
}

export function buildHadithShareText(opts: {
  arabic: string;
  translation?: string;
  collection: string;
  number: number;
  grade?: string;
}): string {
  let text = `📚 ${opts.collection} — Hadith #${opts.number}\n\n`;
  text += `${opts.arabic}\n\n`;
  if (opts.translation) text += `${opts.translation}\n\n`;
  text += `— ${opts.collection} ${opts.number}`;
  if (opts.grade) text += ` (${opts.grade})`;
  text += `\n${APP_BASE_URL}/dashboard/islamic?tab=hadith&collection=${encodeURIComponent(opts.collection)}&number=${opts.number}`;
  return text;
}

export function buildDuaShareText(opts: {
  arabic: string;
  transliteration: string;
  french: string;
  source?: string;
}): string {
  let text = `🤲 Dua\n\n`;
  text += `${opts.arabic}\n\n`;
  text += `${opts.transliteration}\n\n`;
  text += `${opts.french}`;
  if (opts.source) text += `\n\nSource : ${opts.source}`;
  return text;
}

export function buildNameShareText(opts: {
  arabic: string;
  transliteration: string;
  french: string;
  meaning: string;
  number: number;
}): string {
  return `☪️ ${opts.number}. ${opts.arabic} — ${opts.transliteration}\n${opts.french}\n${opts.meaning}`;
}

export function getWhatsAppLink(text: string): string {
  return whatsappLink(text);
}
