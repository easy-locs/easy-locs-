import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ChevronLeft, Loader2, ExternalLink, BookOpen, Heart, Star } from "lucide-react";
import { QURAN_SURAHS } from "@/data/islamic/quran-surahs";

const GOLD = "hsl(var(--accent))";
const NAVY = "hsl(226 22% 14%)";
const LS_FAVORITES_KEY = "quran_verse_favorites";

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
  data: {
    ayahs: AlQuranAyah[];
  };
}

interface AlQuranSearchMatch {
  surah: { number: number };
  numberInSurah: number;
  text: string;
}

interface AlQuranSearchResponse {
  code: number;
  data: {
    matches: AlQuranSearchMatch[];
  } | null;
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

export default function QuranTab() {
  const [search, setSearch] = useState("");
  const [selectedSurah, setSelectedSurah] = useState<number | null>(null);
  const [ayahs, setAyahs] = useState<Ayah[]>([]);
  const [loadingAyahs, setLoadingAyahs] = useState(false);
  const [searchResults, setSearchResults] = useState<{ surah: number; ayah: number; text: string }[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [favorites, setFavorites] = useState<FavoriteVerse[]>(loadFavorites);
  const [showFavorites, setShowFavorites] = useState(false);

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
          surahNumber: surahNum,
          surahName: surahInfo?.nameFr ?? `Sourate ${surahNum}`,
          ayahNumber: ayahNum,
          arabic,
          translation,
          savedAt: new Date().toISOString(),
        }];
      }
      saveFavorites(updated);
      return updated;
    });
  }, []);

  const filtered = search && !selectedSurah
    ? QURAN_SURAHS.filter(s =>
        s.nameFr.toLowerCase().includes(search.toLowerCase()) ||
        s.nameAr.includes(search) ||
        s.nameEn.toLowerCase().includes(search.toLowerCase()) ||
        String(s.number) === search
      )
    : QURAN_SURAHS;

  const loadSurah = useCallback(async (num: number) => {
    setSelectedSurah(num);
    setLoadingAyahs(true);
    setAyahs([]);
    setShowFavorites(false);
    try {
      const [arRes, frRes] = await Promise.all([
        fetch(`https://api.alquran.cloud/v1/surah/${num}`),
        fetch(`https://api.alquran.cloud/v1/surah/${num}/fr.hamidullah`),
      ]);
      const arJson: AlQuranSurahResponse = await arRes.json();
      const frJson: AlQuranSurahResponse = await frRes.json();

      if (arJson.code === 200 && frJson.code === 200) {
        const arAyahs = arJson.data.ayahs;
        const frAyahs = frJson.data.ayahs;
        const merged: Ayah[] = arAyahs.map((a, i) => ({
          number: a.numberInSurah,
          arabic: a.text,
          translation: frAyahs[i]?.text ?? "",
        }));
        setAyahs(merged);
      }
    } catch {
    } finally {
      setLoadingAyahs(false);
    }
  }, []);

  const handleSearch = useCallback(async () => {
    if (!search || search.length < 3) return;
    setSearchLoading(true);
    setSearchResults([]);
    try {
      const res = await fetch(`https://api.alquran.cloud/v1/search/${encodeURIComponent(search)}/all/fr.hamidullah`);
      const json: AlQuranSearchResponse = await res.json();
      if (json.code === 200 && json.data?.matches) {
        setSearchResults(
          json.data.matches.slice(0, 20).map((m) => ({
            surah: m.surah.number,
            ayah: m.numberInSurah,
            text: m.text,
          }))
        );
      }
    } catch {
    } finally {
      setSearchLoading(false);
    }
  }, [search]);

  if (showFavorites) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setShowFavorites(false)}
            className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${GOLD}18` }}>
            <ChevronLeft size={18} style={{ color: GOLD }} />
          </button>
          <div className="flex-1">
            <h2 className="text-base font-bold" style={{ color: GOLD }}>
              Versets Favoris
            </h2>
            <p className="text-xs text-muted-foreground">
              {favorites.length} verset{favorites.length !== 1 ? "s" : ""} sauvegardé{favorites.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {favorites.length === 0 && (
          <div className="text-center py-12">
            <Star size={32} className="mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Aucun verset favori</p>
            <p className="text-xs text-muted-foreground mt-1">
              Appuyez sur le cœur d'un verset pour le sauvegarder
            </p>
          </div>
        )}

        {favorites.length > 0 && (
          <div className="space-y-3">
            {favorites.map(fav => (
              <div key={`${fav.surahNumber}-${fav.ayahNumber}`}
                className="rounded-2xl p-4" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
                <div className="flex items-center justify-between mb-2">
                  <button onClick={() => loadSurah(fav.surahNumber)}
                    className="text-[10px] font-bold" style={{ color: GOLD }}>
                    {fav.surahName} — Verset {fav.ayahNumber}
                  </button>
                  <button
                    onClick={() => toggleFavorite(fav.surahNumber, fav.ayahNumber, fav.arabic, fav.translation)}
                    className="w-7 h-7 rounded-full flex items-center justify-center"
                    style={{ background: `${GOLD}22` }}
                  >
                    <Heart size={14} fill={GOLD} style={{ color: GOLD }} />
                  </button>
                </div>
                <p className="text-right text-base leading-loose mb-2" style={{ fontFamily: "'Amiri', 'Traditional Arabic', serif", direction: "rtl" }}>
                  {fav.arabic}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">{fav.translation}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (selectedSurah !== null) {
    const surahInfo = QURAN_SURAHS.find(s => s.number === selectedSurah);
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => { setSelectedSurah(null); setAyahs([]); }}
            className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${GOLD}18` }}>
            <ChevronLeft size={18} style={{ color: GOLD }} />
          </button>
          <div className="flex-1">
            <h2 className="text-base font-bold" style={{ color: GOLD }}>
              {surahInfo?.number}. {surahInfo?.nameFr}
            </h2>
            <p className="text-xs text-muted-foreground">
              {surahInfo?.nameAr} — {surahInfo?.versesCount} versets — {surahInfo?.revelationType}
            </p>
          </div>
          <a
            href={`https://quran.com/${selectedSurah}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: `${GOLD}18` }}
          >
            <ExternalLink size={14} style={{ color: GOLD }} />
          </a>
        </div>

        {loadingAyahs && (
          <div className="flex flex-col items-center gap-3 py-12">
            <Loader2 size={24} className="animate-spin" style={{ color: GOLD }} />
          </div>
        )}

        {!loadingAyahs && ayahs.length > 0 && (
          <div className="space-y-4">
            {ayahs.map(a => {
              const faved = isFavorite(selectedSurah, a.number);
              return (
                <div key={a.number} className="rounded-2xl p-4" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold"
                      style={{ background: `${GOLD}22`, color: GOLD }}>
                      {a.number}
                    </span>
                    <button
                      onClick={() => toggleFavorite(selectedSurah, a.number, a.arabic, a.translation)}
                      className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                      style={{ background: faved ? `${GOLD}22` : "transparent" }}
                      aria-label={faved ? "Retirer des favoris" : "Ajouter aux favoris"}
                    >
                      <Heart size={16} fill={faved ? GOLD : "none"} style={{ color: faved ? GOLD : "hsl(var(--muted-foreground))" }} />
                    </button>
                  </div>
                  <p className="text-right text-lg leading-loose mb-3" style={{ fontFamily: "'Amiri', 'Traditional Arabic', serif", direction: "rtl" }}>
                    {a.arabic}
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{a.translation}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-lg font-bold mb-1" style={{ color: GOLD }}>Le Saint Coran</h2>
        <p className="text-xs text-muted-foreground">114 Sourates — Texte arabe & traduction</p>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            placeholder="Rechercher une sourate ou un mot..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-card text-sm"
          />
        </div>
        <button
          onClick={() => setShowFavorites(true)}
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 relative"
          style={{ background: `${GOLD}18`, border: `1px solid ${GOLD}33` }}
          aria-label="Versets favoris"
        >
          <Heart size={18} style={{ color: GOLD }} fill={favorites.length > 0 ? GOLD : "none"} />
          {favorites.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold"
              style={{ background: GOLD, color: NAVY }}>
              {favorites.length > 99 ? "99+" : favorites.length}
            </span>
          )}
        </button>
      </div>

      {search.length >= 3 && (
        <button onClick={handleSearch}
          className="w-full py-2 rounded-xl text-xs font-semibold"
          style={{ background: `${GOLD}22`, color: GOLD }}
          disabled={searchLoading}>
          {searchLoading ? "Recherche..." : "Rechercher dans les traductions"}
        </button>
      )}

      {searchResults.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Résultats ({searchResults.length})
          </h3>
          {searchResults.map((r, i) => (
            <button key={i} onClick={() => loadSurah(r.surah)}
              className="w-full text-left rounded-2xl p-3" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
              <p className="text-[10px] font-bold" style={{ color: GOLD }}>
                Sourate {r.surah}, Verset {r.ayah}
              </p>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.text}</p>
            </button>
          ))}
        </div>
      )}

      <div className="space-y-1.5">
        {filtered.map(s => (
          <button
            key={s.number}
            onClick={() => loadSurah(s.number)}
            className="w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-colors hover:bg-muted/30"
            style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold"
              style={{ background: `${GOLD}18`, color: GOLD }}>
              {s.number}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-semibold">{s.nameFr}</span>
                <span className="text-[11px] text-muted-foreground" style={{ fontFamily: "serif" }}>{s.nameAr}</span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                {s.versesCount} versets · {s.revelationType}
              </p>
            </div>
            <BookOpen size={14} className="text-muted-foreground shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}
