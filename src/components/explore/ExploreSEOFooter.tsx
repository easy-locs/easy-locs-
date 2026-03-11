import { Link } from "react-router-dom";
import { Globe, MapPin, Briefcase, Home } from "lucide-react";
import { SEO_COUNTRIES, SEO_SERVICE_CATEGORIES, getPhase1Cities } from "@/lib/seo/seo-data";

export function ExploreSEOFooter() {
  return (
    <section className="border-t border-border bg-muted/20 py-12">
      <div className="max-w-[1400px] mx-auto px-4 space-y-10">
        <div>
          <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Globe className="h-5 w-5 text-accent" /> Browse by Country
          </h2>
          <div className="flex flex-wrap gap-2">
            {SEO_COUNTRIES.filter(c => c.phase === 1).map(c => (
              <Link key={c.slug} to={`/country/${c.slug}`} className="text-sm px-3 py-1.5 rounded-lg bg-card border border-border hover:border-accent/40 hover:bg-accent/5 transition-colors text-muted-foreground hover:text-foreground">
                {c.flag} {c.name}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-accent" /> Popular Cities
          </h2>
          <div className="flex flex-wrap gap-2">
            {getPhase1Cities().slice(0, 24).map(city => (
              <Link key={city.slug} to={`/city/${city.slug}`} className="text-sm px-3 py-1.5 rounded-lg bg-card border border-border hover:border-accent/40 hover:bg-accent/5 transition-colors text-muted-foreground hover:text-foreground">
                {city.name}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-accent" /> Service Categories
          </h2>
          <div className="flex flex-wrap gap-2">
            {SEO_SERVICE_CATEGORIES.map(svc => (
              <Link key={svc.slug} to={`/services/${svc.slug}`} className="text-sm px-3 py-1.5 rounded-lg bg-card border border-border hover:border-accent/40 hover:bg-accent/5 transition-colors text-muted-foreground hover:text-foreground">
                {svc.icon} {svc.label}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Home className="h-5 w-5 text-accent" /> Quick Links
          </h2>
          <div className="flex flex-wrap gap-2">
            {[
              { to: "/locations", label: "All Locations" },
              { to: "/marketplace", label: "Marketplace" },
              { to: "/services", label: "Services Directory" },
              { to: "/seasonal-rentals", label: "Vacation Rentals" },
              { to: "/long-term-rentals", label: "Long-term Rentals" },
              { to: "/properties", label: "Real Estate" },
              { to: "/activities", label: "Activities" },
              { to: "/concierge-services", label: "Concierge" },
            ].map(link => (
              <Link key={link.to} to={link.to} className="text-sm px-3 py-1.5 rounded-lg bg-card border border-border hover:border-accent/40 hover:bg-accent/5 transition-colors text-muted-foreground hover:text-foreground">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
