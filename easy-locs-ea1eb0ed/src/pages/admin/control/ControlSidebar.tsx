import { NavLink } from "react-router-dom";
import { ChevronLeft, ChevronRight, Keyboard, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CONTROL_SECTIONS, type ControlSectionId } from "./sections";
import { useControlContext } from "./ControlContext";

interface ControlSidebarProps {
  activeSection: ControlSectionId;
  collapsed: boolean;
  onToggle: () => void;
}

export default function ControlSidebar({ activeSection, collapsed, onToggle }: ControlSidebarProps) {
  const { setPaletteOpen, setShortcutsOpen } = useControlContext();

  return (
    <TooltipProvider delayDuration={120}>
      <aside
        data-testid="control-sidebar"
        data-collapsed={collapsed}
        className={cn(
          "flex h-full flex-col border-r border-border/40 bg-card/60 backdrop-blur transition-[width] duration-200",
          collapsed ? "w-[64px]" : "w-[232px]",
        )}
      >
        <div
          className={cn(
            "flex h-14 items-center border-b border-border/40 px-3",
            collapsed ? "justify-center" : "justify-between",
          )}
        >
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">ACP</span>
              <span className="text-sm font-semibold">Control Plane</span>
            </div>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onToggle}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto py-2" aria-label="Control sections">
          <ul className="space-y-0.5 px-2">
            {CONTROL_SECTIONS.map((section) => {
              const Icon = section.icon;
              const isActive = section.id === activeSection;
              const item = (
                <NavLink
                  to={`/admin/control/${section.id}`}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-primary/10 text-foreground"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                    collapsed && "justify-center",
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon className={cn("h-4 w-4 shrink-0", isActive && "text-primary")} />
                  {!collapsed && (
                    <span className="flex-1 truncate font-medium">{section.label}</span>
                  )}
                  {!collapsed && section.shortcut && (
                    <span className="text-[10px] tracking-widest text-muted-foreground/70">
                      {section.shortcut}
                    </span>
                  )}
                </NavLink>
              );
              return (
                <li key={section.id}>
                  {collapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>{item}</TooltipTrigger>
                      <TooltipContent side="right" className="text-xs">
                        {section.label}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    item
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        <div
          className={cn(
            "border-t border-border/40 p-2",
            collapsed ? "flex flex-col items-center gap-1" : "space-y-1",
          )}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size={collapsed ? "icon" : "sm"}
                className={cn("w-full justify-start gap-2", collapsed && "h-9 w-9 justify-center")}
                onClick={() => setPaletteOpen(true)}
                aria-label="Open command palette"
              >
                <Search className="h-4 w-4" />
                {!collapsed && <span className="text-xs">Command palette</span>}
                {!collapsed && (
                  <span className="ml-auto text-[10px] tracking-widest text-muted-foreground/70">
                    ⌘K
                  </span>
                )}
              </Button>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right">Command palette · ⌘K</TooltipContent>}
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size={collapsed ? "icon" : "sm"}
                className={cn("w-full justify-start gap-2", collapsed && "h-9 w-9 justify-center")}
                onClick={() => setShortcutsOpen(true)}
                aria-label="Show keyboard shortcuts"
              >
                <Keyboard className="h-4 w-4" />
                {!collapsed && <span className="text-xs">Shortcuts</span>}
                {!collapsed && (
                  <span className="ml-auto text-[10px] tracking-widest text-muted-foreground/70">
                    ?
                  </span>
                )}
              </Button>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right">Shortcuts · ?</TooltipContent>}
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  );
}
