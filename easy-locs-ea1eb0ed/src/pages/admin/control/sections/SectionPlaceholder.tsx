import type { ReactNode } from "react";
import { Construction } from "lucide-react";
import type { ControlSection } from "../sections";

interface SectionPlaceholderProps {
  section: ControlSection;
  children?: ReactNode;
}

/**
 * Slot/outlet for downstream agents (5–9).
 * Each agent should replace `children` of the matching section file with its
 * real implementation, leaving the section meta + container in place.
 */
export default function SectionPlaceholder({ section, children }: SectionPlaceholderProps) {
  const Icon = section.icon;
  return (
    <section
      data-testid={`control-section-${section.id}`}
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
        <span className="rounded-full border border-border/40 bg-muted/40 px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
          {section.ownerAgent}
        </span>
      </header>
      <div className="flex-1 overflow-y-auto p-6">
        {children ?? (
          <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-xl border border-dashed border-border/60 bg-card/40 p-8 text-center">
            <Construction className="h-6 w-6 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Slot reserved for {section.ownerAgent}</h2>
            <p className="text-xs text-muted-foreground">
              The {section.label.toLowerCase()} surface will be wired here. The shell already
              exposes context (detail panel, kill-switch, health) ready for use.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
