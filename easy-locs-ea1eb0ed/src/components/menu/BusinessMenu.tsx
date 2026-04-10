import { memo, useMemo } from "react";
import { resolveBusinessMenu } from "@/lib/menu/menu-engine";
import { useMenuContext } from "@/lib/menu/useMenuContext";
import { MenuSectionComponent } from "./MenuSection";
import type { UserRole } from "@/lib/menu/menu-types";

interface BusinessMenuProps {
  role: UserRole;
  countryCode?: string;
  features?: Record<string, boolean>;
  onItemClick?: () => void;
}

export const BusinessMenu = memo(function BusinessMenu({
  role,
  countryCode = "XX",
  features,
  onItemClick,
}: BusinessMenuProps) {
  const ctx = useMenuContext(role, countryCode, features);

  const sections = useMemo(
    () => resolveBusinessMenu(ctx),
    [ctx],
  );

  if (sections.length === 0) return null;

  return (
    <div className="space-y-1">
      {sections.map(section => (
        <MenuSectionComponent
          key={section.id}
          section={section}
          compact
          onItemClick={onItemClick}
        />
      ))}
    </div>
  );
});
