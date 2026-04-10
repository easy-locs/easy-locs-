/**
 * YouSectionBlock — Clean section grouping for the You cockpit.
 * Premium card-like container with subtle background.
 */
interface YouSectionBlockProps {
  title: string;
  children: React.ReactNode;
}

export default function YouSectionBlock({ title, children }: YouSectionBlockProps) {
  return (
    <div className="px-3 py-1.5">
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: "hsl(var(--muted) / 0.25)",
          border: "1px solid hsl(var(--border) / 0.5)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
