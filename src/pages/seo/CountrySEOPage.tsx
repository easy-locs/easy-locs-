/**
 * Layer 2 — Dynamic Country SEO Page
 * Route: /property-management-:country
 */
import { useParams, Link } from "react-router-dom";
import SEOPageShell from "@/components/seo/SEOPageShell";
import FAQSection from "@/components/seo/FAQSection";
import InternalLinksGrid from "@/components/seo/InternalLinksGrid";
import { getCountryBySlug, SEO_COUNTRIES, SEO_SERVICE_CATEGORIES } from "@/lib/seo/seo-data";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, FileText, Users, CreditCard, BarChart3, Shield, Globe, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const FEATURES = [
  { icon: Home, title: "Property Dashboard", desc: "Manage all your rental properties from one centralized dashboard with real-time occupancy data." },
  { icon: FileText, title: "Legal Documents", desc: "Generate jurisdiction-compliant leases, receipts, and legal notices automatically." },
  { icon: Users, title: "Tenant Portal", desc: "Self-service portal for tenants to view documents, pay rent, and communicate with landlords." },
  { icon: CreditCard, title: "Rent Collection", desc: "Collect rent via Stripe, SEPA, bank transfer with automatic receipt generation." },
  { icon: BarChart3, title: "Financial Reports", desc: "Automated fiscal reports adapted to local tax regulations." },
  { icon: Shield, title: "Compliance", desc: "Stay compliant with local rental laws and tenant protection regulations." },
];

const CountrySEOPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const country = getCountryBySlug(slug || "");

  if (!country) {
    return (
      <SEOPageShell
        title="Property Management Worldwide — Easy-Locs"
        description="Manage rental properties in 200+ countries with Easy-Locs."
        canonical="https://www.easy-locs.com/property-management"
      >
        <section className="py-20 text-center container mx-auto px-4">
          <h1 className="text-4xl font-bold text-foreground mb-4">Property Management Worldwide</h1>
          <p className="text-muted-foreground mb-8">Select a country to learn more about rental management.</p>
          <InternalLinksGrid
            title="All Countries"
            links={SEO_COUNTRIES.map(c => ({ to: `/property-management-${c.slug}`, label: c.name, icon: c.flag }))}
          />
        </section>
      </SEOPageShell>
    );
  }

  const faqs = [
    { question: `What rental regulations apply in ${country.name}?`, answer: `${country.name} has specific rental regulations that govern lease agreements, tenant rights, and landlord obligations. ${country.marketContext} Easy-Locs automatically generates jurisdiction-compliant documents for ${country.name}.` },
    { question: `Can I manage properties remotely in ${country.name}?`, answer: `Yes. Easy-Locs provides a complete cloud-based platform for managing properties in ${country.name} remotely. You can handle tenant communication, rent collection, document generation, and maintenance coordination from anywhere in the world.` },
    { question: `What currency is used for rent collection in ${country.name}?`, answer: `Easy-Locs supports rent collection in ${country.currency} and 120+ other currencies. You can set rental prices in the local currency and receive payments through multiple channels including Stripe, bank transfer, and SEPA (where available).` },
    { question: `How does Easy-Locs help with tenant management in ${country.name}?`, answer: `Easy-Locs provides a dedicated tenant portal where tenants can view their lease, download receipts, pay rent online, submit maintenance requests, and communicate directly with property managers — all adapted to ${country.name}'s rental practices.` },
    { question: `Is Easy-Locs available in ${country.language === "en" ? "English" : "multiple languages"}?`, answer: `Yes. Easy-Locs supports 31 languages and automatically localizes documents, receipts, and communications for ${country.name}. The platform detects user preferences and serves content in the appropriate language.` },
  ];

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: `Easy-Locs Property Management — ${country.name}`,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description: `Property management software for landlords in ${country.name}. Manage leases, tenants, rent collection, and financial reports compliant with ${country.name} regulations.`,
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

  const cityLinks = country.cities.map(ci => ({
    to: `/property-management-${ci.slug}`,
    label: ci.name,
  }));

  const serviceLinks = SEO_SERVICE_CATEGORIES.slice(0, 8).map(s => ({
    to: `/services/${s.slug}-${country.cities[0]?.slug || country.slug}`,
    label: `${s.label} in ${country.cities[0]?.name || country.name}`,
    icon: s.icon,
  }));

  const nearbyCountries = SEO_COUNTRIES
    .filter(c => c.region === country.region && c.slug !== country.slug)
    .slice(0, 10)
    .map(c => ({ to: `/property-management-${c.slug}`, label: c.name, icon: c.flag }));

  return (
    <SEOPageShell
      title={`Property Management in ${country.name} ${country.flag} — Easy-Locs`}
      description={`Manage rental properties in ${country.name}. Leases, receipts, tenant portal, rent collection — compliant with ${country.name} regulations. Free to start.`}
      canonical={`https://www.easy-locs.com/property-management-${country.slug}`}
      jsonLd={jsonLd as any}
      ctaTitle={`Start managing properties in ${country.name} today`}
      ctaDescription={`Join landlords in ${country.name} using Easy-Locs for professional property management.`}
    >
      {/* Hero */}
      <section className="py-20 md:py-28 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4 max-w-5xl text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-6">
            {country.flag} Property Management in {country.name}
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            {country.marketContext} Easy-Locs provides all-in-one property management software for landlords in {country.name} — from lease generation to rent collection and financial reporting.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg"><Link to="/signup">Start Free <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
            <Button asChild size="lg" variant="outline"><Link to="/rentals">Browse Rentals</Link></Button>
          </div>
        </div>
      </section>

      {/* Market Context */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-3xl font-bold text-foreground mb-6">Rental Market in {country.name}</h2>
          <div className="prose prose-lg max-w-none text-muted-foreground">
            <p>{country.marketContext}</p>
            <p>
              Whether you own a single apartment or manage a large portfolio in {country.name}, Easy-Locs adapts to your needs.
              The platform generates legally compliant documents, handles multi-currency rent collection in {country.currency},
              and provides localized financial reports for tax season.
            </p>
            <p>
              {country.name} property owners benefit from automated lease management, digital signature workflows,
              tenant screening tools, and a full tenant self-service portal. Manage everything from a single dashboard,
              available in {country.language === "en" ? "English" : `${country.language} and English`}.
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-3xl font-bold text-center text-foreground mb-12">
            Everything You Need to Manage Properties in {country.name}
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

      {/* Cities */}
      {cityLinks.length > 0 && (
        <InternalLinksGrid
          title={`Cities in ${country.name}`}
          links={cityLinks}
        />
      )}

      {/* Services */}
      {serviceLinks.length > 0 && (
        <InternalLinksGrid
          title={`Services Available in ${country.name}`}
          links={serviceLinks}
        />
      )}

      {/* FAQ */}
      <FAQSection faqs={faqs} />

      {/* Nearby Countries */}
      {nearbyCountries.length > 0 && (
        <InternalLinksGrid
          title={`Property Management in Nearby Countries`}
          links={nearbyCountries}
        />
      )}
    </SEOPageShell>
  );
};

export default CountrySEOPage;
