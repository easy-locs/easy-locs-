import { memo, useState } from "react";
import { useI18n, tSafe } from "@/lib/i18n";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { MenuItem } from "./MenuItem";
import type { MenuSection as MenuSectionType } from "@/lib/menu/menu-types";

interface MenuSectionProps {
  section: MenuSectionType;
  compact?: boolean;
  onItemClick?: () => void;
}

export const MenuSectionComponent = memo(function MenuSectionComponent({ section, compact, onItemClick }: MenuSectionProps) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(section.defaultExpanded);
  const title = tSafe(t, section.titleKey, section.title);

  return (
    <div className="mb-2">
      {section.collapsible ? (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center justify-between w-full px-3 py-2 rounded-lg hover:bg-accent/5 transition-colors"
        >
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "hsl(225 22% 16% / 0.5)" }}>
            {title}
          </span>
          <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          </motion.div>
        </button>
      ) : (
        <div className="px-3 py-2">
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "hsl(225 22% 16% / 0.5)" }}>
            {title}
          </span>
        </div>
      )}

      <AnimatePresence initial={false}>
        {(!section.collapsible || expanded) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {section.nodes.map(node => (
              <MenuItem key={node.id} node={node} compact={compact} showChevron={!!node.children?.length} onClick={onItemClick} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
