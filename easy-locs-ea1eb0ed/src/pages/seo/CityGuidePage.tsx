import { useParams, Link } from "react-router-dom";
import SEOPageShell from "@/components/seo/SEOPageShell";
import FAQSection from "@/components/seo/FAQSection";
import InternalLinksGrid from "@/components/seo/InternalLinksGrid";
import { getCityBySlug, SEO_SERVICE_CATEGORIES, SEO_ACTIVITY_TYPES, isIndexableCity } from "@/lib/seo/seo-data";
import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin } from "lucide-react";

const CityGuidePage = () => {
  const { citySlug } = useParams<{ citySlug: string }>();
  const result = citySlug ? getCityBySlug(citySlug) : undefined;

  if (!result) {
    return (
      <SEOPageShell
        title="City Guides — Easy-Locs"
        description="Explore city guides for services, activities, and local life worldwide."
        canonical="https://www.easy-locs.com/locations"
      >
        <section className="py-20 text-center container mx-auto px-4">
          <h1 className="text-4xl font-bold text-foreground mb-5">City Guides</h1>
          <p className="text-muted-foreground mb-8">Explore our city guides for services and activities worldwide.</p>
          <Button asChild size="lg"><Link to="/locations">View All Locations</Link></Button>
        </section>
      </SEOPageShell>
    );
  }

  const { city, country } = result;
  const canonical = `https://www.easy-locs.com/guide/${citySlug}`;
  const shouldNoindex = !isIndexableCity(city);

  const faqs = [
    { question: `What is the best way to get around ${city.name}?`, answer: `Book taxis, airport transfers, or car rentals through Easy-Locs for convenient transportation in ${city.name}.` },
    { question: `Where can I find the best restaurants in ${city.name}?`, answer: `Browse restaurants in ${city.name} on Easy-Locs. Order delivery or book a private chef for your stay.` },
    { question: `What activities are available in ${city.name}?`, answer: `Easy-Locs offers ${SEO_ACTIVITY_TYPES.length}+ activity types in ${city.name} including tours, water sports, and cultural experiences.` },
    { question: `How do I book services in ${city.name}?`, answer: `Browse available providers on Easy-Locs, compare ratings and prices, and book directly online with secure payment.` },
  ];

  const serviceLinks = SEO_SERVICE_CATEGORIES.slice(0, 8).map(svc => ({
    label: `${svc.label} in ${city.name}`,
    href: `/services/${svc.slug}/in/${citySlug}`,
  }));

  const activityLinks = SEO_ACTIVITY_TYPES.slice(0, 6).map(act => ({
    label: `${act.label} in ${city.name}`,
    href: `/activities/${act.slug}/in/${citySlug}`,
  }));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${city.name} City Guide`,
    description: `Complete guide to services, activities, and local life in ${city.name}, ${country.name}.`,
    url: canonical,
    author: { "@type": "Organization", name: "Easy-Locs", url: "https://www.easy-locs.com" },
    publisher: { "@type": "Organization", name: "Easy-Locs", url: "https://www.easy-locs.com" },
    about: { "@type": "City", name: city.name, containedInPlace: { "@type": "Country", name: country.name } },
  };

  return (
    <SEOPageShell
      title={`${city.name} City Guide — Services, Activities & Local Life | Easy-Locs`}
      description={`Complete guide to ${city.name}, ${country.name}. Find services, book activities, discover restaurants, and explore local life with Easy-Locs.`}
      canonical={canonical}
      jsonLd={jsonLd}
      noindex={shouldNoindex}
      breadcrumbs={[
        { name: "Easy-Locs", href: "/" },
        { name: "City Guides" },
        { name: city.name },
      ]}
    >
      <section className="py-16 container mx-auto px-4">
        <h1 className="text-4xl font-bold text-foreground mb-4">
          {city.name} City Guide
        </h1>
        <p className="text-lg text-muted-foreground mb-3">
          <MapPin className="inline w-4 h-4 mr-1" />
          {city.name}, {country.name}
        </p>
        <p className="text-muted-foreground mb-8 max-w-3xl">
          {city.localContext}
        </p>

        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Services in {city.name}</h2>
          <InternalLinksGrid links={serviceLinks} />
        </div>

        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Activities in {city.name}</h2>
          <InternalLinksGrid links={activityLinks} />
        </div>

        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Explore More in {city.name}</h2>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline"><Link to={`/city/${citySlug}`}>{city.name} Hub</Link></Button>
            <Button asChild variant="outline"><Link to={`/city/${citySlug}/services`}>All Services</Link></Button>
            <Button asChild variant="outline"><Link to={`/city/${citySlug}/activities`}>All Activities</Link></Button>
            <Button asChild variant="outline"><Link to={`/marketplace/${citySlug}`}>Marketplace</Link></Button>
          </div>
        </div>

        <FAQSection faqs={faqs} />

        <section className="mt-12 text-center">
          <Button asChild size="lg">
            <Link to="/signup">
              Explore {city.name} with Easy-Locs <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
          </Button>
        </section>
      </section>
    </SEOPageShell>
  );
};

export default CityGuidePage;
