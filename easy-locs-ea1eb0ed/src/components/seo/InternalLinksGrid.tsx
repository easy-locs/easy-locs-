import { Link } from "react-router-dom";

interface InternalLink {
  to: string;
  label: string;
  icon?: string;
}

const InternalLinksGrid = ({ links, title, columns = 5 }: { links: InternalLink[]; title: string; columns?: number }) => (
  <section className="py-12 px-4">
    <div className="container mx-auto max-w-6xl">
      <h2 className="text-2xl font-bold text-foreground text-center mb-8">{title}</h2>
      <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-${Math.min(columns, 5)} gap-3`}>
        {links.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            className="flex items-center gap-2 bg-card rounded-lg px-3 py-2.5 border border-border/50 hover:border-primary/50 hover:bg-muted/30 transition-all text-sm"
          >
            {l.icon && <span className="text-lg">{l.icon}</span>}
            <span className="min-w-0 break-words text-foreground leading-snug">{l.label}</span>
          </Link>
        ))}
      </div>
    </div>
  </section>
);

export default InternalLinksGrid;
