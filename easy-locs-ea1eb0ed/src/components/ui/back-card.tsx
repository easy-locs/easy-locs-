/**
 * BackCard — Deterministic back navigation for all deep pages.
 * Uses browser history first, then logical parent, then module hub fallback.
 */
import { ArrowLeft } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

/** Map deep paths → logical parent routes */
const PARENT_ROUTES: Record<string, string> = {
  "/food": "/dashboard",
  "/grocery": "/dashboard",
  "/services": "/dashboard",
  "/mobility/taxi": "/dashboard",
  "/mobility/delivery": "/dashboard",
  "/rider/live": "/dashboard",
  "/send": "/dashboard",
  "/travel": "/dashboard",
  "/property-hub": "/dashboard",
  "/wallet": "/dashboard",
  "/orbit": "/dashboard",
  "/settings": "/dashboard",
};

function resolveParent(pathname: string): string {
  // Exact match
  if (PARENT_ROUTES[pathname]) return PARENT_ROUTES[pathname];
  // Walk up segments
  const segments = pathname.split("/").filter(Boolean);
  while (segments.length > 1) {
    segments.pop();
    const candidate = `/${segments.join("/")}`;
    if (PARENT_ROUTES[candidate]) return PARENT_ROUTES[candidate];
  }
  // Module hub: /<first-segment>
  if (segments.length >= 1) return `/${segments[0]}`;
  return "/dashboard";
}

interface BackCardProps {
  /** Override label */
  label?: string;
  /** Force specific route instead of auto-resolve */
  to?: string;
  /** Custom handler */
  onBack?: () => void;
  className?: string;
}

export function BackCard({ label, to, onBack, className }: BackCardProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const handleBack = () => {
    if (onBack) { onBack(); return; }
    if (to) { navigate(to, { replace: true }); return; }
    // Prefer history if we have a stack
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate(resolveParent(pathname), { replace: true });
    }
  };

  return (
    <button
      onClick={handleBack}
      className={cn(
        "inline-flex items-center gap-2 px-3 py-2 rounded-xl",
        "bg-card/80 backdrop-blur-sm border border-border/40",
        "text-sm font-medium text-foreground",
        "hover:bg-muted/60 active:scale-[0.97] transition-all duration-150",
        "shadow-sm",
        className
      )}
      aria-label={label || "Go back"}
    >
      <ArrowLeft className="h-4 w-4 text-muted-foreground" />
      {label && <span className="truncate max-w-[120px]">{label}</span>}
    </button>
  );
}

export default BackCard;
