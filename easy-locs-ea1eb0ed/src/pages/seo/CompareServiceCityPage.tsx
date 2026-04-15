import { useParams, Link } from "react-router-dom";
import SEOPageShell from "@/components/seo/SEOPageShell";
import FAQSection from "@/components/seo/FAQSection";
import InternalLinksGrid from "@/components/seo/InternalLinksGrid";
import { getCityBySlug, getServiceCategoryBySlug, SEO_SERVICE_CATEGORIES, isIndexableCity } from "@/lib/seo/seo-data";
import { getProviderCount } from "@/lib/seo/seo-provider-stats";
import { Button } from "@/components/ui/button";
import { ArrowRight, BarChart3 } from "lucide-react";

const CompareServiceCityPage = () => {
  const { serviceSlug, citySlug } = useParams<{ serviceSlug: string; citySlug: string }>();
  const service = serviceSlug ? getServiceCategoryBySlug(serviceSlug) : undefined;
  const cityResult = citySlug ? getCityBySlug(citySlug) : undefined;

  if (!service || !cityResult) {
    return (
      <SEOPageShell
        title="Compare Services — Easy-Locs"
        description="Compare service providers worldwide with Easy-Locs."
        canonical="https://www.easy-locs.com/marketplace"
      >
        <section className="py-20 text-center container mx-auto px-4">
          <h1 className="text-4xl font-bold text-foreground mb-5">Compare Services</h1>
          <p className="text-muted-foreground mb-8">Compare service providers across locations.</p>
          <Button asChild size="lg"><Link to="/marketplace">Browse Marketplace</Link></Button>
        </section>
      </SEOPageShell>
    );
  }

  const { city, country } = cityResult;
  const canonical = `https://www.easy-locs.com/compare/${serviceSlug}/in/${citySlug}`;
  const shouldNoindex = !isIndexableCity(city);
  const providerCount = getProviderCount(city.slug, service.slug);

  const faqs = [
    { question: `How do I compare ${service.label.toLowerCase()} providers in ${city.name}?`, answer: `Use Easy-Locs to compare ${providerCount} ${service.label.toLowerCase()} providers in ${city.name} side by side. Filter by rating, price, availability, and reviews.` },
    { question: `What factors should I consider when comparing ${service.label.toLowerCase()} in ${city.name}?`, answer: `Compare provider ratings, total review count, pricing transparency, response time, service specializations, and cancellation policies.` },
    { question: `Can I compare prices for ${service.label.toLowerCase()} in ${city.name}?`, answer: `Yes. All prices on Easy-Locs are displayed transparently in ${country.currency}. Compare multiple providers to find the best value.` },
    { question: `How are ${service.label.toLowerCase()} providers rated in ${city.name}?`, answer: `Providers are rated by real customers on a 5-star scale. Easy-Locs also tracks response time, completion rate, and repeat booking metrics.` },
    { question: `Is it free to compare providers on Easy-Locs?`, answer: `Yes. Browsing, comparing, and reading reviews on Easy-Locs is completely free. You only pay when you book a service.` },
  ];

  const relatedLinks = SEO_SERVICE_CATEGORIES
    .filter(s => s.slug !== service.slug)
    .slice(0, 6)
    .map(s => ({
      label: `Compare ${s.label} in ${city.name}`,
      href: `/compare/${s.slug}/in/${citySlug}`,
    }));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `Compare ${service.label} in ${city.name}`,
    serviceType: service.label,
    description: `Compare ${service.label.toLowerCase()} providers in ${city.name}, ${country.name}. Side-by-side comparison of ratings, prices, and reviews.`,
    url: canonical,
    areaServed: { "@type": "City", name: city.name, containedInPlace: { "@type": "Country", name: country.name } },
    provider: { "@type": "Organization", name: "Easy-Locs", url: "https://www.easy-locs.com" },
  };

  return (
    <SEOPageShell
      title={`Compare ${service.label} in ${city.name}, ${country.name} — Provider Comparison | Easy-Locs`}
      description={`Compare ${service.label.toLowerCase()} providers in ${city.name}. Side-by-side comparison of ${providerCount} providers with ratings, reviews, and pricing.`}
      canonical={canonical}
      jsonLd={jsonLd}
      noindex={shouldNoindex}
      breadcrumbs={[
        { name: "Easy-Locs", href: "/" },
        { name: "Compare Services" },
        { name: service.label, href: `/services/${serviceSlug}` },
        { name: city.name, href: `/city/${citySlug}` },
      ]}
    >
      <section className="py-16 container mx-auto px-4">
        <h1 className="text-4xl font-bold text-foreground mb-4">
          <BarChart3 className="inline w-8 h-8 mr-2 text-primary" />
          Compare {service.label} in {city.name}, {country.name}
        </h1>
        <p className="text-lg text-muted-foreground mb-8 max-w-3xl">
          Compare {providerCount} {service.label.toLowerCase()} providers in {city.name} side by side.
          Review ratings, prices in {country.currency}, customer reviews, and service details to find the right provider for your needs.
        </p>

        <div className="bg-card border rounded-lg p-6 mb-12">
          <h2 className="text-xl font-semibold mb-4">Comparison Criteria</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="text-sm"><span className="font-medium">Rating:</span> Customer star ratings</div>
            <div className="text-sm"><span className="font-medium">Reviews:</span> Total verified reviews</div>
            <div className="text-sm"><span className="font-medium">Pricing:</span> Transparent in {country.currency}</div>
            <div className="text-sm"><span className="font-medium">Response:</span> Average response time</div>
            <div className="text-sm"><span className="font-medium">Experience:</span> Years on platform</div>
            <div className="text-sm"><span className="font-medium">Verification:</span> ID and qualification checks</div>
          </div>
        </div>

        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Compare Other Services in {city.name}</h2>
          <InternalLinksGrid links={relatedLinks} />
        </div>

        <div className="mb-12 flex flex-wrap gap-3">
          <Button asChild variant="outline"><Link to={`/best/${serviceSlug}/in/${citySlug}`}>Best {service.label}</Link></Button>
          <Button asChild variant="outline"><Link to={`/services/${serviceSlug}/in/${citySlug}`}>{service.label} Details</Link></Button>
          <Button asChild variant="outline"><Link to={`/guide/${citySlug}`}>{city.name} Guide</Link></Button>
          <Button asChild variant="outline"><Link to={`/city/${citySlug}`}>{city.name} Hub</Link></Button>
        </div>

        <FAQSection faqs={faqs} />

        <section className="mt-12 text-center">
          <Button asChild size="lg">
            <Link to="/signup">
              Compare and book {service.label.toLowerCase()} in {city.name} <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
          </Button>
        </section>
      </section>
    </SEOPageShell>
  );
};

export default CompareServiceCityPage;
