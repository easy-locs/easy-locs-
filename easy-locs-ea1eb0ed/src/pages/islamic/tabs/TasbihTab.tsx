import { useState, useCallback, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { RotateCcw, History, Trash2, Plus, Edit3, Check, X, Volume2, VolumeX } from "lucide-react";
import { playTasbihClick, isTasbihSoundEnabled, setTasbihSoundEnabled } from "@/lib/islamic/tasbih-sound";
import { useI18n } from "@/lib/i18n";

const GOLD = "hsl(var(--accent))";
const NAVY = "hsl(226 22% 14%)";

interface TasbihPreset {
  id: string;
  arabic: string;
  transliteration: string;
  french: string;
  target: number;
  custom?: boolean;
}

const DEFAULT_PRESETS: TasbihPreset[] = [
  { id: "subhanallah", arabic: "سُبْحَانَ اللَّهِ", transliteration: "SubhanAllah", french: "Gloire à Allah", target: 33 },
  { id: "alhamdulillah", arabic: "الْحَمْدُ لِلَّهِ", transliteration: "Alhamdulillah", french: "Louange à Allah", target: 33 },
  { id: "allahuakbar", arabic: "اللَّهُ أَكْبَرُ", transliteration: "Allahu Akbar", french: "Allah est le Plus Grand", target: 34 },
  { id: "lailahaillallah", arabic: "لَا إِلَهَ إِلَّا اللَّهُ", transliteration: "La ilaha illallah", french: "Il n'y a de divinité qu'Allah", target: 100 },
  { id: "astaghfirullah", arabic: "أَسْتَغْفِرُ اللَّهَ", transliteration: "Astaghfirullah", french: "Je demande pardon à Allah", target: 100 },
  { id: "salawat", arabic: "اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ", transliteration: "Allahumma salli 'ala Muhammad", french: "Prière sur le Prophète", target: 100 },
  { id: "hawqala", arabic: "لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ", transliteration: "La hawla wa la quwwata illa billah", french: "Pas de force ni de puissance sauf en Allah", target: 33 },
  { id: "free", arabic: "حر", transliteration: "Libre", french: "Compteur libre", target: 0 },
];

interface TasbihSession {
  id: string;
  dhikr: string;
  count: number;
  target: number;
  date: string;
}

const SESSIONS_KEY = "tasbih_sessions";
const CUSTOM_PRESETS_KEY = "tasbih_custom_presets";
const DAILY_KEY = "tasbih_daily_stats";

function loadSessions(): TasbihSession[] {
  try { return JSON.parse(localStorage.getItem(SESSIONS_KEY) ?? "[]"); } catch { return []; }
}

function saveSessions(sessions: TasbihSession[]) {
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions.slice(-100)));
}

function loadCustomPresets(): TasbihPreset[] {
  try { return JSON.parse(localStorage.getItem(CUSTOM_PRESETS_KEY) ?? "[]"); } catch { return []; }
}

function saveCustomPresets(presets: TasbihPreset[]) {
  localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(presets));
}

function getLocalDateKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getDailyCount(): number {
  try {
    const raw = JSON.parse(localStorage.getItem(DAILY_KEY) ?? "{}");
    const today = getLocalDateKey();
    return raw.date === today ? raw.count : 0;
  } catch { return 0; }
}

function incrementDaily(): number {
  const today = getLocalDateKey();
  const current = getDailyCount();
  const next = current + 1;
  localStorage.setItem(DAILY_KEY, JSON.stringify({ date: today, count: next }));
  return next;
}

export default function TasbihTab() {
  const { t, locale } = useI18n();
  const allPresets = [...DEFAULT_PRESETS, ...loadCustomPresets()];
  const [activePreset, setActivePreset] = useState(allPresets[0]);
  const [count, setCount] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [sessions, setSessions] = useState<TasbihSession[]>([]);
  const [dailyCount, setDailyCount] = useState(getDailyCount);
  const [showAddDhikr, setShowAddDhikr] = useState(false);
  const [newDhikrName, setNewDhikrName] = useState("");
  const [newDhikrTarget, setNewDhikrTarget] = useState("33");
  const [customPresets, setCustomPresets] = useState<TasbihPreset[]>(loadCustomPresets);
  const [hapticEnabled, setHapticEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(isTasbihSoundEnabled);
  const prevCountRef = useRef(0);

  useEffect(() => { setSessions(loadSessions()); }, []);

  const handleTap = useCallback(() => {
    setCount(prev => {
      const next = prev + 1;
      const isCompleted = activePreset.target > 0 && next >= activePreset.target;

      if (hapticEnabled && navigator.vibrate) {
        if (isCompleted) {
          navigator.vibrate([100, 50, 100, 50, 200]);
        } else if (next % 10 === 0) {
          navigator.vibrate(50);
        } else {
          navigator.vibrate(15);
        }
      }

      playTasbihClick(isCompleted);

      return next;
    });
    setDailyCount(incrementDaily());
  }, [activePreset.target, hapticEnabled]);

  const handleReset = useCallback(() => {
    if (count > 0) {
      const session: TasbihSession = {
        id: Date.now().toString(),
        dhikr: activePreset.transliteration,
        count,
        target: activePreset.target,
        date: new Date().toLocaleString(locale),
      };
      const updated = [...sessions, session];
      setSessions(updated);
      saveSessions(updated);
    }
    setCount(0);
    prevCountRef.current = 0;
  }, [count, activePreset, sessions, locale]);

  const clearHistory = useCallback(() => {
    setSessions([]);
    localStorage.removeItem(SESSIONS_KEY);
  }, []);

  const addCustomDhikr = useCallback(() => {
    if (!newDhikrName.trim()) return;
    const preset: TasbihPreset = {
      id: `custom_${Date.now()}`,
      arabic: newDhikrName,
      transliteration: newDhikrName,
      french: newDhikrName,
      target: parseInt(newDhikrTarget) || 0,
      custom: true,
    };
    const updated = [...customPresets, preset];
    setCustomPresets(updated);
    saveCustomPresets(updated);
    setNewDhikrName("");
    setNewDhikrTarget("33");
    setShowAddDhikr(false);
    setActivePreset(preset);
    setCount(0);
  }, [newDhikrName, newDhikrTarget, customPresets]);

  const removeCustomPreset = useCallback((id: string) => {
    const updated = customPresets.filter(p => p.id !== id);
    setCustomPresets(updated);
    saveCustomPresets(updated);
    if (activePreset.id === id) {
      setActivePreset(DEFAULT_PRESETS[0]);
      setCount(0);
    }
  }, [customPresets, activePreset.id]);

  const toggleSound = useCallback(() => {
    const newVal = !soundEnabled;
    setSoundEnabled(newVal);
    setTasbihSoundEnabled(newVal);
  }, [soundEnabled]);

  const progress = activePreset.target > 0 ? Math.min((count / activePreset.target) * 100, 100) : 0;
  const completed = activePreset.target > 0 && count >= activePreset.target;
  const totalDhikrToday = dailyCount;
  const presetsToShow = [...DEFAULT_PRESETS, ...customPresets];

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h2 className="text-lg font-bold mb-1" style={{ color: GOLD }}>{t("islamic.tasbih.title")}</h2>
        <p className="text-xs text-muted-foreground">{totalDhikrToday} {t("islamic.tasbih.dhikr_today")}</p>
      </div>

      <div className="flex flex-wrap gap-2 justify-center">
        {presetsToShow.map(p => {
          const isActive = activePreset.id === p.id;
          return (
            <button key={p.id} onClick={() => { setActivePreset(p); setCount(0); }}
              className="flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-xl text-[9px] font-semibold transition-all relative group"
              style={{ background: isActive ? `${GOLD}22` : "hsl(var(--muted)/0.3)", color: isActive ? GOLD : "hsl(var(--muted-foreground))", border: isActive ? `1px solid ${GOLD}44` : "1px solid transparent" }}>
              <span className="text-sm" style={{ fontFamily: "'Amiri', 'Traditional Arabic', serif" }}>{p.arabic}</span>
              <span className="truncate max-w-[60px]">{p.transliteration}</span>
              {p.custom && (
                <button onClick={e => { e.stopPropagation(); removeCustomPreset(p.id); }}
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <X size={8} className="text-white" />
                </button>
              )}
            </button>
          );
        })}
        <button onClick={() => setShowAddDhikr(true)} className="flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-xl text-[9px] font-semibold"
          style={{ background: "hsl(var(--muted)/0.3)", border: "1px dashed hsl(var(--border))" }}>
          <Plus size={16} className="text-muted-foreground" />
          <span>{t("islamic.tasbih.add")}</span>
        </button>
      </div>

      {showAddDhikr && (
        <div className="rounded-2xl p-4 space-y-3" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold flex items-center gap-1"><Edit3 size={12} /> {t("islamic.tasbih.add_dhikr")}</p>
            <button onClick={() => setShowAddDhikr(false)}><X size={16} className="text-muted-foreground" /></button>
          </div>
          <input type="text" value={newDhikrName} onChange={e => setNewDhikrName(e.target.value)} placeholder={t("islamic.tasbih.dhikr_name")} className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm" />
          <input type="number" value={newDhikrTarget} onChange={e => setNewDhikrTarget(e.target.value)} placeholder={t("islamic.tasbih.target")} className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm" />
          <button onClick={addCustomDhikr} className="w-full py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2" style={{ background: GOLD, color: NAVY }}>
            <Check size={14} /> {t("islamic.tasbih.add")}
          </button>
        </div>
      )}

      <div className="flex justify-center">
        <button onClick={handleTap}
          className="relative w-56 h-56 rounded-full flex flex-col items-center justify-center transition-transform active:scale-95 select-none"
          style={{
            background: `linear-gradient(135deg, ${NAVY} 0%, hsl(226 22% 20%) 100%)`,
            border: `3px solid ${completed ? GOLD : `${GOLD}44`}`,
            boxShadow: completed ? `0 0 40px ${GOLD}33, 0 0 80px ${GOLD}11` : `0 0 20px ${GOLD}11`,
          }}>
          <svg className="absolute inset-0" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="47" fill="none" stroke={`${GOLD}22`} strokeWidth="2" />
            {activePreset.target > 0 && (
              <motion.circle cx="50" cy="50" r="47" fill="none" stroke={completed ? "#4ade80" : GOLD} strokeWidth="2.5" strokeLinecap="round"
                strokeDasharray={295.3} animate={{ strokeDashoffset: 295.3 - (295.3 * progress) / 100 }} transition={{ duration: 0.3 }} transform="rotate(-90 50 50)" />
            )}
          </svg>
          <p className="text-4xl font-extrabold tabular-nums" style={{ color: completed ? "#4ade80" : "#fff" }}>{count}</p>
          {activePreset.target > 0 && <p className="text-xs text-muted-foreground mt-1">/ {activePreset.target}</p>}
          <p className="text-[10px] mt-2 px-4 text-center" style={{ color: `${GOLD}99`, fontFamily: "'Amiri', 'Traditional Arabic', serif" }}>{activePreset.arabic}</p>
          {completed && (
            <motion.p initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="text-[9px] font-bold mt-1" style={{ color: "#4ade80" }}>{t("islamic.tasbih.completed")}</motion.p>
          )}
        </button>
      </div>

      <div className="flex items-center justify-center gap-3">
        <button onClick={handleReset} className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold" style={{ background: `${GOLD}18`, color: GOLD }}>
          <RotateCcw size={14} /> {t("islamic.tasbih.reset")}
        </button>
        <button onClick={() => setShowHistory(!showHistory)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold" style={{ background: "hsl(var(--muted)/0.3)" }}>
          <History size={14} /> {t("islamic.tasbih.history")}
        </button>
        <button onClick={() => setHapticEnabled(!hapticEnabled)} className="px-3 py-2 rounded-xl text-xs font-semibold"
          style={{ background: hapticEnabled ? `${GOLD}22` : "hsl(var(--muted)/0.3)", color: hapticEnabled ? GOLD : "hsl(var(--muted-foreground))" }}>
          {hapticEnabled ? "📳" : "🔇"}
        </button>
        <button onClick={toggleSound} className="px-3 py-2 rounded-xl text-xs font-semibold"
          style={{ background: soundEnabled ? `${GOLD}22` : "hsl(var(--muted)/0.3)", color: soundEnabled ? GOLD : "hsl(var(--muted-foreground))" }}>
          {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
        </button>
      </div>

      {showHistory && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{t("islamic.tasbih.sessions")} ({sessions.length})</h3>
            {sessions.length > 0 && (
              <button onClick={clearHistory} className="text-[10px] text-destructive flex items-center gap-1"><Trash2 size={10} /> {t("islamic.tasbih.clear")}</button>
            )}
          </div>
          {sessions.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">{t("islamic.tasbih.no_sessions")}</p>}
          {sessions.slice().reverse().slice(0, 30).map(s => (
            <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
              <div className="flex-1">
                <p className="text-xs font-semibold">{s.dhikr}</p>
                <p className="text-[10px] text-muted-foreground">{s.date}</p>
              </div>
              <p className="text-sm font-bold tabular-nums" style={{ color: s.target > 0 && s.count >= s.target ? "#4ade80" : GOLD }}>
                {s.count}{s.target > 0 ? `/${s.target}` : ""}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
