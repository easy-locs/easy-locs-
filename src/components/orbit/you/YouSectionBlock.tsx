/**
 * YouSectionBlock — Labeled section in the You cockpit.
 */
interface YouSectionBlockProps {
  title: string;
  children: React.ReactNode;
}

export default function YouSectionBlock({ title, children }: YouSectionBlockProps) {
  return (
    <div className="px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 px-3">
        {title}
      </p>
      <div className="space-y-0.5">
        {children}
      </div>
    </div>
  );
}
