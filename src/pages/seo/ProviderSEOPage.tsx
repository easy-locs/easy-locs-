/**
 * /provider/:providerSlug — Provider SEO landing page.
 * Fetches real provider data from DB, renders as SEO-optimized page.
 * Falls back to the existing ProviderStorefront for authenticated users.
 */
import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import SEOPageShell from "@/components/seo/SEOPageShell";
import FAQSection from "@/components/seo/FAQSection";
import InternalLinksGrid from "@/components/seo/InternalLinksGrid";
import { fetchPublicMarketplaceProviders, fetchPublicMarketplaceServices } from "@/repositories/seo.repository";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin, Star, Shield, Phone, Globe, Mail } from "lucide-react";
import { SEO_SERVICE_CATEGORIES } from "@/lib/seo/seo-data";

interface Provider {
  id: string;
  display_name: string;
  company_name: string | null;
  avatar_url: string | null;
  cover_photo_url: string | null;
  bio: string | null;
  slug: string;
  city: string;
  country: string;
  categories: string[];
  rating: number;
  reviews_count: number;
  verified: boolean;
  website_url: string | null;
  provider_type: string;
  phone: string | null;
  email: string | null;
  whatsapp: string | null;
}

interface Service {
  id: string;
  title: string;
  description: string | null;
  category: string;
  price: number;
  currency: string;
  booking_slug: string | null;
  photo_urls: any;
}

const ProviderSEOPage = () => {
  const { providerSlug } = useParams<{ providerSlug: string }>();
  const [provider, setProvider] = useState<Provider | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!providerSlug) return;
    const load = async () => {
      const p = await fetchPublicMarketplaceProviders({
        p_slug: providerSlug,
        p_active_only: true,
      });
      if (p && p.length > 0) {
        setProvider(p[0] as Provider);
        const svcs = await fetchPublicMarketplaceServices({});
        if (svcs) {
          setServices((svcs as Service[]).filter((s: any) => s.provider_id === p[0].id));
        }
      }
      setLoading(false);
    };
    load();
  }, [providerSlug]);

  if (loading) {
    return (
      <SEOPageShell
        title="Loading Provider... | Easy-Locs"
        description="Loading provider details."
        canonical={`https://www.easy-locs.com/provider/${providerSlug}`}
      >
        <section className="py-20 text-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </section>
      </SEOPageShell>
    );
  }

  if (!provider) {
    return (
      <SEOPageShell
        title="Provider Not Found | Easy-Locs"
        description="This provider was not found on Easy-Locs."
        canonical="https://www.easy-locs.com/marketplace"
        noindex
      >
        <section className="py-20 text-center container mx-auto px-4">
          <h1 className="text-4xl font-bold text-foreground mb-4">Provider Not Found</h1>
          <p className="text-muted-foreground mb-8">This provider does not exist or is no longer active.</p>
          <Button asChild size="lg"><Link to="/marketplace">Browse Marketplace</Link></Button>
        </section>
      </SEOPageShell>
    );
  }

  const displayName = provider.company_name || provider.display_name;
  const citySlug = provider.city?.toLowerCase().replace(/\s+/g, "-") || "";
  const countrySlug = provider.country?.toLowerCase().replace(/\s+/g, "-") || "";

  const faqs = [
    { question: `What services does ${displayName} offer?`, answer: `${displayName} offers ${services.length} services in ${provider.city} including ${provider.categories?.slice(0, 3).join(", ") || "various categories"}. Browse their full catalog and book online.` },
    { question: `How do I book a service with ${displayName}?`, answer: `Select a service from ${displayName}'s catalog, choose your preferred date and time, and book online through Easy-Locs. Payment is processed securely.` },
    { question: `Is ${displayName} verified?`, answer: provider.verified ? `Yes, ${displayName} is a verified provider on Easy-Locs. They have been vetted for quality and reliability.` : `${displayName} is a registered provider on Easy-Locs. Check their ratings and reviews for quality assurance.` },
  ];

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: displayName,
      description: provider.bio || `${displayName} — Professional services in ${provider.city}`,
      url: `https://www.easy-locs.com/provider/${provider.slug}`,
      image: provider.avatar_url || provider.cover_photo_url,
      address: {
        "@type": "PostalAddress",
        addressLocality: provider.city,
        addressCountry: provider.country,
      },
      ...(provider.rating > 0 && {
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: provider.rating,
          reviewCount: provider.reviews_count || 1,
        },
      }),
      ...(provider.phone && { telephone: provider.phone }),
      ...(provider.website_url && { sameAs: provider.website_url }),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Marketplace", item: "https://www.easy-locs.com/marketplace" },
        ...(citySlug ? [{ "@type": "ListItem", position: 2, name: provider.city, item: `https://www.easy-locs.com/marketplace/${citySlug}` }] : []),
        { "@type": "ListItem", position: 3, name: displayName, item: `https://www.easy-locs.com/provider/${provider.slug}` },
      ],
    },
  ];

  const relatedLinks = [
    ...(citySlug ? [
      { to: `/city/${citySlug}`, label: `${provider.city} Overview` },
      { to: `/marketplace/${citySlug}`, label: `${provider.city} Marketplace` },
    ] : []),
    ...(countrySlug ? [{ to: `/country/${countrySlug}`, label: provider.country }] : []),
    ...SEO_SERVICE_CATEGORIES
      .filter(s => provider.categories?.includes(s.slug))
      .slice(0, 4)
      .map(s => ({
        to: citySlug ? `/services/${s.slug}/${citySlug}` : `/services/${s.slug}`,
        label: `${s.icon} ${s.label}`,
      })),
  ];

  return (
    <SEOPageShell
      title={`${displayName} — ${provider.city} | Easy-Locs`}
      description={`${displayName} in ${provider.city}, ${provider.country}. ${provider.bio?.slice(0, 120) || `Professional services. ${services.length} services available.`}`}
      canonical={`https://www.easy-locs.com/provider/${provider.slug}`}
      jsonLd={jsonLd as any}
      ctaTitle={`Book services with ${displayName}`}
      ctaDescription={`Professional services in ${provider.city}. Book online with Easy-Locs.`}
    >
      {/* Hero */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground mb-6">
            <Link to="/marketplace" className="hover:text-foreground">Marketplace</Link>
            {citySlug && <>
              <span>/</span>
              <Link to={`/marketplace/${citySlug}`} className="hover:text-foreground">{provider.city}</Link>
            </>}
            <span>/</span>
            <span className="text-foreground font-medium">{displayName}</span>
          </div>
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="shrink-0">
              {provider.avatar_url ? (
                <img src={provider.avatar_url} alt={displayName} className="w-24 h-24 rounded-2xl object-cover border border-border" />
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-primary/10 flex items-center justify-center text-3xl font-bold text-primary">
                  {displayName[0]}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl md:text-4xl font-bold text-foreground">{displayName}</h1>
                {provider.verified && (
                  <span className="flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    <Shield className="h-3 w-3" /> Verified
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {provider.city}, {provider.country}</span>
                {provider.rating > 0 && (
                  <span className="flex items-center gap-1"><Star className="h-4 w-4 text-warning" /> {provider.rating} ({provider.reviews_count} reviews)</span>
                )}
              </div>
              {provider.bio && <p className="text-muted-foreground max-w-2xl">{provider.bio}</p>}
              <div className="flex flex-wrap gap-3 mt-4">
                {provider.phone && (
                  <a href={`tel:${provider.phone}`} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
                    <Phone className="h-4 w-4" /> {provider.phone}
                  </a>
                )}
                {provider.email && (
                  <a href={`mailto:${provider.email}`} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
                    <Mail className="h-4 w-4" /> Contact
                  </a>
                )}
                {provider.website_url && (
                  <a href={provider.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
                    <Globe className="h-4 w-4" /> Website
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      {services.length > 0 && (
        <section className="py-16">
          <div className="container mx-auto px-4 max-w-5xl">
            <h2 className="text-3xl font-bold text-foreground mb-8">Services Offered</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {services.map(svc => (
                <Card key={svc.id} className="border-border hover:border-primary/50 transition-colors">
                  <CardContent className="p-5">
                    <Link to={svc.booking_slug ? `/book/${svc.booking_slug}` : "#"} className="block">
                      <h3 className="font-semibold text-foreground mb-1">{svc.title}</h3>
                      {svc.description && <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{svc.description}</p>}
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-primary">{svc.price} {svc.currency}</span>
                        <span className="text-xs bg-muted px-2 py-0.5 rounded">{svc.category}</span>
                      </div>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Categories */}
      {provider.categories && provider.categories.length > 0 && (
        <section className="py-12 bg-muted/30">
          <div className="container mx-auto px-4 max-w-5xl">
            <h2 className="text-2xl font-bold text-foreground mb-6">Service Categories</h2>
            <div className="flex flex-wrap gap-2">
              {provider.categories.map(cat => {
                const svc = SEO_SERVICE_CATEGORIES.find(s => s.slug === cat);
                return (
                  <Link
                    key={cat}
                    to={citySlug ? `/services/${cat}/${citySlug}` : `/services/${cat}`}
                    className="px-4 py-2 rounded-lg bg-background border border-border hover:border-primary/50 text-sm font-medium text-foreground transition-colors"
                  >
                    {svc ? `${svc.icon} ${svc.label}` : cat}
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <FAQSection faqs={faqs} />
      {relatedLinks.length > 0 && <InternalLinksGrid title="Related" links={relatedLinks} />}
    </SEOPageShell>
  );
};

export default ProviderSEOPage;
