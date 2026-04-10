import { memo, useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { resolvePublicMenu } from "@/lib/menu/menu-engine";
import { useMenuContext } from "@/lib/menu/useMenuContext";
import { IconMenuCard } from "./IconMenuCard";
import type { UserRole } from "@/lib/menu/menu-types";

interface ServiceMenuGridProps {
  role?: UserRole;
  countryCode?: string;
  maxItems?: number;
  columns?: 3 | 4 | 5;
}

export const ServiceMenuGrid = memo(function ServiceMenuGrid({
  role = "user",
  countryCode = "XX",
  maxItems = 8,
  columns = 4,
}: ServiceMenuGridProps) {
  const { t } = useI18n();
  const ctx = useMenuContext(role, countryCode);

  const items = useMemo(() => {
    const menu = resolvePublicMenu(ctx);
    return menu.quickActions.slice(0, maxItems);
  }, [ctx, maxItems]);

  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-2.5 px-1">
        <h2 className="text-[13px] font-bold text-foreground flex items-center gap-1.5">
          <span>⚡</span> {t("dashboard.super_services")}
        </h2>
      </div>
      <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {items.map((node, i) => (
          <IconMenuCard key={node.id} node={node} index={i} />
        ))}
      </div>
    </div>
  );
});
