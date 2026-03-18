/**
 * PropertyHubBreadcrumb — Explicit "Return to Property Hub" link for sub-pages.
 * Shows a small breadcrumb bar linking back to the Property Hub.
 */
import { Link } from "react-router-dom";
import { Building2, ChevronRight } from "lucide-react";

interface Props {
  currentPage: string;
}

export default function PropertyHubBreadcrumb({ currentPage }: Props) {
  return (
    <nav className="flex items-center gap-1.5 px-1 py-2 text-xs text-muted-foreground" aria-label="Breadcrumb">
      <Link
        to="/property-hub"
        className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
      >
        <Building2 className="h-3 w-3" />
        Property Hub
      </Link>
      <ChevronRight className="h-3 w-3 text-muted-foreground/40" />
      <span className="text-foreground font-medium truncate">{currentPage}</span>
    </nav>
  );
}
