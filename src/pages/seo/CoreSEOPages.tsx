/**
 * Additional Layer 1 pages:
 * /property-owner-software
 * /property-management-platform
 * /rental-management-software
 */
import SEOPageShell from "@/components/seo/SEOPageShell";
import FAQSection from "@/components/seo/FAQSection";
import InternalLinksGrid from "@/components/seo/InternalLinksGrid";
import { SEO_COUNTRIES } from "@/lib/seo/seo-data";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Building2, Globe, BarChart3, Shield, Users, CreditCard, FileText, Smartphone } from "lucide-react";

const features = [
  { icon: Building2, title: "Multi-Property Dashboard", desc: "Manage unlimited properties across countries from one interface with real-time overview of occupancy, rent status, and financials." },
  { icon: Globe, title: "200+ Countries Supported", desc: "Localized lease templates, multi-currency rent collection, and jurisdiction-specific compliance for worldwide property management." },
  { icon: FileText, title: "Smart Document Engine", desc: "Auto-generate leases, receipts, tax reports, and legal notices. All documents adapt to local regulations automatically." },
  { icon: Users, title: "Tenant & Guest Portals", desc: "Dedicated portals for long-term tenants and vacation guests with self-service payments, documents, and communication." },
  { icon: CreditCard, title: "Payment Processing", desc: "Accept payments via Stripe, SEPA, PayPal, and bank transfer. Multi-currency support with automatic conversion." },
  { icon: BarChart3, title: "Analytics & Reporting", desc: "Revenue tracking, expense management, ROI analysis, and tax-ready fiscal reports by property and country." },
  { icon: Shield, title: "Enterprise Security", desc: "MFA, encrypted storage, GDPR compliance, audit trails, and role-based access control for teams." },
  { icon: Smartphone, title: "Mobile Ready", desc: "Full PWA support for managing properties on the go. Works on any device, installable as an app." },
];

const faqs = [
  { question: "What makes Easy-Locs different from other property management platforms?", answer: "Easy-Locs is built for international property owners from day one. Unlike local-only tools, it supports 200+ countries, 120+ currencies, and 31 languages. It generates legally compliant documents for each jurisdiction and handles everything from long-term leases to vacation rentals and marketplace services." },
  { question: "Can I manage both long-term and short-term rentals?", answer: "Yes. Easy-Locs provides separate modules for long-term rental management (leases, rent collection, tenant portal) and seasonal rentals (booking calendar, dynamic pricing, channel sync). Both operate from the same dashboard." },
  { question: "Does Easy-Locs work for property managers and agencies?", answer: "Absolutely. Easy-Locs supports multi-user collaboration with role-based access. Property managers can invite team members, assign properties, and manage client portfolios. The marketplace also supports concierge services and service provider management." },
  { question: "How does international compliance work?", answer: "Easy-Locs maintains a registry of rental regulations for each supported country. When you create a lease, the system automatically includes jurisdiction-specific mandatory clauses, applies correct deposit limits, and generates compliant receipts and financial reports." },
  { question: "Is there an API for developers?", answer: "Yes. Easy-Locs provides a developer portal with API key management, webhooks, and integration capabilities for custom workflows and third-party service connections." },
];

export const PropertyOwnerSoftwarePage = () => (
  <SEOPageShell
    title="Property Owner Software — Manage Rentals Worldwide | Easy-Locs"
    description="All-in-one property owner software for managing rental properties in 200+ countries. Leases, rent collection, tenant portal, marketplace services. Free to start."
    canonical="https://www.easy-locs.com/property-owner-software"
    jsonLd={{
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Easy-Locs Property Owner Software",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description: "All-in-one property owner software for managing rental properties worldwide.",
      offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
    }}
    ctaTitle="Take control of your rental properties"
    ctaDescription="Join property owners in 200+ countries. Free plan available."
  >
    <section className="py-20 md:py-28 bg-gradient-to-b from-primary/5 to-background">
      <div className="container mx-auto px-4 max-w-5xl text-center">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-6">Property Owner Software</h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
          The complete software solution for property owners who want to manage their rental portfolio professionally.
          From single apartments to international portfolios — Easy-Locs handles everything.
        </p>
        <Button asChild size="lg"><Link to="/signup">Start Free <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
      </div>
    </section>
    <section className="py-16">
      <div className="container mx-auto px-4 max-w-6xl">
        <h2 className="text-3xl font-bold text-center text-foreground mb-12">Why Property Owners Choose Easy-Locs</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map(f => (
            <Card key={f.title} className="border-border"><CardContent className="p-6">
              <f.icon className="h-10 w-10 text-primary mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">{f.title}</h3>
              <p className="text-muted-foreground text-sm">{f.desc}</p>
            </CardContent></Card>
          ))}
        </div>
      </div>
    </section>
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4 max-w-4xl prose prose-lg max-w-none text-muted-foreground">
        <h2 className="text-3xl font-bold text-foreground mb-6">Built for Modern Property Owners</h2>
        <p>Today's property owners need more than a spreadsheet. Whether you're managing a family apartment, a growing portfolio, or properties across borders, Easy-Locs provides enterprise-grade tools in an intuitive interface. The platform handles the complexity of international rental management — different lease formats, currencies, tax regulations, and tenant expectations — so you can focus on growing your investment.</p>
        <p>Easy-Locs integrates everything in one place: property listings, lease management, rent collection, document generation, tenant communication, maintenance tracking, and financial reporting. There's no need for multiple tools, manual calculations, or compliance research. The platform does it automatically based on your property's location.</p>
      </div>
    </section>
    <FAQSection faqs={faqs} />
    <InternalLinksGrid title="Available Worldwide" links={SEO_COUNTRIES.slice(0, 24).map(c => ({ to: `/property-management-${c.slug}`, label: c.name, icon: c.flag }))} />
  </SEOPageShell>
);

export const PropertyManagementPlatformPage = () => (
  <SEOPageShell
    title="Property Management Platform — Easy-Locs | 200+ Countries"
    description="Cloud-based property management platform for landlords and agencies. Manage leases, tenants, payments, and services across 200+ countries."
    canonical="https://www.easy-locs.com/property-management-platform"
    jsonLd={{
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Easy-Locs Property Management Platform",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description: "Cloud-based property management platform for landlords and agencies worldwide.",
      offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
    }}
    ctaTitle="Experience the future of property management"
    ctaDescription="Cloud-based, globally compliant, always available."
  >
    <section className="py-20 md:py-28 bg-gradient-to-b from-primary/5 to-background">
      <div className="container mx-auto px-4 max-w-5xl text-center">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-6">Property Management Platform</h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
          A cloud-based property management platform that scales from a single unit to thousands of properties across 200+ countries. Built for landlords, agencies, and property management companies.
        </p>
        <Button asChild size="lg"><Link to="/signup">Start Free <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
      </div>
    </section>
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4 max-w-4xl prose prose-lg max-w-none text-muted-foreground">
        <h2 className="text-3xl font-bold text-foreground mb-6">A Platform That Grows With You</h2>
        <p>Easy-Locs isn't just another SaaS tool — it's a complete ecosystem for rental property management. The platform combines long-term rental management, seasonal booking systems, marketplace services, and concierge operations into one unified experience. This means less context-switching, fewer integrations to maintain, and a single source of truth for all your property data.</p>
        <p>For agencies and property management companies, Easy-Locs offers collaboration features including team invitations, role-based access control, and multi-organization support. Assign properties to team members, track performance, and maintain audit trails for every action taken on the platform.</p>
        <p>The platform is designed for global scale. With support for 200+ countries, 120+ currencies, and 31 languages, you can expand into new markets without changing tools. Each jurisdiction gets customized document templates, local payment methods, and compliance-aware workflows.</p>
      </div>
    </section>
    <section className="py-16">
      <div className="container mx-auto px-4 max-w-6xl">
        <h2 className="text-3xl font-bold text-center text-foreground mb-12">Platform Capabilities</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.slice(0, 8).map(f => (
            <Card key={f.title} className="border-border"><CardContent className="p-6">
              <f.icon className="h-10 w-10 text-primary mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">{f.title}</h3>
              <p className="text-muted-foreground text-sm">{f.desc}</p>
            </CardContent></Card>
          ))}
        </div>
      </div>
    </section>
    <FAQSection faqs={faqs} />
    <InternalLinksGrid title="Explore by Country" links={SEO_COUNTRIES.slice(0, 24).map(c => ({ to: `/property-management-${c.slug}`, label: c.name, icon: c.flag }))} />
  </SEOPageShell>
);

export const RentalManagementSoftwarePage = () => (
  <SEOPageShell
    title="Rental Management Software — Easy-Locs | Free to Start"
    description="Professional rental management software for landlords. Automate leases, rent collection, tenant communication, and financial reporting. 200+ countries."
    canonical="https://www.easy-locs.com/rental-management-software"
    jsonLd={{
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Easy-Locs Rental Management Software",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description: "Professional rental management software for landlords worldwide.",
      offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
    }}
    ctaTitle="Automate your rental management"
    ctaDescription="Free plan includes 2 properties. No credit card required."
  >
    <section className="py-20 md:py-28 bg-gradient-to-b from-primary/5 to-background">
      <div className="container mx-auto px-4 max-w-5xl text-center">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-6">Rental Management Software</h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
          Automate every aspect of rental management — from lease creation to rent collection, tenant communication to tax reporting.
          Professional tools that make landlording effortless.
        </p>
        <Button asChild size="lg"><Link to="/signup">Start Free <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
      </div>
    </section>
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4 max-w-4xl prose prose-lg max-w-none text-muted-foreground">
        <h2 className="text-3xl font-bold text-foreground mb-6">Rental Management, Simplified</h2>
        <p>Managing rental properties shouldn't require hours of administrative work each month. Easy-Locs automates the repetitive tasks that consume landlords' time: generating monthly receipts, sending payment reminders, tracking expenses, and producing financial reports for tax season.</p>
        <p>The software adapts to each property's jurisdiction, generating legally compliant documents in the local language, calculating correct rent indexation, and applying jurisdiction-specific rules. Whether you manage properties in France (with its strict bail meublé/vide regulations) or in the UAE (with its Ejari registration system), Easy-Locs handles the compliance automatically.</p>
        <p>Tenants benefit too, with a self-service portal for payments, documents, and communication. This reduces friction, improves collection rates, and builds better landlord-tenant relationships. The result: higher occupancy, fewer disputes, and more time to focus on growing your portfolio.</p>
      </div>
    </section>
    <section className="py-16">
      <div className="container mx-auto px-4 max-w-6xl">
        <h2 className="text-3xl font-bold text-center text-foreground mb-12">Key Features</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map(f => (
            <Card key={f.title} className="border-border"><CardContent className="p-6">
              <f.icon className="h-10 w-10 text-primary mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">{f.title}</h3>
              <p className="text-muted-foreground text-sm">{f.desc}</p>
            </CardContent></Card>
          ))}
        </div>
      </div>
    </section>
    <FAQSection faqs={faqs} />
    <InternalLinksGrid title="Worldwide Coverage" links={SEO_COUNTRIES.slice(0, 24).map(c => ({ to: `/property-management-${c.slug}`, label: c.name, icon: c.flag }))} />
  </SEOPageShell>
);
