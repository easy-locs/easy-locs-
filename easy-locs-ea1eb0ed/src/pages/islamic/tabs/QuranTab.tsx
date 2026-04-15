import { useState, useCallback, useRef, useEffect, useSyncExternalStore } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, SearchX, ChevronLeft, ChevronRight, Loader2, ExternalLink, BookOpen, Heart, RefreshCw, Copy, Share2, Type, Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Layers, Sparkles, MessageSquare, Globe, BookOpenCheck, Download, WifiOff, CheckSquare, Square, XCircle } from "lucide-react";
import { QURAN_SURAHS } from "@/data/islamic/quran-surahs";
import { QURAN_JUZ, VERSE_OF_THE_DAY_POOL } from "@/data/islamic/quran-juz";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";

const GOLD = "hsl(var(--accent))";
const NAVY = "hsl(226 22% 14%)";
const LS_FAVORITES_KEY = "quran_verse_favorites";
const LS_READING_KEY = "quran_reading_progress";
const LS_FONT_SIZE_KEY = "quran_font_size";
const LS_BOOKMARKS_KEY = "quran_bookmarks";
const LS_RECENT_KEY = "quran_recently_read";
const AYAHS_PER_PAGE = 50;

interface Bookmark {
  surah: number;
  ayah: number;
  name: string;
  savedAt: string;
}

interface RecentEntry {
  surah: number;
  name: string;
  ts: number;
}

function loadBookmarks(): Bookmark[] {
  try { const raw = localStorage.getItem(LS_BOOKMARKS_KEY); if (raw) return JSON.parse(raw); } catch {}
  return [];
}

function saveBookmarks(bm: Bookmark[]): void {
  try { localStorage.setItem(LS_BOOKMARKS_KEY, JSON.stringify(bm)); } catch {}
}

function loadRecentlyRead(): RecentEntry[] {
  try { const raw = localStorage.getItem(LS_RECENT_KEY); if (raw) return JSON.parse(raw); } catch {}
  return [];
}

function addRecentlyRead(surah: number, name: string): void {
  try {
    let list = loadRecentlyRead().filter(r => r.surah !== surah);
    list.unshift({ surah, name, ts: Date.now() });
    list = list.slice(0, 10);
    localStorage.setItem(LS_RECENT_KEY, JSON.stringify(list));
  } catch {}
}

function getVerseOfTheDay(): typeof VERSE_OF_THE_DAY_POOL[0] {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / 86400000);
  return VERSE_OF_THE_DAY_POOL[dayOfYear % VERSE_OF_THE_DAY_POOL.length];
}

const QURAN_LANGUAGES = [
  { code: "fr.hamidullah", native: "Français" },
  { code: "en.sahih", native: "English" },
  { code: "en.yusufali", native: "English (Yusuf Ali)" },
  { code: "de.aburida", native: "Deutsch" },
  { code: "es.cortes", native: "Español" },
  { code: "tr.ates", native: "Türkçe" },
  { code: "ur.jalandhry", native: "اردو" },
  { code: "id.indonesian", native: "Bahasa Indonesia" },
  { code: "bn.bengali", native: "বাংলা" },
  { code: "ru.kuliev", native: "Русский" },
  { code: "zh.majian", native: "中文" },
  { code: "fa.makarem", native: "فارسی" },
  { code: "ms.basmeih", native: "Bahasa Melayu" },
  { code: "nl.keyzer", native: "Nederlands" },
  { code: "it.piccardo", native: "Italiano" },
  { code: "pt.elhayek", native: "Português" },
  { code: "sw.barwani", native: "Kiswahili" },
  { code: "bs.mlivo", native: "Bosanski" },
  { code: "sq.nahi", native: "Shqip" },
  { code: "az.musayev", native: "Azərbaycan" },
  { code: "so.abduh", native: "Soomaali" },
  { code: "ha.gumi", native: "Hausa" },
  { code: "ko.korean", native: "한국어" },
  { code: "ja.japanese", native: "日本語" },
  { code: "th.thai", native: "ไทย" },
  { code: "hi.hindi", native: "हिन्दी" },
  { code: "ta.tamil", native: "தமிழ்" },
];

const FONT_SIZES = [
  { id: "small", labelKey: "islamic.quran.font_small", arabicClass: "text-base", transClass: "text-xs" },
  { id: "medium", labelKey: "islamic.quran.font_medium", arabicClass: "text-lg", transClass: "text-sm" },
  { id: "large", labelKey: "islamic.quran.font_large", arabicClass: "text-2xl", transClass: "text-base" },
];

const AUDIO_MODES: { id: AudioMode; label: string }[] = [
  { id: "arabic", label: "Arabe seul" },
  { id: "arabic_tts", label: "Arabe + Traduction vocale" },
  { id: "tts_only", label: "Traduction vocale seule" },
];

interface Ayah {
  number: number;
  arabic: string;
  translation: string;
  transliteration?: string;
}

interface FavoriteVerse {
  surahNumber: number;
  surahName: string;
  ayahNumber: number;
  arabic: string;
  translation: string;
  savedAt: string;
}

interface AlQuranAyah {
  numberInSurah: number;
  text: string;
}

interface AlQuranSurahResponse {
  code: number;
  data: { ayahs: AlQuranAyah[] };
}

interface AlQuranSearchMatch {
  surah: { number: number };
  numberInSurah: number;
  text: string;
}

interface AlQuranSearchResponse {
  code: number;
  data: { matches: AlQuranSearchMatch[] } | null;
}

function loadFavorites(): FavoriteVerse[] {
  try { const raw = localStorage.getItem(LS_FAVORITES_KEY); if (raw) return JSON.parse(raw) as FavoriteVerse[]; } catch {}
  return [];
}

function saveFavorites(favs: FavoriteVerse[]): void {
  try { localStorage.setItem(LS_FAVORITES_KEY, JSON.stringify(favs)); } catch {}
}

function getStoredLang(): string {
  try { return localStorage.getItem("quran_language") ?? "fr.hamidullah"; } catch { return "fr.hamidullah"; }
}

function getStoredFontSize(): string {
  try { return localStorage.getItem(LS_FONT_SIZE_KEY) ?? "medium"; } catch { return "medium"; }
}

function saveReadingProgress(surah: number, page: number): void {
  try { localStorage.setItem(LS_READING_KEY, JSON.stringify({ surah, page, ts: Date.now() })); } catch {}
}

function getReadingProgress(): { surah: number; page: number } | null {
  try { const raw = localStorage.getItem(LS_READING_KEY); if (raw) return JSON.parse(raw); } catch {}
  return null;
}

const RECITERS = [
  { id: "ar.alafasy", name: "Mishary Rashid Alafasy", nameAr: "مشاري العفاسي" },
  { id: "ar.abdurrahmaansudais", name: "Abdurrahmaan As-Sudais", nameAr: "عبدالرحمن السديس" },
  { id: "ar.hudhaify", name: "Ali Al-Hudhaify", nameAr: "علي الحذيفي" },
  { id: "ar.minshawi", name: "Mohamed Siddiq Al-Minshawi", nameAr: "محمد صديق المنشاوي" },
  { id: "ar.abdulbasitmurattal", name: "Abdul Basit (Murattal)", nameAr: "عبد الباسط" },
];

export default function QuranTab() {
  const { t, locale } = useI18n();
  const [search, setSearch] = useState("");
  const [selectedSurah, setSelectedSurah] = useState<number | null>(null);
  const [ayahs, setAyahs] = useState<Ayah[]>([]);
  const [loadingAyahs, setLoadingAyahs] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [servedFromCache, setServedFromCache] = useState(false);
  const [searchResults, setSearchResults] = useState<{ surah: number; ayah: number; text: string }[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [favorites, setFavorites] = useState<FavoriteVerse[]>(loadFavorites);
  const [showFavorites, setShowFavorites] = useState(false);
  const [language, setLanguage] = useState(getStoredLang);
  const [currentPage, setCurrentPage] = useState(1);
  const [fontSize, setFontSize] = useState(getStoredFontSize);
  const [showFontSettings, setShowFontSettings] = useState(false);
  const [browseMode, setBrowseMode] = useState<"surah" | "juz">("surah");
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(loadBookmarks);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showTafsir, setShowTafsir] = useState<number | null>(null);
  const [tafsirText, setTafsirText] = useState<string>("");
  const [tafsirLoading, setTafsirLoading] = useState(false);
  const [cachedSurahStatus, setCachedSurahStatus] = useState<CachedSurahStatus>({ cached: new Set(), pinned: new Set() });
  const [showOfflineManager, setShowOfflineManager] = useState(false);
  const [offlineEntries, setOfflineEntries] = useState<CachedSurahEntry[]>([]);
  const [downloadingSurah, setDownloadingSurah] = useState<number | null>(null);
  const [bulkProgress, setBulkProgress] = useState<BulkDownloadProgress | null>(null);
  const bulkAbortRef = useRef<AbortController | null>(null);
  const bulkRunningRef = useRef(false);
  const bulkLastAttemptRef = useRef<string>("");
  const bulkFailCooldownRef = useRef(0);
  const [storageQuota, setStorageQuota] = useState<StorageQuotaInfo | null>(null);
  const [bulkDownloadQueue, setBulkDownloadQueue] = useState<number[]>([]);
  const [bulkDownloadProgress, setBulkDownloadProgress] = useState<{ completed: number; total: number; failed: number } | null>(null);
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const [bulkSelected, setBulkSelected] = useState<Set<number>>(new Set());
  const bulkCancelledRef = useRef(false);
  const bulkUserAbortRef = useRef<AbortController | null>(null);

  const audioStore = useQuranAudioStore();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ttsCancel = useRef<{ cancel: () => void } | null>(null);
  const ayahScrollRef = useRef<Map<number, HTMLDivElement>>(new Map());
  const deepLinkHandled = useRef(false);

  const [verseOfDay, setVerseOfDay] = useState<{ arabic: string; translation: string; ref: string; theme: string } | null>(null);
  const [vodLoading, setVodLoading] = useState(false);
  const [vodFromCache, setVodFromCache] = useState(false);
  const [searchFromCache, setSearchFromCache] = useState(false);
  const [searchDone, setSearchDone] = useState(false);

  const fontConfig = FONT_SIZES.find(f => f.id === fontSize) ?? FONT_SIZES[1];
  const readingProgress = getReadingProgress();
  const recentlyRead = loadRecentlyRead();

  useEffect(() => {
    const vod = getVerseOfTheDay();
    setVodLoading(true);
    setVodFromCache(false);
    const lang = getStoredLang();
    Promise.all([
      fetch(`https://api.alquran.cloud/v1/ayah/${vod.surah}:${vod.ayah}`).then(r => r.json()),
      fetch(`https://api.alquran.cloud/v1/ayah/${vod.surah}:${vod.ayah}/${lang}`).then(r => r.json()),
    ]).then(([arJson, trJson]) => {
      if (arJson.code === 200 && trJson.code === 200) {
        const surahInfo = QURAN_SURAHS.find(s => s.number === vod.surah);
        const vodData = {
          arabic: arJson.data.text,
          translation: trJson.data.text,
          ref: `${surahInfo?.nameFr ?? t("islamic.quran.surah")} ${vod.surah}:${vod.ayah}`,
          theme: vod.theme,
        };
        setVerseOfDay(vodData);
        cacheVerseOfDay(vodData);
      } else {
        const cached = getCachedVerseOfDay();
        if (cached) {
          setVerseOfDay({ arabic: cached.arabic, translation: cached.translation, ref: cached.ref, theme: cached.theme });
          setVodFromCache(true);
        }
      }
    }).catch(() => {
      const cached = getCachedVerseOfDay();
      if (cached) {
        setVerseOfDay({ arabic: cached.arabic, translation: cached.translation, ref: cached.ref, theme: cached.theme });
        setVodFromCache(true);
      }
    }).finally(() => setVodLoading(false));
  }, []);

  useEffect(() => {
    return () => {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      audioStore.setAudioElement(null);
      audioStore.setPlaybackCallbacks(null, null);
      cancelTTS();
      ttsCancel.current?.cancel();
      clearMediaSession();
    };
  }, []);

  useEffect(() => {
    if (deepLinkHandled.current) return;
    if (deepLinkSurah && deepLinkSurah >= 1 && deepLinkSurah <= 114) {
      deepLinkHandled.current = true;
      const targetAyah = deepLinkAyah ?? undefined;
      const pageForAyah = targetAyah ? Math.ceil(targetAyah / AYAHS_PER_PAGE) : 1;
      loadSurah(deepLinkSurah, pageForAyah).then(() => {
        if (targetAyah) {
          setTimeout(() => {
            const el = ayahScrollRef.current.get(targetAyah);
            if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
          }, 500);
        }
      });
    }
  }, [deepLinkSurah, deepLinkAyah]);

  useEffect(() => {
    if (audioStore.currentAyah !== null && selectedSurah !== null) {
      const el = ayahScrollRef.current.get(audioStore.currentAyah);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [audioStore.currentAyah, selectedSurah]);

  const refreshCachedSurahs = useCallback(async () => {
    const status = await getCachedSurahStatus();
    setCachedSurahStatus(status);
  }, []);

  useEffect(() => {
    refreshCachedSurahs();
  }, [refreshCachedSurahs]);

  useEffect(() => {
    if (!isOnline) return;
    if (bulkRunningRef.current) return;

    const favSurahs = [...new Set(favorites.map(f => f.surahNumber))];
    const bmSurahs = [...new Set(bookmarks.map(b => b.surah))];
    const allNeeded = [...new Set([...favSurahs, ...bmSurahs])].sort((a, b) => a - b);

    if (allNeeded.length === 0) return;

    const unpinned = allNeeded.filter(n => !cachedSurahStatus.pinned.has(n));
    if (unpinned.length === 0) return;

    const attemptKey = `${unpinned.join(",")}-${language}-${audioStore.transliterationEnabled}`;
    if (attemptKey === bulkLastAttemptRef.current && bulkFailCooldownRef.current > Date.now()) {
      return;
    }

    const timer = setTimeout(() => {
      if (bulkRunningRef.current) return;
      bulkRunningRef.current = true;

      bulkAbortRef.current?.abort();
      const controller = new AbortController();
      bulkAbortRef.current = controller;

      bulkPinSurahs(
        allNeeded,
        language,
        audioStore.transliterationEnabled,
        (url: string) => fetchWithRetry(url, { signal: controller.signal }),
        (progress) => {
          if (controller.signal.aborted) return;
          setBulkProgress(progress);
          if (progress.done) {
            bulkRunningRef.current = false;
            if (progress.failed > 0 && progress.completed === 0) {
              bulkLastAttemptRef.current = attemptKey;
              bulkFailCooldownRef.current = Date.now() + 60000;
            } else if (progress.failed > 0) {
              bulkLastAttemptRef.current = attemptKey;
              bulkFailCooldownRef.current = Date.now() + 30000;
            } else {
              bulkLastAttemptRef.current = "";
            }
            refreshCachedSurahs();
          }
        },
        controller.signal
      ).catch(() => {
        bulkRunningRef.current = false;
      });
    }, 2000);

    return () => {
      clearTimeout(timer);
      if (bulkRunningRef.current) {
        bulkAbortRef.current?.abort();
        bulkRunningRef.current = false;
      }
    };
  }, [favorites, bookmarks, isOnline, language, audioStore.transliterationEnabled, refreshCachedSurahs, cachedSurahStatus.pinned]);

  useEffect(() => {
    return () => {
      bulkAbortRef.current?.abort();
    };
  }, []);

  const downloadSurahForOffline = useCallback(async (surahNum: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (downloadingSurah !== null || bulkDownloadProgress !== null) return;
    if (!isOnline) {
      toast.error("Connexion requise pour télécharger");
      return;
    }
    setDownloadingSurah(surahNum);
    const lang = language;
    const withTranslit = audioStore.transliterationEnabled;
    try {
      const fetches: Promise<Response>[] = [
        fetchWithRetry(`https://api.alquran.cloud/v1/surah/${surahNum}`),
        fetchWithRetry(`https://api.alquran.cloud/v1/surah/${surahNum}/${lang}`),
      ];
      if (withTranslit) {
        fetches.push(fetchWithRetry(`https://api.alquran.cloud/v1/surah/${surahNum}/en.transliteration`).catch(() => new Response(JSON.stringify({ code: 0 }))));
      }
      const responses = await Promise.all(fetches);
      const arJson: AlQuranSurahResponse = await responses[0].json();
      const trJson: AlQuranSurahResponse = await responses[1].json();
      let transLitJson: AlQuranSurahResponse | null = null;
      if (responses[2]) transLitJson = await responses[2].json();

      if (arJson.code === 200 && trJson.code === 200) {
        const merged: Ayah[] = arJson.data.ayahs.map((a, i) => ({
          number: a.numberInSurah,
          arabic: a.text,
          translation: trJson.data.ayahs[i]?.text ?? "",
          transliteration: transLitJson?.code === 200 ? transLitJson.data.ayahs[i]?.text : undefined,
        }));
        await pinSurah(surahNum, lang, withTranslit, merged);
        await refreshCachedSurahs();
        const surahInfo = QURAN_SURAHS.find(s => s.number === surahNum);
        toast.success(`${surahInfo?.nameFr ?? `Sourate ${surahNum}`} téléchargée pour hors-ligne`);
      } else {
        toast.error("Erreur lors du téléchargement");
      }
    } catch {
      toast.error("Erreur réseau lors du téléchargement");
    } finally {
      setDownloadingSurah(null);
    }
  }, [downloadingSurah, bulkDownloadProgress, isOnline, language, audioStore.transliterationEnabled, refreshCachedSurahs]);

  const startBulkDownload = useCallback(async (surahNumbers: number[]) => {
    if (bulkRunningRef.current || downloadingSurah !== null) return;
    if (!isOnline) {
      toast.error("Connexion requise pour télécharger");
      return;
    }
    const alreadyPinned = cachedSurahStatus.pinned;
    const toDownload = surahNumbers.filter(n => !alreadyPinned.has(n));
    if (toDownload.length === 0) {
      toast.info("Toutes les sourates sélectionnées sont déjà téléchargées");
      return;
    }
    bulkRunningRef.current = true;
    bulkCancelledRef.current = false;
    setBulkDownloadQueue(toDownload);
    setBulkDownloadProgress({ completed: 0, total: toDownload.length, failed: 0 });
    setBulkSelectMode(false);
    setBulkSelected(new Set());

    const lang = language;
    const withTranslit = audioStore.transliterationEnabled;
    let completed = 0;
    let failed = 0;

    for (const surahNum of toDownload) {
      if (bulkCancelledRef.current) break;
      setDownloadingSurah(surahNum);
      const abortController = new AbortController();
      bulkUserAbortRef.current = abortController;
      try {
        const fetchOpts = { signal: abortController.signal };
        const fetches: Promise<Response>[] = [
          fetchWithRetry(`https://api.alquran.cloud/v1/surah/${surahNum}`, fetchOpts),
          fetchWithRetry(`https://api.alquran.cloud/v1/surah/${surahNum}/${lang}`, fetchOpts),
        ];
        if (withTranslit) {
          fetches.push(fetchWithRetry(`https://api.alquran.cloud/v1/surah/${surahNum}/en.transliteration`, fetchOpts).catch(() => new Response(JSON.stringify({ code: 0 }))));
        }
        const responses = await Promise.all(fetches);
        const arJson: AlQuranSurahResponse = await responses[0].json();
        const trJson: AlQuranSurahResponse = await responses[1].json();
        let transLitJson: AlQuranSurahResponse | null = null;
        if (responses[2]) transLitJson = await responses[2].json();

        if (arJson.code === 200 && trJson.code === 200) {
          const merged: Ayah[] = arJson.data.ayahs.map((a, i) => ({
            number: a.numberInSurah,
            arabic: a.text,
            translation: trJson.data.ayahs[i]?.text ?? "",
            transliteration: transLitJson?.code === 200 ? transLitJson.data.ayahs[i]?.text : undefined,
          }));
          await pinSurah(surahNum, lang, withTranslit, merged);
          completed++;
        } else {
          failed++;
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") break;
        failed++;
      }
      bulkUserAbortRef.current = null;
      setBulkDownloadProgress({ completed: completed + failed, total: toDownload.length, failed });
    }

    setDownloadingSurah(null);
    bulkRunningRef.current = false;
    bulkUserAbortRef.current = null;
    await refreshCachedSurahs();
    const entries = await getAllCachedEntries();
    setOfflineEntries(entries);

    if (bulkCancelledRef.current) {
      toast.info(`Téléchargement annulé — ${completed} sourate${completed !== 1 ? "s" : ""} téléchargée${completed !== 1 ? "s" : ""}`);
    } else if (failed === 0) {
      toast.success(`${completed} sourate${completed !== 1 ? "s" : ""} téléchargée${completed !== 1 ? "s" : ""} pour hors-ligne`);
    } else {
      toast.warning(`${completed} réussie${completed !== 1 ? "s" : ""}, ${failed} échouée${failed !== 1 ? "s" : ""}`);
    }
    setBulkDownloadProgress(null);
    setBulkDownloadQueue([]);
  }, [downloadingSurah, isOnline, language, audioStore.transliterationEnabled, refreshCachedSurahs, cachedSurahStatus.pinned]);

  const cancelBulkDownload = useCallback(() => {
    bulkCancelledRef.current = true;
    bulkUserAbortRef.current?.abort();
  }, []);

  const retryFailedBulkDownload = useCallback(() => {
    if (!bulkProgress || bulkProgress.failedSurahs.length === 0) return;
    if (bulkRunningRef.current) return;
    if (!isOnline) {
      toast.error("Connexion requise pour réessayer");
      return;
    }

    const failedSurahs = [...bulkProgress.failedSurahs];
    bulkRunningRef.current = true;
    bulkLastAttemptRef.current = "";
    bulkFailCooldownRef.current = 0;

    bulkAbortRef.current?.abort();
    const controller = new AbortController();
    bulkAbortRef.current = controller;

    setBulkProgress({
      total: failedSurahs.length,
      completed: 0,
      failed: 0,
      failedSurahs: [],
      current: null,
      done: false,
    });

    bulkPinSurahs(
      failedSurahs,
      language,
      audioStore.transliterationEnabled,
      (url: string) => fetchWithRetry(url, { signal: controller.signal }),
      (progress) => {
        if (controller.signal.aborted) return;
        setBulkProgress(progress);
        if (progress.done) {
          bulkRunningRef.current = false;
          if (progress.failed > 0 && progress.completed === 0) {
            bulkLastAttemptRef.current = `${progress.failedSurahs.join(",")}-${language}-${audioStore.transliterationEnabled}`;
            bulkFailCooldownRef.current = Date.now() + 60000;
          } else if (progress.failed > 0) {
            bulkLastAttemptRef.current = `${progress.failedSurahs.join(",")}-${language}-${audioStore.transliterationEnabled}`;
            bulkFailCooldownRef.current = Date.now() + 30000;
          } else {
            bulkLastAttemptRef.current = "";
          }
          refreshCachedSurahs();
        }
      },
      controller.signal
    ).catch(() => {
      bulkRunningRef.current = false;
    });
  }, [bulkProgress, isOnline, language, audioStore.transliterationEnabled, refreshCachedSurahs]);

  const toggleBulkSelect = useCallback((surahNum: number) => {
    setBulkSelected(prev => {
      const next = new Set(prev);
      if (next.has(surahNum)) next.delete(surahNum);
      else next.add(surahNum);
      return next;
    });
  }, []);

  const handleRemoveCached = useCallback(async (surahNum: number) => {
    await removeCachedSurah(surahNum);
    await refreshCachedSurahs();
    const [entries, quota] = await Promise.all([getAllCachedEntries(), getStorageQuota()]);
    setOfflineEntries(entries);
    setStorageQuota(quota);
    const surahInfo = QURAN_SURAHS.find(s => s.number === surahNum);
    toast.success(`${surahInfo?.nameFr ?? `Sourate ${surahNum}`} supprimée du cache`);
  }, [refreshCachedSurahs]);

  const openOfflineManager = useCallback(async () => {
    const [entries, quota] = await Promise.all([getAllCachedEntries(), getStorageQuota()]);
    setOfflineEntries(entries);
    setStorageQuota(quota);
    setShowOfflineManager(true);
  }, []);

  const isFavorite = useCallback((surahNum: number, ayahNum: number) => {
    return favorites.some(f => f.surahNumber === surahNum && f.ayahNumber === ayahNum);
  }, [favorites]);

  const toggleFavorite = useCallback((surahNum: number, ayahNum: number, arabic: string, translation: string) => {
    setFavorites(prev => {
      const exists = prev.some(f => f.surahNumber === surahNum && f.ayahNumber === ayahNum);
      let updated: FavoriteVerse[];
      if (exists) {
        updated = prev.filter(f => !(f.surahNumber === surahNum && f.ayahNumber === ayahNum));
      } else {
        const surahInfo = QURAN_SURAHS.find(s => s.number === surahNum);
        updated = [...prev, {
          surahNumber: surahNum, surahName: surahInfo?.nameFr ?? `${t("islamic.quran.surah")} ${surahNum}`,
          ayahNumber: ayahNum, arabic, translation, savedAt: new Date().toISOString(),
        }];
      }
      saveFavorites(updated);
      return updated;
    });
  }, []);

  const copyVerse = useCallback(async (arabic: string, translation: string, surahNum: number, ayahNum: number) => {
    const surahInfo = QURAN_SURAHS.find(s => s.number === surahNum);
    const text = `${arabic}\n\n${translation}\n\n— ${surahInfo?.nameFr ?? t("islamic.quran.surah")} ${surahNum}:${ayahNum}`;
    try { await navigator.clipboard.writeText(text); toast.success(t("islamic.quran.verse_copied")); } catch { toast.error(t("islamic.copy_failed")); }
  }, [t]);

  const shareVerse = useCallback(async (arabic: string, translation: string, surahNum: number, ayahNum: number, transliteration?: string) => {
    const surahInfo = QURAN_SURAHS.find(s => s.number === surahNum);
    const text = `${arabic}\n\n${translation}\n\n— ${surahInfo?.nameFr ?? t("islamic.quran.surah")} ${surahNum}:${ayahNum}`;
    if (navigator.share) { try { await navigator.share({ text }); } catch {} }
    else { await copyVerse(arabic, translation, surahNum, ayahNum); }
  }, [copyVerse, t]);

  const filtered = search && !selectedSurah
    ? QURAN_SURAHS.filter(s =>
        s.nameFr.toLowerCase().includes(search.toLowerCase()) ||
        s.nameAr.includes(search) ||
        s.nameEn.toLowerCase().includes(search.toLowerCase()) ||
        String(s.number) === search
      )
    : QURAN_SURAHS;

  const loadSurah = useCallback(async (num: number, page: number = 1, langOverride?: string) => {
    const lang = langOverride ?? language;
    const withTranslit = audioStore.transliterationEnabled;
    setSelectedSurah(num);
    setLoadingAyahs(true);
    setAyahs([]);
    setLoadError(null);
    setShowFavorites(false);
    setCurrentPage(page);
    setShowTafsir(null);
    setServedFromCache(false);

    const surahInfo = QURAN_SURAHS.find(s => s.number === num);
    if (surahInfo) addRecentlyRead(num, surahInfo.nameFr);

    try {
      const fetches: Promise<Response>[] = [
        fetchWithRetry(`https://api.alquran.cloud/v1/surah/${num}`),
        fetchWithRetry(`https://api.alquran.cloud/v1/surah/${num}/${lang}`),
      ];
      if (withTranslit) {
        fetches.push(fetchWithRetry(`https://api.alquran.cloud/v1/surah/${num}/en.transliteration`).catch(() => new Response(JSON.stringify({ code: 0 }))));
      }

      const responses = await Promise.all(fetches);
      const arJson: AlQuranSurahResponse = await responses[0].json();
      const trJson: AlQuranSurahResponse = await responses[1].json();
      let transLitJson: AlQuranSurahResponse | null = null;
      if (responses[2]) transLitJson = await responses[2].json();

      if (arJson.code === 200 && trJson.code === 200) {
        const merged: Ayah[] = arJson.data.ayahs.map((a, i) => ({
          number: a.numberInSurah,
          arabic: a.text,
          translation: trJson.data.ayahs[i]?.text ?? "",
          transliteration: transLitJson?.code === 200 ? transLitJson.data.ayahs[i]?.text : undefined,
        }));
        setAyahs(merged);
        saveReadingProgress(num, page);
        cacheSurah(num, lang, withTranslit, merged).then(() => refreshCachedSurahs()).catch(() => {});
      } else {
        setLoadError(t("islamic.quran.load_error"));
      }
    } catch {
      setLoadError(t("islamic.quran.network_error"));
    } finally {
      setLoadingAyahs(false);
    }
  }, [language, audioStore.transliterationEnabled, refreshCachedSurahs]);

  const handleSearch = useCallback(async () => {
    if (!search || search.length < 3) return;
    setSearchLoading(true);
    setSearchResults([]);
    setSearchFromCache(false);
    setSearchDone(false);
    try {
      const res = await fetch(`https://api.alquran.cloud/v1/search/${encodeURIComponent(search)}/all/${language}`);
      const json: AlQuranSearchResponse = await res.json();
      if (json.code === 200 && json.data?.matches) {
        setSearchResults(json.data.matches.slice(0, 20).map((m) => ({
          surah: m.surah.number, ayah: m.numberInSurah, text: m.text,
        })));
        return;
      }
      const offlineResults = await searchCachedSurahs(search, language);
      if (offlineResults.length > 0) {
        setSearchResults(offlineResults);
        setSearchFromCache(true);
      }
    } catch {
      const offlineResults = await searchCachedSurahs(search, language);
      if (offlineResults.length > 0) {
        setSearchResults(offlineResults);
        setSearchFromCache(true);
      }
    } finally {
      setSearchLoading(false);
      setSearchDone(true);
    }
  }, [search, language]);

  const handleLanguageChange = useCallback((code: string) => {
    setLanguage(code);
    try { localStorage.setItem("quran_language", code); } catch {}
    if (selectedSurah !== null) loadSurah(selectedSurah, 1, code);
  }, [selectedSurah, loadSurah]);

  const handleFontSizeChange = useCallback((size: string) => {
    setFontSize(size);
    try { localStorage.setItem(LS_FONT_SIZE_KEY, size); } catch {}
  }, []);

  const playAyahAudio = useCallback(async (surahNum: number, ayahNum: number) => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    cancelTTS();
    ttsCancel.current?.cancel();

    if (audioStore.currentAyah === ayahNum && audioStore.isPlaying) {
      audioStore.setPlaying(false);
      audioStore.setCurrentTrack(surahNum, 0, "", "");
      audioStore.stop();
      clearMediaSession();
      return;
    }

    const surahInfo = QURAN_SURAHS.find(s => s.number === surahNum);
    const reciterInfo = RECITERS.find(r => r.id === audioStore.reciterId);
    audioStore.setLoading(true);
    audioStore.setCurrentTrack(surahNum, ayahNum, surahInfo?.nameFr ?? "", surahInfo?.nameAr ?? "");

    const mode = audioStore.audioMode;

    const playNextAyah = (nextNum: number) => {
      const nextAyah = ayahs.find(a => a.number === nextNum);
      if (nextAyah) {
        playAyahAudio(surahNum, nextAyah.number);
      } else if (audioStore.continuousPlay) {
        const nextSurahNum = surahNum + 1;
        if (nextSurahNum <= 114) {
          loadSurah(nextSurahNum).then(() => {
            setTimeout(() => playAyahAudio(nextSurahNum, 1), 500);
          });
        }
      } else {
        audioStore.stop();
        clearMediaSession();
      }
    };

    setupMediaSession({
      title: `${surahInfo?.nameFr} — Verset ${ayahNum}`,
      artist: reciterInfo?.name ?? "Réciteur",
      album: "Quran",
      onPlay: () => {
        if (audioRef.current) audioRef.current.play();
        audioStore.setPlaying(true);
      },
      onPause: () => {
        if (audioRef.current) audioRef.current.pause();
        cancelTTS();
        audioStore.setPlaying(false);
      },
      onNextTrack: () => playNextAyah(ayahNum + 1),
      onPreviousTrack: () => {
        if (ayahNum > 1) playAyahAudio(surahNum, ayahNum - 1);
      },
    });

    if (mode === "tts_only") {
      audioStore.setLoading(false);
      audioStore.setPlaying(true);
      const currentAyah = ayahs.find(a => a.number === ayahNum);
      if (currentAyah) {
        speakText(currentAyah.translation, getTTSLang(language), {
          rate: 0.9,
          onEnd: () => playNextAyah(ayahNum + 1),
          onError: () => { audioStore.stop(); },
        });
      }
      return;
    }

    try {
      const res = await fetchWithRetry(`https://api.alquran.cloud/v1/ayah/${surahNum}:${ayahNum}/${audioStore.reciterId}`);
      const json = await res.json();
      if (json.code === 200 && json.data?.audio) {
        const audio = new Audio(json.data.audio);
        audioRef.current = audio;
        audioStore.setAudioElement(audio);
        audio.ontimeupdate = () => {
          audioStore.setProgress(audio.currentTime, audio.duration || 0);
        };
        audio.onended = () => {
          if (mode === "arabic_tts") {
            const currentAyah = ayahs.find(a => a.number === ayahNum);
            if (currentAyah) {
              speakText(currentAyah.translation, getTTSLang(language), {
                rate: 0.9,
                onEnd: () => {
                  setTimeout(() => playNextAyah(ayahNum + 1), 300);
                },
                onError: () => playNextAyah(ayahNum + 1),
              });
              return;
            }
          }
          playNextAyah(ayahNum + 1);
        };
        audio.onerror = () => {
          audioStore.stop();
          toast.error("Erreur audio");
        };
        audio.onerror = () => { setAudioPlaying(false); setAudioAyah(null); toast.error(t("islamic.quran.audio_error")); };
        await audio.play();
        audioStore.setPlaying(true);
        audioStore.setLoading(false);
      } else {
        toast.error(t("islamic.quran.audio_unavailable"));
        setAudioAyah(null);
      }
    } catch {
      toast.error(t("islamic.quran.audio_error"));
      setAudioAyah(null);
    } finally {
      setAudioLoading(false);
    }
  }, [audioStore, ayahs, language, loadSurah]);

  useEffect(() => {
    if (audioStore.currentSurah === null || audioStore.currentAyah === null) {
      audioStore.setPlaybackCallbacks(null, null);
      return;
    }
    const surah = audioStore.currentSurah;
    const ayah = audioStore.currentAyah;
    const onNext = () => {
      const nextAyah = ayahs.find(a => a.number === ayah + 1);
      if (nextAyah) {
        playAyahAudio(surah, nextAyah.number);
      }
    };
    const onPrev = () => {
      if (ayah > 1) {
        playAyahAudio(surah, ayah - 1);
      }
    };
    audioStore.setPlaybackCallbacks(onNext, onPrev);
  }, [audioStore.currentSurah, audioStore.currentAyah, ayahs, playAyahAudio]);

  const stopAudio = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    audioStore.setAudioElement(null);
    cancelTTS();
    ttsCancel.current?.cancel();
    audioStore.stop();
    clearMediaSession();
  }, [audioStore]);

  const loadTafsir = useCallback(async (surahNum: number, ayahNum: number) => {
    if (showTafsir === ayahNum) { setShowTafsir(null); return; }
    setShowTafsir(ayahNum);
    setTafsirLoading(true);
    setTafsirText("");
    const tafsirEditions = ["en.ibn-kathir", "en.jalalayn", language];
    let found = false;
    for (const edition of tafsirEditions) {
      try {
        const res = await fetchWithRetry(`https://api.alquran.cloud/v1/ayah/${surahNum}:${ayahNum}/${edition}`);
        const json = await res.json();
        if (json.code === 200 && json.data?.text) {
          setTafsirText(json.data.text);
          found = true;
          break;
        }
      } catch {
        continue;
      }
    }
    if (!found) setTafsirText("Tafsir non disponible pour ce verset.");
    setTafsirLoading(false);
  }, [showTafsir, language]);

  const toggleBookmark = useCallback((surahNum: number, ayahNum: number) => {
    setBookmarks(prev => {
      const exists = prev.some(b => b.surah === surahNum && b.ayah === ayahNum);
      const surahInfo = QURAN_SURAHS.find(s => s.number === surahNum);
      const updated = exists
        ? prev.filter(b => !(b.surah === surahNum && b.ayah === ayahNum))
        : [...prev, { surah: surahNum, ayah: ayahNum, name: `${surahInfo?.nameFr} ${surahNum}:${ayahNum}`, savedAt: new Date().toISOString() }];
      saveBookmarks(updated);
      toast.success(exists ? t("islamic.quran.bookmark_removed") : t("islamic.quran.bookmark_added"));
      return updated;
    });
  }, []);

  const totalPages = Math.ceil(ayahs.length / AYAHS_PER_PAGE);
  const paginatedAyahs = ayahs.slice((currentPage - 1) * AYAHS_PER_PAGE, currentPage * AYAHS_PER_PAGE);

  if (showFavorites) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setShowFavorites(false)} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${GOLD}18` }}>
            <ChevronLeft size={18} style={{ color: GOLD }} />
          </button>
          <div className="flex-1">
            <h2 className="text-base font-bold" style={{ color: GOLD }}>{t("islamic.quran.favorite_verses")}</h2>
            <p className="text-xs text-muted-foreground">{favorites.length} {favorites.length !== 1 ? t("islamic.quran.verses") : t("islamic.quran.verse")}</p>
          </div>
        </div>
        {favorites.length === 0 && (
          <div className="text-center py-12">
            <Heart size={32} className="mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t("islamic.no_favorites")}</p>
          </div>
        )}
        {favorites.map(fav => (
          <div key={`${fav.surahNumber}-${fav.ayahNumber}`} className="rounded-2xl p-4" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
            <div className="flex items-center justify-between mb-2">
              <button onClick={() => loadSurah(fav.surahNumber)} className="text-[10px] font-bold" style={{ color: GOLD }}>
                {fav.surahName} — {t("islamic.quran.verse")} {fav.ayahNumber}
              </button>
              <button onClick={() => toggleFavorite(fav.surahNumber, fav.ayahNumber, fav.arabic, fav.translation)} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: `${GOLD}22` }}>
                <Heart size={14} fill={GOLD} style={{ color: GOLD }} />
              </button>
            </div>
            <p className={`text-right ${fontConfig.arabicClass} leading-loose mb-2`} style={{ fontFamily: "'Amiri', 'Traditional Arabic', serif", direction: "rtl" }}>{fav.arabic}</p>
            <p className={`${fontConfig.transClass} text-muted-foreground leading-relaxed`}>{fav.translation}</p>
          </div>
        ))}
      </div>
    );
  }

  if (showBookmarks) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setShowBookmarks(false)} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${GOLD}18` }}>
            <ChevronLeft size={18} style={{ color: GOLD }} />
          </button>
          <div className="flex-1">
            <h2 className="text-base font-bold" style={{ color: GOLD }}>{t("islamic.quran.bookmarks")}</h2>
            <p className="text-xs text-muted-foreground">{bookmarks.length} {t("islamic.quran.bookmarks").toLowerCase()}</p>
          </div>
        </div>
        {bookmarks.length === 0 && (
          <div className="text-center py-12">
            <Layers size={32} className="mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t("islamic.no_favorites")}</p>
          </div>
        )}
        {bookmarks.map(bm => (
          <button key={`${bm.surah}-${bm.ayah}`} onClick={() => { setShowBookmarks(false); loadSurah(bm.surah); }}
            className="w-full text-left rounded-2xl p-4 flex items-center gap-3" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
            <Layers size={16} style={{ color: GOLD }} />
            <div className="flex-1">
              <p className="text-sm font-semibold">{bm.name}</p>
              <p className="text-[10px] text-muted-foreground">{new Date(bm.savedAt).toLocaleDateString(locale)}</p>
            </div>
          </button>
        ))}
      </div>
    );
  }

  if (showOfflineManager) {
    const totalEstimatedBytes = offlineEntries.reduce((sum, e) => sum + e.estimatedSizeBytes, 0);
    const quotaWarning = storageQuota && storageQuota.percentUsed >= STORAGE_QUOTA_WARNING_PERCENT;
    const notPinnedCount = QURAN_SURAHS.filter(s => !cachedSurahStatus.pinned.has(s.number)).length;
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => { setShowOfflineManager(false); setBulkSelectMode(false); setBulkSelected(new Set()); }} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${GOLD}18` }}>
            <ChevronLeft size={18} style={{ color: GOLD }} />
          </button>
          <div className="flex-1">
            <h2 className="text-base font-bold" style={{ color: GOLD }}>Sourates hors-ligne</h2>
            <p className="text-xs text-muted-foreground">
              {offlineEntries.length} sourate{offlineEntries.length !== 1 ? "s" : ""} en cache
              {offlineEntries.length > 0 && ` · ${formatStorageSize(totalEstimatedBytes)} utilisé`}
            </p>
          </div>
        </div>

        {quotaWarning && (
          <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: "hsl(0 80% 50% / 0.12)", border: "1px solid hsl(0 80% 50% / 0.25)" }}>
            <Layers size={14} style={{ color: "hsl(0 80% 50%)" }} />
            <div className="flex-1 min-w-0">
              <span className="text-xs font-medium" style={{ color: "hsl(0 80% 50%)" }}>
                Stockage presque plein — {storageQuota.percentUsed.toFixed(0)}% utilisé
              </span>
              <p className="text-[10px]" style={{ color: "hsl(0 80% 50% / 0.7)" }}>
                {formatStorageSize(storageQuota.usageBytes)} / {formatStorageSize(storageQuota.quotaBytes)}. Supprimez des sourates pour libérer de l'espace.
              </p>
            </div>
          </div>
        )}

        {storageQuota && !quotaWarning && offlineEntries.length > 0 && (
          <div className="rounded-xl px-3 py-2" style={{ background: `${GOLD}08`, border: `1px solid ${GOLD}22` }}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-muted-foreground">Stockage navigateur</span>
              <span className="text-[10px] text-muted-foreground">{storageQuota.percentUsed.toFixed(1)}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: `${GOLD}18` }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(storageQuota.percentUsed, 100)}%`, background: GOLD }} />
            </div>
          </div>
        )}

        {bulkDownloadProgress !== null && (
          <div className="rounded-2xl p-4 space-y-3" style={{ background: "hsl(var(--card))", border: `1px solid ${GOLD}44` }}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold" style={{ color: GOLD }}>
                Téléchargement en cours...
              </p>
              <button onClick={cancelBulkDownload} className="flex items-center gap-1 text-[10px] font-semibold" style={{ color: "hsl(0 80% 50%)" }}>
                <XCircle size={12} /> Annuler
              </button>
            </div>
            <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: `${GOLD}18` }}>
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  background: GOLD,
                  width: `${Math.round((bulkDownloadProgress.completed / bulkDownloadProgress.total) * 100)}%`,
                }}
              />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-muted-foreground">
                {bulkDownloadProgress.completed} / {bulkDownloadProgress.total} sourate{bulkDownloadProgress.total !== 1 ? "s" : ""}
                {bulkDownloadProgress.failed > 0 && ` (${bulkDownloadProgress.failed} échouée${bulkDownloadProgress.failed !== 1 ? "s" : ""})`}
              </p>
              <p className="text-[10px] font-semibold" style={{ color: GOLD }}>
                {Math.round((bulkDownloadProgress.completed / bulkDownloadProgress.total) * 100)}%
              </p>
            </div>
            {downloadingSurah !== null && (
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Loader2 size={10} className="animate-spin" style={{ color: GOLD }} />
                {QURAN_SURAHS.find(s => s.number === downloadingSurah)?.nameFr ?? `Sourate ${downloadingSurah}`}
              </p>
            )}
          </div>
        )}

        {bulkDownloadProgress === null && isOnline && notPinnedCount > 0 && (
          <div className="flex gap-2">
            <button
              onClick={() => startBulkDownload(QURAN_SURAHS.map(s => s.number))}
              className="flex-1 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2"
              style={{ background: `${GOLD}22`, color: GOLD, border: `1px solid ${GOLD}44` }}
            >
              <Download size={14} /> Tout télécharger ({notPinnedCount})
            </button>
            <button
              onClick={() => { setBulkSelectMode(!bulkSelectMode); setBulkSelected(new Set()); }}
              className="py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2"
              style={{ background: bulkSelectMode ? `${GOLD}33` : `${GOLD}18`, color: GOLD, border: `1px solid ${GOLD}44` }}
            >
              <CheckSquare size={14} /> Sélectionner
            </button>
          </div>
        )}

        {bulkSelectMode && bulkSelected.size > 0 && (
          <button
            onClick={() => startBulkDownload([...bulkSelected])}
            className="w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2"
            style={{ background: GOLD, color: NAVY }}
          >
            <Download size={14} /> Télécharger {bulkSelected.size} sourate{bulkSelected.size !== 1 ? "s" : ""}
          </button>
        )}

        {offlineEntries.length === 0 && bulkDownloadProgress === null && (
          <div className="text-center py-12">
            <Download size={32} className="mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Aucune sourate téléchargée</p>
            <p className="text-xs text-muted-foreground mt-1">Téléchargez des sourates pour y accéder sans connexion</p>
          </div>
        )}

        {bulkSelectMode && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              Sélectionnez les sourates à télécharger
            </p>
            {QURAN_SURAHS.filter(s => !cachedSurahStatus.pinned.has(s.number)).map(s => {
              const isSelected = bulkSelected.has(s.number);
              return (
                <button
                  key={s.number}
                  onClick={() => toggleBulkSelect(s.number)}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-colors hover:bg-muted/30"
                  style={{ background: isSelected ? `${GOLD}12` : "hsl(var(--card))", border: isSelected ? `1px solid ${GOLD}44` : "1px solid hsl(var(--border))" }}
                >
                  {isSelected ? (
                    <CheckSquare size={18} style={{ color: GOLD }} />
                  ) : (
                    <Square size={18} className="text-muted-foreground" />
                  )}
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-bold" style={{ background: `${GOLD}18`, color: GOLD }}>
                    {s.number}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold">{s.nameFr}</span>
                    <span className="text-[11px] text-muted-foreground ml-2" style={{ fontFamily: "serif" }}>{s.nameAr}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {!bulkSelectMode && offlineEntries.map(entry => {
          const surahInfo = QURAN_SURAHS.find(s => s.number === entry.surahNumber);
          return (
            <div key={entry.surahNumber} className="rounded-2xl p-4 flex items-center gap-3" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold" style={{ background: `${GOLD}18`, color: GOLD }}>
                {entry.surahNumber}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold">{surahInfo?.nameFr ?? `Sourate ${entry.surahNumber}`}</span>
                  <span className="text-[11px] text-muted-foreground" style={{ fontFamily: "serif" }}>{surahInfo?.nameAr}</span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {entry.ayahCount} versets · {formatStorageSize(entry.estimatedSizeBytes)}{entry.pinned ? " · Téléchargé" : " · Cache auto"} · {new Date(entry.cachedAt).toLocaleDateString("fr-FR")}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowOfflineManager(false);
                  loadSurah(entry.surahNumber);
                }}
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: `${GOLD}18` }}
              >
                <BookOpen size={14} style={{ color: GOLD }} />
              </button>
              <button
                onClick={() => handleRemoveCached(entry.surahNumber)}
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: "hsl(0 80% 50% / 0.12)" }}
              >
                <span className="text-xs font-bold" style={{ color: "hsl(0 80% 50%)" }}>×</span>
              </button>
            </div>
          );
        })}
      </div>
    );
  }

  if (selectedSurah !== null) {
    const surahInfo = QURAN_SURAHS.find(s => s.number === selectedSurah);
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => { setSelectedSurah(null); setAyahs([]); setLoadError(null); stopAudio(); }} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${GOLD}18` }}>
            <ChevronLeft size={18} style={{ color: GOLD }} />
          </button>
          <div className="flex-1">
            <h2 className="text-base font-bold" style={{ color: GOLD }}>{surahInfo?.number}. {surahInfo?.nameFr}</h2>
            <p className="text-xs text-muted-foreground">{surahInfo?.nameAr} — {surahInfo?.versesCount} {t("islamic.quran.verses")} — {surahInfo?.revelationType}</p>
          </div>
          <button onClick={() => setShowFontSettings(!showFontSettings)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${GOLD}18` }}>
            <Type size={14} style={{ color: GOLD }} />
          </button>
          <a href={`https://quran.com/${selectedSurah}`} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${GOLD}18` }}>
            <ExternalLink size={14} style={{ color: GOLD }} />
          </a>
          <button
            onClick={async () => {
              if (!surahInfo) return;
              toast.info("Downloading...");
              try {
                await downloadBrandedQuranAudio({
                  surahNumber: surahInfo.number,
                  surahNameArabic: surahInfo.nameAr,
                  surahNameTranslit: surahInfo.nameFr,
                  reciterName: RECITERS.find(r => r.id === reciter)?.name || "Reciter",
                  reciterIdentifier: reciter,
                  onProgress: (p) => { if (p === 100) toast.success("Download complete"); },
                });
              } catch { toast.error("Download failed"); }
            }}
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: `${GOLD}18` }}
            title="Download audio"
          >
            <Download size={14} style={{ color: GOLD }} />
          </button>
        </div>
        {(!isOnline || servedFromCache) && (
          <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: "hsl(45 90% 50% / 0.12)", border: "1px solid hsl(45 90% 50% / 0.25)" }}>
            <WifiOff size={14} style={{ color: "hsl(45 90% 50%)" }} />
            <span className="text-xs font-medium" style={{ color: "hsl(45 90% 50%)" }}>
              {servedFromCache ? "Lecture hors-ligne — données en cache" : "Vous êtes hors-ligne"}
            </span>
          </div>
        )}

        <div className="flex justify-end">
          <ShareButtons type="quran" slug={String(selectedSurah)} title={`Sourate ${surahInfo?.nameFr || selectedSurah} — Le Saint Coran`} />
        </div>

        <div className="rounded-xl p-3 space-y-2" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-1"><Volume2 size={10} /> {t("islamic.quran.audio_player")}</p>
            {audioPlaying && (
              <button onClick={stopAudio} className="text-[10px] font-semibold text-destructive flex items-center gap-1">
                <VolumeX size={10} /> {t("islamic.quran.stop_audio")}
              </button>
            )}
          </div>
          <select value={audioStore.reciterId} onChange={e => {
            const r = RECITERS.find(rc => rc.id === e.target.value);
            audioStore.setReciter(e.target.value, r?.name ?? "");
          }} className="w-full text-[11px] rounded-lg border border-border bg-background px-2 py-1.5">
            {RECITERS.map(r => (
              <option key={r.id} value={r.id}>{r.name} — {r.nameAr}</option>
            ))}
          </select>

          <select value={audioStore.audioMode} onChange={e => audioStore.setAudioMode(e.target.value as AudioMode)}
            className="w-full text-[11px] rounded-lg border border-border bg-background px-2 py-1.5">
            {AUDIO_MODES.map(m => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-[10px]">
              <input type="checkbox" checked={audioStore.continuousPlay} onChange={e => audioStore.setContinuousPlay(e.target.checked)}
                className="rounded" />
              <span>Lecture continue</span>
            </label>
            <label className="flex items-center gap-1.5 text-[10px]">
              <input type="checkbox" checked={audioStore.transliterationEnabled}
                onChange={e => { audioStore.setTransliteration(e.target.checked); if (selectedSurah) loadSurah(selectedSurah, currentPage); }}
                className="rounded" />
              <span>Translitération</span>
            </label>
          </div>

          {audioStore.currentAyah !== null && (
            <p className="text-[10px] text-center" style={{ color: GOLD }}>
              {audioLoading ? t("islamic.loading") : `${t("islamic.quran.playing_verse")} ${audioAyah}`}
            </p>
          )}
        </div>

        {showFontSettings && (
          <div className="flex gap-2">
            {FONT_SIZES.map(f => (
              <button key={f.id} onClick={() => handleFontSizeChange(f.id)}
                className="flex-1 py-2 rounded-xl text-xs font-semibold"
                style={{ background: fontSize === f.id ? `${GOLD}22` : "hsl(var(--muted)/0.3)", color: fontSize === f.id ? GOLD : "hsl(var(--muted-foreground))", border: fontSize === f.id ? `1px solid ${GOLD}44` : "1px solid transparent" }}>
                {t(f.labelKey)}
              </button>
            ))}
          </div>
        )}

        {loadingAyahs && (
          <div className="flex flex-col items-center gap-3 py-12">
            <Loader2 size={24} className="animate-spin" style={{ color: GOLD }} />
          </div>
        )}

        {loadError && !loadingAyahs && (
          <div className="text-center py-8 space-y-3">
            <p className="text-sm text-destructive">{loadError}</p>
            <button onClick={() => loadSurah(selectedSurah)} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold" style={{ background: `${GOLD}22`, color: GOLD }}>
              <RefreshCw size={14} /> {t("islamic.retry")}
            </button>
          </div>
        )}

        {!loadingAyahs && !loadError && paginatedAyahs.length > 0 && (
          <>
            <div className="space-y-4">
              {paginatedAyahs.map(a => {
                const faved = isFavorite(selectedSurah, a.number);
                const isPlayingThis = audioStore.currentAyah === a.number && audioStore.isPlaying;
                const isBookmarked = bookmarks.some(b => b.surah === selectedSurah && b.ayah === a.number);
                const isTafsirOpen = showTafsir === a.number;
                return (
                  <div
                    key={a.number}
                    ref={el => { if (el) ayahScrollRef.current.set(a.number, el); }}
                    className="rounded-2xl p-4 transition-all duration-300"
                    style={{
                      background: isPlayingThis ? `linear-gradient(135deg, ${NAVY} 0%, hsl(226 22% 18%) 100%)` : "hsl(var(--card))",
                      border: isPlayingThis ? `2px solid ${GOLD}` : "1px solid hsl(var(--border))",
                      boxShadow: isPlayingThis ? `0 0 20px ${GOLD}22` : undefined,
                    }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: `${GOLD}22`, color: GOLD }}>{a.number}</span>
                      <div className="flex gap-1">
                        <button onClick={() => playAyahAudio(selectedSurah, a.number)} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: isPlayingThis ? `${GOLD}33` : "transparent" }}>
                          {audioStore.isLoading && audioStore.currentAyah === a.number
                            ? <Loader2 size={12} className="animate-spin" style={{ color: GOLD }} />
                            : isPlayingThis
                              ? <Pause size={12} style={{ color: GOLD }} />
                              : <Play size={12} className="text-muted-foreground" />
                          }
                        </button>
                        <button onClick={() => loadTafsir(selectedSurah, a.number)} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: isTafsirOpen ? `${GOLD}22` : "transparent" }}>
                          <MessageSquare size={12} style={{ color: isTafsirOpen ? GOLD : "hsl(var(--muted-foreground))" }} />
                        </button>
                        <button onClick={() => toggleBookmark(selectedSurah, a.number)} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: isBookmarked ? `${GOLD}22` : "transparent" }}>
                          <Layers size={12} style={{ color: isBookmarked ? GOLD : "hsl(var(--muted-foreground))" }} />
                        </button>
                        <button onClick={() => copyVerse(a.arabic, a.translation, selectedSurah, a.number)} className="w-7 h-7 rounded-full flex items-center justify-center"><Copy size={12} className="text-muted-foreground" /></button>
                        <button onClick={() => shareVerse(a.arabic, a.translation, selectedSurah, a.number, a.transliteration)} className="w-7 h-7 rounded-full flex items-center justify-center"><Share2 size={12} className="text-muted-foreground" /></button>
                        <button onClick={() => toggleFavorite(selectedSurah, a.number, a.arabic, a.translation)} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: faved ? `${GOLD}22` : "transparent" }}>
                          <Heart size={14} fill={faved ? GOLD : "none"} style={{ color: faved ? GOLD : "hsl(var(--muted-foreground))" }} />
                        </button>
                      </div>
                    </div>
                    <p className={`text-right ${fontConfig.arabicClass} leading-loose mb-3`} style={{ fontFamily: "'Amiri', 'Traditional Arabic', serif", direction: "rtl" }}>{a.arabic}</p>
                    {a.transliteration && audioStore.transliterationEnabled && (
                      <p className="text-[11px] italic text-muted-foreground leading-relaxed mb-2">{a.transliteration}</p>
                    )}
                    <p className={`${fontConfig.transClass} text-muted-foreground leading-relaxed`}>{a.translation}</p>

                    {isTafsirOpen && (
                      <div className="mt-3 pt-3 border-t" style={{ borderColor: `${GOLD}22` }}>
                        <p className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: GOLD }}>Tafsir / Explication</p>
                        {tafsirLoading ? (
                          <Loader2 size={14} className="animate-spin" style={{ color: GOLD }} />
                        ) : (
                          <p className="text-xs text-muted-foreground leading-relaxed">{tafsirText}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-2">
                <button onClick={() => { setCurrentPage(p => Math.max(1, p - 1)); saveReadingProgress(selectedSurah, Math.max(1, currentPage - 1)); }} disabled={currentPage <= 1}
                  className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${GOLD}18`, opacity: currentPage <= 1 ? 0.3 : 1 }}>
                  <ChevronLeft size={16} style={{ color: GOLD }} />
                </button>
                <span className="text-xs font-semibold" style={{ color: GOLD }}>Page {currentPage}/{totalPages}</span>
                <button onClick={() => { setCurrentPage(p => Math.min(totalPages, p + 1)); saveReadingProgress(selectedSurah, Math.min(totalPages, currentPage + 1)); }} disabled={currentPage >= totalPages}
                  className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${GOLD}18`, opacity: currentPage >= totalPages ? 0.3 : 1 }}>
                  <ChevronRight size={16} style={{ color: GOLD }} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-lg font-bold mb-1" style={{ color: GOLD }}>{t("islamic.quran.title")}</h2>
        <p className="text-xs text-muted-foreground">{t("islamic.quran.subtitle")}</p>
      </div>

      {!isOnline && (
        <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: "hsl(45 90% 50% / 0.12)", border: "1px solid hsl(45 90% 50% / 0.25)" }}>
          <WifiOff size={14} style={{ color: "hsl(45 90% 50%)" }} />
          <span className="text-xs font-medium" style={{ color: "hsl(45 90% 50%)" }}>
            Hors-ligne — seules les sourates en cache sont disponibles
          </span>
        </div>
      )}

      {bulkProgress && !bulkProgress.done && bulkProgress.total > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl px-3 py-2.5 space-y-1.5"
          style={{ background: `${GOLD}08`, border: `1px solid ${GOLD}22` }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Loader2 size={12} className="animate-spin" style={{ color: GOLD }} />
              <span className="text-[11px] font-semibold" style={{ color: GOLD }}>
                Téléchargement favoris/marque-pages
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground">
              {bulkProgress.completed + bulkProgress.failed}/{bulkProgress.total}
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: `${GOLD}15` }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: GOLD }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.round(((bulkProgress.completed + bulkProgress.failed) / bulkProgress.total) * 100)}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          {bulkProgress.current && (
            <p className="text-[10px] text-muted-foreground">
              {QURAN_SURAHS.find(s => s.number === bulkProgress.current)?.nameFr ?? `Sourate ${bulkProgress.current}`}...
            </p>
          )}
        </motion.div>
      )}

      {bulkProgress?.done && bulkProgress.total > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl px-3 py-2.5 space-y-2"
          style={{
            background: bulkProgress.completed > 0 ? "hsl(142 71% 45% / 0.08)" : "hsl(0 80% 50% / 0.08)",
            border: bulkProgress.completed > 0 ? "1px solid hsl(142 71% 45% / 0.22)" : "1px solid hsl(0 80% 50% / 0.22)",
          }}
        >
          <div className="flex items-center gap-2">
            {bulkProgress.completed > 0 ? (
              <BookOpenCheck size={14} style={{ color: "hsl(142 71% 45%)" }} />
            ) : (
              <WifiOff size={14} style={{ color: "hsl(0 80% 50%)" }} />
            )}
            <span className="text-[11px] font-medium flex-1" style={{ color: bulkProgress.completed > 0 ? "hsl(142 71% 45%)" : "hsl(0 80% 50%)" }}>
              {bulkProgress.completed > 0
                ? `${bulkProgress.completed} sourate${bulkProgress.completed !== 1 ? "s" : ""} téléchargée${bulkProgress.completed !== 1 ? "s" : ""} pour hors-ligne`
                : "Échec du téléchargement"}
              {bulkProgress.failed > 0 && bulkProgress.completed > 0 && ` · ${bulkProgress.failed} échouée${bulkProgress.failed !== 1 ? "s" : ""}`}
            </span>
            <button
              onClick={() => setBulkProgress(null)}
              className="text-[10px] font-bold"
              style={{ color: bulkProgress.completed > 0 ? "hsl(142 71% 45%)" : "hsl(0 80% 50%)" }}
            >
              ✕
            </button>
          </div>
          {bulkProgress.failed > 0 && bulkProgress.failedSurahs.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={retryFailedBulkDownload}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors"
                style={{ background: `${GOLD}22`, color: GOLD, border: `1px solid ${GOLD}44` }}
              >
                <RefreshCw size={12} />
                Réessayer {bulkProgress.failed} échouée{bulkProgress.failed !== 1 ? "s" : ""}
              </button>
              <span className="text-[10px] text-muted-foreground">
                {bulkProgress.failedSurahs.map(n => QURAN_SURAHS.find(s => s.number === n)?.nameFr ?? `S${n}`).join(", ")}
              </span>
            </div>
          )}
        </motion.div>
      )}

      {verseOfDay && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl p-5"
          style={{
            background: `linear-gradient(135deg, ${NAVY} 0%, hsl(226 22% 18%) 100%)`,
            border: `1px solid ${GOLD}44`,
            boxShadow: `0 8px 32px ${GOLD}18`,
          }}
        >
          <p className="text-[10px] uppercase tracking-widest mb-2 text-center flex items-center justify-center gap-1" style={{ color: `${GOLD}99` }}>
            <Sparkles size={10} /> {t("islamic.quran.verse_of_day")} — {verseOfDay.theme}
          </p>
          <p className="text-base text-right leading-loose mb-3" style={{ fontFamily: "'Amiri', 'Traditional Arabic', serif", color: "#fff", direction: "rtl" }}>
            {verseOfDay.arabic}
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed mb-2">{verseOfDay.translation}</p>
          <p className="text-[10px] text-center" style={{ color: `${GOLD}99` }}>— {verseOfDay.ref}</p>
        </motion.div>
      )}
      {vodLoading && (
        <div className="text-center py-4"><Loader2 size={16} className="animate-spin mx-auto" style={{ color: GOLD }} /></div>
      )}

      <div>
        <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1 block">{t("islamic.quran.translation_lang")}</label>
        <select value={language} onChange={e => handleLanguageChange(e.target.value)} className="w-full text-xs rounded-lg border border-border bg-card px-2 py-2">
          {QURAN_LANGUAGES.map(l => (
            <option key={l.code} value={l.code}>{l.native}</option>
          ))}
        </select>
      </div>

      {recentlyRead.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">Récemment lu</p>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {recentlyRead.map(r => (
              <button key={r.surah} onClick={() => loadSurah(r.surah)}
                className="shrink-0 px-3 py-1.5 rounded-xl text-[10px] font-semibold"
                style={{ background: `${GOLD}18`, color: GOLD, border: `1px solid ${GOLD}33` }}>
                {r.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {readingProgress && (
        <button onClick={() => loadSurah(readingProgress.surah, readingProgress.page)}
          className="w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2"
          style={{ background: `${GOLD}18`, color: GOLD, border: `1px solid ${GOLD}33` }}>
          <BookOpen size={14} />
          {t("islamic.quran.continue_reading")} — {QURAN_SURAHS.find(s => s.number === readingProgress.surah)?.nameFr ?? t("islamic.quran.surah")} (p.{readingProgress.page})
        </button>
      )}

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSearch()}
            placeholder={t("islamic.quran.search_surah")} className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-card text-sm" />
        </div>
        <button onClick={() => setShowFavorites(true)} className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 relative" style={{ background: `${GOLD}18`, border: `1px solid ${GOLD}33` }}>
          <Heart size={18} style={{ color: GOLD }} fill={favorites.length > 0 ? GOLD : "none"} />
          {favorites.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold" style={{ background: GOLD, color: NAVY }}>{favorites.length > 99 ? "99+" : favorites.length}</span>
          )}
        </button>
        <button onClick={() => setShowBookmarks(true)} className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${GOLD}18`, border: `1px solid ${GOLD}33` }}>
          <Layers size={18} style={{ color: GOLD }} />
        </button>
        <button onClick={openOfflineManager} className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 relative" style={{ background: `${GOLD}18`, border: `1px solid ${GOLD}33` }}>
          <Download size={18} style={{ color: GOLD }} />
          {cachedSurahStatus.cached.size > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold" style={{ background: GOLD, color: NAVY }}>{cachedSurahStatus.cached.size > 99 ? "99+" : cachedSurahStatus.cached.size}</span>
          )}
        </button>
      </div>

      {search.length >= 3 && (
        <button onClick={handleSearch} className="w-full py-2 rounded-xl text-xs font-semibold" style={{ background: `${GOLD}22`, color: GOLD }} disabled={searchLoading}>
          {searchLoading ? t("islamic.quran.searching") : t("islamic.quran.search_translations")}
        </button>
      )}

      {searchDone && !searchLoading && searchResults.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-2xl px-4 py-5 text-center" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
          <SearchX size={28} className="text-muted-foreground" style={{ opacity: 0.5 }} />
          <p className="text-sm font-semibold text-muted-foreground">Aucun résultat trouvé</p>
          {!isOnline ? (
            <p className="text-xs text-muted-foreground leading-relaxed">
              Vous êtes hors-ligne — la recherche est limitée aux sourates en cache. Mettez plus de sourates en cache ou reconnectez-vous pour une recherche complète.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground leading-relaxed">
              Aucune correspondance pour « {search} ». Essayez avec d'autres termes.
            </p>
          )}
        </div>
      )}

      {searchResults.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{t("islamic.quran.results")} ({searchResults.length})</h3>
          {searchResults.map((r, i) => (
            <button key={i} onClick={() => loadSurah(r.surah)} className="w-full text-left rounded-2xl p-3" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
              <p className="text-[10px] font-bold" style={{ color: GOLD }}>{t("islamic.quran.surah")} {r.surah}, {t("islamic.quran.verse")} {r.ayah}</p>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.text}</p>
            </button>
          ))}
        </div>
      )}

      {bulkDownloadProgress !== null && (
        <div className="rounded-2xl p-3 space-y-2" style={{ background: "hsl(var(--card))", border: `1px solid ${GOLD}44` }}>
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold flex items-center gap-1" style={{ color: GOLD }}>
              <Loader2 size={10} className="animate-spin" />
              Téléchargement {bulkDownloadProgress.completed}/{bulkDownloadProgress.total}
            </p>
            <button onClick={cancelBulkDownload} className="flex items-center gap-1 text-[10px] font-semibold" style={{ color: "hsl(0 80% 50%)" }}>
              <XCircle size={10} /> Annuler
            </button>
          </div>
          <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: `${GOLD}18` }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ background: GOLD, width: `${Math.round((bulkDownloadProgress.completed / bulkDownloadProgress.total) * 100)}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex gap-2">
        {(["surah", "juz"] as const).map(mode => (
          <button key={mode} onClick={() => setBrowseMode(mode)}
            className="flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-wide"
            style={{ background: browseMode === mode ? `${GOLD}22` : "hsl(var(--muted)/0.3)", color: browseMode === mode ? GOLD : "hsl(var(--muted-foreground))", border: browseMode === mode ? `1px solid ${GOLD}44` : "1px solid transparent" }}>
            {mode === "surah" ? t("islamic.quran.surahs_label") : t("islamic.quran.juz_label")}
          </button>
        ))}
      </div>

      {browseMode === "juz" ? (
        <div className="space-y-1.5">
          {QURAN_JUZ.map(j => {
            const startSurah = QURAN_SURAHS.find(s => s.number === j.startSurah);
            const endSurah = QURAN_SURAHS.find(s => s.number === j.endSurah);
            return (
              <button key={j.number} onClick={() => loadSurah(j.startSurah)} className="w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-colors hover:bg-muted/30" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold" style={{ background: `${GOLD}18`, color: GOLD }}>{j.number}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold">Juz {j.number}</span>
                    <span className="text-[11px]" style={{ fontFamily: "'Amiri', 'Traditional Arabic', serif", color: `${GOLD}99` }}>{j.nameAr}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {startSurah?.nameFr} {j.startAyah} → {endSurah?.nameFr} {j.endAyah}
                  </p>
                </div>
                <BookOpen size={14} className="text-muted-foreground shrink-0" />
              </button>
            );
          })}
        </div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map(s => (
            <button key={s.number} onClick={() => loadSurah(s.number)} className="w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-colors hover:bg-muted/30" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold" style={{ background: `${GOLD}18`, color: GOLD }}>{s.number}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold">{s.nameFr}</span>
                  <span className="text-[11px] text-muted-foreground" style={{ fontFamily: "serif" }}>{s.nameAr}</span>
                </div>
                <p className="text-[10px] text-muted-foreground">{s.versesCount} {t("islamic.quran.verses")} · {s.revelationType}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
