import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { ChevronDown, RotateCcw, Search, Heart, Copy, Share2, Volume2, VolumeX } from "lucide-react";
import { DUA_CATEGORIES, type Dua } from "@/data/islamic/duas-adhkar";
import { toast } from "sonner";
import { speakArabic, speakText, cancelTTS } from "@/lib/islamic/tts-engine";
import { buildDuaShareText, shareIslamicContent, getWhatsAppLink } from "@/lib/islamic/islamic-share";

const GOLD = "hsl(var(--accent))";
const LS_COUNTERS_KEY = "islamic_dua_counters";
const LS_DUA_FAVORITES_KEY = "islamic_dua_favorites";
const LS_DAILY_COUNT_KEY = "islamic_daily_adhkar";

function loadCounters(): Record<string, number> {
  try { const raw = localStorage.getItem(LS_COUNTERS_KEY); if (raw) return JSON.parse(raw); } catch {}
  return {};
}

function saveCounters(counters: Record<string, number>): void {
  try { localStorage.setItem(LS_COUNTERS_KEY, JSON.stringify(counters)); } catch {}
}

function loadFavorites(): string[] {
  try { const raw = localStorage.getItem(LS_DUA_FAVORITES_KEY); if (raw) return JSON.parse(raw); } catch {}
  return [];
}

function saveFavorites(favs: string[]): void {
  try { localStorage.setItem(LS_DUA_FAVORITES_KEY, JSON.stringify(favs)); } catch {}
}

function loadDailyCount(): { date: string; count: number } {
  try { const raw = localStorage.getItem(LS_DAILY_COUNT_KEY); if (raw) return JSON.parse(raw); } catch {}
  return { date: "", count: 0 };
}

function incrementDailyCount(): number {
  const today = new Date().toISOString().slice(0, 10);
  const current = loadDailyCount();
  const count = current.date === today ? current.count + 1 : 1;
  try { localStorage.setItem(LS_DAILY_COUNT_KEY, JSON.stringify({ date: today, count })); } catch {}
  return count;
}

export default function DuasTab() {
  const [expandedCategory, setExpandedCategory] = useState<string | null>("morning");
  const [counters, setCounters] = useState<Record<string, number>>(loadCounters);
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState<string[]>(loadFavorites);
  const [showFavorites, setShowFavorites] = useState(false);
  const [dailyCount, setDailyCount] = useState(() => {
    const d = loadDailyCount();
    return d.date === new Date().toISOString().slice(0, 10) ? d.count : 0;
  });
  const [speakingDua, setSpeakingDua] = useState<string | null>(null);

  const toggleCategory = useCallback((id: string) => {
    setExpandedCategory(prev => prev === id ? null : id);
  }, []);

  const incrementCounter = useCallback((duaId: string) => {
    setCounters(prev => {
      const updated = { ...prev, [duaId]: (prev[duaId] ?? 0) + 1 };
      saveCounters(updated);
      return updated;
    });
    setDailyCount(incrementDailyCount());
  }, []);

  const resetCounter = useCallback((duaId: string) => {
    setCounters(prev => {
      const updated = { ...prev, [duaId]: 0 };
      saveCounters(updated);
      return updated;
    });
  }, []);

  const toggleFavorite = useCallback((duaId: string) => {
    setFavorites(prev => {
      const updated = prev.includes(duaId) ? prev.filter(id => id !== duaId) : [...prev, duaId];
      saveFavorites(updated);
      return updated;
    });
  }, []);

  const copyDua = useCallback(async (dua: Dua) => {
    const text = buildDuaShareText({ arabic: dua.arabic, transliteration: dua.transliteration, french: dua.french, source: dua.source });
    try { await navigator.clipboard.writeText(text); toast.success("Dua copié"); } catch { toast.error("Impossible de copier"); }
  }, []);

  const shareDua = useCallback(async (dua: Dua) => {
    const text = buildDuaShareText({ arabic: dua.arabic, transliteration: dua.transliteration, french: dua.french, source: dua.source });
    shareIslamicContent({ text, title: "Dua" });
  }, []);

  const shareDuaWhatsApp = useCallback((dua: Dua) => {
    const text = buildDuaShareText({ arabic: dua.arabic, transliteration: dua.transliteration, french: dua.french, source: dua.source });
    window.open(getWhatsAppLink(text), "_blank", "noopener,noreferrer");
  }, []);

  const speakDua = useCallback((dua: Dua) => {
    if (speakingDua === dua.id) {
      cancelTTS();
      setSpeakingDua(null);
      return;
    }
    cancelTTS();
    setSpeakingDua(dua.id);
    speakArabic(dua.arabic, {
      onEnd: () => {
        setTimeout(() => {
          speakText(dua.french, "fr-FR", {
            rate: 0.9,
            onEnd: () => setSpeakingDua(null),
            onError: () => setSpeakingDua(null),
          });
        }, 400);
      },
      onError: () => setSpeakingDua(null),
    });
  }, [speakingDua]);

  const allDuas = DUA_CATEGORIES.flatMap(cat => cat.duas);
  const filteredCategories = search
    ? DUA_CATEGORIES.map(cat => ({
        ...cat,
        duas: cat.duas.filter(d =>
          d.arabic.includes(search) ||
          d.transliteration.toLowerCase().includes(search.toLowerCase()) ||
          d.french.toLowerCase().includes(search.toLowerCase())
        ),
      })).filter(cat => cat.duas.length > 0)
    : DUA_CATEGORIES;

  const favoriteDuas = allDuas.filter(d => favorites.includes(d.id));

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-lg font-bold mb-1" style={{ color: GOLD }}>Duas & Adhkar</h2>
        <p className="text-xs text-muted-foreground">Invocations quotidiennes</p>
      </div>

      {dailyCount > 0 && (
        <div className="rounded-2xl p-3 text-center" style={{ background: `${GOLD}12`, border: `1px solid ${GOLD}33` }}>
          <p className="text-xs font-semibold" style={{ color: GOLD }}>
            {dailyCount} adhkar récité{dailyCount > 1 ? "s" : ""} aujourd'hui
          </p>
        </div>
      )}

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher une dua..." className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-card text-sm" />
        </div>
        <button onClick={() => setShowFavorites(!showFavorites)} className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${GOLD}18`, border: `1px solid ${GOLD}33` }}>
          <Heart size={18} style={{ color: GOLD }} fill={showFavorites ? GOLD : "none"} />
        </button>
      </div>

      {showFavorites && (
        <div className="space-y-2">
          <h3 className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Favoris ({favoriteDuas.length})</h3>
          {favoriteDuas.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Aucun favori</p>}
          {favoriteDuas.map(dua => (
            <DuaCard key={dua.id} dua={dua} count={counters[dua.id] ?? 0} isFavorite={true} isSpeaking={speakingDua === dua.id}
              onIncrement={() => incrementCounter(dua.id)} onReset={() => resetCounter(dua.id)}
              onToggleFavorite={() => toggleFavorite(dua.id)} onCopy={() => copyDua(dua)}
              onShare={() => shareDua(dua)} onSpeak={() => speakDua(dua)} onShareWhatsApp={() => shareDuaWhatsApp(dua)} />
          ))}
        </div>
      )}

      {!showFavorites && (
        <div className="space-y-2">
          {filteredCategories.map(cat => {
            const isOpen = expandedCategory === cat.id || search.length > 0;
            return (
              <div key={cat.id} className="rounded-2xl overflow-hidden" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
                <button onClick={() => toggleCategory(cat.id)} className="w-full flex items-center gap-3 p-4 text-left">
                  <span className="text-2xl">{cat.emoji}</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{cat.name}</p>
                    <p className="text-[10px] text-muted-foreground">{cat.duas.length} invocations</p>
                  </div>
                  <ChevronDown size={18} className="text-muted-foreground transition-transform" style={{ transform: isOpen ? "rotate(180deg)" : undefined }} />
                </button>
                {isOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="px-4 pb-4 space-y-3">
                    {cat.duas.map(dua => (
                      <DuaCard key={dua.id} dua={dua} count={counters[dua.id] ?? 0} isFavorite={favorites.includes(dua.id)} isSpeaking={speakingDua === dua.id}
                        onIncrement={() => incrementCounter(dua.id)} onReset={() => resetCounter(dua.id)}
                        onToggleFavorite={() => toggleFavorite(dua.id)} onCopy={() => copyDua(dua)}
                        onShare={() => shareDua(dua)} onSpeak={() => speakDua(dua)} onShareWhatsApp={() => shareDuaWhatsApp(dua)} />
                    ))}
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DuaCard({
  dua, count, isFavorite, isSpeaking, onIncrement, onReset, onToggleFavorite, onCopy, onShare, onSpeak, onShareWhatsApp,
}: {
  dua: Dua; count: number; isFavorite: boolean; isSpeaking: boolean;
  onIncrement: () => void; onReset: () => void; onToggleFavorite: () => void;
  onCopy: () => void; onShare: () => void; onSpeak: () => void; onShareWhatsApp: () => void;
}) {
  const completed = dua.repetitions > 1 && count >= dua.repetitions;
  return (
    <div className="rounded-xl p-3 space-y-2" style={{ background: completed ? `${GOLD}12` : "hsl(var(--muted)/0.3)", border: completed ? `1px solid ${GOLD}44` : "1px solid transparent" }}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-right text-base leading-loose flex-1" style={{ fontFamily: "'Amiri', 'Traditional Arabic', serif", direction: "rtl" }}>{dua.arabic}</p>
        <div className="flex gap-1 shrink-0">
          <button onClick={onSpeak} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: isSpeaking ? `${GOLD}22` : "transparent" }}>
            {isSpeaking ? <VolumeX size={12} style={{ color: GOLD }} /> : <Volume2 size={12} className="text-muted-foreground" />}
          </button>
          <button onClick={onToggleFavorite} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: isFavorite ? `${GOLD}22` : "transparent" }}>
            <Heart size={12} fill={isFavorite ? GOLD : "none"} style={{ color: isFavorite ? GOLD : "hsl(var(--muted-foreground))" }} />
          </button>
          <button onClick={onCopy} className="w-7 h-7 rounded-full flex items-center justify-center"><Copy size={12} className="text-muted-foreground" /></button>
          <button onClick={onShare} className="w-7 h-7 rounded-full flex items-center justify-center"><Share2 size={12} className="text-muted-foreground" /></button>
        </div>
      </div>
      <p className="text-[11px] italic text-muted-foreground">{dua.transliteration}</p>
      <p className="text-xs">{dua.french}</p>
      {dua.source && <p className="text-[9px] text-muted-foreground">Source : {dua.source}</p>}
      {dua.repetitions > 1 && (
        <div className="flex items-center gap-2 pt-1">
          <button onClick={onIncrement} className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all" style={{ background: completed ? `${GOLD}33` : `${GOLD}18`, color: GOLD }}>
            {count} / {dua.repetitions}
          </button>
          <button onClick={onReset} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "hsl(var(--muted)/0.5)" }}>
            <RotateCcw size={12} className="text-muted-foreground" />
          </button>
        </div>
      )}
    </div>
  );
}
