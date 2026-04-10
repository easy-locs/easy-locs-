import { memo, useState, useDeferredValue, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { useI18n, tSafe } from "@/lib/i18n";
import { Search, X } from "lucide-react";
import { searchMenu } from "@/lib/menu/menu-engine";
import type { MenuContext } from "@/lib/menu/menu-types";

interface MenuSearchBarProps {
  ctx: MenuContext;
  onSelect?: () => void;
  placeholder?: string;
}

export const MenuSearchBar = memo(function MenuSearchBar({ ctx, onSelect, placeholder }: MenuSearchBarProps) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const results = useMemo(
    () => searchMenu(deferredQuery, ctx, 12),
    [deferredQuery, ctx],
  );

  const clear = useCallback(() => setQuery(""), []);

  const displayPlaceholder = placeholder ?? tSafe(t, "menu.search_placeholder", "Search services...");

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={displayPlaceholder}
          className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-border/20 bg-accent/5 text-sm focus:outline-none focus:ring-2"
          style={{ fontSize: 16, borderColor: "hsl(220 40% 18% / 0.1)" }}
        />
        {query && (
          <button onClick={clear} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {results.length > 0 && (
        <div
          className="absolute top-full left-0 right-0 mt-1 rounded-xl border shadow-lg z-50 max-h-[320px] overflow-y-auto"
          style={{ background: "var(--background, #fff)", borderColor: "hsl(220 40% 18% / 0.1)" }}
        >
          {results.map(r => (
            <Link
              key={r.node.id}
              to={r.node.route}
              onClick={() => { clear(); onSelect?.(); }}
              className="flex items-center gap-3 px-3 py-2.5 hover:bg-accent/5 transition-colors"
            >
              {r.node.emoji && <span className="text-base">{r.node.emoji}</span>}
              {r.node.icon && !r.node.emoji && (
                <r.node.icon className="w-4 h-4 text-muted-foreground" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{r.node.label}</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {r.breadcrumb.join(" › ")}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
});
