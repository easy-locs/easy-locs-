/**
 * /services — Global services directory
 * /services/:service — Service category page
 * /services/:service/:city — Service in a specific city
 */
import { useParams, Link } from "react-router-dom";
import SEOPageShell from "@/components/seo/SEOPageShell";
import FAQSection from "@/components/seo/FAQSection";
import InternalLinksGrid from "@/components/seo/InternalLinksGrid";
import { getServiceCategoryBySlug, getCityBySlug, SEO_SERVICE_CATEGORIES, getPhase1Cities, isIndexableCity } from "@/lib/seo/seo-data";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin } from "lucide-react";
import { useUiEngine } from "@/hooks/useUiEngine";

/** /services — Hub listing all service categories */
export const ServicesHubPage = () => {
  const topCities = getPhase1Cities().slice(0, 15);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Easy-Locs Services — Professional Services Worldwide",
    url: "https://www.easy-locs.com/services",
  };

  useUiEngine("seo-servicehubpage");

  return (
    <SEOPageShell
      title="Services — Professional Services Worldwide | Easy-Locs"
      description={`Discover ${SEO_SERVICE_CATEGORIES.length}+ professional service categories worldwide. Cleaning, maintenance, transport, tours, and more.`}
      canonical="https://www.easy-locs.com/services"
      jsonLd={jsonLd}
      ctaTitle="Become a service provider"
      ctaDescription="List your services on Easy-Locs and reach property owners worldwide."
    >
      <section className="py-20 md:py-28 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4 max-w-5xl text-center">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground mb-6">
            Professional Services Worldwide
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            From cleaning and maintenance to luxury concierge — find and book professional services in cities across the globe.
          </p>
          <Button asChild size="lg"><Link to="/signup">Get Started <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-3xl font-bold text-foreground mb-8">All Service Categories</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SEO_SERVICE_CATEGORIES.map(svc => (
              <Card key={svc.slug} className="border-border hover:border-primary/50 transition-colors">
                <CardContent className="p-5">
                  <Link to={`/services/${svc.slug}`} className="block">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-2xl">{svc.icon}</span>
                      <h3 className="text-lg font-semibold text-foreground">{svc.label}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{svc.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {svc.keywords.map(k => (
                        <span key={k} className="text-xs bg-muted px-2 py-0.5 rounded">{k}</span>
                      ))}
                    </div>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-3xl font-bold text-foreground mb-8">Browse by City</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {topCities.map(city => (
              <Link key={city.slug} to={`/city/${city.slug}/services`} className="flex items-center gap-2 p-3 bg-background rounded-lg border border-border hover:border-primary/50 transition-all">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium text-foreground line-clamp-1 break-words">{city.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </SEOPageShell>
  );
};

/** /services/:categorySlug — Single service category page (matches App.tsx route) */
export const ServiceCategoryPage = () => {
  const { categorySlug: serviceSl } = useParams<{ categorySlug: string }>();
  const service = getServiceCategoryBySlug(serviceSl || "");

  if (!service) return <ServicesHubPage />;

  const topCities = getPhase1Cities().slice(0, 20);

  const faqs = [
    { question: `What is ${service.label}?`, answer: `${service.description}. Easy-Locs connects you with verified providers worldwide.` },
    { question: `How do I book ${service.label.toLowerCase()}?`, answer: `Search for ${service.label.toLowerCase()} in your city, compare providers and prices, and book online through Easy-Locs.` },
    { question: `Can I offer ${service.label.toLowerCase()} on Easy-Locs?`, answer: `Yes. Sign up as a provider and list your ${service.label.toLowerCase()} services. Set your prices, availability, and booking rules.` },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.label,
    serviceType: service.label,
    description: service.description,
    url: `https://www.easy-locs.com/services/${service.slug}`,
    provider: { "@type": "Organization", name: "Easy-Locs" },
  };

  const cityLinks = topCities.map(city => ({
    to: `/services/${service.slug}/in/${city.slug}`,
    label: city.name,
  }));

  const otherServices = SEO_SERVICE_CATEGORIES.filter(s => s.slug !== service.slug).map(s => ({
    to: `/services/${s.slug}`,
    label: `${s.icon} ${s.label}`,
  }));

  return (
    <SEOPageShell
      title={`${service.label} Services Worldwide | Easy-Locs`}
      description={`Find professional ${service.label.toLowerCase()} services worldwide. ${service.description}. Compare providers and book online.`}
      canonical={`https://www.easy-locs.com/services/${service.slug}`}
      jsonLd={jsonLd}
      ctaTitle={`List your ${service.label.toLowerCase()} service`}
    >
      <section className="py-20 md:py-28 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4 max-w-5xl text-center">
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Link to="/services" className="hover:text-foreground">Services</Link>
            <span>/</span>
            <span className="text-foreground font-medium">{service.label}</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-6">
            {service.icon} {service.label}
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            {service.description}. Find and book verified providers worldwide through Easy-Locs.
          </p>
          <Button asChild size="lg"><Link to="/signup">Get Started <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
        </div>
      </section>

      <InternalLinksGrid title={`${service.label} by City`} links={cityLinks} />
      <FAQSection faqs={faqs} />
      <InternalLinksGrid title="Other Services" links={otherServices} />
    </SEOPageShell>
  );
};

/** /services/city/:citySlug — All services available in a specific city (matches App.tsx route) */
export const ServiceCityPage = () => {
  const { citySlug: citySl } = useParams<{ citySlug: string }>();
  const result = getCityBySlug(citySl || "");

  if (!result) return <ServicesHubPage />;

  // Show first service as representative for this city page (page shows all services)
  const service = SEO_SERVICE_CATEGORIES[0];

  const { city, country } = result;
  const shouldNoindex = !isIndexableCity(city);

  const faqs = [
    { question: `How do I book ${service.label.toLowerCase()} in ${city.name}?`, answer: `Browse ${service.label.toLowerCase()} providers in ${city.name} on Easy-Locs. Compare prices, check availability, and book online with secure payment.` },
    { question: `How much does ${service.label.toLowerCase()} cost in ${city.name}?`, answer: `Prices vary by provider. All prices are displayed in ${country.currency} with transparent pricing.` },
  ];

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Service",
      name: `${service.label} in ${city.name}`,
      serviceType: service.label,
      areaServed: { "@type": "City", name: city.name, containedInPlace: { "@type": "Country", name: country.name } },
      url: `https://www.easy-locs.com/services/${service.slug}/in/${city.slug}`,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Services", item: "https://www.easy-locs.com/services" },
        { "@type": "ListItem", position: 2, name: service.label, item: `https://www.easy-locs.com/services/${service.slug}` },
        { "@type": "ListItem", position: 3, name: city.name, item: `https://www.easy-locs.com/services/${service.slug}/in/${city.slug}` },
      ],
    },
  ];

  const otherServices = SEO_SERVICE_CATEGORIES.filter(s => s.slug !== service.slug).slice(0, 8).map(s => ({
    to: `/services/${s.slug}/in/${city.slug}`,
    label: `${s.icon} ${s.label}`,
  }));

  return (
    <SEOPageShell
      title={`${service.label} in ${city.name}, ${country.name} | Easy-Locs`}
      description={`Book ${service.label.toLowerCase()} in ${city.name}. Find verified local providers, compare prices in ${country.currency}, and book online.`}
      canonical={`https://www.easy-locs.com/services/${service.slug}/in/${city.slug}`}
      jsonLd={jsonLd as any}
      ctaTitle={`Book ${service.label} in ${city.name}`}
      noindex={shouldNoindex}
    >
      <section className="py-20 md:py-28 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4 max-w-5xl text-center">
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground mb-4 flex-wrap justify-center">
            <Link to="/services" className="hover:text-foreground">Services</Link>
            <span>/</span>
            <Link to={`/services/${service.slug}`} className="hover:text-foreground">{service.label}</Link>
            <span>/</span>
            <span className="text-foreground font-medium">{city.name}</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-6">
            {service.icon} {service.label} in {city.name}
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            {service.description} in {city.name}, {country.name}. Find and book verified local providers.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg"><Link to="/signup">List Your Service <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
            <Button asChild size="lg" variant="outline"><Link to={`/shop/${service.slug}-${city.slug}`}>View Providers</Link></Button>
          </div>
        </div>
      </section>

      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-3xl font-bold text-foreground mb-6">{service.label} in {city.name}</h2>
          <div className="prose prose-lg max-w-none text-muted-foreground">
            <p>{city.localContext}</p>
            <p>Easy-Locs connects you with professional {service.label.toLowerCase()} providers in {city.name}. All providers offer transparent pricing in {country.currency}, secure online payments, and real-time booking confirmation.</p>
          </div>
        </div>
      </section>

      <FAQSection faqs={faqs} />
      <InternalLinksGrid title={`Other Services in ${city.name}`} links={otherServices} />
      <InternalLinksGrid title="Related" links={[
        { to: `/city/${city.slug}`, label: `${city.name} Overview` },
        { to: `/marketplace/${city.slug}`, label: `${city.name} Marketplace` },
        { to: `/country/${country.slug}`, label: `${country.flag} ${country.name}` },
      ]} />
    </SEOPageShell>
  );
};
