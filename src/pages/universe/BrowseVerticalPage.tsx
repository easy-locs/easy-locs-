/**
 * BrowseVerticalPage — Unified vertical hub resolver.
 * Route: /browse/:vertical?sub=subcategory
 * Dashboard → Category click → this page (clusters + subclusters + results)
 */
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useMemo } from "react";
import { VERTICALS } from "@/lib/discovery/verticals";
import VerticalHubPage from "@/components/discovery/VerticalHubPage";
import { ArrowLeft } from "lucide-react";

export default function BrowseVerticalPage() {
  const { vertical } = useParams<{ vertical: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Alias map for backward-compat routes
  const VERTICAL_ALIASES: Record<string, string> = {
    retail: "shops",
    real_estate: "property",
    healthcare: "healthcare",
  };

  const resolvedVertical = vertical ? (VERTICAL_ALIASES[vertical] ?? vertical) : vertical;

  const verticalDef = useMemo(
    () => VERTICALS.find((v) => v.value === resolvedVertical),
    [resolvedVertical]
  );

  if (!verticalDef) {
    return (
      <div className="app-mobile-page flex flex-col items-center justify-center bg-background px-6">
        <p className="text-lg font-bold text-foreground mb-2">Category not found</p>
        <p className="text-sm text-muted-foreground mb-6">"{vertical}" doesn't exist.</p>
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold active:scale-[0.97] transition-transform"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </button>
      </div>
    );
  }

  return <VerticalHubPage vertical={verticalDef} />;
}
