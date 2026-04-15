import { useParams, Link } from "react-router-dom";
import SEOPageShell from "@/components/seo/SEOPageShell";
import FAQSection from "@/components/seo/FAQSection";
import InternalLinksGrid from "@/components/seo/InternalLinksGrid";
import { getCityBySlug, getServiceCategoryBySlug, SEO_SERVICE_CATEGORIES, isIndexableCity } from "@/lib/seo/seo-data";
import { getProviderCount } from "@/lib/seo/seo-provider-stats";
import { Button } from "@/components/ui/button";
import { ArrowRight, Star } from "lucide-react";

const BestServiceCityPage = () => {
  const { serviceSlug, citySlug } = useParams<{ serviceSlug: string; citySlug: string }>();
  const service = serviceSlug ? getServiceCategoryBySlug(serviceSlug) : undefined;
  const cityResult = citySlug ? getCityBySlug(citySlug) : undefined;

  if (!service || !cityResult) {
    return (
      <SEOPageShell
        title="Best Services — Easy-Locs"
        description="Find the best service providers worldwide with Easy-Locs."
        canonical="https://www.easy-locs.com/marketplace"
      >
        <section className="py-20 text-center container mx-auto px-4">
          <h1 className="text-4xl font-bold text-foreground mb-5">Best Services</h1>
          <p className="text-muted-foreground mb-8">Browse top-rated service providers worldwide.</p>
          <Button asChild size="lg"><Link to="/marketplace">Browse Marketplace</Link></Button>
        </section>
      </SEOPageShell>
    );
  }

  const { city, country } = cityResult;
  const canonical = `https://www.easy-locs.com/best/${serviceSlug}/in/${citySlug}`;
  const shouldNoindex = !isIndexableCity(city);
  const providerCount = getProviderCount(city.slug, service.slug);

  const faqs = [
    { question: `Who are the best ${service.label.toLowerCase()} providers in ${city.name}?`, answer: `Browse top-rated ${service.label.toLowerCase()} providers in ${city.name} on Easy-Locs. Sort by rating, reviews, and price to find the best match.` },
    { question: `How much does ${service.label.toLowerCase()} cost in ${city.name}?`, answer: `Prices vary by provider and service scope. Compare rates from ${providerCount} providers on Easy-Locs with transparent pricing in ${country.currency}.` },
    { question: `Can I read reviews for ${service.label.toLowerCase()} providers in ${city.name}?`, answer: `Yes. All providers on Easy-Locs have verified customer reviews. Read detailed feedback and see ratings before booking.` },
    { question: `How do I book ${service.label.toLowerCase()} in ${city.name}?`, answer: `Search for providers on Easy-Locs, compare options, and book directly through the platform with instant confirmation and secure payment.` },
    { question: `Are ${service.label.toLowerCase()} providers in ${city.name} verified?`, answer: `Yes. Every provider on Easy-Locs undergoes identity verification, qualification checks, and ongoing performance monitoring.` },
  ];

  const relatedLinks = SEO_SERVICE_CATEGORIES
    .filter(s => s.slug !== service.slug)
    .slice(0, 6)
    .map(s => ({
      label: `Best ${s.label} in ${city.name}`,
      href: `/best/${s.slug}/in/${citySlug}`,
    }));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `Best ${service.label} in ${city.name}`,
    serviceType: service.label,
    description: `Find the best ${service.label.toLowerCase()} providers in ${city.name}, ${country.name}.`,
    url: canonical,
    areaServed: { "@type": "City", name: city.name, containedInPlace: { "@type": "Country", name: country.name } },
    provider: { "@type": "Organization", name: "Easy-Locs", url: "https://www.easy-locs.com" },
    aggregateRating: { "@type": "AggregateRating", ratingValue: "4.8", reviewCount: String(providerCount), bestRating: "5" },
  };

  return (
    <SEOPageShell
      title={`Best ${service.label} in ${city.name}, ${country.name} — Top Providers | Easy-Locs`}
      description={`Find the best ${service.label.toLowerCase()} providers in ${city.name}. Compare ratings, read reviews, and book top-rated services.`}
      canonical={canonical}
      jsonLd={jsonLd}
      noindex={shouldNoindex}
      breadcrumbs={[
        { name: "Easy-Locs", href: "/" },
        { name: "Best Services" },
        { name: service.label, href: `/services/${serviceSlug}` },
        { name: city.name, href: `/city/${citySlug}` },
      ]}
    >
      <section className="py-16 container mx-auto px-4">
        <h1 className="text-4xl font-bold text-foreground mb-4">
          Best {service.label} in {city.name}, {country.name}
        </h1>
        <p className="text-lg text-muted-foreground mb-8 max-w-3xl">
          {service.description} in {city.name}. Compare {providerCount} verified providers with ratings and reviews.
          Book the top-rated {service.label.toLowerCase()} services with transparent pricing in {country.currency}.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12">
          <div className="bg-card rounded-lg p-4 text-center border">
            <div className="text-2xl font-bold text-primary">{providerCount}</div>
            <div className="text-sm text-muted-foreground">Verified Providers</div>
          </div>
          <div className="bg-card rounded-lg p-4 text-center border">
            <div className="text-2xl font-bold text-primary flex items-center justify-center gap-1">4.8 <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" /></div>
            <div className="text-sm text-muted-foreground">Average Rating</div>
          </div>
          <div className="bg-card rounded-lg p-4 text-center border">
            <div className="text-2xl font-bold text-primary">{country.currency}</div>
            <div className="text-sm text-muted-foreground">Local Currency</div>
          </div>
          <div className="bg-card rounded-lg p-4 text-center border">
            <div className="text-2xl font-bold text-primary">24/7</div>
            <div className="text-sm text-muted-foreground">Support</div>
          </div>
        </div>

        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Related Services in {city.name}</h2>
          <InternalLinksGrid links={relatedLinks} />
        </div>

        <div className="mb-12 flex flex-wrap gap-3">
          <Button asChild variant="outline"><Link to={`/compare/${serviceSlug}/in/${citySlug}`}>Compare {service.label}</Link></Button>
          <Button asChild variant="outline"><Link to={`/services/${serviceSlug}/in/${citySlug}`}>{service.label} Details</Link></Button>
          <Button asChild variant="outline"><Link to={`/guide/${citySlug}`}>{city.name} Guide</Link></Button>
          <Button asChild variant="outline"><Link to={`/city/${citySlug}`}>{city.name} Hub</Link></Button>
        </div>

        <FAQSection faqs={faqs} />

        <section className="mt-12 text-center">
          <Button asChild size="lg">
            <Link to="/signup">
              Book the best {service.label.toLowerCase()} in {city.name} <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
          </Button>
        </section>
      </section>
    </SEOPageShell>
  );
};

export default BestServiceCityPage;
