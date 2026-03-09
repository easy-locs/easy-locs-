/**
 * Layer 3 — Dynamic City SEO Page
 * Route: /property-management-:citySlug
 * Uses unique localContext per city for differentiated content.
 */
import { Link } from "react-router-dom";
import SEOPageShell from "@/components/seo/SEOPageShell";
import FAQSection from "@/components/seo/FAQSection";
import InternalLinksGrid from "@/components/seo/InternalLinksGrid";
import { getCityBySlug, SEO_SERVICE_CATEGORIES, SEO_ACTIVITY_TYPES, isIndexableCity } from "@/lib/seo/seo-data";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin, Building2, Star } from "lucide-react";

const CitySEOPage = ({ citySlug }: { citySlug: string }) => {
  const result = getCityBySlug(citySlug);
  if (!result) return null;

  const { city, country } = result;
  const shouldNoindex = !isIndexableCity(city);

  // Contextual FAQs using unique local data
  const faqs = [
    {
      question: `What is the rental market like in ${city.name}?`,
      answer: city.localContext,
    },
    {
      question: `What services are available for property managers in ${city.name}?`,
      answer: `Easy-Locs connects property managers in ${city.name} with local service providers for cleaning, maintenance, airport transfers, and guest experiences. All bookable online through the platform.`,
    },
    {
      question: `Can I manage my ${city.name} property remotely?`,
      answer: `Yes. Easy-Locs provides cloud-based tools for tenant management, rent collection in ${country.currency}, automated documents, and access to local service providers in ${city.name}.`,
    },
    {
      question: `What rental regulations apply in ${city.name}?`,
      answer: `${city.name} follows ${country.name}'s rental framework. ${country.regulatoryNote} Easy-Locs helps you stay informed about local practices.`,
    },
  ];

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: `Property Management in ${city.name} — Easy-Locs`,
      description: `${city.localContext.slice(0, 160)}`,
      url: `https://www.easy-locs.com/property-management-${city.slug}`,
      about: {
        "@type": "City",
        name: city.name,
        containedInPlace: { "@type": "Country", name: country.name },
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map(f => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer },
      })),
    },
  ];

  // Only link to phase-1 service/city combos
  const serviceLinks = SEO_SERVICE_CATEGORIES.slice(0, 8).map(s => ({
    to: `/services/${s.slug}-${city.slug}`,
    label: `${s.label}`,
    icon: s.icon,
  }));

  const activityLinks = SEO_ACTIVITY_TYPES.slice(0, 8).map(a => ({
    to: `/activities/${a.slug}-${city.slug}`,
    label: `${a.label}`,
    icon: a.icon,
  }));

  const siblingCities = country.cities
    .filter(ci => ci.slug !== city.slug && ci.phase === 1)
    .slice(0, 6)
    .map(ci => ({ to: `/property-management-${ci.slug}`, label: ci.name }));

  return (
    <SEOPageShell
      title={`Property Management in ${city.name}, ${country.name} — Easy-Locs`}
      description={`${city.localContext.slice(0, 140)} Manage properties with Easy-Locs.`}
      canonical={`https://www.easy-locs.com/property-management-${city.slug}`}
      jsonLd={jsonLd as any}
      ctaTitle={`Start managing properties in ${city.name}`}
      ctaDescription={`Join property owners in ${city.name} using Easy-Locs.`}
      noindex={shouldNoindex}
    >
      {/* Hero */}
      <section className="py-20 md:py-28 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4 max-w-5xl text-center">
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <MapPin className="h-4 w-4" />
            <Link to={`/property-management-${country.slug}`} className="hover:text-foreground transition-colors">
              {country.flag} {country.name}
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">{city.name}</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-6">
            Property Management in {city.name}
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            {city.localContext.split(". ").slice(0, 2).join(". ")}.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg"><Link to="/signup">Start Free <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
            <Button asChild size="lg" variant="outline"><Link to={`/rentals`}>Browse Rentals</Link></Button>
          </div>
        </div>
      </section>

      {/* Unique City Context */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-3xl font-bold text-foreground mb-6">Rental Market in {city.name}</h2>
          <div className="prose prose-lg max-w-none text-muted-foreground">
            <p>{city.localContext}</p>
            <p>
              Property owners in {city.name} benefit from Easy-Locs' automated document generation,
              rent collection in {country.currency}, and access to a network of local service providers
              for cleaning, maintenance, and guest experiences.
            </p>
          </div>
        </div>
      </section>

      {/* Regulatory Context from Country */}
      <section className="py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="bg-muted/50 border border-border rounded-lg p-6">
            <h3 className="text-xl font-bold text-foreground mb-3">📋 Rental Regulations in {country.name}</h3>
            <p className="text-muted-foreground">{country.regulatoryNote}</p>
          </div>
        </div>
      </section>

      {/* What you can do */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-5xl">
          <h2 className="text-3xl font-bold text-center text-foreground mb-12">What You Can Do in {city.name}</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Building2, title: "Manage Properties", desc: `List and manage rental properties in ${city.name} with professional tools.` },
              { icon: Star, title: "Find Local Services", desc: `Book cleaning, maintenance, and transfers from local ${city.name} providers.` },
              { icon: MapPin, title: "Discover Activities", desc: `Offer guests tours, experiences, and local activities in ${city.name}.` },
            ].map(f => (
              <Card key={f.title} className="border-border">
                <CardContent className="p-6">
                  <f.icon className="h-10 w-10 text-primary mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">{f.title}</h3>
                  <p className="text-muted-foreground text-sm">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      {city.phase === 1 && <InternalLinksGrid title={`Services in ${city.name}`} links={serviceLinks} />}

      {/* Activities */}
      {city.phase === 1 && <InternalLinksGrid title={`Activities in ${city.name}`} links={activityLinks} />}

      {/* FAQ */}
      <FAQSection faqs={faqs} />

      {/* Other cities */}
      {siblingCities.length > 0 && (
        <InternalLinksGrid title={`Other Cities in ${country.name}`} links={siblingCities} />
      )}
    </SEOPageShell>
  );
};

export default CitySEOPage;
