import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Loader2, RefreshCw, Heart, Copy, Share2, BookOpen, ChevronDown, Volume2, VolumeX, Image } from "lucide-react";
import { toast } from "sonner";
import ShareButtons from "@/components/public/ShareButtons";
import { shareAsImage } from "@/lib/share/branded-share-card";
import { speakText, speakArabic, cancelTTS, isTTSSpeaking, getTTSLang } from "@/lib/islamic/tts-engine";
import { buildHadithShareText, shareIslamicContent, getWhatsAppLink } from "@/lib/islamic/islamic-share";

const GOLD = "hsl(var(--accent))";
const LS_FAVORITES_KEY = "islamic_hadith_favorites";
const LS_RECENT_HADITH_KEY = "islamic_hadith_recently_read";

interface HadithEntry {
  number: number;
  arab: string;
  id: string;
  translation?: string;
}

interface FavoriteHadith {
  collection: string;
  number: number;
  arab: string;
  translation?: string;
  savedAt: string;
}

interface RecentHadith {
  collection: string;
  collectionName: string;
  page: number;
  ts: number;
}

const COLLECTIONS = [
  { id: "bukhari", name: "Sahih al-Bukhari", nameAr: "صحيح البخاري", emoji: "📗", totalHadith: 7563 },
  { id: "muslim", name: "Sahih Muslim", nameAr: "صحيح مسلم", emoji: "📕", totalHadith: 5362 },
  { id: "tirmidhi", name: "Jami' at-Tirmidhi", nameAr: "جامع الترمذي", emoji: "📙", totalHadith: 3956 },
  { id: "abudawud", name: "Sunan Abu Dawud", nameAr: "سنن أبي داود", emoji: "📘", totalHadith: 5274 },
  { id: "nasai", name: "Sunan an-Nasa'i", nameAr: "سنن النسائي", emoji: "📓", totalHadith: 5758 },
  { id: "ibnmajah", name: "Sunan Ibn Majah", nameAr: "سنن ابن ماجه", emoji: "📔", totalHadith: 4341 },
];

const HADITH_DU_JOUR = [
  { arab: "إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى", french: "Les actes ne valent que par leurs intentions, et chacun n'aura que ce qu'il a eu réellement l'intention de faire.", source: "Bukhari 1", theme: "Intention", grade: "Sahih" },
  { arab: "لاَ يُؤْمِنُ أَحَدُكُمْ حَتَّى يُحِبَّ لِأَخِيهِ مَا يُحِبُّ لِنَفْسِهِ", french: "Aucun d'entre vous ne sera véritablement croyant tant qu'il n'aimera pas pour son frère ce qu'il aime pour lui-même.", source: "Bukhari 13", theme: "Fraternité", grade: "Sahih" },
  { arab: "مَنْ كَانَ يُؤْمِنُ بِاللَّهِ وَالْيَوْمِ الآخِرِ فَلْيَقُلْ خَيْرًا أَوْ لِيَصْمُتْ", french: "Que celui qui croit en Allah et au Jour dernier dise du bien ou se taise.", source: "Bukhari 6018", theme: "Parole", grade: "Sahih" },
  { arab: "الْمُسْلِمُ مَنْ سَلِمَ الْمُسْلِمُونَ مِنْ لِسَانِهِ وَيَدِهِ", french: "Le musulman est celui dont les musulmans sont à l'abri de sa langue et de sa main.", source: "Bukhari 10", theme: "Islam", grade: "Sahih" },
  { arab: "خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ", french: "Le meilleur d'entre vous est celui qui apprend le Coran et l'enseigne.", source: "Bukhari 5027", theme: "Coran", grade: "Sahih" },
  { arab: "الطُّهُورُ شَطْرُ الإِيمَانِ", french: "La purification est la moitié de la foi.", source: "Muslim 223", theme: "Purification", grade: "Sahih" },
  { arab: "مَنْ سَلَكَ طَرِيقًا يَلْتَمِسُ فِيهِ عِلْمًا سَهَّلَ اللَّهُ لَهُ طَرِيقًا إِلَى الْجَنَّةِ", french: "Celui qui prend un chemin à la recherche d'un savoir, Allah lui facilite un chemin vers le Paradis.", source: "Muslim 2699", theme: "Savoir", grade: "Sahih" },
  { arab: "إِنَّ اللَّهَ لاَ يَنْظُرُ إِلَى صُوَرِكُمْ وَأَمْوَالِكُمْ وَلَكِنْ يَنْظُرُ إِلَى قُلُوبِكُمْ وَأَعْمَالِكُمْ", french: "Certes, Allah ne regarde ni vos apparences ni vos biens, mais Il regarde vos cœurs et vos actions.", source: "Muslim 2564", theme: "Cœur", grade: "Sahih" },
  { arab: "الدُّنْيَا سِجْنُ الْمُؤْمِنِ وَجَنَّةُ الْكَافِرِ", french: "Le bas monde est la prison du croyant et le paradis du mécréant.", source: "Muslim 2956", theme: "Dounia", grade: "Sahih" },
  { arab: "لاَ تَحَاسَدُوا وَلاَ تَنَاجَشُوا وَلاَ تَبَاغَضُوا وَلاَ تَدَابَرُوا", french: "Ne vous enviez pas, ne vous surenchérissez pas, ne vous haïssez pas et ne vous tournez pas le dos.", source: "Muslim 2559", theme: "Relations", grade: "Sahih" },
  { arab: "اتَّقِ اللَّهَ حَيْثُمَا كُنْتَ وَأَتْبِعِ السَّيِّئَةَ الْحَسَنَةَ تَمْحُهَا وَخَالِقِ النَّاسَ بِخُلُقٍ حَسَنٍ", french: "Crains Allah où que tu sois, fais suivre la mauvaise action par une bonne qui l'effacera et comporte-toi bien avec les gens.", source: "Tirmidhi 1987", theme: "Taqwa", grade: "Hasan" },
  { arab: "مَنْ لاَ يَرْحَمِ النَّاسَ لاَ يَرْحَمْهُ اللَّهُ", french: "Celui qui ne fait pas miséricorde aux gens, Allah ne lui fera pas miséricorde.", source: "Bukhari 7376", theme: "Miséricorde", grade: "Sahih" },
  { arab: "الْمُؤْمِنُ لِلْمُؤْمِنِ كَالْبُنْيَانِ يَشُدُّ بَعْضُهُ بَعْضًا", french: "Le croyant pour le croyant est comme un édifice dont les parties se soutiennent mutuellement.", source: "Bukhari 481", theme: "Entraide", grade: "Sahih" },
  { arab: "مَا مَلَأَ آدَمِيٌّ وِعَاءً شَرًّا مِنْ بَطْنٍ", french: "L'homme n'a jamais rempli un récipient pire que son ventre.", source: "Tirmidhi 2380", theme: "Modération", grade: "Sahih" },
];

function loadFavorites(): FavoriteHadith[] {
  try { const raw = localStorage.getItem(LS_FAVORITES_KEY); if (raw) return JSON.parse(raw); } catch {}
  return [];
}

function saveFavorites(favs: FavoriteHadith[]): void {
  try { localStorage.setItem(LS_FAVORITES_KEY, JSON.stringify(favs)); } catch {}
}

function loadRecentHadiths(): RecentHadith[] {
  try { const raw = localStorage.getItem(LS_RECENT_HADITH_KEY); if (raw) return JSON.parse(raw); } catch {}
  return [];
}

function addRecentHadith(collection: string, collectionName: string, page: number): void {
  try {
    let list = loadRecentHadiths().filter(r => r.collection !== collection);
    list.unshift({ collection, collectionName, page, ts: Date.now() });
    list = list.slice(0, 10);
    localStorage.setItem(LS_RECENT_HADITH_KEY, JSON.stringify(list));
  } catch {}
}

function getDailyHadithIndex(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / 86400000);
  return dayOfYear % HADITH_DU_JOUR.length;
}

export default function HadithTab() {
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [hadiths, setHadiths] = useState<HadithEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [favorites, setFavorites] = useState<FavoriteHadith[]>(loadFavorites);
  const [showFavorites, setShowFavorites] = useState(false);
  const [expandedHadith, setExpandedHadith] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [speakingHadith, setSpeakingHadith] = useState<number | null>(null);

  const dailyHadith = HADITH_DU_JOUR[getDailyHadithIndex()];
  const recentHadiths = loadRecentHadiths();

  const fetchHadiths = useCallback(async (collection: string, pageNum: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`https://api.hadith.gading.dev/books/${collection}?range=${(pageNum - 1) * 20 + 1}-${pageNum * 20}`, { signal: AbortSignal.timeout(12000) });
      if (!res.ok) throw new Error("err");
      const json = await res.json();
      if (json?.data?.hadiths) {
        setHadiths(json.data.hadiths.map((h: { number: number; arab: string; id: string }) => ({
          number: h.number,
          arab: h.arab,
          id: h.id,
        })));
      }
    } catch {
      setError("Impossible de charger les hadiths.");
    } finally {
      setLoading(false);
    }
  }, []);

  const openCollection = useCallback((id: string, startPage?: number) => {
    const pg = startPage ?? 1;
    setSelectedCollection(id);
    setPage(pg);
    setShowFavorites(false);
    fetchHadiths(id, pg);
    const colInfo = COLLECTIONS.find(c => c.id === id);
    if (colInfo) addRecentHadith(id, colInfo.name, pg);
  }, [fetchHadiths]);

  const changePage = useCallback((dir: -1 | 1) => {
    const newPage = Math.max(1, page + dir);
    setPage(newPage);
    if (selectedCollection) fetchHadiths(selectedCollection, newPage);
  }, [page, selectedCollection, fetchHadiths]);

  const toggleFavorite = useCallback((collection: string, number: number, arab: string, translation?: string) => {
    setFavorites(prev => {
      const exists = prev.some(f => f.collection === collection && f.number === number);
      const updated = exists
        ? prev.filter(f => !(f.collection === collection && f.number === number))
        : [...prev, { collection, number, arab, translation, savedAt: new Date().toISOString() }];
      saveFavorites(updated);
      return updated;
    });
  }, []);

  const copyHadith = useCallback(async (arab: string, source: string, translation?: string) => {
    let text = `${arab}\n\n`;
    if (translation) text += `${translation}\n\n`;
    text += `— ${source}`;
    try { await navigator.clipboard.writeText(text); toast.success("Hadith copié"); } catch { toast.error("Impossible de copier"); }
  }, []);

  const shareHadith = useCallback(async (arab: string, source: string, collection: string, number: number, translation?: string) => {
    const text = buildHadithShareText({
      arabic: arab,
      translation,
      collection: source,
      number,
    });
    shareIslamicContent({ text, title: `${source} — Hadith #${number}` });
  }, []);

  const shareHadithWhatsApp = useCallback((arab: string, source: string, number: number, translation?: string) => {
    const text = buildHadithShareText({ arabic: arab, translation, collection: source, number });
    window.open(getWhatsAppLink(text), "_blank", "noopener,noreferrer");
  }, []);

  const speakHadith = useCallback((hadithNum: number, arab: string, translation?: string) => {
    if (speakingHadith === hadithNum) {
      cancelTTS();
      setSpeakingHadith(null);
      return;
    }
    cancelTTS();
    setSpeakingHadith(hadithNum);

    speakArabic(arab, {
      onEnd: () => {
        if (translation) {
          setTimeout(() => {
            speakText(translation, "fr-FR", {
              rate: 0.9,
              onEnd: () => setSpeakingHadith(null),
              onError: () => setSpeakingHadith(null),
            });
          }, 400);
        } else {
          setSpeakingHadith(null);
        }
      },
      onError: () => setSpeakingHadith(null),
    });
  }, [speakingHadith]);

  if (showFavorites) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setShowFavorites(false)} className="text-xs font-semibold" style={{ color: GOLD }}>← Retour</button>
          <h2 className="text-base font-bold" style={{ color: GOLD }}>Hadiths Favoris ({favorites.length})</h2>
        </div>
        {favorites.length === 0 && (
          <div className="text-center py-12">
            <Heart size={32} className="mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Aucun hadith favori</p>
          </div>
        )}
        {favorites.map((fav, i) => {
          const colInfo = COLLECTIONS.find(c => c.id === fav.collection);
          return (
            <div key={i} className="rounded-2xl p-4 space-y-2" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
              <p className="text-[10px] font-bold" style={{ color: GOLD }}>{colInfo?.name ?? fav.collection} — Hadith #{fav.number}</p>
              <p className="text-base text-right leading-loose" style={{ fontFamily: "'Amiri', 'Traditional Arabic', serif", direction: "rtl" }}>{fav.arab}</p>
              {fav.translation && <p className="text-xs text-muted-foreground leading-relaxed">{fav.translation}</p>}
              <div className="flex gap-2">
                <button onClick={() => speakHadith(fav.number, fav.arab, fav.translation)} className="text-[10px] text-muted-foreground flex items-center gap-1">
                  {speakingHadith === fav.number ? <VolumeX size={10} /> : <Volume2 size={10} />} {speakingHadith === fav.number ? "Stop" : "Écouter"}
                </button>
                <button onClick={() => copyHadith(fav.arab, `${colInfo?.name} ${fav.number}`, fav.translation)} className="text-[10px] text-muted-foreground flex items-center gap-1"><Copy size={10} /> Copier</button>
                <button onClick={() => toggleFavorite(fav.collection, fav.number, fav.arab)} className="text-[10px] text-destructive flex items-center gap-1"><Heart size={10} fill="currentColor" /> Retirer</button>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (selectedCollection) {
    const colInfo = COLLECTIONS.find(c => c.id === selectedCollection);
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => { setSelectedCollection(null); setHadiths([]); cancelTTS(); setSpeakingHadith(null); }} className="text-xs font-semibold" style={{ color: GOLD }}>← Retour</button>
          <div className="flex-1">
            <h2 className="text-base font-bold" style={{ color: GOLD }}>{colInfo?.name}</h2>
            <p className="text-xs text-muted-foreground" dir="rtl">{colInfo?.nameAr}</p>
          </div>
        </div>

        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher dans les hadiths…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full text-xs rounded-xl border border-border bg-card pl-9 pr-3 py-2.5"
          />
        </div>

        {loading && (
          <div className="flex flex-col items-center gap-3 py-12">
            <Loader2 size={24} className="animate-spin" style={{ color: GOLD }} />
          </div>
        )}

        {error && !loading && (
          <div className="text-center py-8 space-y-3">
            <p className="text-sm text-destructive">{error}</p>
            <button onClick={() => fetchHadiths(selectedCollection, page)} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold" style={{ background: `${GOLD}22`, color: GOLD }}>
              <RefreshCw size={14} /> Réessayer
            </button>
          </div>
        )}

        {!loading && !error && hadiths.length > 0 && (
          <div className="space-y-3">
            {hadiths.filter(h => !searchQuery || h.arab.includes(searchQuery) || String(h.number).includes(searchQuery)).map(h => {
              const isFav = favorites.some(f => f.collection === selectedCollection && f.number === h.number);
              const isExpanded = expandedHadith === h.number;
              const isSpeaking = speakingHadith === h.number;
              return (
                <div key={h.number} className="rounded-2xl p-4" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
                  <button onClick={() => setExpandedHadith(isExpanded ? null : h.number)} className="w-full text-left">
                    <div className="flex items-center justify-between mb-2">
                      <span className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: `${GOLD}22`, color: GOLD }}>
                        {h.number}
                      </span>
                      <ChevronDown size={14} className="text-muted-foreground transition-transform" style={{ transform: isExpanded ? "rotate(180deg)" : undefined }} />
                    </div>
                    <p className={`text-right leading-loose ${isExpanded ? "" : "line-clamp-3"}`} style={{ fontFamily: "'Amiri', 'Traditional Arabic', serif", direction: "rtl" }}>
                      {h.arab}
                    </p>
                  </button>
                  {isExpanded && (
                    <div className="flex flex-wrap gap-2 pt-3 border-t border-border/30 mt-3">
                      <button onClick={() => speakHadith(h.number, h.arab)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold"
                        style={{ background: isSpeaking ? `${GOLD}22` : "hsl(var(--muted)/0.3)", color: isSpeaking ? GOLD : "hsl(var(--muted-foreground))" }}>
                        {isSpeaking ? <VolumeX size={12} /> : <Volume2 size={12} />} {isSpeaking ? "Stop" : "Écouter"}
                      </button>
                      <button onClick={() => toggleFavorite(selectedCollection, h.number, h.arab)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold"
                        style={{ background: isFav ? `${GOLD}22` : "hsl(var(--muted)/0.3)", color: isFav ? GOLD : "hsl(var(--muted-foreground))" }}>
                        <Heart size={12} fill={isFav ? GOLD : "none"} /> {isFav ? "Retirer" : "Favori"}
                      </button>
                      <button onClick={() => copyHadith(h.arab, `${colInfo?.name} ${h.number}`)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold" style={{ background: "hsl(var(--muted)/0.3)" }}>
                        <Copy size={12} /> Copier
                      </button>
                      <button onClick={() => shareHadith(h.arab, colInfo?.name ?? "", selectedCollection, h.number)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold" style={{ background: "hsl(var(--muted)/0.3)" }}>
                        <Share2 size={12} /> Partager
                      </button>
                      <button onClick={() => shareHadithWhatsApp(h.arab, colInfo?.name ?? "", h.number)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold" style={{ background: "#25D36622", color: "#25D366" }}>
                        WhatsApp
                      </button>
                      <button onClick={() => shareAsImage({ type: "hadith", arabicText: h.arab, collection: colInfo?.name || selectedCollection, number: h.number }, `Hadith ${h.number}`).then(r => { if (r === "shared" || r === "downloaded") toast.success("Image ready"); }).catch(() => {})} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold" style={{ background: "hsl(var(--muted)/0.3)" }}>
                        <Image size={12} /> Image
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            <div className="flex items-center justify-center gap-3 pt-2">
              <button onClick={() => changePage(-1)} disabled={page <= 1}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold"
                style={{ background: `${GOLD}18`, color: GOLD, opacity: page <= 1 ? 0.3 : 1 }}>
                ← Précédent
              </button>
              <span className="text-xs font-semibold" style={{ color: GOLD }}>Page {page}</span>
              <button onClick={() => changePage(1)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold"
                style={{ background: `${GOLD}18`, color: GOLD }}>
                Suivant →
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h2 className="text-lg font-bold mb-1" style={{ color: GOLD }}>Hadiths</h2>
        <p className="text-xs text-muted-foreground">Les 6 recueils authentiques (Kutub al-Sittah)</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl p-5"
        style={{
          background: `linear-gradient(135deg, hsl(226 22% 14%) 0%, hsl(226 22% 18%) 100%)`,
          border: `1px solid ${GOLD}44`,
          boxShadow: `0 8px 32px ${GOLD}18`,
        }}
      >
        <p className="text-[10px] uppercase tracking-widest mb-2 text-center" style={{ color: `${GOLD}99` }}>
          Hadith du jour — {dailyHadith.theme}
        </p>
        <p className="text-base text-right leading-loose mb-2" style={{ fontFamily: "'Amiri', 'Traditional Arabic', serif", color: "#fff", direction: "rtl" }}>
          {dailyHadith.arab}
        </p>
        <p className="text-xs leading-relaxed mb-3" style={{ color: `${GOLD}dd` }}>
          {dailyHadith.french}
        </p>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px]" style={{ color: `${GOLD}99` }}>— {dailyHadith.source}</p>
            <p className="text-[9px] mt-0.5" style={{ color: `${GOLD}66` }}>{dailyHadith.grade}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => speakHadith(-1, dailyHadith.arab, dailyHadith.french)} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: `${GOLD}22` }}>
              {speakingHadith === -1 ? <VolumeX size={12} style={{ color: GOLD }} /> : <Volume2 size={12} style={{ color: GOLD }} />}
            </button>
            <button onClick={() => copyHadith(dailyHadith.arab, dailyHadith.source, dailyHadith.french)} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: `${GOLD}22` }}>
              <Copy size={12} style={{ color: GOLD }} />
            </button>
            <button onClick={() => shareHadith(dailyHadith.arab, dailyHadith.source, "", 0, dailyHadith.french)} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: `${GOLD}22` }}>
              <Share2 size={12} style={{ color: GOLD }} />
            </button>
          </div>
        </div>
      </motion.div>

      <div className="flex gap-2">
        <button
          onClick={() => setShowFavorites(true)}
          className="flex-1 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2"
          style={{ background: `${GOLD}18`, color: GOLD, border: `1px solid ${GOLD}33` }}
        >
          <Heart size={14} fill={favorites.length > 0 ? GOLD : "none"} />
          Mes Favoris ({favorites.length})
        </button>
      </div>

      {recentHadiths.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">Récemment lu</p>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {recentHadiths.map(r => (
              <button key={r.collection} onClick={() => openCollection(r.collection, r.page)}
                className="shrink-0 px-3 py-1.5 rounded-xl text-[10px] font-semibold"
                style={{ background: `${GOLD}18`, color: GOLD, border: `1px solid ${GOLD}33` }}>
                {r.collectionName} (p.{r.page})
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <h3 className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Collections</h3>
        {COLLECTIONS.map(col => (
          <button
            key={col.id}
            onClick={() => openCollection(col.id)}
            className="w-full flex items-center gap-3 p-4 rounded-2xl text-left"
            style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
          >
            <span className="text-2xl">{col.emoji}</span>
            <div className="flex-1">
              <p className="text-sm font-semibold">{col.name}</p>
              <p className="text-[10px] text-muted-foreground" dir="rtl">{col.nameAr}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs font-bold tabular-nums" style={{ color: GOLD }}>{col.totalHadith.toLocaleString()}</p>
              <p className="text-[9px] text-muted-foreground">hadiths</p>
            </div>
            <BookOpen size={14} className="text-muted-foreground shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}
