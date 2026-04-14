import { memo, useState } from "react";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useI18n, tSafe } from "@/lib/i18n";
import { CategoryMenu } from "./CategoryMenu";
import { Grid3x3 } from "lucide-react";
import type { UserRole } from "@/lib/menu/menu-types";

interface ServiceMenuDrawerProps {
  role?: UserRole;
  countryCode?: string;
  trigger?: React.ReactNode;
}

export const ServiceMenuDrawer = memo(function ServiceMenuDrawer({
  role = "user",
  countryCode = "XX",
  trigger,
}: ServiceMenuDrawerProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger ?? (
          <button
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold active:scale-[0.97] transition-all"
            style={{ background: "hsl(225 22% 16%)", color: "hsl(var(--accent))" }}
          >
            <Grid3x3 className="w-4 h-4" />
            {tSafe(t, "menu.all_services", "All Services")}
          </button>
        )}
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl p-0">
        <SheetHeader className="px-4 pt-4 pb-2">
          <SheetTitle className="text-base font-bold" style={{ color: "hsl(225 22% 16%)" }}>
            {tSafe(t, "menu.explore_services", "Explore Services")}
          </SheetTitle>
        </SheetHeader>
        <CategoryMenu role={role} countryCode={countryCode} onSelect={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
});
