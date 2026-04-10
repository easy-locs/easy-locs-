/**
 * /city/:city — City hub page: services, activities, marketplace, concierge.
 * Also handles /city/:city/services, /city/:city/activities, /city/:city/concierge
 * Now with live listings from the database for organic discovery.
 */
import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { fetchPublicMarketplaceServices, fetchPublicListingsForCity } from "@/repositories/seo.repository";
import SEOPageShell from "@/components/seo/SEOPageShell";
import FAQSection from "@/components/seo/FAQSection";
import InternalLinksGrid from "@/components/seo/InternalLinksGrid";
import { getCityBySlug, SEO_SERVICE_CATEGORIES, SEO_ACTIVITY_TYPES, isIndexableCity } from "@/lib/seo/seo-data";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, MapPin, Briefcase, Compass, Star, Building2, Sparkles, Shield, CheckCircle, Users, Moon, Eye, Search } from "lucide-react";

type CitySubPage = "overview" | "services" | "activities" | "concierge";

const CityHubPage = ({ subPage = "overview" }: { subPage?: CitySubPage }) => {
  const { city: citySlug } = useParams<{ city: string }>();
  const result = getCityBySlug(citySlug || "");
  const [liveServices, setLiveServices] = useState<any[]>([]);
  const [liveListings, setLiveListings] = useState<any[]>([]);

  // Fetch live listings for this city
  useEffect(() => {
    if (!result) return;
    const cityName = result.city.name;
    Promise.all([
      fetchPublicMarketplaceServices({ _city: cityName }),
      fetchPublicListingsForCity(12),
    ]).then(([svcs, listings]) => {
      setLiveServices((svcs || []).slice(0, 8));
      setLiveListings(listings || []);
    });
  }, [result]);

  if (!result) {
    return (
      <SEOPageShell
        title="City Not Found — Easy-Locs"
        description="Explore cities worldwide with Easy-Locs."
        canonical="https://www.easy-locs.com/locations"
      >
        <section className="py-20 text-center container mx-auto px-4">
          <h1 className="text-4xl font-bold text-foreground mb-4">City Not Found</h1>
          <Button asChild size="lg"><Link to="/locations">View All Locations</Link></Button>
        </section>
      </SEOPageShell>
    );
  }

  const { city, country } = result;
  const shouldNoindex = !isIndexableCity(city);

  const pageTitles: Record<CitySubPage, string> = {
    overview: `${city.name}, ${country.name} — Property Management & Services | Easy-Locs`,
    services: `Services in ${city.name}, ${country.name} | Easy-Locs Marketplace`,
    activities: `Things to Do in ${city.name} | Activities & Experiences | Easy-Locs`,
    concierge: `Concierge Services in ${city.name} | Easy-Locs`,
  };

  const pageDescriptions: Record<CitySubPage, string> = {
    overview: `Discover property management, marketplace services, and activities in ${city.name}. ${city.localContext.slice(0, 100)}`,
    services: `Find the best services in ${city.name}: cleaning, maintenance, transport, and more. Compare providers and book online.`,
    activities: `Discover things to do in ${city.name}. Tours, experiences, and activities with local providers. Book online with Easy-Locs.`,
    concierge: `Professional concierge services in ${city.name}. Luxury experiences, transfers, and personalized guest services.`,
  };

  const canonicalPath = subPage === "overview" ? `/city/${city.slug}` : `/city/${city.slug}/${subPage}`;

  const faqs = [
    { question: `What services are available in ${city.name}?`, answer: `Easy-Locs offers ${SEO_SERVICE_CATEGORIES.length}+ service categories in ${city.name} including cleaning, maintenance, transport, tours, and more. All bookable online with local providers.` },
    { question: `What is the rental market like in ${city.name}?`, answer: city.localContext },
    { question: `Can I book activities in ${city.name}?`, answer: `Yes. Browse tours, experiences, and activities in ${city.name} from local providers. Book online with transparent pricing in ${country.currency}.` },
    { question: `How do I find a property manager in ${city.name}?`, answer: `Search our marketplace for property management services in ${city.name}. Compare providers, read reviews, and book directly.` },
  ];

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "City",
      name: city.name,
      containedInPlace: { "@type": "Country", name: country.name },
      url: `https://www.easy-locs.com/city/${city.slug}`,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Easy-Locs", item: "https://www.easy-locs.com" },
        { "@type": "ListItem", position: 2, name: "Locations", item: "https://www.easy-locs.com/locations" },
        { "@type": "ListItem", position: 3, name: country.name, item: `https://www.easy-locs.com/country/${country.slug}` },
        { "@type": "ListItem", position: 4, name: city.name, item: `https://www.easy-locs.com/city/${city.slug}` },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map(f => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
    },
  ];

  const tabs = [
    { key: "overview" as const, label: "Overview", to: `/city/${city.slug}`, icon: MapPin },
    { key: "services" as const, label: "Services", to: `/city/${city.slug}/services`, icon: Briefcase },
    { key: "activities" as const, label: "Activities", to: `/city/${city.slug}/activities`, icon: Compass },
    { key: "concierge" as const, label: "Concierge", to: `/city/${city.slug}/concierge`, icon: Star },
  ];

  const serviceLinks = SEO_SERVICE_CATEGORIES.map(s => ({
    to: `/services/${s.slug}/${city.slug}`,
    label: s.label,
    icon: s.icon,
  }));

  const activityLinks = SEO_ACTIVITY_TYPES.slice(0, 12).map(a => ({
    to: `/activities/${a.slug}-${city.slug}`,
    label: a.label,
    icon: a.icon,
  }));

  const siblingCities = country.cities
    .filter(ci => ci.slug !== city.slug)
    .slice(0, 8)
    .map(ci => ({ to: `/city/${ci.slug}`, label: ci.name }));

  return (
    <SEOPageShell
      title={pageTitles[subPage]}
      description={pageDescriptions[subPage]}
      canonical={`https://www.easy-locs.com${canonicalPath}`}
      jsonLd={jsonLd as any}
      ctaTitle={`Get started in ${city.name}`}
      ctaDescription={`Join property owners and service providers in ${city.name}.`}
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
            <span className="text-foreground font-medium">{city.name}</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4">
            {subPage === "overview" && city.name}
            {subPage === "services" && `Services in ${city.name}`}
            {subPage === "activities" && `Things to Do in ${city.name}`}
            {subPage === "concierge" && `Concierge in ${city.name}`}
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto mb-6">
            {city.localContext.split(". ").slice(0, 2).join(". ")}.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg"><Link to="/signup">Start Free <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
            <Button asChild size="lg" variant="outline"><Link to={`/marketplace/${city.slug}`}>Browse Marketplace</Link></Button>
          </div>
        </div>
      </section>

      {/* Sub-navigation tabs */}
      <nav className="border-b border-border sticky top-0 bg-background/95 backdrop-blur z-10">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="flex gap-1 overflow-x-auto py-2">
            {tabs.map(tab => (
              <Link
                key={tab.key}
                to={tab.to}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  tab.key === subPage
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Content based on subPage */}
      {(subPage === "overview" || subPage === "concierge") && (
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-3xl font-bold text-foreground mb-6">
              {subPage === "overview" ? `About ${city.name}` : `Concierge Services in ${city.name}`}
            </h2>
            <div className="prose prose-lg max-w-none text-muted-foreground">
              <p>{city.localContext}</p>
              <p>
                {subPage === "overview"
                  ? `Easy-Locs connects property owners, guests, and service providers in ${city.name}. Manage rentals, book services, and discover local experiences — all from one platform.`
                  : `Our concierge services in ${city.name} include luxury transfers, private tours, restaurant reservations, and personalized guest experiences. All bookable online with local providers.`
                }
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Quick access cards */}
      {subPage === "overview" && (
        <section className="py-16">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { icon: Briefcase, title: "Services", desc: `${SEO_SERVICE_CATEGORIES.length} categories`, to: `/city/${city.slug}/services` },
                { icon: Compass, title: "Activities", desc: "Tours & experiences", to: `/city/${city.slug}/activities` },
                { icon: Star, title: "Concierge", desc: "Premium services", to: `/city/${city.slug}/concierge` },
                { icon: Building2, title: "Marketplace", desc: "Local providers", to: `/marketplace/${city.slug}` },
              ].map(item => (
                <Card key={item.title} className="border-border hover:border-primary/50 transition-colors">
                  <CardContent className="p-5">
                    <Link to={item.to} className="block">
                      <item.icon className="h-8 w-8 text-primary mb-3" />
                      <h3 className="font-semibold text-foreground">{item.title}</h3>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Services list */}
      {(subPage === "services" || subPage === "overview") && (
        <InternalLinksGrid title={`Services in ${city.name}`} links={serviceLinks} />
      )}

      {/* Activities list */}
      {(subPage === "activities" || subPage === "overview") && (
        <InternalLinksGrid title={`Activities in ${city.name}`} links={activityLinks} />
      )}

      {/* Live Marketplace Listings */}
      {liveServices.length > 0 && (
        <section className="py-16 bg-muted/20">
          <div className="container mx-auto px-4 max-w-6xl">
            <h2 className="text-2xl font-bold text-foreground mb-6">
              <Sparkles className="inline h-6 w-6 mr-2 text-accent" />
              Live Services in {city.name}
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {liveServices.map((svc: any) => (
                <Link key={svc.id} to={svc.booking_slug ? `/book/${svc.booking_slug}` : "/explore"} className="group block">
                  <Card className="border-border hover:border-accent/30 hover:shadow-lg transition-all h-full">
                    <CardContent className="p-4 flex flex-col gap-2">
                      {Array.isArray(svc.photo_urls) && svc.photo_urls[0] && (
                        <div className="aspect-[4/3] rounded-lg overflow-hidden bg-muted mb-1">
                          <img src={svc.photo_urls[0]} alt={svc.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                        </div>
                      )}
                      <h3 className="font-semibold text-foreground text-sm line-clamp-1 group-hover:text-accent transition-colors">{svc.title}</h3>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" /> {svc.city}{svc.country ? `, ${svc.country.toUpperCase()}` : ""}
                      </div>
                      <div className="flex items-center justify-between mt-auto pt-2">
                        <span className="text-sm font-bold text-foreground">{svc.price > 0 ? `${svc.price} ${svc.currency || "€"}` : "Free"}</span>
                        <span className="text-xs text-accent font-semibold flex items-center gap-1">Book <ArrowRight className="h-3 w-3" /></span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
            <div className="text-center mt-6">
              <Button asChild variant="outline" className="rounded-full gap-2">
                <Link to={`/explore?location=${city.name}`}>View all listings in {city.name} <ArrowRight className="h-4 w-4" /></Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Marketplace CTA */}
      <section className="py-12">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            <Sparkles className="inline h-6 w-6 mr-2" />
            {city.name} Marketplace
          </h2>
          <p className="text-muted-foreground mb-6">
            Discover local service providers in {city.name}. Book cleaning, maintenance, transport, and more.
          </p>
          <Button asChild size="lg"><Link to={`/marketplace/${city.slug}`}>Browse {city.name} Marketplace <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
        </div>
      </section>

      <FAQSection faqs={faqs} />

      {siblingCities.length > 0 && <InternalLinksGrid title={`Other Cities in ${country.name}`} links={siblingCities} />}

      {/* Cross-link to Explore */}
      <section className="py-8 bg-muted/10">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <Link to={`/explore?location=${city.name}`} className="text-sm text-accent font-semibold hover:underline flex items-center justify-center gap-2">
            <Search className="h-4 w-4" /> Search all listings in {city.name} on Explore <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </SEOPageShell>
  );
};

export default CityHubPage;
