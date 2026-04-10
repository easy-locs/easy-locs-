/**
 * /country/:country — Country hub page with cities, services, activities.
 * New URL pattern alongside the legacy /property-management-:country
 */
import { useParams, Link } from "react-router-dom";
import SEOPageShell from "@/components/seo/SEOPageShell";
import FAQSection from "@/components/seo/FAQSection";
import InternalLinksGrid from "@/components/seo/InternalLinksGrid";
import { getCountryBySlug, SEO_COUNTRIES, SEO_SERVICE_CATEGORIES, SEO_ACTIVITY_TYPES, isIndexableCountry } from "@/lib/seo/seo-data";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin, Building2, Briefcase, Compass, Star, Home } from "lucide-react";

const CountryHubPage = () => {
  const { country: countrySlug } = useParams<{ country: string }>();
  const country = getCountryBySlug(countrySlug || "");

  if (!country) {
    return (
      <SEOPageShell
        title="Countries — Easy-Locs"
        description="Explore property management and services in countries worldwide."
        canonical="https://www.easy-locs.com/locations"
      >
        <section className="py-20 text-center container mx-auto px-4">
          <h1 className="text-4xl font-bold text-foreground mb-5">Country Not Found</h1>
          <p className="text-muted-foreground mb-8">Explore our available destinations.</p>
          <Button asChild size="lg"><Link to="/locations">View All Locations</Link></Button>
        </section>
      </SEOPageShell>
    );
  }

  const shouldNoindex = !isIndexableCountry(country);
  const phase1Cities = country.cities.filter(ci => ci.phase === 1);
  const phase2Cities = country.cities.filter(ci => ci.phase === 2);

  const faqs = [
    { question: `What rental regulations apply in ${country.name}?`, answer: `${country.regulatoryNote} Easy-Locs helps landlords in ${country.name} with local document generation and compliance tools.` },
    { question: `Can I manage properties remotely in ${country.name}?`, answer: `Yes. Easy-Locs provides cloud-based property management for ${country.name} including tenant communication, rent collection in ${country.currency}, and document generation.` },
    { question: `What services are available in ${country.name}?`, answer: `Easy-Locs marketplace offers cleaning, maintenance, transport, tours, and more across cities in ${country.name}. All bookable online.` },
    { question: `How do I find activities in ${country.name}?`, answer: `Browse city-specific activity pages for tours, experiences, and local activities in ${country.name}. Book directly through the platform.` },
  ];

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Country",
      name: country.name,
      url: `https://www.easy-locs.com/country/${country.slug}`,
      description: country.marketContext.slice(0, 200),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Easy-Locs", item: "https://www.easy-locs.com" },
        { "@type": "ListItem", position: 2, name: "Locations", item: "https://www.easy-locs.com/locations" },
        { "@type": "ListItem", position: 3, name: country.name, item: `https://www.easy-locs.com/country/${country.slug}` },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map(f => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
    },
  ];

  const serviceLinks = SEO_SERVICE_CATEGORIES.slice(0, 8).map(s => ({
    to: `/services/${s.slug}/${phase1Cities[0]?.slug || country.cities[0]?.slug}`,
    label: `${s.icon} ${s.label}`,
  }));

  const nearbyCountries = SEO_COUNTRIES
    .filter(c => c.region === country.region && c.slug !== country.slug)
    .slice(0, 8)
    .map(c => ({ to: `/country/${c.slug}`, label: `${c.flag} ${c.name}` }));

  return (
    <SEOPageShell
      title={`${country.name} ${country.flag} — Property Management, Services & Activities | Easy-Locs`}
      description={`Discover property management, marketplace services, and activities in ${country.name}. ${country.cities.length} cities covered. ${country.regulatoryNote.slice(0, 80)}`}
      canonical={`https://www.easy-locs.com/country/${country.slug}`}
      jsonLd={jsonLd as any}
      ctaTitle={`Start in ${country.name} today`}
      ctaDescription={`Join property owners and service providers in ${country.name}.`}
      noindex={shouldNoindex}
    >
      {/* Hero */}
      <section className="py-20 md:py-28 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4 max-w-5xl text-center">
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Link to="/locations" className="hover:text-foreground">Locations</Link>
            <span>/</span>
            <span className="text-foreground font-medium">{country.flag} {country.name}</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground mb-6">
            {country.flag} {country.name}
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-4">
            Property management, marketplace services, activities & concierge in {country.name}
          </p>
          <p className="text-sm text-muted-foreground mb-8">
            {country.cities.length} cities · {country.currency} · {country.language.toUpperCase()}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg"><Link to="/signup">Start Free <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
            <Button asChild size="lg" variant="outline"><Link to={`/marketplace/${phase1Cities[0]?.slug || ""}`}>Browse Marketplace</Link></Button>
          </div>
        </div>
      </section>

      {/* Market Context */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-3xl font-bold text-foreground mb-6">
            <Home className="inline h-7 w-7 mr-2" />
            Rental Market in {country.name}
          </h2>
          <div className="prose prose-lg max-w-none text-muted-foreground">
            <p>{country.marketContext}</p>
          </div>
          <div className="mt-6 bg-background border border-border rounded-lg p-5">
            <h3 className="font-bold text-foreground mb-2">📋 Key Regulations</h3>
            <p className="text-sm text-muted-foreground">{country.regulatoryNote}</p>
          </div>
        </div>
      </section>

      {/* Cities Grid */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-3xl font-bold text-foreground mb-8">
            <MapPin className="inline h-7 w-7 mr-2" />
            Cities in {country.name}
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...phase1Cities, ...phase2Cities].map(city => (
              <Card key={city.slug} className="border-border hover:border-primary/50 hover:shadow-sm transition-all">
                <CardContent className="p-5">
                  <Link to={`/city/${city.slug}`} className="block">
                    <h3 className="text-lg font-semibold text-foreground mb-2">{city.name}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-3">{city.localContext.split(". ").slice(0, 2).join(". ")}.</p>
                  </Link>
                  <div className="flex flex-wrap gap-1.5">
                    <Link to={`/city/${city.slug}/services`} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded hover:bg-primary/20">Services</Link>
                    <Link to={`/city/${city.slug}/activities`} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded hover:bg-primary/20">Activities</Link>
                    <Link to={`/marketplace/${city.slug}`} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded hover:bg-primary/20">Marketplace</Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      {serviceLinks.length > 0 && <InternalLinksGrid title={`Services in ${country.name}`} links={serviceLinks} />}

      {/* FAQ */}
      <FAQSection faqs={faqs} />

      {/* Nearby Countries */}
      {nearbyCountries.length > 0 && <InternalLinksGrid title="Explore Nearby Countries" links={nearbyCountries} />}

      {/* Cross-link to Explore */}
      <section className="py-8 bg-muted/10">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <Link to={`/explore?location=${country.name}`} className="text-sm text-primary font-semibold hover:underline flex items-center justify-center gap-2">
            <MapPin className="h-4 w-4" /> Browse all listings in {country.name} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </SEOPageShell>
  );
};

export default CountryHubPage;
