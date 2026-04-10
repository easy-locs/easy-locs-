import SEOHead from "@/components/SEOHead";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Calendar, CreditCard, Globe, Image, LineChart, MessageSquare, Search, Shield } from "lucide-react";

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Easy-Locs Seasonal Rental Management",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: "Vacation rental management software for short-term property owners. Calendar booking, dynamic pricing, guest communication, Stripe payments, and channel management in 190+ countries.",
    url: "https://www.easy-locs.com/seasonal-rentals",
    offers: { "@type": "Offer", price: "0", priceCurrency: "EUR", description: "Free to start" },
    provider: { "@type": "Organization", name: "Easy-Locs", url: "https://www.easy-locs.com" },
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://www.easy-locs.com/" },
      { "@type": "ListItem", position: 2, name: "Vacation Rentals", item: "https://www.easy-locs.com/seasonal-rentals" },
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "How does the seasonal rental calendar work?",
        acceptedAnswer: { "@type": "Answer", text: "Guests select check-in and check-out dates. The system automatically calculates nights, total price, and blocks unavailable dates. After booking confirmation, the calendar updates in real-time." },
      },
      {
        "@type": "Question",
        name: "Can I sync with Airbnb and Booking.com?",
        acceptedAnswer: { "@type": "Answer", text: "Yes. Easy-Locs supports iCal sync to import and export calendars from Airbnb, Booking.com, VRBO, and other platforms to avoid double bookings." },
      },
      {
        "@type": "Question",
        name: "How are payments handled for seasonal rentals?",
        acceptedAnswer: { "@type": "Answer", text: "Payments are processed securely via Stripe. You can send payment links to guests, track payment status, and generate automatic invoices and receipts." },
      },
    ],
  },
];

const features = [
  { icon: Calendar, title: "Smart Booking Calendar", desc: "Check-in/check-out selection with automatic night calculation, blocked dates, and real-time availability sync." },
  { icon: LineChart, title: "Dynamic Pricing", desc: "Set seasonal rates, minimum stays, and automatic price adjustments based on demand and occupancy." },
  { icon: CreditCard, title: "Stripe Payments", desc: "Send payment links, track payment status, and generate invoices automatically with multi-currency support." },
  { icon: Image, title: "Photo Gallery & Listings", desc: "Create beautiful public listing pages with photo galleries, amenities, and SEO-optimized descriptions." },
  { icon: MessageSquare, title: "Guest Communication", desc: "Centralized messaging with guests, booking confirmations, check-in instructions, and review requests." },
  { icon: Globe, title: "Channel Manager", desc: "Sync calendars with Airbnb, Booking.com, VRBO via iCal to prevent double bookings." },
  { icon: Search, title: "Public Catalog", desc: "SEO-optimized rental catalog searchable by country, city, and property type for direct bookings." },
  { icon: Shield, title: "Secure & Compliant", desc: "GDPR compliant, secure data handling, and localized tax compliance in 190+ countries." },
];

const SeasonalRentalsPage = () => (
  <div className="app-mobile-page bg-background">
    <SEOHead
      title="Vacation Rental Management Software | Easy-Locs"
      description="Manage short-term rentals with smart calendars, dynamic pricing, Stripe payments, and channel sync. Direct booking pages for your properties. 190+ countries."
      canonical="https://www.easy-locs.com/seasonal-rentals"
      jsonLd={jsonLd as any}
    />
    <Navbar />

    <main>
      <section className="py-20 md:py-28 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4 max-w-5xl text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-6">
            Vacation Rental Management Made Simple
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Smart booking calendars, dynamic pricing, guest communication, and Stripe payments — everything you need to manage short-term rentals professionally in 190+ countries.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg"><Link to="/signup">Start Free</Link></Button>
            <Button asChild size="lg" variant="outline"><Link to="/rentals">Browse Rentals</Link></Button>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-3xl font-bold text-center text-foreground mb-12">
            Complete Vacation Rental Toolkit
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
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

      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-3xl font-bold text-center text-foreground mb-8">How Booking Works</h2>
          <div className="space-y-4">
            {[
              "Guest selects check-in and check-out dates on your listing page",
              "System calculates nights and total price automatically",
              "Guest submits booking request with contact details",
              "You review and confirm or decline the booking",
              "Payment link is sent automatically via Stripe",
              "Calendar blocks the dates after payment confirmation",
              "Guest receives check-in instructions and confirmation",
            ].map((step, i) => (
              <div key={i} className="flex gap-3 items-center p-3 bg-background rounded-lg border border-border">
                <span className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">{i + 1}</span>
                <span className="text-foreground">{step}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

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

      <section className="py-16 bg-primary/5">
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">Start managing your vacation rentals today</h2>
          <p className="text-muted-foreground mb-6">Join property owners in 190+ countries using Easy-Locs for professional short-term rental management.</p>
          <Button asChild size="lg"><Link to="/signup">Get Started Free</Link></Button>
          <nav className="flex flex-wrap justify-center gap-4 mt-8 text-sm" aria-label="Related pages">
            <Link to="/property-management" className="text-muted-foreground hover:text-primary transition-colors">Property Management →</Link>
            <Link to="/concierge-services" className="text-muted-foreground hover:text-primary transition-colors">Concierge Services →</Link>
            <Link to="/marketplace-services" className="text-muted-foreground hover:text-primary transition-colors">Marketplace →</Link>
            <Link to="/explore" className="text-muted-foreground hover:text-primary transition-colors">Explore Listings →</Link>
          </nav>
        </div>
      </section>
    </main>

    <Footer />
  </div>
);

export default SeasonalRentalsPage;
