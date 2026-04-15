const ALBUM_NAME = "Le Saint Coran — Easy-Locs";

export interface QuranDownloadOptions {
  surahNumber: number;
  surahNameArabic: string;
  surahNameTranslit: string;
  reciterName: string;
  reciterIdentifier: string;
  onProgress?: (percent: number) => void;
}

export async function downloadBrandedQuranAudio(opts: QuranDownloadOptions): Promise<void> {
  const { surahNumber, surahNameArabic, surahNameTranslit, reciterName, reciterIdentifier, onProgress } = opts;

  const audioUrl = `https://cdn.islamic.network/quran/audio-surah/128/${reciterIdentifier}/${surahNumber}.mp3`;

  const response = await fetch(audioUrl);
  if (!response.ok) throw new Error(`Failed to fetch audio: ${response.status}`);

  const contentLength = Number(response.headers.get("content-length") || 0);
  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const chunks: Uint8Array[] = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    if (contentLength > 0 && onProgress) {
      onProgress(Math.round((received / contentLength) * 100));
    }
  }

  const audioBlob = new Blob(chunks, { type: "audio/mpeg" });
  const fileName = `EasyLocs_Sourate_${surahNumber}_${surahNameTranslit.replace(/\s+/g, "_")}.mp3`;

  const url = URL.createObjectURL(audioBlob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }, 1000);
}
