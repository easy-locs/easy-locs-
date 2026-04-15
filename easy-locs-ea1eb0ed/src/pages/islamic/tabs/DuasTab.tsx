import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { ChevronDown, RotateCcw } from "lucide-react";
import { DUA_CATEGORIES, type DuaCategory, type Dua } from "@/data/islamic/duas-adhkar";

const GOLD = "hsl(var(--accent))";

export default function DuasTab() {
  const [expandedCategory, setExpandedCategory] = useState<string | null>("morning");
  const [counters, setCounters] = useState<Record<string, number>>({});

  const toggleCategory = useCallback((id: string) => {
    setExpandedCategory(prev => prev === id ? null : id);
  }, []);

  const incrementCounter = useCallback((duaId: string) => {
    setCounters(prev => ({ ...prev, [duaId]: (prev[duaId] ?? 0) + 1 }));
  }, []);

  const resetCounter = useCallback((duaId: string) => {
    setCounters(prev => ({ ...prev, [duaId]: 0 }));
  }, []);

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-lg font-bold mb-1" style={{ color: GOLD }}>Duas & Adhkar</h2>
        <p className="text-xs text-muted-foreground">Invocations quotidiennes</p>
      </div>

      <div className="space-y-2">
        {DUA_CATEGORIES.map(cat => {
          const isOpen = expandedCategory === cat.id;
          return (
            <div key={cat.id} className="rounded-2xl overflow-hidden" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
              <button
                onClick={() => toggleCategory(cat.id)}
                className="w-full flex items-center gap-3 p-4 text-left"
              >
                <span className="text-2xl">{cat.emoji}</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{cat.name}</p>
                  <p className="text-[10px] text-muted-foreground">{cat.duas.length} invocations</p>
                </div>
                <ChevronDown
                  size={18}
                  className="text-muted-foreground transition-transform"
                  style={{ transform: isOpen ? "rotate(180deg)" : undefined }}
                />
              </button>

              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  className="px-4 pb-4 space-y-3"
                >
                  {cat.duas.map(dua => {
                    const count = counters[dua.id] ?? 0;
                    const completed = dua.repetitions > 1 && count >= dua.repetitions;
                    return (
                      <div
                        key={dua.id}
                        className="rounded-xl p-3 space-y-2"
                        style={{
                          background: completed ? `${GOLD}12` : "hsl(var(--muted)/0.3)",
                          border: completed ? `1px solid ${GOLD}44` : "1px solid transparent",
                        }}
                      >
                        <p className="text-right text-base leading-loose" style={{ fontFamily: "'Amiri', 'Traditional Arabic', serif", direction: "rtl" }}>
                          {dua.arabic}
                        </p>
                        <p className="text-[11px] italic text-muted-foreground">{dua.transliteration}</p>
                        <p className="text-xs">{dua.french}</p>
                        {dua.source && (
                          <p className="text-[9px] text-muted-foreground">Source : {dua.source}</p>
                        )}

                        {dua.repetitions > 1 && (
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              onClick={() => incrementCounter(dua.id)}
                              className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
                              style={{
                                background: completed ? `${GOLD}33` : `${GOLD}18`,
                                color: GOLD,
                              }}
                            >
                              {count} / {dua.repetitions}
                            </button>
                            <button
                              onClick={() => resetCounter(dua.id)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center"
                              style={{ background: "hsl(var(--muted)/0.5)" }}
                            >
                              <RotateCcw size={12} className="text-muted-foreground" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </motion.div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
