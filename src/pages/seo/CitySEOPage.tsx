/**
 * Layer 3 — Dynamic City SEO Page
 * Route: /property-management-:citySlug
 * Falls through from country route when slug matches a city instead of a country.
 */
import { useParams, Link } from "react-router-dom";
import SEOPageShell from "@/components/seo/SEOPageShell";
import FAQSection from "@/components/seo/FAQSection";
import InternalLinksGrid from "@/components/seo/InternalLinksGrid";
import { getCityBySlug, SEO_SERVICE_CATEGORIES, SEO_ACTIVITY_TYPES } from "@/lib/seo/seo-data";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin, Building2, Star } from "lucide-react";

const CitySEOPage = ({ citySlug }: { citySlug: string }) => {
  const result = getCityBySlug(citySlug);
  if (!result) return null;

  const { city, country } = result;

  const faqs = [
    { question: `How do I find a rental property in ${city.name}?`, answer: `Easy-Locs provides a searchable rental catalog for ${city.name}, ${country.name}. Browse available properties, view photos, check pricing, and submit booking requests directly through the platform.` },
    { question: `What services are available in ${city.name}?`, answer: `Our marketplace offers professional services in ${city.name} including cleaning, airport transfers, property maintenance, tours, car rental, and more. Local providers are verified and bookable online.` },
    { question: `Can I manage my ${city.name} property remotely?`, answer: `Yes. Easy-Locs provides a complete cloud-based platform with tenant management, rent collection in ${country.currency}, automated documents, and a concierge service network in ${city.name}.` },
    { question: `What activities are available in ${city.name}?`, answer: `Explore tours, experiences, and activities in ${city.name} through the Easy-Locs activities marketplace. From city tours to dining experiences, discover local offerings bookable online.` },
  ];

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: `Property Management in ${city.name} — Easy-Locs`,
      description: `Manage rental properties in ${city.name}, ${country.name}. Find local services, activities, and rental listings.`,
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

  const serviceLinks = SEO_SERVICE_CATEGORIES.map(s => ({
    to: `/services/${s.slug}-${city.slug}`,
    label: `${s.label}`,
    icon: s.icon,
  }));

  const activityLinks = SEO_ACTIVITY_TYPES.slice(0, 12).map(a => ({
    to: `/activities/${a.slug}-${city.slug}`,
    label: `${a.label}`,
    icon: a.icon,
  }));

  const siblingCities = country.cities
    .filter(ci => ci.slug !== city.slug)
    .slice(0, 8)
    .map(ci => ({ to: `/property-management-${ci.slug}`, label: ci.name }));

  return (
    <SEOPageShell
      title={`Property Management in ${city.name}, ${country.name} — Easy-Locs`}
      description={`Manage rental properties in ${city.name}. Find cleaning services, airport transfers, tours, and local activities. Rent collection, leases, and tenant portal for ${city.name}.`}
      canonical={`https://www.easy-locs.com/property-management-${city.slug}`}
      jsonLd={jsonLd as any}
      ctaTitle={`Start managing properties in ${city.name}`}
      ctaDescription={`Join property owners in ${city.name} using Easy-Locs.`}
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
            Manage your rental properties in {city.name}, {country.name}. Access local services, activities, and a complete property management toolkit — from lease generation to rent collection.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg"><Link to="/signup">Start Free <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
            <Button asChild size="lg" variant="outline"><Link to={`/rentals/${country.slug}/${city.slug}`}>Browse {city.name} Rentals</Link></Button>
          </div>
        </div>
      </section>

      {/* City Context */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-3xl font-bold text-foreground mb-6">Rental Market in {city.name}</h2>
          <div className="prose prose-lg max-w-none text-muted-foreground">
            <p>
              {city.name} is one of {country.name}'s key rental markets. Whether you manage long-term residential leases
              or short-term vacation rentals, Easy-Locs provides the tools you need to operate professionally.
            </p>
            <p>
              Property owners in {city.name} benefit from automated document generation compliant with {country.name} regulations,
              multi-currency rent collection in {country.currency}, and access to a network of verified local service providers
              including cleaning, maintenance, airport transfers, and guest experiences.
            </p>
            <p>
              The {city.name} property market offers diverse opportunities — from city-center apartments to suburban homes.
              Easy-Locs helps you create public listing pages, manage bookings, and grow your rental business with
              SEO-optimized property pages that attract direct bookings.
            </p>
          </div>
        </div>
      </section>

      {/* Key metrics */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-5xl">
          <h2 className="text-3xl font-bold text-center text-foreground mb-12">What You Can Do in {city.name}</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Building2, title: "Manage Properties", desc: `List and manage rental properties in ${city.name} with professional tools.` },
              { icon: Star, title: "Find Local Services", desc: `Book cleaning, maintenance, transfers, and more from verified ${city.name} providers.` },
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
      <InternalLinksGrid title={`Services in ${city.name}`} links={serviceLinks} />

      {/* Activities */}
      <InternalLinksGrid title={`Activities in ${city.name}`} links={activityLinks} />

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
