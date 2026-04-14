import { memo, useState, useMemo } from "react";
import { useI18n, tSafe } from "@/lib/i18n";
import { getFilteredVerticals, getVerticalSubMenu } from "@/lib/menu/menu-engine";
import { useMenuContext } from "@/lib/menu/useMenuContext";
import { MenuItem } from "./MenuItem";
import { MenuSearchBar } from "./MenuSearchBar";
import type { UserRole } from "@/lib/menu/menu-types";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft } from "lucide-react";

interface CategoryMenuProps {
  role?: UserRole;
  countryCode?: string;
  onSelect?: () => void;
}

export const CategoryMenu = memo(function CategoryMenu({ role = "user", countryCode = "XX", onSelect }: CategoryMenuProps) {
  const { t } = useI18n();
  const ctx = useMenuContext(role, countryCode);
  const [selectedVertical, setSelectedVertical] = useState<string | null>(null);

  const verticals = useMemo(() => getFilteredVerticals(ctx), [ctx]);

  const subMenu = useMemo(() => {
    if (!selectedVertical) return [];
    return getVerticalSubMenu(selectedVertical, ctx);
  }, [selectedVertical, ctx]);

  return (
    <div className="flex flex-col h-full">
      <div className="p-3">
        <MenuSearchBar ctx={ctx} onSelect={onSelect} />
      </div>

      <AnimatePresence mode="wait">
        {!selectedVertical ? (
          <motion.div
            key="verticals"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.15 }}
            className="flex-1 overflow-y-auto px-1"
          >
            <div className="px-3 py-2">
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "hsl(226 24% 14% / 0.5)" }}>
                {tSafe(t, "menu.all_services", "All Services")}
              </span>
            </div>
            {verticals.map(v => (
              <button
                key={v.id}
                onClick={() => setSelectedVertical(v.slug)}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 w-full text-left active:scale-[0.98] transition-all hover:bg-accent/5"
              >
                {v.emoji && <span className="text-xl">{v.emoji}</span>}
                <span className="text-sm font-semibold text-foreground flex-1">
                  {tSafe(t, v.labelKey, v.label)}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {v.children?.length ?? 0}
                </span>
              </button>
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="subcategories"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.15 }}
            className="flex-1 overflow-y-auto px-1"
          >
            <button
              onClick={() => setSelectedVertical(null)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-semibold hover:bg-accent/5 rounded-lg w-full"
              style={{ color: "hsl(var(--accent))" }}
            >
              <ChevronLeft className="w-4 h-4" />
              {tSafe(t, "menu.back", "Back")}
            </button>

            {subMenu.map(cluster => (
              <div key={cluster.id} className="mb-3">
                <div className="px-3 py-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "hsl(226 24% 14% / 0.4)" }}>
                    {tSafe(t, cluster.labelKey, cluster.label)}
                  </span>
                </div>
                {cluster.children?.map(sub => (
                  <MenuItem key={sub.id} node={sub} compact onClick={onSelect} />
                ))}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
