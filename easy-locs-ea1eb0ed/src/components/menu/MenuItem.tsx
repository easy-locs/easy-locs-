import { memo } from "react";
import { Link } from "react-router-dom";
import { useI18n, tSafe } from "@/lib/i18n";
import { ChevronRight } from "lucide-react";
import type { MenuNode } from "@/lib/menu/menu-types";

interface MenuItemProps {
  node: MenuNode;
  compact?: boolean;
  showChevron?: boolean;
  onClick?: () => void;
}

export const MenuItem = memo(function MenuItem({ node, compact, showChevron, onClick }: MenuItemProps) {
  const { t } = useI18n();
  const Icon = node.icon;
  const label = tSafe(t, node.labelKey, node.label);

  return (
    <Link
      to={node.route}
      onClick={onClick}
      className="flex items-center gap-3 rounded-xl px-3 py-2.5 active:scale-[0.98] transition-all hover:bg-accent/5"
      style={{ minHeight: compact ? 40 : 48 }}
    >
      {Icon ? (
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: "hsl(226 24% 14% / 0.06)" }}
        >
          <Icon className="w-4.5 h-4.5" style={{ color: "hsl(226 24% 14%)" }} />
        </div>
      ) : node.emoji ? (
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-accent/5">
          <span className="text-lg">{node.emoji}</span>
        </div>
      ) : null}

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{label}</p>
        {node.badge && (
          <span
            className="text-[0.625rem] font-bold px-1.5 py-0.5 rounded-full"
            style={{ background: "hsl(var(--accent) / 0.15)", color: "hsl(var(--accent))" }}
          >
            {node.badge}
          </span>
        )}
      </div>

      {showChevron && <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
    </Link>
  );
});
