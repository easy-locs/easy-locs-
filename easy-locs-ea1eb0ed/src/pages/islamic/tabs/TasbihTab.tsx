import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { RotateCcw, History, Trash2 } from "lucide-react";

const GOLD = "hsl(var(--accent))";
const NAVY = "hsl(226 22% 14%)";

const PRESETS = [
  { id: "subhanallah", arabic: "سُبْحَانَ اللَّهِ", transliteration: "SubhanAllah", french: "Gloire à Allah", target: 33 },
  { id: "alhamdulillah", arabic: "الْحَمْدُ لِلَّهِ", transliteration: "Alhamdulillah", french: "Louange à Allah", target: 33 },
  { id: "allahuakbar", arabic: "اللَّهُ أَكْبَرُ", transliteration: "Allahu Akbar", french: "Allah est le Plus Grand", target: 34 },
  { id: "free", arabic: "حر", transliteration: "Libre", french: "Compteur libre", target: 0 },
];

interface TasbihSession {
  id: string;
  dhikr: string;
  count: number;
  target: number;
  date: string;
}

const STORAGE_KEY = "tasbih_sessions";

function loadSessions(): TasbihSession[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveSessions(sessions: TasbihSession[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(-50)));
}

export default function TasbihTab() {
  const [activePreset, setActivePreset] = useState(PRESETS[0]);
  const [count, setCount] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [sessions, setSessions] = useState<TasbihSession[]>([]);

  useEffect(() => {
    setSessions(loadSessions());
  }, []);

  const handleTap = useCallback(() => {
    setCount(prev => {
      const next = prev + 1;
      if (activePreset.target > 0 && next >= activePreset.target) {
        if (navigator.vibrate) navigator.vibrate(200);
      } else {
        if (navigator.vibrate) navigator.vibrate(30);
      }
      return next;
    });
  }, [activePreset.target]);

  const handleReset = useCallback(() => {
    if (count > 0) {
      const session: TasbihSession = {
        id: Date.now().toString(),
        dhikr: activePreset.transliteration,
        count,
        target: activePreset.target,
        date: new Date().toLocaleString("fr-FR"),
      };
      const updated = [...sessions, session];
      setSessions(updated);
      saveSessions(updated);
    }
    setCount(0);
  }, [count, activePreset, sessions]);

  const clearHistory = useCallback(() => {
    setSessions([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const progress = activePreset.target > 0 ? Math.min((count / activePreset.target) * 100, 100) : 0;
  const completed = activePreset.target > 0 && count >= activePreset.target;

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h2 className="text-lg font-bold mb-1" style={{ color: GOLD }}>Compteur Tasbih</h2>
        <p className="text-xs text-muted-foreground">Dhikr digital</p>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {PRESETS.map(p => {
          const isActive = activePreset.id === p.id;
          return (
            <button
              key={p.id}
              onClick={() => { setActivePreset(p); setCount(0); }}
              className="flex flex-col items-center gap-1 py-2 rounded-xl text-[9px] font-semibold transition-all"
              style={{
                background: isActive ? `${GOLD}22` : "hsl(var(--muted)/0.3)",
                color: isActive ? GOLD : "hsl(var(--muted-foreground))",
                border: isActive ? `1px solid ${GOLD}44` : "1px solid transparent",
              }}
            >
              <span className="text-base" style={{ fontFamily: "serif" }}>{p.arabic}</span>
              {p.transliteration}
            </button>
          );
        })}
      </div>

      <div className="flex justify-center">
        <button
          onClick={handleTap}
          className="relative w-52 h-52 rounded-full flex flex-col items-center justify-center transition-transform active:scale-95"
          style={{
            background: `linear-gradient(135deg, ${NAVY} 0%, hsl(226 22% 20%) 100%)`,
            border: `3px solid ${completed ? GOLD : `${GOLD}44`}`,
            boxShadow: completed ? `0 0 40px ${GOLD}33` : `0 0 20px ${GOLD}11`,
          }}
        >
          <svg className="absolute inset-0" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="47" fill="none" stroke={`${GOLD}22`} strokeWidth="2" />
            {activePreset.target > 0 && (
              <motion.circle
                cx="50" cy="50" r="47"
                fill="none"
                stroke={GOLD}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray={295.3}
                animate={{ strokeDashoffset: 295.3 - (295.3 * progress) / 100 }}
                transition={{ duration: 0.3 }}
                transform="rotate(-90 50 50)"
              />
            )}
          </svg>

          <p className="text-4xl font-extrabold tabular-nums" style={{ color: completed ? GOLD : "#fff" }}>
            {count}
          </p>
          {activePreset.target > 0 && (
            <p className="text-xs text-muted-foreground mt-1">/ {activePreset.target}</p>
          )}
          <p className="text-[10px] mt-2" style={{ color: `${GOLD}99`, fontFamily: "serif" }}>
            {activePreset.arabic}
          </p>
        </button>
      </div>

      <div className="flex items-center justify-center gap-4">
        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold"
          style={{ background: `${GOLD}18`, color: GOLD }}
        >
          <RotateCcw size={14} />
          Réinitialiser
        </button>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold"
          style={{ background: "hsl(var(--muted)/0.3)" }}
        >
          <History size={14} />
          Historique
        </button>
      </div>

      {showHistory && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Sessions ({sessions.length})
            </h3>
            {sessions.length > 0 && (
              <button onClick={clearHistory} className="text-[10px] text-destructive flex items-center gap-1">
                <Trash2 size={10} /> Effacer
              </button>
            )}
          </div>
          {sessions.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">Aucune session enregistrée.</p>
          )}
          {sessions.slice().reverse().slice(0, 20).map(s => (
            <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl"
              style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
              <div className="flex-1">
                <p className="text-xs font-semibold">{s.dhikr}</p>
                <p className="text-[10px] text-muted-foreground">{s.date}</p>
              </div>
              <p className="text-sm font-bold tabular-nums" style={{ color: GOLD }}>
                {s.count}{s.target > 0 ? `/${s.target}` : ""}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
