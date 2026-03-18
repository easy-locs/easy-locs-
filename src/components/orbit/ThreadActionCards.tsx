/**
 * ThreadActionCards — Inline action buttons rendered inside conversation threads.
 */
import { useNavigate } from "react-router-dom";

export default function ThreadActionCards({
  actions,
}: {
  actions?: Array<{ label: string; route: string; type: string }>;
}) {
  const navigate = useNavigate();
  if (!actions?.length) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {actions.map((action) => (
        <button
          key={`${action.type}-${action.route}`}
          onClick={() => navigate(action.route)}
          className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground active:scale-95 transition-transform"
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
