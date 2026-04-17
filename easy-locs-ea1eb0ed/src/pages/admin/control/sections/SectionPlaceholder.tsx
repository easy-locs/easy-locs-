import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Construction, ArrowLeft, Sparkles } from "lucide-react";
import type { ControlSection } from "../sections";

interface SectionPlaceholderProps {
  section: ControlSection;
  /** Optional ETA shown next to the "Coming soon" badge. */
  eta?: string;
  children?: ReactNode;
}

/**
 * Slot for sections that are not yet wired up. After audit #946 this is
 * styled as an explicit "Coming soon" surface — never as an error — so the
 * user understands the page is intentionally empty rather than broken.
 *
 * Each agent (5–9) replaces the contents of the matching SectionXxx file
 * with the real implementation, leaving the section meta + container in
 * place. While the slot is empty, we still render:
 *   - a "Coming soon" badge with optional ETA
 *   - a short explanation
 *   - a back-link to the Overview so the user always has a way out
 */
export default function SectionPlaceholder({
  section,
  eta,
  children,
}: SectionPlaceholderProps) {
  const Icon = section.icon;
  return (
    <section
      data-testid={`control-section-${section.id}`}
      data-placeholder={children ? "false" : "true"}
      className="flex h-full flex-col"
    >
      <header className="flex items-start justify-between gap-3 border-b border-border/40 px-6 py-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg border border-border/40 bg-card/60 p-2">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-tight">{section.label}</h1>
            <p className="text-xs text-muted-foreground">{section.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!children ? (
            <span
              data-testid={`control-section-${section.id}-coming-soon`}
              className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-600 dark:text-amber-400"
            >
              <Sparkles className="h-3 w-3" />
              Coming soon
              {eta ? <span className="opacity-80">· {eta}</span> : null}
            </span>
          ) : null}
          <span className="rounded-full border border-border/40 bg-muted/40 px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            {section.ownerAgent}
          </span>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto p-6">
        {children ?? (
          <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-xl border border-dashed border-border/60 bg-card/40 p-8 text-center">
            <Construction className="h-6 w-6 text-muted-foreground" />
            <h2 className="text-sm font-semibold">
              Section {section.label} — Coming soon
            </h2>
            <p className="text-xs text-muted-foreground">
              Cette surface n'est pas encore branchée. Le shell expose déjà le
              contexte (panneau détail, kill-switch, santé) prêt à être utilisé
              par {section.ownerAgent}. Ce n'est pas un bug — la page est
              volontairement vide en attendant l'implémentation.
            </p>
            <Link
              to="/admin/control/overview"
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <ArrowLeft className="h-3 w-3" />
              Retour à Overview
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
