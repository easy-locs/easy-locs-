import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useControlContext } from "./ControlContext";

export default function ControlDetailDrawer() {
  const { detail, closeDetail } = useControlContext();
  const open = !!detail;

  return (
    <aside
      data-testid="control-detail-drawer"
      data-open={open}
      aria-hidden={!open}
      className={cn(
        "flex h-full flex-col border-l border-border/40 bg-card/40 backdrop-blur transition-all duration-200",
        open ? "w-full max-w-[420px] opacity-100" : "w-0 overflow-hidden opacity-0",
      )}
    >
      {open && detail && (
        <>
          <header className="flex items-start justify-between gap-3 border-b border-border/40 px-4 py-3">
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold">{detail.title}</h2>
              {detail.subtitle && (
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{detail.subtitle}</p>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={closeDetail}
              aria-label="Close detail panel"
            >
              <X className="h-4 w-4" />
            </Button>
          </header>
          <div className="flex-1 overflow-y-auto p-4 text-sm">{detail.body}</div>
        </>
      )}
    </aside>
  );
}
