/**
 * /marketplace — Global marketplace hub
 * /marketplace/:city — City marketplace page
 * /marketplace/:service/:city — Service + city marketplace page
 */
import { useParams, Link } from "react-router-dom";
import SEOPageShell from "@/components/seo/SEOPageShell";
import FAQSection from "@/components/seo/FAQSection";
import InternalLinksGrid from "@/components/seo/InternalLinksGrid";
import { getCityBySlug, getServiceCategoryBySlug, SEO_SERVICE_CATEGORIES, getPhase1Cities, isIndexableCity } from "@/lib/seo/seo-data";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin, Briefcase, Star, Shield, Zap } from "lucide-react";
import { useUiEngine } from "@/hooks/useUiEngine";

/** /marketplace — Global hub */
export const MarketplaceHubPage = () => {
  const topCities = getPhase1Cities().slice(0, 20);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Easy-Locs Marketplace — Services Worldwide",
    description: "Find and book professional services worldwide.",
    url: "https://www.easy-locs.com/marketplace",
  };

  useUiEngine("seo-marketplacecitypage");

  return (
    <SEOPageShell
      title="Marketplace — Find Services Worldwide | Easy-Locs"
      description="Discover professional services across the globe. Cleaning, maintenance, transport, tours, and more. Compare providers and book online."
      canonical="https://www.easy-locs.com/marketplace"
      jsonLd={jsonLd}
      ctaTitle="List your services on Easy-Locs"
      ctaDescription="Reach property owners and travelers worldwide."
    >
      <section className="py-20 md:py-28 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4 max-w-5xl text-center">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground mb-6">
            Easy-Locs Marketplace
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Find and book professional services in cities worldwide. Cleaning, maintenance, transport, tours, and more.
          </p>
          <Button asChild size="lg"><Link to="/signup">List Your Service <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
        </div>
      </section>

      {/* Service Categories */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-3xl font-bold text-foreground mb-8">Service Categories</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {SEO_SERVICE_CATEGORIES.map(svc => (
              <Link key={svc.slug} to={`/services/${svc.slug}`} className="p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-center">
                <span className="text-3xl block mb-2">{svc.icon}</span>
                <span className="text-sm font-medium text-foreground">{svc.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Top Cities */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-3xl font-bold text-foreground mb-8">Browse by City</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {topCities.map(city => (
              <Link
                key={city.slug}
                to={`/marketplace/${city.slug}`}
                className="flex items-center gap-2 p-3 bg-background rounded-lg border border-border hover:border-primary/50 transition-all"
              >
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium text-foreground line-clamp-1 break-words">{city.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Value Props */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { icon: Shield, title: "Verified Providers", desc: "All service providers are verified and rated by the community." },
              { icon: Zap, title: "Instant Booking", desc: "Book services online with real-time availability and instant confirmation." },
              { icon: Star, title: "Transparent Pricing", desc: "Compare prices across providers. No hidden fees." },
            ].map(item => (
              <Card key={item.title} className="border-border text-center">
                <CardContent className="p-6">
                  <item.icon className="h-10 w-10 text-primary mx-auto mb-4" />
                  <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </SEOPageShell>
  );
};

/** /marketplace/:citySlug */
export const MarketplaceCityPage = () => {
  const { citySlug } = useParams<{ citySlug: string }>();
  const result = getCityBySlug(citySlug || "");

  if (!result) {
    return <MarketplaceHubPage />;
  }

  const { city, country } = result;
  const shouldNoindex = !isIndexableCity(city);

  const faqs = [
    { question: `What services are available in ${city.name}?`, answer: `The Easy-Locs marketplace in ${city.name} offers ${SEO_SERVICE_CATEGORIES.length}+ service categories including cleaning, maintenance, transport, tours, and more.` },
    { question: `How do I book a service in ${city.name}?`, answer: `Browse service providers in ${city.name}, compare prices and ratings, select your preferred provider, and book online. Payment is processed securely.` },
    { question: `Can I list my service in ${city.name}?`, answer: `Yes. Sign up as a service provider on Easy-Locs and list your services in ${city.name}. Set your own prices, availability, and booking rules.` },
  ];

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: `Marketplace in ${city.name}`,
      description: `Find and book services in ${city.name}, ${country.name}.`,
      url: `https://www.easy-locs.com/marketplace/${city.slug}`,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Easy-Locs", item: "https://www.easy-locs.com" },
        { "@type": "ListItem", position: 2, name: "Marketplace", item: "https://www.easy-locs.com/marketplace" },
        { "@type": "ListItem", position: 3, name: city.name, item: `https://www.easy-locs.com/marketplace/${city.slug}` },
      ],
    },
  ];

  const serviceLinks = SEO_SERVICE_CATEGORIES.map(s => ({
    to: `/marketplace/${city.slug}/${s.slug}`,
    label: `${s.icon} ${s.label}`,
  }));

  const breadcrumbs = [
    { name: "Easy-Locs", href: "/" },
    { name: "Marketplace", href: "/marketplace" },
    { name: `${country.flag} ${country.name}`, href: `/country/${country.slug}` },
    { name: city.name },
  ];

  return (
    <SEOPageShell
      title={`Best Services in ${city.name} | Easy-Locs Marketplace`}
      description={`Find the best services in ${city.name}, ${country.name}. Cleaning, maintenance, transport, tours, and more. Compare providers, read reviews, and book online.`}
      canonical={`https://www.easy-locs.com/marketplace/${city.slug}`}
      jsonLd={jsonLd as any}
      ctaTitle={`List your service in ${city.name}`}
      ctaDescription={`Reach property owners and travelers in ${city.name}.`}
      noindex={shouldNoindex}
      breadcrumbs={breadcrumbs}
    >
      <section className="py-20 md:py-28 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4 max-w-5xl text-center">
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Link to="/marketplace" className="hover:text-foreground">Marketplace</Link>
            <span>/</span>
            <span className="text-foreground font-medium">{city.name}</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-6">
            {city.name} Marketplace
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Find and book the best services in {city.name}, {country.name}. Compare local providers and book online.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg"><Link to="/signup">List Your Service <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
            <Button asChild size="lg" variant="outline"><Link to={`/city/${city.slug}`}>Explore {city.name}</Link></Button>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-3xl font-bold text-foreground mb-6">About {city.name}</h2>
          <div className="prose prose-lg max-w-none text-muted-foreground">
            <p>{city.localContext}</p>
            <p>The Easy-Locs marketplace in {city.name} connects property owners, travelers, and local service providers. All services are bookable online with transparent pricing in {country.currency}.</p>
          </div>
        </div>
      </section>

      <InternalLinksGrid title={`Services in ${city.name}`} links={serviceLinks} />

      <FAQSection faqs={faqs} />

      <InternalLinksGrid
        title="Related"
        links={[
          { to: `/city/${city.slug}`, label: `${city.name} Overview` },
          { to: `/city/${city.slug}/activities`, label: `Activities in ${city.name}` },
          { to: `/country/${country.slug}`, label: `${country.flag} ${country.name}` },
        ]}
      />
    </SEOPageShell>
  );
};

/** /marketplace/:citySlug/:serviceSlug — city first, then service (matches App.tsx) */
export const MarketplaceServiceCityPage = () => {
  const { citySlug: citySl, serviceSlug: serviceSl } = useParams<{ citySlug: string; serviceSlug: string }>();
  const service = getServiceCategoryBySlug(serviceSl || "");
  const result = getCityBySlug(citySl || "");

  if (!service || !result) {
    return <MarketplaceHubPage />;
  }

  const { city, country } = result;
  const shouldNoindex = !isIndexableCity(city);

  const faqs = [
    { question: `How do I book ${service.label.toLowerCase()} in ${city.name}?`, answer: `Browse ${service.label.toLowerCase()} providers in ${city.name} on Easy-Locs. Compare prices, check availability, and book online.` },
    { question: `How much does ${service.label.toLowerCase()} cost in ${city.name}?`, answer: `Prices vary by provider. Browse the marketplace to compare rates in ${country.currency}.` },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `${service.label} in ${city.name}`,
    serviceType: service.label,
    areaServed: { "@type": "City", name: city.name },
    provider: { "@type": "Organization", name: "Easy-Locs" },
    url: `https://www.easy-locs.com/marketplace/${city.slug}/${service.slug}`,
  };

  const otherServices = SEO_SERVICE_CATEGORIES
    .filter(s => s.slug !== service.slug)
    .slice(0, 8)
    .map(s => ({ to: `/marketplace/${city.slug}/${s.slug}`, label: `${s.icon} ${s.label}` }));

  return (
    <SEOPageShell
      title={`Best ${service.label} in ${city.name} | Easy-Locs Marketplace`}
      description={`Find the best ${service.label.toLowerCase()} in ${city.name}, ${country.name}. Compare providers, read reviews, and book online through Easy-Locs.`}
      canonical={`https://www.easy-locs.com/marketplace/${city.slug}/${service.slug}`}
      jsonLd={jsonLd}
      ctaTitle={`Book ${service.label} in ${city.name}`}
      noindex={shouldNoindex}
    >
      <section className="py-20 md:py-28 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4 max-w-5xl text-center">
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Link to="/marketplace" className="hover:text-foreground">Marketplace</Link>
            <span>/</span>
            <Link to={`/marketplace/${city.slug}`} className="hover:text-foreground">{city.name}</Link>
            <span>/</span>
            <span className="text-foreground font-medium">{service.label}</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-6">
            {service.icon} {service.label} in {city.name}
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            {service.description} in {city.name}, {country.name}. Compare local providers and book online.
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
            <p>Finding reliable {service.label.toLowerCase()} in {city.name} is easy with Easy-Locs. Our marketplace connects you with verified local providers offering professional {service.label.toLowerCase()} with transparent pricing in {country.currency}.</p>
          </div>
        </div>
      </section>

      <FAQSection faqs={faqs} />
      <InternalLinksGrid title={`Other Services in ${city.name}`} links={otherServices} />
    </SEOPageShell>
  );
};
