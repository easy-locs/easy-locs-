/**
 * Layer 2 — Dynamic Country SEO Page
 * Route: /property-management-:country
 * Uses differentiated market context and regulatory info per country.
 */
import { useParams, Link } from "react-router-dom";
import SEOPageShell from "@/components/seo/SEOPageShell";
import FAQSection from "@/components/seo/FAQSection";
import InternalLinksGrid from "@/components/seo/InternalLinksGrid";
import { getCountryBySlug, SEO_COUNTRIES, SEO_SERVICE_CATEGORIES, isIndexableCountry } from "@/lib/seo/seo-data";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, FileText, Users, CreditCard, BarChart3, Shield, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const FEATURES = [
  { icon: Home, title: "Property Dashboard", desc: "Manage all your rental properties from one centralized dashboard with real-time occupancy data." },
  { icon: FileText, title: "Legal Documents", desc: "Generate lease agreements and receipts adapted to local rental practices." },
  { icon: Users, title: "Tenant Portal", desc: "Self-service portal for tenants to view documents, pay rent, and communicate with landlords." },
  { icon: CreditCard, title: "Rent Collection", desc: "Collect rent via multiple payment methods with automatic receipt generation." },
  { icon: BarChart3, title: "Financial Reports", desc: "Track revenue, expenses, and generate reports for tax preparation." },
  { icon: Shield, title: "Compliance Tools", desc: "Stay informed about local rental regulations and best practices." },
];

const CountrySEOPage = ({ slugOverride }: { slugOverride?: string }) => {
  const { slug: paramSlug } = useParams<{ slug: string }>();
  const slug = slugOverride || paramSlug || "";
  const country = getCountryBySlug(slug);

  if (!country) {
    return (
      <SEOPageShell
        title="Property Management Worldwide — Easy-Locs"
        description="Manage rental properties in multiple countries with Easy-Locs. All-in-one platform for international landlords."
        canonical="https://www.easy-locs.com/property-management"
      >
        <section className="py-20 text-center container mx-auto px-4">
          <h1 className="text-4xl font-bold text-foreground mb-4">Property Management Worldwide</h1>
          <p className="text-muted-foreground mb-8">Select a country to learn more about rental management.</p>
          <InternalLinksGrid
            title="All Countries"
            links={SEO_COUNTRIES.filter(c => c.phase === 1).map(c => ({ to: `/property-management-${c.slug}`, label: c.name, icon: c.flag }))}
          />
        </section>
      </SEOPageShell>
    );
  }

  const shouldNoindex = !isIndexableCountry(country);
  const phase1Cities = country.cities.filter(ci => ci.phase === 1);

  const faqs = [
    {
      question: `What rental regulations apply in ${country.name}?`,
      answer: `${country.regulatoryNote} Easy-Locs helps landlords in ${country.name} by generating lease documents that follow local conventions and providing tools adapted to the ${country.currency} market.`
    },
    {
      question: `Can I manage properties remotely in ${country.name}?`,
      answer: `Yes. Easy-Locs provides a cloud-based platform for managing properties in ${country.name} remotely. Handle tenant communication, rent collection, document generation, and maintenance coordination from anywhere.`
    },
    {
      question: `What currency is used for rent collection in ${country.name}?`,
      answer: `Easy-Locs supports rent collection in ${country.currency} among many other currencies. You can set rental prices in the local currency and process payments through Stripe and other available methods.`
    },
    {
      question: `How does Easy-Locs help landlords in ${country.name}?`,
      answer: `Easy-Locs provides a tenant self-service portal, automated document generation, financial tracking, and multi-property management — all adapted to work with ${country.name}'s rental market practices.`
    },
  ];

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: `Easy-Locs Property Management — ${country.name}`,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description: `Property management software for landlords in ${country.name}. ${country.marketContext.slice(0, 160)}`,
      url: `https://www.easy-locs.com/property-management-${country.slug}`,
      countryOfOrigin: { "@type": "Country", name: country.name },
      offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
      provider: { "@type": "Organization", name: "Easy-Locs", url: "https://www.easy-locs.com" },
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

  const cityLinks = phase1Cities.map(ci => ({
    to: `/property-management-${ci.slug}`,
    label: ci.name,
  }));

  const phase2CityLinks = country.cities.filter(ci => ci.phase === 2).map(ci => ({
    to: `/property-management-${ci.slug}`,
    label: ci.name,
  }));

  const serviceLinks = SEO_SERVICE_CATEGORIES.slice(0, 6).map(s => ({
    to: `/services/${s.slug}-${phase1Cities[0]?.slug || country.cities[0]?.slug || country.slug}`,
    label: `${s.label} in ${phase1Cities[0]?.name || country.cities[0]?.name || country.name}`,
    icon: s.icon,
  }));

  const nearbyCountries = SEO_COUNTRIES
    .filter(c => c.region === country.region && c.slug !== country.slug && c.phase === 1)
    .slice(0, 8)
    .map(c => ({ to: `/property-management-${c.slug}`, label: c.name, icon: c.flag }));

  return (
    <SEOPageShell
      title={`Property Management in ${country.name} ${country.flag} — Easy-Locs`}
      description={`Manage rental properties in ${country.name}. ${country.regulatoryNote.slice(0, 100)} Leases, receipts, tenant portal. Free to start.`}
      canonical={`https://www.easy-locs.com/property-management-${country.slug}`}
      jsonLd={jsonLd as any}
      ctaTitle={`Start managing properties in ${country.name} today`}
      ctaDescription={`Join landlords in ${country.name} using Easy-Locs for professional property management.`}
      noindex={shouldNoindex}
    >
      {/* Hero */}
      <section className="py-20 md:py-28 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4 max-w-5xl text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-6">
            {country.flag} Property Management in {country.name}
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            {country.marketContext.split(". ").slice(0, 2).join(". ")}. Easy-Locs provides all-in-one property management software for landlords in {country.name}.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg"><Link to="/signup">Start Free <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
            <Button asChild size="lg" variant="outline"><Link to="/rentals">Browse Rentals</Link></Button>
          </div>
        </div>
      </section>

      {/* Market Context — UNIQUE per country */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-3xl font-bold text-foreground mb-6">Rental Market in {country.name}</h2>
          <div className="prose prose-lg max-w-none text-muted-foreground">
            <p>{country.marketContext}</p>
            <p>
              Whether you own a single apartment or manage a larger portfolio in {country.name}, Easy-Locs adapts to your needs.
              The platform supports rent collection in {country.currency}, generates documents following local conventions,
              and provides financial tracking tools for tax preparation.
            </p>
          </div>
        </div>
      </section>

      {/* Regulatory Box */}
      <section className="py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="bg-muted/50 border border-border rounded-lg p-6">
            <h3 className="text-xl font-bold text-foreground mb-3">📋 Key Rental Regulations in {country.name}</h3>
            <p className="text-muted-foreground">{country.regulatoryNote}</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-3xl font-bold text-center text-foreground mb-12">
            Tools for Property Managers in {country.name}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(f => (
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

      {/* Phase 1 Cities */}
      {cityLinks.length > 0 && (
        <InternalLinksGrid title={`Top Cities in ${country.name}`} links={cityLinks} />
      )}

      {/* Phase 2 Cities */}
      {phase2CityLinks.length > 0 && (
        <InternalLinksGrid title={`More Cities in ${country.name}`} links={phase2CityLinks} />
      )}

      {/* Services */}
      {serviceLinks.length > 0 && phase1Cities.length > 0 && (
        <InternalLinksGrid title={`Services Available in ${country.name}`} links={serviceLinks} />
      )}

      {/* FAQ */}
      <FAQSection faqs={faqs} />

      {/* Nearby Countries */}
      {nearbyCountries.length > 0 && (
        <InternalLinksGrid title={`Property Management in Nearby Countries`} links={nearbyCountries} />
      )}
    </SEOPageShell>
  );
};

export default CountrySEOPage;
