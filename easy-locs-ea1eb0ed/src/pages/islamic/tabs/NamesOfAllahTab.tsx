import { useState } from "react";
import { Search } from "lucide-react";
import { NAMES_OF_ALLAH } from "@/data/islamic/names-of-allah";

const GOLD = "hsl(var(--accent))";

export default function NamesOfAllahTab() {
  const [search, setSearch] = useState("");

  const filtered = search
    ? NAMES_OF_ALLAH.filter(n =>
        n.transliteration.toLowerCase().includes(search.toLowerCase()) ||
        n.french.toLowerCase().includes(search.toLowerCase()) ||
        n.arabic.includes(search) ||
        String(n.number) === search
      )
    : NAMES_OF_ALLAH;

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-lg font-bold mb-1" style={{ color: GOLD }}>Asma ul-Husna</h2>
        <p className="text-xs text-muted-foreground">Les 99 Noms d'Allah</p>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher un nom..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-card text-sm"
        />
      </div>

      <div className="grid grid-cols-1 gap-2">
        {filtered.map(name => (
          <div
            key={name.number}
            className="rounded-2xl p-4"
            style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
          >
            <div className="flex items-start gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold"
                style={{ background: `${GOLD}18`, color: GOLD }}
              >
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
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
