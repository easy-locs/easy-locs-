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
          background: "hsl(var(--card))",
          border: "1px solid hsl(0 0% 100% / 0.05)",
          boxShadow: "0 2px 8px hsl(0 0% 0% / 0.15), inset 0 1px 0 hsl(0 0% 100% / 0.02)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
