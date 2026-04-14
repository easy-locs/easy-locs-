/**
 * Layer 4 — Service + City SEO Page
 * Route: /services/:service/in/:city  (e.g. /services/airport-transfer/in/dubai)
 * Only indexes phase-1 city combinations.
 */
import { useParams, Link } from "react-router-dom";
import SEOPageShell from "@/components/seo/SEOPageShell";
import FAQSection from "@/components/seo/FAQSection";
import InternalLinksGrid from "@/components/seo/InternalLinksGrid";
import { getCityBySlug, getServiceCategoryBySlug, SEO_SERVICE_CATEGORIES, isIndexableCity } from "@/lib/seo/seo-data";
import { getProviderCount } from "@/lib/seo/seo-provider-stats";
import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin } from "lucide-react";
import { useUiEngine } from "@/hooks/useUiEngine";

const ServiceCitySEOPage = () => {
  const { service: serviceSlug, city: citySlug } = useParams<{ service: string; city: string }>();

  const service = serviceSlug ? getServiceCategoryBySlug(serviceSlug) : undefined;
  const cityResult = citySlug ? getCityBySlug(citySlug) : undefined;

  if (!service || !cityResult) {
    return (
      <SEOPageShell
        title="Marketplace Services — Easy-Locs"
        description="Find professional services for property management worldwide."
        canonical="https://www.easy-locs.com/marketplace-services"
      >
        <section className="py-20 text-center container mx-auto px-4">
          <h1 className="text-4xl font-bold text-foreground mb-5">Marketplace Services</h1>
          <p className="text-muted-foreground mb-8">Browse our service categories and locations.</p>
          <Button asChild size="lg"><Link to="/marketplace-services">View All Services</Link></Button>
        </section>
      </SEOPageShell>
    );
  }

  const { city, country } = cityResult;
  const shouldNoindex = !isIndexableCity(city);
  const canonical = `https://www.easy-locs.com/services/${serviceSlug}/in/${citySlug}`;

  const faqs = [
    { question: `How do I book ${service.label.toLowerCase()} in ${city.name}?`, answer: `Browse available ${service.label.toLowerCase()} providers in ${city.name} on Easy-Locs. Select your preferred provider, choose a date and time, and book directly online. Payment is processed securely.` },
    { question: `How much does ${service.label.toLowerCase()} cost in ${city.name}?`, answer: `Prices vary by provider and service specifics. Browse providers in ${city.name} to compare rates. All prices are displayed in ${country.currency} with transparent pricing.` },
    { question: `Can I cancel or modify my ${service.label.toLowerCase()} booking?`, answer: `Yes. Each provider sets their own cancellation policy. You can view the terms before booking and manage modifications through your Easy-Locs dashboard.` },
  ];

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Service",
      name: `${service.label} in ${city.name}`,
      serviceType: service.label,
      description: `${service.description} in ${city.name}, ${country.name}. Book online with local providers.`,
      url: canonical,
      areaServed: { "@type": "City", name: city.name, containedInPlace: { "@type": "Country", name: country.name } },
      provider: { "@type": "Organization", name: "Easy-Locs", url: "https://www.easy-locs.com" },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map(f => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
    },
  ];

  const otherServices = SEO_SERVICE_CATEGORIES
    .filter(s => s.slug !== service?.slug)
    .slice(0, 8)
    .map(s => ({ to: `/services/${s.slug}/in/${city.slug}`, label: s.label, icon: s.icon }));

  const providerCount = getProviderCount(city.slug, service.slug);

  useUiEngine("seo-servicecityseopage");

  const breadcrumbs = [
    { name: "Easy-Locs", href: "/" },
    { name: "Services", href: "/services" },
    { name: `${country.flag} ${country.name}`, href: `/country/${country.slug}` },
    { name: city.name, href: `/city/${city.slug}` },
    { name: service.label },
  ];

  return (
    <SEOPageShell
      title={`${service.label} in ${city.name}, ${country.name} — Easy-Locs`}
      description={`Book ${service.label.toLowerCase()} in ${city.name}. Find local providers, compare prices, and book online. ${service.description}.`}
      canonical={canonical}
      jsonLd={jsonLd as any}
      ctaTitle={`Book ${service.label} in ${city.name}`}
      ctaDescription={`Find ${service.label.toLowerCase()} providers in ${city.name} and book online.`}
      noindex={shouldNoindex}
      breadcrumbs={breadcrumbs}
    >
      <section className="py-20 md:py-28 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4 max-w-5xl text-center">
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <MapPin className="h-4 w-4" />
            <Link to={`/country/${country.slug}`} className="hover:text-foreground">{country.flag} {country.name}</Link>
            <span>/</span>
            <Link to={`/city/${city.slug}`} className="hover:text-foreground">{city.name}</Link>
            <span>/</span>
            <span className="text-foreground font-medium">{service.label}</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-6">
            {service.icon} {service.label} in {city.name}
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            {service.description} in {city.name}, {country.name}. Find local providers and book online through Easy-Locs.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg"><Link to="/signup">List Your Service <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
            <Button asChild size="lg" variant="outline"><Link to={`/marketplace/${city.slug}/${service.slug}`}>Browse Providers</Link></Button>
          </div>
        </div>
      </section>

      <section className="py-10 border-b">
        <div className="container mx-auto px-4 max-w-5xl">
          <ul className="flex flex-wrap justify-center gap-8 text-center">
            <li><span className="block text-3xl font-bold text-primary">{providerCount}</span><span className="text-sm text-muted-foreground">verified {service.label} providers</span></li>
            <li><span className="block text-3xl font-bold text-primary">{SEO_SERVICE_CATEGORIES.length}</span><span className="text-sm text-muted-foreground">service categories</span></li>
            <li><span className="block text-3xl font-bold text-primary">Instant</span><span className="text-sm text-muted-foreground">online booking</span></li>
            <li><span className="block text-3xl font-bold text-primary">{country.currency}</span><span className="text-sm text-muted-foreground">transparent pricing</span></li>
          </ul>
        </div>
      </section>

      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-3xl font-bold text-foreground mb-6">About {service.label} in {city.name}</h2>
          <div className="prose prose-lg max-w-none text-muted-foreground">
            <p>
              {city.localContext}
            </p>
            <p>
              Finding reliable {service.label.toLowerCase()} in {city.name} is easy with Easy-Locs.
              Our marketplace connects property owners, guests, and travelers with local service providers
              offering professional {service.label.toLowerCase()} in {city.name} and surrounding areas.
            </p>
            <p>
              All providers on Easy-Locs offer transparent pricing in {country.currency}, secure online payment,
              and real-time booking confirmation. Property managers in {city.name} can integrate {service.label.toLowerCase()} directly into their
              guest experience through listing pages and the concierge dashboard.
            </p>
          </div>
        </div>
      </section>

      <FAQSection faqs={faqs} />

      <InternalLinksGrid title={`Other Services in ${city.name}`} links={otherServices} />
    </SEOPageShell>
  );
};

export default ServiceCitySEOPage;
