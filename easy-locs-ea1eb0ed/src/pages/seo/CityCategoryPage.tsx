/**
 * City + Category SEO Page
 * Renders pages like /dubai/cleaning, /paris/apartments, /barcelona/tours
 * with live marketplace data and rich structured markup.
 */
import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  fetchPublicMarketplaceServices, fetchPublicRealEstateListings,
  fetchPublicListings, fetchConciergeServicesByCityCategory,
} from "@/repositories/seo.repository";
import SEOPageShell from "@/components/seo/SEOPageShell";
import FAQSection from "@/components/seo/FAQSection";
import InternalLinksGrid from "@/components/seo/InternalLinksGrid";
import { ExploreListingCard } from "@/components/explore/ExploreListingCard";
import { getCityBySlug, SEO_SERVICE_CATEGORIES, isIndexableCity } from "@/lib/seo/seo-data";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, MapPin, Sparkles, Search } from "lucide-react";

/* ── Category config mapping ── */
const CATEGORY_CONFIG: Record<string, { label: string; emoji: string; serviceKey?: string; listingType?: string; description: string }> = {
  cleaning: { label: "Cleaning Services", emoji: "🧹", serviceKey: "cleaning", description: "Professional cleaning services for homes and rental properties" },
  maintenance: { label: "Property Maintenance", emoji: "🔧", serviceKey: "maintenance", description: "Reliable maintenance and repair services" },
  construction: { label: "Construction & Renovation", emoji: "🏗️", serviceKey: "construction", description: "Construction, renovation and remodeling projects" },
  transport: { label: "Transport Services", emoji: "🚐", serviceKey: "transport", description: "Private transport and shuttle services" },
  "car-rental": { label: "Car Rental", emoji: "🚗", serviceKey: "car_rental", description: "Car rental and vehicle hire" },
  "airport-transfer": { label: "Airport Transfer", emoji: "✈️", serviceKey: "airport_transfer", description: "Airport pickup and drop-off services" },
  tours: { label: "Tours & Activities", emoji: "🗺️", serviceKey: "tours", description: "Guided tours, excursions and sightseeing" },
  "water-sport": { label: "Water Sports", emoji: "🏄", serviceKey: "water_sport", description: "Water sports, boat tours and marine activities" },
  spa: { label: "Wellness & Spa", emoji: "🧖", serviceKey: "spa", description: "Spa, massage and wellness treatments" },
  "sports-coach": { label: "Sports Coach", emoji: "🏋️", serviceKey: "sports_coach", description: "Personal training, fitness and sports lessons" },
  restaurant: { label: "Restaurants", emoji: "🍽️", serviceKey: "restaurant", description: "Restaurant reservations and dining experiences" },
  coworking: { label: "Coworking Spaces", emoji: "💻", serviceKey: "coworking", description: "Coworking and remote work spaces" },
  legal: { label: "Legal Services", emoji: "⚖️", serviceKey: "legal", description: "Legal advice, advocacy and notary services" },
  "business-services": { label: "Business Services", emoji: "💼", serviceKey: "business_services", description: "Accounting, admin and business support" },
  consulting: { label: "Professional Consulting", emoji: "📊", serviceKey: "consulting", description: "Strategy and management consulting" },
  personal: { label: "Personal Services", emoji: "💆", serviceKey: "personal", description: "Personal care and concierge services" },
  event: { label: "Events & Tickets", emoji: "🎫", serviceKey: "event", description: "Event tickets, shows and entertainment" },
  apartments: { label: "Apartments", emoji: "🏢", listingType: "real-estate", description: "Apartments for sale and rent" },
  "vacation-rentals": { label: "Vacation Rentals", emoji: "🏖️", listingType: "seasonal", description: "Short-term vacation rental properties" },
  "real-estate": { label: "Real Estate", emoji: "🏡", listingType: "real-estate", description: "Properties for sale and long-term rent" },
  "long-term-rentals": { label: "Long-term Rentals", emoji: "🏠", listingType: "long-term", description: "Properties available for long-term rental" },
};

export default function CityCategoryPage() {
  const { slug, category } = useParams<{ slug: string; category: string }>();
  const result = getCityBySlug(slug || "");
  const config = category ? CATEGORY_CONFIG[category] : undefined;

  const [services, setServices] = useState<any[]>([]);
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!result || !config) { setLoading(false); return; }
    const cityName = result.city.name;
    setLoading(true);

    const run = async () => {
      const nextServices: any[] = [];
      const nextListings: any[] = [];

      if (config.serviceKey) {
        const data = await fetchPublicMarketplaceServices({ _category: config.serviceKey, _city: cityName });
        nextServices.push(...(data || []).slice(0, 20));
      }

      if (config.listingType === "real-estate") {
        const data = await fetchPublicRealEstateListings({ p_city: cityName, p_limit: 20 });
        nextListings.push(...(data || []).map((l: any) => ({ ...l, _type: "real-estate" })));
      }

      if (config.listingType === "seasonal" || config.listingType === "long-term") {
        const data = await fetchPublicListings(20);
        nextListings.push(...(data || []).map((l: any) => ({ ...l, _type: "seasonal" })));
      }

      if (config.serviceKey) {
        const conciergeItems = (await fetchConciergeServicesByCityCategory(cityName, config.serviceKey) || []).map((s: any) => ({ ...s, _type: "service" }));
        const ids = new Set(nextServices.map((p) => p.id));
        nextServices.push(...conciergeItems.filter((c: any) => !ids.has(c.id)));
      }

      setServices(nextServices);
      setListings(nextListings);
      setLoading(false);
    };
    void run().catch((error) => {
      console.error("[CityCategoryPage] failed to load city/category content", error);
      setServices([]);
      setListings([]);
      setLoading(false);
    });
  }, [result, config]);

  // Fallback: city or category not found
  if (!result || !config) {
    return (
      <SEOPageShell
        title="Page Not Found — Easy-Locs"
        description="Explore services and properties worldwide."
        canonical="https://www.easy-locs.com/locations"
      >
        <section className="py-20 text-center container mx-auto px-4">
          <h1 className="text-4xl font-bold text-foreground mb-4">Page Not Found</h1>
          <p className="text-muted-foreground mb-6">This city or category doesn't exist yet.</p>
          <div className="flex gap-3 justify-center">
            <Button asChild><Link to="/explore">Explore All</Link></Button>
            <Button asChild variant="outline"><Link to="/locations">All Locations</Link></Button>
          </div>
        </section>
      </SEOPageShell>
    );
  }

  const { city, country } = result;
  const shouldNoindex = !isIndexableCity(city);
  const allResults = [
    ...services.map(s => ({ ...s, _type: "service" })),
    ...listings,
  ];

  const title = `${config.label} in ${city.name}, ${country.name} | Easy-Locs`;
  const description = `Find the best ${config.label.toLowerCase()} in ${city.name}. ${config.description}. Compare providers and book online on Easy-Locs.`;
  const canonical = `https://www.easy-locs.com/${city.slug}/${category}`;

  const faqs = [
    { question: `Where can I find ${config.label.toLowerCase()} in ${city.name}?`, answer: `Easy-Locs lists verified ${config.label.toLowerCase()} providers in ${city.name}, ${country.name}. Browse, compare prices, and book online.` },
    { question: `How much do ${config.label.toLowerCase()} cost in ${city.name}?`, answer: `Prices vary by provider and service scope. Browse our marketplace to compare transparent pricing in ${country.currency} from local providers.` },
    { question: `Can I book ${config.label.toLowerCase()} online?`, answer: `Yes. All services on Easy-Locs are bookable online with secure payment. No account needed to browse — sign up only when ready to book.` },
    { question: `Are providers in ${city.name} verified?`, answer: `We verify provider profiles and encourage reviews. Look for the "Verified" badge when browsing ${config.label.toLowerCase()} in ${city.name}.` },
  ];

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: `${config.label} in ${city.name}`,
      description,
      url: canonical,
      isPartOf: { "@type": "WebSite", name: "Easy-Locs", url: "https://www.easy-locs.com" },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Easy-Locs", item: "https://www.easy-locs.com" },
        { "@type": "ListItem", position: 2, name: country.name, item: `https://www.easy-locs.com/country/${country.slug}` },
        { "@type": "ListItem", position: 3, name: city.name, item: `https://www.easy-locs.com/city/${city.slug}` },
        { "@type": "ListItem", position: 4, name: config.label, item: canonical },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map(f => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
    },
  ];

  // Related categories for internal linking
  const relatedCategories = Object.entries(CATEGORY_CONFIG)
    .filter(([key]) => key !== category)
    .slice(0, 12)
    .map(([key, val]) => ({ to: `/${city.slug}/${key}`, label: `${val.emoji} ${val.label}` }));

  // Sibling cities for same category
  const siblingCities = country.cities
    .filter(c => c.slug !== city.slug)
    .slice(0, 8)
    .map(c => ({ to: `/${c.slug}/${category}`, label: `${config.emoji} ${c.name}` }));

  return (
    <SEOPageShell
      title={title}
      description={description}
      canonical={canonical}
      jsonLd={jsonLd as any}
      ctaTitle={`List your ${config.label.toLowerCase()} in ${city.name}`}
      ctaDescription={`Join Easy-Locs and reach customers in ${city.name} and worldwide. 0% commission.`}
      noindex={shouldNoindex}
    >
      {/* Hero */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4 max-w-5xl text-center">
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Link to="/locations" className="hover:text-foreground">Locations</Link>
            <span>/</span>
            <Link to={`/country/${country.slug}`} className="hover:text-foreground">{country.flag} {country.name}</Link>
            <span>/</span>
            <Link to={`/city/${city.slug}`} className="hover:text-foreground">{city.name}</Link>
            <span>/</span>
            <span className="text-foreground font-medium">{config.label}</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4">
            {config.emoji} {config.label} in {city.name}
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto mb-6">
            {config.description} in {city.name}, {country.name}. Compare providers and book online.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg">
              <Link to={`/explore?location=${city.name}&q=${config.serviceKey || category}`}>
                <Search className="mr-2 h-4 w-4" /> Search {config.label}
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/signup">List Your Service <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Results */}
      <section className="py-12">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-accent" />
            {loading ? "Loading..." : `${allResults.length} result${allResults.length !== 1 ? "s" : ""}`}
            <span className="text-muted-foreground font-normal text-lg">in {city.name}</span>
          </h2>

          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-2xl overflow-hidden border border-border bg-card">
                  <Skeleton className="aspect-[4/3] w-full" />
                  <div className="p-4 space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /></div>
                </div>
              ))}
            </div>
          ) : allResults.length === 0 ? (
            <SmartEmptyState city={city.name} category={config.label} categorySlug={category!} countrySlug={country.slug} siblingCities={siblingCities} />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {allResults.map(item => (
                <ExploreListingCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      </section>

      <FAQSection faqs={faqs} />

      {relatedCategories.length > 0 && (
        <InternalLinksGrid title={`Other services in ${city.name}`} links={relatedCategories} />
      )}

      {siblingCities.length > 0 && (
        <InternalLinksGrid title={`${config.label} in other cities`} links={siblingCities} />
      )}
    </SEOPageShell>
  );
}

/* ── Smart empty state with suggestions ── */
function SmartEmptyState({ city, category, categorySlug, countrySlug, siblingCities }: {
  city: string; category: string; categorySlug: string; countrySlug: string;
  siblingCities: { to: string; label: string }[];
}) {
  return (
    <div className="text-center py-16 space-y-6">
      <div className="w-16 h-16 mx-auto rounded-2xl bg-muted/50 flex items-center justify-center">
        <MapPin className="h-7 w-7 text-muted-foreground/40" />
      </div>
      <h3 className="text-xl font-bold text-foreground">No {category.toLowerCase()} listed in {city} yet</h3>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">
        Be the first to list your {category.toLowerCase()} service in {city}. Reach customers worldwide with 0% commission.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button asChild>
          <Link to="/signup"><Sparkles className="mr-2 h-4 w-4" /> List Your Service</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to={`/explore?location=${city}`}>Browse all in {city}</Link>
        </Button>
      </div>
      {siblingCities.length > 0 && (
        <div className="pt-6">
          <p className="text-sm font-medium text-muted-foreground mb-3">Try {category.toLowerCase()} in nearby cities:</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {siblingCities.slice(0, 6).map(c => (
              <Link key={c.to} to={c.to} className="text-sm px-3 py-1.5 rounded-lg bg-card border border-border hover:border-accent/40 hover:bg-accent/5 transition-colors text-muted-foreground hover:text-foreground">
                {c.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
