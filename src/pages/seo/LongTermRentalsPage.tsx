/**
 * Layer 1 — Additional Core Pages
 * /long-term-rentals, /property-owner-software, /property-management-platform, /rental-management-software
 */
import SEOPageShell from "@/components/seo/SEOPageShell";
import FAQSection from "@/components/seo/FAQSection";
import InternalLinksGrid from "@/components/seo/InternalLinksGrid";
import { SEO_COUNTRIES } from "@/lib/seo/seo-data";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Home, FileText, Users, CreditCard, BarChart3, Shield, Key, Building2, Briefcase, Globe, Gavel } from "lucide-react";

const LONG_TERM_FEATURES = [
  { icon: FileText, title: "Lease Generation", desc: "Create legally compliant leases for 200+ countries with automatic clause adaptation based on jurisdiction." },
  { icon: CreditCard, title: "Rent Collection", desc: "Collect rent via Stripe, SEPA Direct Debit, bank transfer, or PayPal. Automatic receipts and payment tracking." },
  { icon: Users, title: "Tenant Portal", desc: "Self-service portal where tenants view leases, download receipts, pay rent, and submit maintenance requests." },
  { icon: Gavel, title: "Legal Compliance", desc: "Stay compliant with local regulations. Automatic rent indexation, legal notices, and jurisdiction-specific clauses." },
  { icon: BarChart3, title: "Financial Reporting", desc: "Automated fiscal reports, expense tracking, and tax-ready statements adapted to local accounting standards." },
  { icon: Key, title: "Digital Signatures", desc: "Secure digital signatures for leases, inventory reports, and legal documents with full audit trail." },
  { icon: Building2, title: "Portfolio Management", desc: "Manage unlimited properties across multiple countries from a single dashboard with multi-currency support." },
  { icon: Shield, title: "Document Security", desc: "GDPR-compliant data handling, encrypted document storage, and secure tenant data management." },
];

const faqs = [
  { question: "What is long-term rental management software?", answer: "Long-term rental management software helps landlords and property managers handle all aspects of residential leasing — from creating legal contracts and collecting rent to managing tenant relationships and generating financial reports. Easy-Locs provides a complete solution that works in 200+ countries." },
  { question: "How does Easy-Locs handle lease generation?", answer: "Easy-Locs automatically generates jurisdiction-compliant leases based on the property's country. Each lease includes mandatory clauses required by local law, customizable optional clauses, digital signature support, and PDF export." },
  { question: "Can I manage properties in multiple countries?", answer: "Yes. Easy-Locs supports property management in 200+ countries with localized documents, multi-currency rent collection (120+ currencies), and country-specific compliance features. You can manage your entire international portfolio from one dashboard." },
  { question: "How does rent collection work?", answer: "Tenants can pay rent through multiple channels: Stripe for card payments, SEPA Direct Debit for European bank transfers, PayPal, or manual bank transfer. Each payment automatically generates a receipt and updates the financial dashboard." },
  { question: "Is there a tenant portal?", answer: "Yes. Each tenant gets access to a self-service portal where they can view their lease, download rent receipts, pay rent online, submit maintenance requests, communicate with the landlord, and request documents." },
  { question: "How much does Easy-Locs cost?", answer: "Easy-Locs offers a free plan that includes up to 2 properties. Paid plans start at affordable rates and scale based on portfolio size. All plans include core features like lease generation, rent collection, and tenant portal." },
];

const LongTermRentalsPage = () => {
  const topCountries = SEO_COUNTRIES.slice(0, 30).map(c => ({
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
      description: "Complete long-term rental management software for landlords. Lease generation, rent collection, tenant portal, financial reporting in 200+ countries.",
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
      description="Complete long-term rental management platform. Lease generation, rent collection, tenant portal, and financial reporting for landlords in 200+ countries. Free to start."
      canonical="https://www.easy-locs.com/long-term-rentals"
      jsonLd={jsonLd as any}
      ctaTitle="Start Managing Your Rental Properties Today"
      ctaDescription="Join thousands of landlords worldwide using Easy-Locs for professional property management. Free plan available."
    >
      {/* Hero */}
      <section className="py-20 md:py-28 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4 max-w-5xl text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-6">
            Long-Term Rental Management Software
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            The complete platform for managing residential rental properties. Generate leases, collect rent, manage tenants,
            and produce financial reports — all compliant with local regulations in 200+ countries worldwide.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg"><Link to="/signup">Start Free <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
            <Button asChild size="lg" variant="outline"><Link to="/#pricing">View Pricing</Link></Button>
          </div>
        </div>
      </section>

      {/* Long description section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-3xl font-bold text-foreground mb-6">Why Choose Easy-Locs for Long-Term Rentals?</h2>
          <div className="prose prose-lg max-w-none text-muted-foreground">
            <p>
              Managing long-term rental properties requires a different set of tools than vacation rentals.
              You need legally compliant lease agreements, reliable rent collection, proper financial documentation for tax reporting,
              and efficient tenant communication channels. Easy-Locs provides all of this in a single integrated platform.
            </p>
            <p>
              Unlike generic property management tools, Easy-Locs is built from the ground up for international landlords.
              Whether you own a single apartment in Paris or manage a portfolio spanning Dubai, London, and New York,
              the platform automatically adapts to each jurisdiction's requirements — generating the right lease clauses,
              applying correct rent indexation rules, and producing tax-compliant financial reports.
            </p>
            <p>
              The tenant experience matters too. Your tenants get a dedicated self-service portal where they can access
              their lease, download receipts, pay rent online, submit maintenance requests, and communicate directly with you.
              This reduces administrative overhead and improves tenant satisfaction and retention.
            </p>
            <p>
              Easy-Locs supports 120+ currencies with automatic conversion, 31 interface languages, and integrates with
              Stripe for secure payment processing. Digital signatures ensure your leases are legally binding,
              while encrypted document storage keeps sensitive data safe and GDPR-compliant.
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
              "Create tenant profiles with contact details and documents",
              "Generate a jurisdiction-compliant lease with automatic clauses",
              "Both parties sign digitally — lease becomes active",
              "Set up automatic rent collection via Stripe or SEPA",
              "Receipts and financial reports are generated automatically",
              "Tenants access their portal for documents and payments",
              "Track expenses, generate fiscal reports at tax time",
            ].map((step, i) => (
              <div key={i} className="flex gap-3 items-center p-3 bg-background rounded-lg border border-border">
                <span className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">{i + 1}</span>
                <span className="text-foreground">{step}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <FAQSection faqs={faqs} />

      {/* Countries */}
      <InternalLinksGrid title="Available in 200+ Countries" links={topCountries} />
    </SEOPageShell>
  );
};

export default LongTermRentalsPage;
