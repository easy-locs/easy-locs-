import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ChevronLeft, ChevronRight, Loader2, ExternalLink, BookOpen, Heart, RefreshCw, Copy, Share2, Type, Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Layers, Sparkles } from "lucide-react";
import { QURAN_SURAHS } from "@/data/islamic/quran-surahs";
import { QURAN_JUZ, VERSE_OF_THE_DAY_POOL } from "@/data/islamic/quran-juz";
import { toast } from "sonner";

const GOLD = "hsl(var(--accent))";
const NAVY = "hsl(226 22% 14%)";
const LS_FAVORITES_KEY = "quran_verse_favorites";
const LS_READING_KEY = "quran_reading_progress";
const LS_FONT_SIZE_KEY = "quran_font_size";
const LS_BOOKMARKS_KEY = "quran_bookmarks";
const AYAHS_PER_PAGE = 50;

interface Bookmark {
  surah: number;
  ayah: number;
  name: string;
  savedAt: string;
}

function loadBookmarks(): Bookmark[] {
  try { const raw = localStorage.getItem(LS_BOOKMARKS_KEY); if (raw) return JSON.parse(raw); } catch {}
  return [];
}

function saveBookmarks(bm: Bookmark[]): void {
  try { localStorage.setItem(LS_BOOKMARKS_KEY, JSON.stringify(bm)); } catch {}
}

function getVerseOfTheDay(): typeof VERSE_OF_THE_DAY_POOL[0] {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / 86400000);
  return VERSE_OF_THE_DAY_POOL[dayOfYear % VERSE_OF_THE_DAY_POOL.length];
}

const QURAN_LANGUAGES = [
  { code: "fr.hamidullah", label: "Français", native: "Français" },
  { code: "en.sahih", label: "Anglais", native: "English" },
  { code: "en.yusufali", label: "Anglais (Yusuf Ali)", native: "English" },
  { code: "de.aburida", label: "Allemand", native: "Deutsch" },
  { code: "es.cortes", label: "Espagnol", native: "Español" },
  { code: "tr.ates", label: "Turc", native: "Türkçe" },
  { code: "ur.jalandhry", label: "Ourdou", native: "اردو" },
  { code: "id.indonesian", label: "Indonésien", native: "Bahasa Indonesia" },
  { code: "bn.bengali", label: "Bengali", native: "বাংলা" },
  { code: "ru.kuliev", label: "Russe", native: "Русский" },
  { code: "zh.majian", label: "Chinois", native: "中文" },
  { code: "fa.makarem", label: "Persan", native: "فارسی" },
  { code: "ms.basmeih", label: "Malais", native: "Bahasa Melayu" },
  { code: "nl.keyzer", label: "Néerlandais", native: "Nederlands" },
  { code: "it.piccardo", label: "Italien", native: "Italiano" },
  { code: "pt.elhayek", label: "Portugais", native: "Português" },
  { code: "sw.barwani", label: "Swahili", native: "Kiswahili" },
  { code: "bs.mlivo", label: "Bosniaque", native: "Bosanski" },
  { code: "sq.nahi", label: "Albanais", native: "Shqip" },
  { code: "az.musayev", label: "Azéri", native: "Azərbaycan" },
  { code: "so.abduh", label: "Somali", native: "Soomaali" },
  { code: "ha.gumi", label: "Haoussa", native: "Hausa" },
  { code: "ko.korean", label: "Coréen", native: "한국어" },
  { code: "ja.japanese", label: "Japonais", native: "日本語" },
  { code: "th.thai", label: "Thaï", native: "ไทย" },
  { code: "hi.hindi", label: "Hindi", native: "हिन्दी" },
  { code: "ta.tamil", label: "Tamoul", native: "தமிழ்" },
];

const FONT_SIZES = [
  { id: "small", label: "Petit", arabicClass: "text-base", transClass: "text-xs" },
  { id: "medium", label: "Moyen", arabicClass: "text-lg", transClass: "text-sm" },
  { id: "large", label: "Grand", arabicClass: "text-2xl", transClass: "text-base" },
];

interface Ayah {
  number: number;
  arabic: string;
  translation: string;
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
  try {
    const raw = localStorage.getItem(LS_FAVORITES_KEY);
    if (raw) return JSON.parse(raw) as FavoriteVerse[];
  } catch {}
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
  try {
    const raw = localStorage.getItem(LS_READING_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
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
  const [search, setSearch] = useState("");
  const [selectedSurah, setSelectedSurah] = useState<number | null>(null);
  const [ayahs, setAyahs] = useState<Ayah[]>([]);
  const [loadingAyahs, setLoadingAyahs] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
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

  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioAyah, setAudioAyah] = useState<number | null>(null);
  const [reciter, setReciter] = useState(RECITERS[0].id);
  const [audioLoading, setAudioLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [verseOfDay, setVerseOfDay] = useState<{ arabic: string; translation: string; ref: string; theme: string } | null>(null);
  const [vodLoading, setVodLoading] = useState(false);

  const fontConfig = FONT_SIZES.find(f => f.id === fontSize) ?? FONT_SIZES[1];
  const readingProgress = getReadingProgress();

  useEffect(() => {
    const vod = getVerseOfTheDay();
    setVodLoading(true);
    const lang = getStoredLang();
    Promise.all([
      fetch(`https://api.alquran.cloud/v1/ayah/${vod.surah}:${vod.ayah}`).then(r => r.json()),
      fetch(`https://api.alquran.cloud/v1/ayah/${vod.surah}:${vod.ayah}/${lang}`).then(r => r.json()),
    ]).then(([arJson, trJson]) => {
      if (arJson.code === 200 && trJson.code === 200) {
        const surahInfo = QURAN_SURAHS.find(s => s.number === vod.surah);
        setVerseOfDay({
          arabic: arJson.data.text,
          translation: trJson.data.text,
          ref: `${surahInfo?.nameFr ?? "Sourate"} ${vod.surah}:${vod.ayah}`,
          theme: vod.theme,
        });
      }
    }).catch(() => {}).finally(() => setVodLoading(false));
  }, []);

  useEffect(() => {
    return () => {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    };
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
          surahNumber: surahNum, surahName: surahInfo?.nameFr ?? `Sourate ${surahNum}`,
          ayahNumber: ayahNum, arabic, translation, savedAt: new Date().toISOString(),
        }];
      }
      saveFavorites(updated);
      return updated;
    });
  }, []);

  const copyVerse = useCallback(async (arabic: string, translation: string, surahNum: number, ayahNum: number) => {
    const surahInfo = QURAN_SURAHS.find(s => s.number === surahNum);
    const text = `${arabic}\n\n${translation}\n\n— ${surahInfo?.nameFr ?? "Sourate"} ${surahNum}:${ayahNum}`;
    try { await navigator.clipboard.writeText(text); toast.success("Verset copié"); } catch { toast.error("Impossible de copier"); }
  }, []);

  const shareVerse = useCallback(async (arabic: string, translation: string, surahNum: number, ayahNum: number) => {
    const surahInfo = QURAN_SURAHS.find(s => s.number === surahNum);
    const text = `${arabic}\n\n${translation}\n\n— ${surahInfo?.nameFr ?? "Sourate"} ${surahNum}:${ayahNum}`;
    if (navigator.share) { try { await navigator.share({ text }); } catch {} }
    else { await copyVerse(arabic, translation, surahNum, ayahNum); }
  }, [copyVerse]);

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
    setSelectedSurah(num);
    setLoadingAyahs(true);
    setAyahs([]);
    setLoadError(null);
    setShowFavorites(false);
    setCurrentPage(page);
    try {
      const [arRes, trRes] = await Promise.all([
        fetch(`https://api.alquran.cloud/v1/surah/${num}`),
        fetch(`https://api.alquran.cloud/v1/surah/${num}/${lang}`),
      ]);
      const arJson: AlQuranSurahResponse = await arRes.json();
      const trJson: AlQuranSurahResponse = await trRes.json();

      if (arJson.code === 200 && trJson.code === 200) {
        const merged: Ayah[] = arJson.data.ayahs.map((a, i) => ({
          number: a.numberInSurah, arabic: a.text, translation: trJson.data.ayahs[i]?.text ?? "",
        }));
        setAyahs(merged);
        saveReadingProgress(num, page);
      } else {
        setLoadError("Erreur lors du chargement de la sourate.");
      }
    } catch {
      setLoadError("Erreur réseau. Vérifiez votre connexion.");
    } finally {
      setLoadingAyahs(false);
    }
  }, [language]);

  const handleSearch = useCallback(async () => {
    if (!search || search.length < 3) return;
    setSearchLoading(true);
    setSearchResults([]);
    try {
      const res = await fetch(`https://api.alquran.cloud/v1/search/${encodeURIComponent(search)}/all/${language}`);
      const json: AlQuranSearchResponse = await res.json();
      if (json.code === 200 && json.data?.matches) {
        setSearchResults(json.data.matches.slice(0, 20).map((m) => ({
          surah: m.surah.number, ayah: m.numberInSurah, text: m.text,
        })));
      }
    } catch {} finally { setSearchLoading(false); }
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
    if (audioAyah === ayahNum && audioPlaying) {
      setAudioPlaying(false);
      setAudioAyah(null);
      return;
    }
    setAudioLoading(true);
    setAudioAyah(ayahNum);
    try {
      const res = await fetch(`https://api.alquran.cloud/v1/ayah/${surahNum}:${ayahNum}/${reciter}`);
      const json = await res.json();
      if (json.code === 200 && json.data?.audio) {
        const audio = new Audio(json.data.audio);
        audioRef.current = audio;
        audio.onended = () => {
          setAudioPlaying(false);
          setAudioAyah(null);
          const nextAyah = ayahs.find(a => a.number === ayahNum + 1);
          if (nextAyah) playAyahAudio(surahNum, nextAyah.number);
        };
        audio.onerror = () => { setAudioPlaying(false); setAudioAyah(null); toast.error("Erreur audio"); };
        await audio.play();
        setAudioPlaying(true);
      } else {
        toast.error("Audio non disponible");
        setAudioAyah(null);
      }
    } catch {
      toast.error("Erreur lors du chargement audio");
      setAudioAyah(null);
    } finally {
      setAudioLoading(false);
    }
  }, [reciter, audioAyah, audioPlaying, ayahs]);

  const stopAudio = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setAudioPlaying(false);
    setAudioAyah(null);
  }, []);

  const toggleBookmark = useCallback((surahNum: number, ayahNum: number) => {
    setBookmarks(prev => {
      const exists = prev.some(b => b.surah === surahNum && b.ayah === ayahNum);
      const surahInfo = QURAN_SURAHS.find(s => s.number === surahNum);
      const updated = exists
        ? prev.filter(b => !(b.surah === surahNum && b.ayah === ayahNum))
        : [...prev, { surah: surahNum, ayah: ayahNum, name: `${surahInfo?.nameFr} ${surahNum}:${ayahNum}`, savedAt: new Date().toISOString() }];
      saveBookmarks(updated);
      toast.success(exists ? "Marque-page retiré" : "Marque-page ajouté");
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
            <h2 className="text-base font-bold" style={{ color: GOLD }}>Versets Favoris</h2>
            <p className="text-xs text-muted-foreground">{favorites.length} verset{favorites.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        {favorites.length === 0 && (
          <div className="text-center py-12">
            <Heart size={32} className="mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Aucun verset favori</p>
          </div>
        )}
        {favorites.map(fav => (
          <div key={`${fav.surahNumber}-${fav.ayahNumber}`} className="rounded-2xl p-4" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
            <div className="flex items-center justify-between mb-2">
              <button onClick={() => loadSurah(fav.surahNumber)} className="text-[10px] font-bold" style={{ color: GOLD }}>
                {fav.surahName} — Verset {fav.ayahNumber}
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
            <h2 className="text-base font-bold" style={{ color: GOLD }}>Marque-pages</h2>
            <p className="text-xs text-muted-foreground">{bookmarks.length} marque-page{bookmarks.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        {bookmarks.length === 0 && (
          <div className="text-center py-12">
            <Layers size={32} className="mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Aucun marque-page</p>
          </div>
        )}
        {bookmarks.map(bm => (
          <button key={`${bm.surah}-${bm.ayah}`} onClick={() => { setShowBookmarks(false); loadSurah(bm.surah); }}
            className="w-full text-left rounded-2xl p-4 flex items-center gap-3" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
            <Layers size={16} style={{ color: GOLD }} />
            <div className="flex-1">
              <p className="text-sm font-semibold">{bm.name}</p>
              <p className="text-[10px] text-muted-foreground">{new Date(bm.savedAt).toLocaleDateString("fr-FR")}</p>
            </div>
          </button>
        ))}
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
            <p className="text-xs text-muted-foreground">{surahInfo?.nameAr} — {surahInfo?.versesCount} versets — {surahInfo?.revelationType}</p>
          </div>
          <button onClick={() => setShowFontSettings(!showFontSettings)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${GOLD}18` }}>
            <Type size={14} style={{ color: GOLD }} />
          </button>
          <a href={`https://quran.com/${selectedSurah}`} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${GOLD}18` }}>
            <ExternalLink size={14} style={{ color: GOLD }} />
          </a>
        </div>

        <div className="rounded-xl p-3 space-y-2" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-1"><Volume2 size={10} /> Lecteur Audio</p>
            {audioPlaying && (
              <button onClick={stopAudio} className="text-[10px] font-semibold text-destructive flex items-center gap-1">
                <VolumeX size={10} /> Arrêter
              </button>
            )}
          </div>
          <select value={reciter} onChange={e => setReciter(e.target.value)} className="w-full text-[11px] rounded-lg border border-border bg-background px-2 py-1.5">
            {RECITERS.map(r => (
              <option key={r.id} value={r.id}>{r.name} — {r.nameAr}</option>
            ))}
          </select>
          {audioAyah !== null && (
            <p className="text-[10px] text-center" style={{ color: GOLD }}>
              {audioLoading ? "Chargement..." : `Lecture verset ${audioAyah}`}
            </p>
          )}
        </div>

        {showFontSettings && (
          <div className="flex gap-2">
            {FONT_SIZES.map(f => (
              <button key={f.id} onClick={() => handleFontSizeChange(f.id)}
                className="flex-1 py-2 rounded-xl text-xs font-semibold"
                style={{ background: fontSize === f.id ? `${GOLD}22` : "hsl(var(--muted)/0.3)", color: fontSize === f.id ? GOLD : "hsl(var(--muted-foreground))", border: fontSize === f.id ? `1px solid ${GOLD}44` : "1px solid transparent" }}>
                {f.label}
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
              <RefreshCw size={14} /> Réessayer
            </button>
          </div>
        )}

        {!loadingAyahs && !loadError && paginatedAyahs.length > 0 && (
          <>
            <div className="space-y-4">
              {paginatedAyahs.map(a => {
                const faved = isFavorite(selectedSurah, a.number);
                const isPlayingThis = audioAyah === a.number && audioPlaying;
                const isBookmarked = bookmarks.some(b => b.surah === selectedSurah && b.ayah === a.number);
                return (
                  <div key={a.number} className="rounded-2xl p-4" style={{
                    background: isPlayingThis ? `linear-gradient(135deg, ${NAVY} 0%, hsl(226 22% 18%) 100%)` : "hsl(var(--card))",
                    border: isPlayingThis ? `1px solid ${GOLD}55` : "1px solid hsl(var(--border))",
                  }}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: `${GOLD}22`, color: GOLD }}>{a.number}</span>
                      <div className="flex gap-1">
                        <button onClick={() => playAyahAudio(selectedSurah, a.number)} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: isPlayingThis ? `${GOLD}33` : "transparent" }}>
                          {audioLoading && audioAyah === a.number
                            ? <Loader2 size={12} className="animate-spin" style={{ color: GOLD }} />
                            : isPlayingThis
                              ? <Pause size={12} style={{ color: GOLD }} />
                              : <Play size={12} className="text-muted-foreground" />
                          }
                        </button>
                        <button onClick={() => toggleBookmark(selectedSurah, a.number)} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: isBookmarked ? `${GOLD}22` : "transparent" }}>
                          <Layers size={12} style={{ color: isBookmarked ? GOLD : "hsl(var(--muted-foreground))" }} />
                        </button>
                        <button onClick={() => copyVerse(a.arabic, a.translation, selectedSurah, a.number)} className="w-7 h-7 rounded-full flex items-center justify-center"><Copy size={12} className="text-muted-foreground" /></button>
                        <button onClick={() => shareVerse(a.arabic, a.translation, selectedSurah, a.number)} className="w-7 h-7 rounded-full flex items-center justify-center"><Share2 size={12} className="text-muted-foreground" /></button>
                        <button onClick={() => toggleFavorite(selectedSurah, a.number, a.arabic, a.translation)} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: faved ? `${GOLD}22` : "transparent" }}>
                          <Heart size={14} fill={faved ? GOLD : "none"} style={{ color: faved ? GOLD : "hsl(var(--muted-foreground))" }} />
                        </button>
                      </div>
                    </div>
                    <p className={`text-right ${fontConfig.arabicClass} leading-loose mb-3`} style={{ fontFamily: "'Amiri', 'Traditional Arabic', serif", direction: "rtl" }}>{a.arabic}</p>
                    <p className={`${fontConfig.transClass} text-muted-foreground leading-relaxed`}>{a.translation}</p>
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
        <h2 className="text-lg font-bold mb-1" style={{ color: GOLD }}>Le Saint Coran</h2>
        <p className="text-xs text-muted-foreground">114 Sourates · 30 Juz — Texte arabe, traduction & audio</p>
      </div>

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
            <Sparkles size={10} /> Verset du jour — {verseOfDay.theme}
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
        <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1 block">Langue de traduction</label>
        <select value={language} onChange={e => handleLanguageChange(e.target.value)} className="w-full text-xs rounded-lg border border-border bg-card px-2 py-2">
          {QURAN_LANGUAGES.map(l => (
            <option key={l.code} value={l.code}>{l.native} — {l.label}</option>
          ))}
        </select>
      </div>

      {readingProgress && (
        <button onClick={() => loadSurah(readingProgress.surah, readingProgress.page)}
          className="w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2"
          style={{ background: `${GOLD}18`, color: GOLD, border: `1px solid ${GOLD}33` }}>
          <BookOpen size={14} />
          Continuer la lecture — {QURAN_SURAHS.find(s => s.number === readingProgress.surah)?.nameFr ?? "Sourate"} (p.{readingProgress.page})
        </button>
      )}

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSearch()}
            placeholder="Rechercher une sourate ou un mot..." className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-card text-sm" />
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
      </div>

      {search.length >= 3 && (
        <button onClick={handleSearch} className="w-full py-2 rounded-xl text-xs font-semibold" style={{ background: `${GOLD}22`, color: GOLD }} disabled={searchLoading}>
          {searchLoading ? "Recherche..." : "Rechercher dans les traductions"}
        </button>
      )}

      {searchResults.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Résultats ({searchResults.length})</h3>
          {searchResults.map((r, i) => (
            <button key={i} onClick={() => loadSurah(r.surah)} className="w-full text-left rounded-2xl p-3" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
              <p className="text-[10px] font-bold" style={{ color: GOLD }}>Sourate {r.surah}, Verset {r.ayah}</p>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.text}</p>
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        {(["surah", "juz"] as const).map(mode => (
          <button key={mode} onClick={() => setBrowseMode(mode)}
            className="flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-wide"
            style={{ background: browseMode === mode ? `${GOLD}22` : "hsl(var(--muted)/0.3)", color: browseMode === mode ? GOLD : "hsl(var(--muted-foreground))", border: browseMode === mode ? `1px solid ${GOLD}44` : "1px solid transparent" }}>
            {mode === "surah" ? "Sourates (114)" : "Juz (30)"}
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
                <p className="text-[10px] text-muted-foreground">{s.versesCount} versets · {s.revelationType}</p>
              </div>
              <BookOpen size={14} className="text-muted-foreground shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
