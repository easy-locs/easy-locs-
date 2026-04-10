/**
 * Layer 1 — Long-Term Rentals page with softened claims
 */
import SEOPageShell from "@/components/seo/SEOPageShell";
import FAQSection from "@/components/seo/FAQSection";
import InternalLinksGrid from "@/components/seo/InternalLinksGrid";
import { getPhase1Countries } from "@/lib/seo/seo-data";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Home, FileText, Users, CreditCard, BarChart3, Shield, Key, Building2, Gavel } from "lucide-react";

const LONG_TERM_FEATURES = [
  { icon: FileText, title: "Lease Generation", desc: "Create lease agreements adapted to local rental conventions, with customizable clauses and PDF export." },
  { icon: CreditCard, title: "Rent Collection", desc: "Collect rent via Stripe with automatic receipts and payment tracking. Multi-currency support included." },
  { icon: Users, title: "Tenant Portal", desc: "Self-service portal where tenants view leases, download receipts, pay rent, and submit maintenance requests." },
  { icon: Gavel, title: "Regulatory Awareness", desc: "Stay informed about local rental practices with country-specific tools and document templates." },
  { icon: BarChart3, title: "Financial Reporting", desc: "Track revenue, expenses, and generate reports adapted to local standards for tax preparation." },
  { icon: Key, title: "Digital Signatures", desc: "Secure digital signatures for leases and documents with full audit trail." },
  { icon: Building2, title: "Portfolio Management", desc: "Manage multiple properties across countries from a single dashboard with multi-currency support." },
  { icon: Shield, title: "Document Security", desc: "Encrypted document storage and secure tenant data management." },
];

const faqs = [
  { question: "What is long-term rental management software?", answer: "Long-term rental management software helps landlords and property managers handle all aspects of residential leasing — from creating contracts and collecting rent to managing tenant relationships and generating financial reports. Easy-Locs provides a complete solution that works internationally." },
  { question: "How does Easy-Locs handle lease generation?", answer: "Easy-Locs generates lease documents adapted to your property's country. Each lease includes relevant clauses, customizable terms, digital signature support, and PDF export." },
  { question: "Can I manage properties in multiple countries?", answer: "Yes. Easy-Locs supports property management across many countries with adapted documents, multi-currency rent collection, and country-specific tools. You can manage your international portfolio from one dashboard." },
  { question: "How does rent collection work?", answer: "Tenants can pay rent through Stripe for card payments, with additional methods available depending on your region. Each payment automatically generates a receipt and updates the financial dashboard." },
  { question: "Is there a tenant portal?", answer: "Yes. Each tenant gets access to a self-service portal where they can view their lease, download rent receipts, pay rent online, submit maintenance requests, and communicate with the landlord." },
  { question: "How much does Easy-Locs cost?", answer: "Easy-Locs offers a free plan that includes up to 2 properties. Paid plans scale based on portfolio size. All plans include core features like lease generation, rent collection, and tenant portal." },
];

const LongTermRentalsPage = () => {
  const topCountries = getPhase1Countries().slice(0, 20).map(c => ({
    to: `/property-management-${c.slug}`,
    label: c.name,
    icon: c.flag,
  }));

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Easy-Locs Long-Term Rental Management",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description: "Complete long-term rental management software for landlords. Lease generation, rent collection, tenant portal, financial reporting.",
      url: "https://www.easy-locs.com/long-term-rentals",
      offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
      provider: { "@type": "Organization", name: "Easy-Locs", url: "https://www.easy-locs.com" },
      featureList: "Lease generation, Rent collection, Tenant portal, Financial reporting, Digital signatures, Multi-country support",
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map(f => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
    },
  ];

  return (
    <SEOPageShell
      title="Long-Term Rental Management Software | Easy-Locs"
      description="Complete long-term rental management platform. Lease generation, rent collection, tenant portal, and financial reporting for landlords worldwide. Free to start."
      canonical="https://www.easy-locs.com/long-term-rentals"
      jsonLd={jsonLd as any}
      ctaTitle="Start Managing Your Rental Properties Today"
      ctaDescription="Join landlords worldwide using Easy-Locs for professional property management. Free plan available."
    >
      {/* Hero */}
      <section className="py-20 md:py-28 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4 max-w-5xl text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-6">
            Long-Term Rental Management Software
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            The complete platform for managing residential rental properties. Generate leases, collect rent, manage tenants,
            and produce financial reports — all adapted to local rental practices worldwide.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg"><Link to="/signup">Start Free <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
            <Button asChild size="lg" variant="outline"><Link to="/#pricing">View Pricing</Link></Button>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-3xl font-bold text-foreground mb-6">Why Choose Easy-Locs for Long-Term Rentals?</h2>
          <div className="prose prose-lg max-w-none text-muted-foreground">
            <p>
              Managing long-term rental properties requires a different set of tools than vacation rentals.
              You need legally appropriate lease agreements, reliable rent collection, proper financial documentation for tax reporting,
              and efficient tenant communication channels. Easy-Locs provides all of this in a single integrated platform.
            </p>
            <p>
              Unlike generic tools, Easy-Locs is built for international landlords.
              Whether you own a single apartment in Paris or manage a portfolio spanning Dubai, London, and New York,
              the platform adapts to each location — generating the right document format,
              supporting local currency, and providing relevant financial reports.
            </p>
            <p>
              The tenant experience matters too. Your tenants get a dedicated self-service portal where they can access
              their lease, download receipts, pay rent online, submit maintenance requests, and communicate directly with you.
              This reduces administrative overhead and improves tenant satisfaction.
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-3xl font-bold text-center text-foreground mb-12">Complete Long-Term Rental Toolkit</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {LONG_TERM_FEATURES.map(f => (
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

      {/* Workflow */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-3xl font-bold text-center text-foreground mb-8">How It Works</h2>
          <div className="space-y-4">
            {[
              "Add your properties — address, type, surface area, amenities",
              "Create tenant profiles with contact details",
              "Generate a lease agreement adapted to local conventions",
              "Both parties sign digitally — lease becomes active",
              "Set up rent collection via Stripe",
              "Receipts and financial reports are generated automatically",
              "Tenants access their portal for documents and payments",
              "Track expenses and generate reports at tax time",
            ].map((step, i) => (
              <div key={i} className="flex gap-3 items-center p-3 bg-background rounded-lg border border-border">
                <span className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">{i + 1}</span>
                <span className="text-foreground">{step}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <FAQSection faqs={faqs} />
      <InternalLinksGrid title="Available Worldwide" links={topCountries} />
    </SEOPageShell>
  );
};

export default LongTermRentalsPage;
