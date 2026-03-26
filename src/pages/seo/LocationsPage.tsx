/**
 * /locations — Global hub page linking all countries and cities.
 * Airbnb-style navigation for the entire SEO structure.
 */
import { Link } from "react-router-dom";
import SEOPageShell from "@/components/seo/SEOPageShell";
import { SEO_COUNTRIES, getPhase1Countries, getAllCities, SEO_SERVICE_CATEGORIES, getIndexablePageCount } from "@/lib/seo/seo-data";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Globe, MapPin, Briefcase, Sparkles } from "lucide-react";

const REGIONS: { key: string; label: string; icon: string }[] = [
  { key: "europe", label: "Europe", icon: "🌍" },
  { key: "americas", label: "Americas", icon: "🌎" },
  { key: "middle-east", label: "Middle East", icon: "🕌" },
  { key: "asia-pacific", label: "Asia Pacific", icon: "🌏" },
  { key: "africa", label: "Africa", icon: "🌍" },
];

const LocationsPage = () => {
  const allCountries = SEO_COUNTRIES;
  const stats = getIndexablePageCount();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Easy-Locs Locations — Property Management & Services Worldwide",
    description: "Explore property management, marketplace services, activities, and concierge services in cities worldwide.",
    url: "https://www.easy-locs.com/locations",
    provider: { "@type": "Organization", name: "Easy-Locs", url: "https://www.easy-locs.com" },
  };

  return (
    <SEOPageShell
      title="Locations — Property Management & Services Worldwide | Easy-Locs"
      description={`Explore property management, marketplace services, and activities in ${allCountries.length}+ countries and ${getAllCities().length}+ cities worldwide. Find local providers and book services.`}
      canonical="https://www.easy-locs.com/locations"
      jsonLd={jsonLd}
      ctaTitle="Start managing properties worldwide"
      ctaDescription="Join thousands of property owners using Easy-Locs across the globe."
    >
      {/* Hero */}
      <section className="py-20 md:py-28 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4 max-w-5xl text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-6">
            <Globe className="h-4 w-4" />
            {allCountries.length}+ Countries · {getAllCities().length}+ Cities
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground mb-6">
            Explore Destinations Worldwide
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Find property management tools, marketplace services, local activities, and concierge solutions 
            in cities across the globe. Your gateway to global real estate and hospitality.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg"><Link to="/signup">Get Started Free <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
            <Button asChild size="lg" variant="outline"><Link to="/services">Browse Services</Link></Button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 border-b border-border">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <p className="text-3xl font-bold text-primary">{allCountries.length}+</p>
              <p className="text-sm text-muted-foreground">Countries</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-primary">{getAllCities().length}+</p>
              <p className="text-sm text-muted-foreground">Cities</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-primary">{SEO_SERVICE_CATEGORIES.length}</p>
              <p className="text-sm text-muted-foreground">Service Categories</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-primary">{stats.total.toLocaleString()}+</p>
              <p className="text-sm text-muted-foreground">Pages</p>
            </div>
          </div>
        </div>
      </section>

      {/* Popular Destinations */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-3xl font-bold text-foreground mb-4">Popular Destinations</h2>
          <p className="text-muted-foreground mb-8">Top cities for property management and services</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {getPhase1Countries().flatMap(c => c.cities.filter(ci => ci.phase === 1)).slice(0, 20).map(city => (
              <Link
                key={city.slug}
                to={`/city/${city.slug}`}
                className="group flex items-center gap-2 p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all"
              >
                <MapPin className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{city.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{city.country}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Countries by Region */}
      {REGIONS.map(region => {
        const regionCountries = allCountries.filter(c => c.region === region.key);
        if (regionCountries.length === 0) return null;
        return (
          <section key={region.key} className="py-12 border-t border-border">
            <div className="container mx-auto px-4 max-w-6xl">
              <h2 className="text-2xl font-bold text-foreground mb-6">
                {region.icon} {region.label}
              </h2>
              <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {regionCountries.map(country => (
                  <Card key={country.slug} className="border-border hover:border-primary/50 transition-colors">
                    <CardContent className="p-4">
                      <Link to={`/country/${country.slug}`} className="block">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xl">{country.flag}</span>
                          <h3 className="font-semibold text-foreground">{country.name}</h3>
                        </div>
                        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                          {country.marketContext.split(". ")[0]}.
                        </p>
                      </Link>
                      <div className="flex flex-wrap gap-1">
                        {country.cities.filter(ci => ci.phase === 1).slice(0, 4).map(city => (
                          <Link
                            key={city.slug}
                            to={`/city/${city.slug}`}
                            className="text-xs bg-muted px-2 py-0.5 rounded hover:bg-primary/10 hover:text-primary transition-colors"
                          >
                            {city.name}
                          </Link>
                        ))}
                        {country.cities.length > 4 && (
                          <span className="text-xs text-muted-foreground px-1">+{country.cities.length - 4}</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>
        );
      })}

      {/* Service Categories */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            <Briefcase className="inline h-8 w-8 mr-2" />
            Service Categories
          </h2>
          <p className="text-muted-foreground mb-8">Professional services available across all destinations</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {SEO_SERVICE_CATEGORIES.map(svc => (
              <Link
                key={svc.slug}
                to={`/services/${svc.slug}`}
                className="flex items-center gap-2 p-3 bg-background rounded-lg border border-border hover:border-primary/50 hover:shadow-sm transition-all"
              >
                <span className="text-lg">{svc.icon}</span>
                <span className="text-sm font-medium text-foreground">{svc.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Internal Link Mesh */}
      <section className="py-12">
        <div className="container mx-auto px-4 max-w-6xl">
          <h3 className="text-xl font-bold text-foreground mb-6">
            <Sparkles className="inline h-5 w-5 mr-2" />
            Quick Links
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="font-semibold text-foreground mb-2">By Service</p>
              {SEO_SERVICE_CATEGORIES.slice(0, 7).map(s => (
                <Link key={s.slug} to={`/services/${s.slug}`} className="block text-muted-foreground hover:text-primary py-0.5">{s.label}</Link>
              ))}
            </div>
            <div>
              <p className="font-semibold text-foreground mb-2">Popular Cities</p>
              {["dubai", "paris", "london", "barcelona", "miami", "bangkok", "bali"].map(slug => (
                <Link key={slug} to={`/city/${slug}`} className="block text-muted-foreground hover:text-primary py-0.5 capitalize">{slug}</Link>
              ))}
            </div>
            <div>
              <p className="font-semibold text-foreground mb-2">Marketplace</p>
              {["dubai", "paris", "london", "barcelona", "miami"].map(slug => (
                <Link key={slug} to={`/marketplace/${slug}`} className="block text-muted-foreground hover:text-primary py-0.5 capitalize">{slug} Marketplace</Link>
              ))}
            </div>
            <div>
              <p className="font-semibold text-foreground mb-2">Resources</p>
              <Link to="/property-management" className="block text-muted-foreground hover:text-primary py-0.5">Property Management</Link>
              <Link to="/long-term-rentals" className="block text-muted-foreground hover:text-primary py-0.5">Long-Term Rentals</Link>
              <Link to="/seasonal-rentals-booking" className="block text-muted-foreground hover:text-primary py-0.5">Seasonal Rentals</Link>
              <Link to="/activities" className="block text-muted-foreground hover:text-primary py-0.5">Activities</Link>
              <Link to="/marketplace-services" className="block text-muted-foreground hover:text-primary py-0.5">Marketplace</Link>
              <Link to="/concierge-services" className="block text-muted-foreground hover:text-primary py-0.5">Concierge</Link>
            </div>
          </div>
        </div>
      </section>
    </SEOPageShell>
  );
};

export default LocationsPage;
