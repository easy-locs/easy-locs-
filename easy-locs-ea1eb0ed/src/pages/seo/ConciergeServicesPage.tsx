import SEOHead from "@/components/SEOHead";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Building2, CalendarCheck, CreditCard, Globe, MessageSquare, Shield, Star, Users } from "lucide-react";

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Easy-Locs Concierge Services",
    serviceType: "Property Concierge Management",
    provider: {
      "@type": "Organization",
      name: "Easy-Locs",
      url: "https://www.easy-locs.com",
    },
    areaServed: { "@type": "Place", name: "Worldwide" },
    description: "Professional concierge services for property owners and vacation rental managers. Guest check-in, cleaning, maintenance, key handover, and hospitality services in 190+ countries.",
    offers: {
      "@type": "Offer",
      priceCurrency: "EUR",
      price: "0",
      description: "Free to start, pay-per-service model",
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://www.easy-locs.com/" },
      { "@type": "ListItem", position: 2, name: "Concierge Services", item: "https://www.easy-locs.com/concierge-services" },
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What concierge services does Easy-Locs offer?",
        acceptedAnswer: { "@type": "Answer", text: "Easy-Locs provides guest check-in/check-out, cleaning coordination, maintenance dispatch, key handover, linen services, airport transfers, and local activity bookings for property owners worldwide." },
      },
      {
        "@type": "Question",
        name: "Can I manage concierge services for multiple properties?",
        acceptedAnswer: { "@type": "Answer", text: "Yes. Easy-Locs supports unlimited properties across 190+ countries. Each property can have its own concierge team, service catalog, and booking calendar." },
      },
      {
        "@type": "Question",
        name: "How does payment work for concierge services?",
        acceptedAnswer: { "@type": "Answer", text: "Guests pay securely via Stripe. You set your own prices and commission rates. Payments are tracked per booking with automatic invoicing and receipt generation." },
      },
    ],
  },
];

const features = [
  { icon: CalendarCheck, title: "Booking Calendar", desc: "Dynamic calendar per service with real-time availability, time slots, and automatic conflict detection." },
  { icon: Users, title: "Guest Management", desc: "Track guest details, special requests, check-in times, and communication history in one place." },
  { icon: CreditCard, title: "Secure Payments", desc: "Stripe-powered payments with automatic invoicing, commission tracking, and multi-currency support." },
  { icon: MessageSquare, title: "Communication Hub", desc: "Centralized messaging between guests, property owners, and service providers with email sync." },
  { icon: Globe, title: "Multi-Country Support", desc: "Operate concierge services in 190+ countries with localized pricing, languages, and compliance." },
  { icon: Shield, title: "Professional Dashboard", desc: "Track all bookings, revenue, provider performance, and guest satisfaction from a single dashboard." },
];

const ConciergeServicesPage = () => (
  <div className="app-mobile-page bg-background">
    <SEOHead
      title="Concierge Services for Property Owners | Easy-Locs"
      description="Professional concierge management for vacation rentals and properties. Guest check-in, cleaning, maintenance, airport transfers. 190+ countries. Free to start."
      canonical="https://www.easy-locs.com/concierge-services"
      jsonLd={jsonLd as any}
    />
    <Navbar />

    <main>
      {/* Hero */}
      <section className="py-20 md:py-28 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4 max-w-5xl text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-6">
            Concierge Services for Property Owners
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Deliver 5-star hospitality to your guests. Manage check-ins, cleaning, maintenance, airport transfers, and local experiences — all from one platform, in 190+ countries.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="text-base">
              <Link to="/signup">Start Free</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="text-base">
              <Link to="/#pricing">View Pricing</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-3xl font-bold text-center text-foreground mb-12">
            Everything You Need for Professional Concierge Management
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
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

      {/* Service Types */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-3xl font-bold text-center text-foreground mb-8">
            Services You Can Offer
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {["Guest Check-in & Check-out", "Professional Cleaning", "Linen & Laundry Service", "Key Handover & Lockbox", "Airport Transfers", "Maintenance & Repairs", "Local Tours & Activities", "Restaurant Reservations", "Grocery Delivery", "Welcome Packages"].map((s) => (
              <div key={s} className="flex items-center gap-3 p-4 bg-background rounded-lg border border-border">
                <Star className="h-5 w-5 text-primary shrink-0" />
                <span className="text-foreground font-medium">{s}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-3xl font-bold text-center text-foreground mb-10">Frequently Asked Questions</h2>
          {jsonLd[2].mainEntity.map((q: any) => (
            <details key={q.name} className="mb-4 border border-border rounded-lg">
              <summary className="p-4 font-medium text-foreground cursor-pointer">{q.name}</summary>
              <p className="px-4 pb-4 text-muted-foreground text-sm">{q.acceptedAnswer.text}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-primary/5">
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">Ready to elevate your guest experience?</h2>
          <p className="text-muted-foreground mb-6">Join thousands of property owners using Easy-Locs to deliver professional concierge services worldwide.</p>
          <Button asChild size="lg"><Link to="/signup">Get Started Free</Link></Button>
          <nav className="flex flex-wrap justify-center gap-4 mt-8 text-sm" aria-label="Related pages">
            <Link to="/property-management" className="text-muted-foreground hover:text-primary transition-colors">Property Management →</Link>
            <Link to="/seasonal-rentals-booking" className="text-muted-foreground hover:text-primary transition-colors">Vacation Rentals →</Link>
            <Link to="/marketplace-services" className="text-muted-foreground hover:text-primary transition-colors">Marketplace →</Link>
            <Link to="/explore" className="text-muted-foreground hover:text-primary transition-colors">Explore Listings →</Link>
          </nav>
        </div>
      </section>
    </main>

    <Footer />
  </div>
);

export default ConciergeServicesPage;
