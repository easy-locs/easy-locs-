import { Link } from "react-router-dom";
import { Globe, MapPin, Briefcase, Home, Users, ChevronRight } from "lucide-react";
import { SEO_COUNTRIES, SEO_SERVICE_CATEGORIES, getPhase1Cities } from "@/lib/seo/seo-data";
import { CATEGORY_HIERARCHY } from "@/lib/taxonomy/category-tree";
import { useI18n } from "@/lib/i18n";

const CONTINENT_ORDER = [
  { label: "🇪🇺 Europe", filter: (c: any) => ["FR","ES","DE","IT","PT","GB","NL","BE","CH","AT","IE","SE","DK","NO","FI","PL","CZ","GR","HR","RO","HU","BG","SK","LU"].includes(c.slug?.toUpperCase()) },
  { label: "🌎 Americas", filter: (c: any) => ["US","CA","BR","MX","AR","CL","CO","PE"].some(x => c.slug?.toUpperCase() === x) },
  { label: "🌍 Africa & Middle East", filter: (c: any) => ["MA","TN","DZ","SN","CI","ZA","NG","KE","AE","SA","QA","TR","IL","EG"].some(x => c.slug?.toUpperCase() === x) },
  { label: "🌏 Asia-Pacific", filter: (c: any) => ["JP","KR","CN","IN","TH","VN","ID","MY","SG","AU","NZ","PH"].some(x => c.slug?.toUpperCase() === x) },
];

export function ExploreSEOFooter() {
  const { t } = useI18n();
  const phase1Countries = SEO_COUNTRIES.filter(c => c.phase === 1);
  const cities = getPhase1Cities().slice(0, 30);

  return (
    <section className="border-t border-border bg-muted/20 py-14">
      <div className="max-w-[1400px] mx-auto px-4 space-y-12">

        {/* ── Countries by continent ── */}
        <div>
          <h2 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
            <Globe className="h-5 w-5 text-accent" /> {t("explore.browse_country") || "Browse by Country"}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {CONTINENT_ORDER.map(cont => {
              const countries = phase1Countries.filter(cont.filter);
              if (!countries.length) return null;
              return (
                <div key={cont.label}>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-accent mb-3">{cont.label}</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {countries.map(c => (
                      <Link key={c.slug} to={`/country/${c.slug}`} className="text-xs px-2.5 py-1.5 rounded-lg bg-card border border-border hover:border-accent/40 hover:bg-accent/5 transition-all text-muted-foreground hover:text-foreground">
                        {c.flag} {c.name}
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Popular Cities ── */}
        <div>
          <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-accent" /> {t("explore.popular_cities") || "Popular Cities"}
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {cities.map(city => (
              <Link key={city.slug} to={`/city/${city.slug}`} className="text-xs px-2.5 py-1.5 rounded-lg bg-card border border-border hover:border-accent/40 hover:bg-accent/5 transition-all text-muted-foreground hover:text-foreground">
                {city.name}
              </Link>
            ))}
          </div>
        </div>

        {/* ── Categories with full hierarchy ── */}
        <div>
          <h2 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-accent" /> {t("explore.categories") || "Categories"}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {CATEGORY_HIERARCHY.map(group => (
              <div key={group.value}>
                <Link
                  to={`/explore?group=${group.value}`}
                  className="text-xs font-bold uppercase tracking-wider text-accent hover:text-accent/80 mb-2 flex items-center gap-1 group"
                >
                  {group.emoji} {group.label}
                  <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
                <div className="flex flex-col gap-0.5 mt-2">
                  {group.subcategories.map(sub => (
                    <Link
                      key={sub.value}
                      to={`/explore?group=${group.value}&sub=${sub.value}`}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors py-0.5 flex items-center gap-1.5"
                    >
                      <span className="text-[11px]">{sub.emoji}</span>
                      {sub.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Services Directory ── */}
        <div>
          <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-accent" /> {t("explore.services_directory") || "Services Directory"}
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {SEO_SERVICE_CATEGORIES.map(svc => (
              <Link key={svc.slug} to={`/services/${svc.slug}`} className="text-xs px-2.5 py-1.5 rounded-lg bg-card border border-border hover:border-accent/40 hover:bg-accent/5 transition-all text-muted-foreground hover:text-foreground">
                {svc.icon} {svc.label}
              </Link>
            ))}
          </div>
        </div>

        {/* ── Quick Links ── */}
        <div>
          <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Home className="h-5 w-5 text-accent" /> {t("explore.quick_links") || "Quick Links"}
          </h2>
          <div className="flex flex-wrap gap-2">
            {[
              { to: "/locations", label: "📍 All Locations" },
              { to: "/marketplace", label: "🛍️ Marketplace" },
              { to: "/services", label: "🔧 Services" },
              { to: "/seasonal-rentals", label: "🏖️ Vacation Rentals" },
              { to: "/long-term-rentals", label: "📋 Long-term Rentals" },
              { to: "/properties", label: "🏠 Real Estate" },
              { to: "/activities", label: "🗺️ Activities" },
              { to: "/concierge-services", label: "🔑 Concierge" },
              { to: "/about", label: "ℹ️ About Easy-Locs" },
            ].map(link => (
              <Link key={link.to} to={link.to} className="text-xs px-3 py-2 rounded-xl bg-card border border-border hover:border-accent/40 hover:bg-accent/5 transition-all text-muted-foreground hover:text-foreground font-medium">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
