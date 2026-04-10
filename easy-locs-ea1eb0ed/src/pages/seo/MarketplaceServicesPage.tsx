import SEOHead from "@/components/SEOHead";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Car, ChefHat, Dumbbell, Hammer, MapPin, Plane, ShoppingBag, Sparkles, Ticket, Wifi } from "lucide-react";

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Easy-Locs Marketplace — Local Services for Property Guests",
    description: "Marketplace connecting property guests with local service providers. Airport transfers, car rentals, cleaning, tours, wellness, restaurants, and more.",
    url: "https://www.easy-locs.com/marketplace-services",
    isPartOf: { "@type": "WebSite", name: "Easy-Locs", url: "https://www.easy-locs.com" },
  },
  {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Marketplace Service Categories",
    numberOfItems: 10,
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Airport Transfers" },
      { "@type": "ListItem", position: 2, name: "Car Rental" },
      { "@type": "ListItem", position: 3, name: "Cleaning Services" },
      { "@type": "ListItem", position: 4, name: "Tours & Activities" },
      { "@type": "ListItem", position: 5, name: "Wellness & Spa" },
      { "@type": "ListItem", position: 6, name: "Restaurant Reservations" },
      { "@type": "ListItem", position: 7, name: "Maintenance & Repairs" },
      { "@type": "ListItem", position: 8, name: "Coworking Spaces" },
      { "@type": "ListItem", position: 9, name: "Events & Tickets" },
      { "@type": "ListItem", position: 10, name: "Personal Services" },
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What services are available on the Easy-Locs marketplace?",
        acceptedAnswer: { "@type": "Answer", text: "The marketplace offers airport transfers, car rentals, cleaning, tours & activities, wellness, restaurants, maintenance, coworking, events, and personal services — all bookable by your guests." },
      },
      {
        "@type": "Question",
        name: "How do I become a service provider on Easy-Locs?",
        acceptedAnswer: { "@type": "Answer", text: "Sign up for free, create your provider profile, list your services with pricing and availability, and start receiving bookings from property guests in your area." },
      },
      {
        "@type": "Question",
        name: "Does each service type have its own booking calendar?",
        acceptedAnswer: { "@type": "Answer", text: "Yes. Each service category uses a dynamic calendar adapted to its type — date range for car rentals, single date + time for transfers, time slots for tours, etc." },
      },
    ],
  },
];

const categories = [
  { icon: Plane, name: "Airport Transfers", desc: "Pickup and drop-off with date, time, and passenger count." },
  { icon: Car, name: "Car Rental", desc: "Date range booking with automatic day calculation and vehicle availability." },
  { icon: Sparkles, name: "Cleaning Services", desc: "Schedule cleaning with time slots and service duration tracking." },
  { icon: MapPin, name: "Tours & Activities", desc: "Book local experiences with participant count and time slot selection." },
  { icon: Dumbbell, name: "Wellness & Spa", desc: "Spa appointments, yoga sessions, and personal training bookings." },
  { icon: ChefHat, name: "Restaurant Reservations", desc: "Table reservations with party size and preferred time." },
  { icon: Hammer, name: "Maintenance & Repairs", desc: "On-demand maintenance with provider availability and status tracking." },
  { icon: Wifi, name: "Coworking Spaces", desc: "Book desk or meeting room by the day or hour." },
  { icon: Ticket, name: "Events & Tickets", desc: "Local events, shows, and ticket bookings with seat selection." },
  { icon: ShoppingBag, name: "Personal Services", desc: "Grocery delivery, babysitting, personal chef, and more." },
];

const MarketplaceServicesPage = () => (
  <div className="app-mobile-page bg-background">
    <SEOHead
      title="Marketplace Services for Rental Guests | Easy-Locs"
      description="Connect your guests with local services: airport transfers, car rental, cleaning, tours, wellness, restaurants. Dynamic booking calendars for each service type."
      canonical="https://www.easy-locs.com/marketplace-services"
      jsonLd={jsonLd as any}
    />
    <Navbar />

    <main>
      <section className="py-20 md:py-28 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4 max-w-5xl text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-6">
            Marketplace Services for Rental Guests
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Boost your rental revenue by offering local services to your guests. Airport transfers, car rentals, tours, cleaning, wellness — each with its own smart booking calendar.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg"><Link to="/signup">List Your Services</Link></Button>
            <Button asChild size="lg" variant="outline"><Link to="/#features">Explore Features</Link></Button>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-3xl font-bold text-center text-foreground mb-12">
            10+ Service Categories with Smart Calendars
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((c) => (
              <Card key={c.name} className="border-border">
                <CardContent className="p-6">
                  <c.icon className="h-10 w-10 text-primary mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">{c.name}</h3>
                  <p className="text-muted-foreground text-sm">{c.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-3xl font-bold text-center text-foreground mb-8">How It Works</h2>
          <div className="space-y-6">
            {[
              { step: "1", title: "Create Your Service", desc: "Add your service with pricing, photos, availability, and booking rules." },
              { step: "2", title: "Share Your Booking Page", desc: "Each service gets a unique booking link you can share with guests or embed on your website." },
              { step: "3", title: "Receive & Manage Bookings", desc: "Get notified of new bookings, confirm or decline, and communicate directly with guests." },
              { step: "4", title: "Get Paid Securely", desc: "Payments processed via Stripe with automatic invoicing and commission tracking." },
            ].map((s) => (
              <div key={s.step} className="flex gap-4 items-start">
                <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0">{s.step}</div>
                <div>
                  <h3 className="font-semibold text-foreground">{s.title}</h3>
                  <p className="text-muted-foreground text-sm">{s.desc}</p>
                </div>
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
          <h2 className="text-2xl font-bold text-foreground mb-4">Start earning more from your properties</h2>
          <p className="text-muted-foreground mb-6">List your services on Easy-Locs and reach guests in 190+ countries.</p>
          <Button asChild size="lg"><Link to="/signup">Get Started Free</Link></Button>
          <nav className="flex flex-wrap justify-center gap-4 mt-8 text-sm" aria-label="Related pages">
            <Link to="/property-management" className="text-muted-foreground hover:text-primary transition-colors">Property Management →</Link>
            <Link to="/seasonal-rentals-booking" className="text-muted-foreground hover:text-primary transition-colors">Vacation Rentals →</Link>
            <Link to="/concierge-services" className="text-muted-foreground hover:text-primary transition-colors">Concierge Services →</Link>
            <Link to="/explore" className="text-muted-foreground hover:text-primary transition-colors">Explore Listings →</Link>
          </nav>
        </div>
      </section>
    </main>

    <Footer />
  </div>
);

export default MarketplaceServicesPage;
