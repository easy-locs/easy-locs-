import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Heart, Copy, ChevronDown, Share2 } from "lucide-react";
import { NAMES_OF_ALLAH } from "@/data/islamic/names-of-allah";
import { toast } from "sonner";

const GOLD = "hsl(var(--accent))";
const LS_FAVORITES_KEY = "islamic_names_favorites";

function loadFavorites(): number[] {
  try { const raw = localStorage.getItem(LS_FAVORITES_KEY); if (raw) return JSON.parse(raw); } catch {}
  return [];
}

function saveFavorites(favs: number[]): void {
  try { localStorage.setItem(LS_FAVORITES_KEY, JSON.stringify(favs)); } catch {}
}

export default function NamesOfAllahTab() {
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState<number[]>(loadFavorites);
  const [showFavorites, setShowFavorites] = useState(false);
  const [expandedName, setExpandedName] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  const toggleFavorite = useCallback((num: number) => {
    setFavorites(prev => {
      const updated = prev.includes(num) ? prev.filter(n => n !== num) : [...prev, num];
      saveFavorites(updated);
      return updated;
    });
  }, []);

  const copyName = useCallback(async (name: typeof NAMES_OF_ALLAH[0]) => {
    const text = `${name.arabic} — ${name.transliteration}\n${name.french}\n${name.meaning}`;
    try { await navigator.clipboard.writeText(text); toast.success("Nom copié"); } catch { toast.error("Impossible de copier"); }
  }, []);

  const shareName = useCallback(async (name: typeof NAMES_OF_ALLAH[0]) => {
    const text = `${name.arabic} — ${name.transliteration}\n${name.french}\n${name.meaning}`;
    if (navigator.share) { try { await navigator.share({ text }); } catch {} }
    else { await copyName(name); }
  }, [copyName]);

  const filtered = search
    ? NAMES_OF_ALLAH.filter(n =>
        n.transliteration.toLowerCase().includes(search.toLowerCase()) ||
        n.french.toLowerCase().includes(search.toLowerCase()) ||
        n.arabic.includes(search) ||
        n.meaning.toLowerCase().includes(search.toLowerCase()) ||
        String(n.number) === search
      )
    : NAMES_OF_ALLAH;

  const displayNames = showFavorites
    ? NAMES_OF_ALLAH.filter(n => favorites.includes(n.number))
    : filtered;

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-lg font-bold mb-1" style={{ color: GOLD }}>Asma ul-Husna</h2>
        <p className="text-xs text-muted-foreground">Les 99 Noms d'Allah</p>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setShowFavorites(false); }}
            placeholder="Rechercher un nom..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-card text-sm"
          />
        </div>
        <button
          onClick={() => setShowFavorites(!showFavorites)}
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${GOLD}18`, border: `1px solid ${GOLD}33` }}
        >
          <Heart size={18} style={{ color: GOLD }} fill={showFavorites ? GOLD : "none"} />
        </button>
      </div>

      <div className="flex gap-2">
        {(["list", "grid"] as const).map(mode => (
          <button key={mode} onClick={() => setViewMode(mode)}
            className="flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide"
            style={{ background: viewMode === mode ? `${GOLD}22` : "hsl(var(--muted)/0.3)", color: viewMode === mode ? GOLD : "hsl(var(--muted-foreground))" }}>
            {mode === "list" ? "Liste" : "Grille"}
          </button>
        ))}
      </div>

      {showFavorites && displayNames.length === 0 && (
        <div className="text-center py-8">
          <Heart size={24} className="mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Aucun nom favori</p>
        </div>
      )}

      {viewMode === "grid" ? (
        <div className="grid grid-cols-3 gap-2">
          {displayNames.map(name => {
            const isFav = favorites.includes(name.number);
            return (
              <button
                key={name.number}
                onClick={() => setExpandedName(expandedName === name.number ? null : name.number)}
                className="rounded-2xl p-3 text-center relative"
                style={{ background: "hsl(var(--card))", border: expandedName === name.number ? `1px solid ${GOLD}44` : "1px solid hsl(var(--border))" }}
              >
                <p className="text-lg mb-1" style={{ fontFamily: "'Amiri', 'Traditional Arabic', serif", color: GOLD }}>{name.arabic}</p>
                <p className="text-[9px] font-semibold truncate">{name.transliteration}</p>
                <p className="text-[8px] text-muted-foreground truncate">{name.french}</p>
                {isFav && <div className="absolute top-1 right-1 w-2 h-2 rounded-full" style={{ background: GOLD }} />}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2">
          {displayNames.map(name => {
            const isFav = favorites.includes(name.number);
            const isExpanded = expandedName === name.number;
            return (
              <div key={name.number}>
                <button
                  onClick={() => setExpandedName(isExpanded ? null : name.number)}
                  className="w-full rounded-2xl p-4 text-left"
                  style={{ background: "hsl(var(--card))", border: isExpanded ? `1px solid ${GOLD}44` : "1px solid hsl(var(--border))" }}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold"
                      style={{ background: `${GOLD}18`, color: GOLD }}>
                      {name.number}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2 mb-1">
                        <span className="text-sm font-semibold">{name.transliteration}</span>
                        <span className="text-lg shrink-0" style={{ fontFamily: "'Amiri', 'Traditional Arabic', serif", color: GOLD }}>
                          {name.arabic}
                        </span>
                      </div>
                      <p className="text-xs font-medium" style={{ color: GOLD }}>{name.french}</p>
                      <p className="text-[11px] text-muted-foreground mt-1">{name.meaning}</p>
                    </div>
                    <ChevronDown size={14} className="text-muted-foreground shrink-0 transition-transform" style={{ transform: isExpanded ? "rotate(180deg)" : undefined }} />
                  </div>
                </button>
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="flex gap-2 pt-2 px-4">
                        <button onClick={() => toggleFavorite(name.number)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold"
                          style={{ background: isFav ? `${GOLD}22` : "hsl(var(--muted)/0.3)", color: isFav ? GOLD : "hsl(var(--muted-foreground))" }}>
                          <Heart size={12} fill={isFav ? GOLD : "none"} /> {isFav ? "Retirer" : "Favori"}
                        </button>
                        <button onClick={() => copyName(name)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold" style={{ background: "hsl(var(--muted)/0.3)" }}>
                          <Copy size={12} /> Copier
                        </button>
                        <button onClick={() => shareName(name)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold" style={{ background: "hsl(var(--muted)/0.3)" }}>
                          <Share2 size={12} /> Partager
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      <div className="text-center">
        <p className="text-[10px] text-muted-foreground">
          {displayNames.length} nom{displayNames.length !== 1 ? "s" : ""} affiché{displayNames.length !== 1 ? "s" : ""}
        </p>
      </div>
    </div>
  );
}
