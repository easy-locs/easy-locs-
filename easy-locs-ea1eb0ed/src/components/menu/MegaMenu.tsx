import { memo, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useI18n, tSafe } from "@/lib/i18n";
import { getFilteredVerticals, getVerticalSubMenu } from "@/lib/menu/menu-engine";
import { useMenuContext } from "@/lib/menu/useMenuContext";
import { MenuSearchBar } from "./MenuSearchBar";
import type { UserRole } from "@/lib/menu/menu-types";
import { motion, AnimatePresence } from "framer-motion";

interface MegaMenuProps {
  role?: UserRole;
  countryCode?: string;
  open: boolean;
  onClose: () => void;
}

export const MegaMenu = memo(function MegaMenu({ role = "user", countryCode = "XX", open, onClose }: MegaMenuProps) {
  const { t } = useI18n();
  const ctx = useMenuContext(role, countryCode);
  const [hoveredVertical, setHoveredVertical] = useState<string | null>(null);

  const verticals = useMemo(() => getFilteredVerticals(ctx), [ctx]);

  const subMenu = useMemo(() => {
    if (!hoveredVertical) return [];
    return getVerticalSubMenu(hoveredVertical, ctx);
  }, [hoveredVertical, ctx]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-x-0 top-16 z-50 mx-auto max-w-6xl"
        onMouseLeave={onClose}
      >
        <div
          className="rounded-2xl border shadow-2xl overflow-hidden"
          style={{ background: "var(--background, #fff)", borderColor: "hsl(220 40% 18% / 0.1)" }}
        >
          <div className="p-4 border-b" style={{ borderColor: "hsl(220 40% 18% / 0.08)" }}>
            <div className="max-w-md mx-auto">
              <MenuSearchBar ctx={ctx} onSelect={onClose} />
            </div>
          </div>

          <div className="flex min-h-[400px]">
            <div className="w-56 border-r p-2 overflow-y-auto" style={{ borderColor: "hsl(220 40% 18% / 0.08)" }}>
              {verticals.map(v => (
                <button
                  key={v.id}
                  onMouseEnter={() => setHoveredVertical(v.slug)}
                  onClick={() => { onClose(); }}
                  className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-left transition-all ${hoveredVertical === v.slug ? "bg-accent/10" : "hover:bg-accent/5"}`}
                >
                  {v.emoji && <span className="text-lg">{v.emoji}</span>}
                  <span className="text-sm font-medium text-foreground">{tSafe(t, v.labelKey, v.label)}</span>
                </button>
              ))}
            </div>

            <div className="flex-1 p-4 overflow-y-auto">
              {subMenu.length > 0 ? (
                <div className="grid grid-cols-3 gap-6">
                  {subMenu.map(cluster => (
                    <div key={cluster.id}>
                      <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "hsl(220 40% 18% / 0.4)" }}>
                        {tSafe(t, cluster.labelKey, cluster.label)}
                      </h3>
                      <div className="space-y-0.5">
                        {cluster.children?.map(sub => (
                          <Link
                            key={sub.id}
                            to={sub.route}
                            onClick={onClose}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent/5 transition-colors"
                          >
                            {sub.emoji && <span className="text-sm">{sub.emoji}</span>}
                            <span className="text-sm text-foreground">{sub.label}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  {tSafe(t, "menu.hover_vertical", "Hover a category to explore")}
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
});
