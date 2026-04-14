/**
 * BreadcrumbNav — Visual breadcrumb UI matching JSON-LD breadcrumb data.
 * Drop-in for all SEO landing pages (SEOPageShell, CityHubPage, CountryHubPage, etc.)
 */
import { Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

export interface BreadcrumbItem {
  name: string;
  href?: string;
}

interface BreadcrumbNavProps {
  items: BreadcrumbItem[];
  className?: string;
}

const BreadcrumbNav = ({ items, className = "" }: BreadcrumbNavProps) => {
  if (!items || items.length === 0) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className={`py-3 border-b border-border/50 bg-muted/20 ${className}`}
    >
      <div className="container mx-auto px-4 max-w-5xl">
        <ol
          className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground"
          itemScope
          itemType="https://schema.org/BreadcrumbList"
        >
          {items.map((item, index) => {
            const isLast = index === items.length - 1;
            const isFirst = index === 0;

            return (
              <li
                key={index}
                className="flex items-center gap-1"
                itemProp="itemListElement"
                itemScope
                itemType="https://schema.org/ListItem"
              >
                {index > 0 && (
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 flex-shrink-0" aria-hidden="true" />
                )}
                {isFirst && <Home className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />}
                {isLast || !item.href ? (
                  <span
                    className="font-medium text-foreground truncate max-w-[180px]"
                    aria-current="page"
                    itemProp="name"
                  >
                    {item.name}
                  </span>
                ) : (
                  <Link
                    to={item.href}
                    className="hover:text-foreground transition-colors truncate max-w-[180px]"
                    itemProp="item"
                  >
                    <span itemProp="name">{item.name}</span>
                  </Link>
                )}
                <meta itemProp="position" content={String(index + 1)} />
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
};

export default BreadcrumbNav;
