/**
 * PropertyHubBreadcrumb — Explicit deterministic return path for property sub-pages.
 * Uses a hard-routed exit back to Property Hub and shows the current hierarchy.
 */
import { Building2, ChevronRight } from "lucide-react";
import { usePropertyHubExit } from "@/hooks/usePropertyHubExit";

interface Props {
  currentPage: string;
}

export default function PropertyHubBreadcrumb({ currentPage }: Props) {
  const exitToPropertyHub = usePropertyHubExit();

  return (
    <nav className="flex items-center gap-1.5 px-1 py-2 text-xs text-muted-foreground" aria-label="Breadcrumb">
      <button
        type="button"
        onClick={exitToPropertyHub}
        className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
      >
        <Building2 className="h-3 w-3" />
        Property Hub
      </button>
      <ChevronRight className="h-3 w-3 text-muted-foreground/40" />
      <span className="text-foreground font-medium truncate">{currentPage}</span>
    </nav>
  );
}
