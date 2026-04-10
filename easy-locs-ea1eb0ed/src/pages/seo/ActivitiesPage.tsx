import SEOHead from "@/components/SEOHead";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Anchor, Bike, Camera, Mountain, Music, Palette, Sailboat, Sun, TreePine, Utensils } from "lucide-react";

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Easy-Locs Tours & Activities",
    serviceType: "Tourism & Activity Booking",
    provider: { "@type": "Organization", name: "Easy-Locs", url: "https://www.easy-locs.com" },
    areaServed: { "@type": "Place", name: "Worldwide" },
    description: "Book local tours, excursions, outdoor activities, cultural experiences, and dining for vacation rental guests. Available in 190+ countries.",
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What types of activities can I book through Easy-Locs?",
        acceptedAnswer: { "@type": "Answer", text: "Easy-Locs offers guided tours, outdoor adventures, water sports, cultural workshops, cooking classes, wine tastings, cycling tours, photography tours, and more — all bookable online with time slot selection." },
      },
      {
        "@type": "Question",
        name: "Can activity providers set their own pricing and availability?",
        acceptedAnswer: { "@type": "Answer", text: "Yes. Providers set their own prices, available dates, time slots, maximum group sizes, and booking conditions. The system automatically manages availability after each booking." },
      },
    ],
  },
];

const activities = [
  { icon: Mountain, name: "Hiking & Trekking", desc: "Guided mountain hikes, nature trails, and trekking expeditions." },
  { icon: Sailboat, name: "Water Sports", desc: "Sailing, surfing, kayaking, diving, and boat tours." },
  { icon: Utensils, name: "Food & Wine", desc: "Cooking classes, wine tastings, local food tours, and dining experiences." },
  { icon: Camera, name: "Photography Tours", desc: "Guided photo walks through scenic locations with expert photographers." },
  { icon: Palette, name: "Art & Culture", desc: "Museum visits, art workshops, pottery classes, and cultural immersion." },
  { icon: Bike, name: "Cycling Tours", desc: "City bike tours, countryside rides, and mountain biking adventures." },
  { icon: Music, name: "Entertainment", desc: "Live music, local festivals, theater shows, and cultural performances." },
  { icon: TreePine, name: "Nature & Wildlife", desc: "Wildlife safaris, bird watching, botanical gardens, and nature reserves." },
  { icon: Anchor, name: "Boat Trips", desc: "Sunset cruises, fishing trips, island hopping, and yacht charters." },
  { icon: Sun, name: "Wellness Retreats", desc: "Yoga sessions, meditation workshops, spa days, and wellness retreats." },
];

const ActivitiesPage = () => (
  <div className="app-mobile-page bg-background">
    <SEOHead
      title="Tours & Activities for Rental Guests | Easy-Locs"
      description="Book local tours, outdoor adventures, food & wine experiences, water sports, and cultural activities for your vacation rental guests. 190+ countries."
      canonical="https://www.easy-locs.com/activities"
      jsonLd={jsonLd as any}
    />
    <Navbar />

    <main>
      <section className="py-20 md:py-28 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4 max-w-5xl text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-6">
            Tours & Activities for Your Guests
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Curate unforgettable local experiences for your vacation rental guests. From guided tours to outdoor adventures, food experiences to cultural workshops — all bookable online.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg"><Link to="/signup">List Your Activity</Link></Button>
            <Button asChild size="lg" variant="outline"><Link to="/rentals">Browse Rentals</Link></Button>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-3xl font-bold text-center text-foreground mb-12">
            Popular Activity Categories
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {activities.map((a) => (
              <Card key={a.name} className="border-border">
                <CardContent className="p-6">
                  <a.icon className="h-10 w-10 text-primary mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">{a.name}</h3>
                  <p className="text-muted-foreground text-sm">{a.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-3xl font-bold text-center text-foreground mb-8">Why List on Easy-Locs?</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {[
              { title: "Reach Global Guests", desc: "Your activities are visible to travelers staying in local vacation rentals across 190+ countries." },
              { title: "Smart Booking Calendar", desc: "Each activity gets a dynamic calendar with time slots, participant limits, and automatic availability updates." },
              { title: "Secure Payments", desc: "Get paid via Stripe with automatic invoicing and multi-currency support." },
              { title: "Built-in Communication", desc: "Chat directly with guests, send confirmations, and manage modifications from one dashboard." },
            ].map((f) => (
              <div key={f.title} className="p-6 bg-background rounded-lg border border-border">
                <h3 className="font-semibold text-foreground mb-2">{f.title}</h3>
                <p className="text-muted-foreground text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-3xl font-bold text-center text-foreground mb-10">Frequently Asked Questions</h2>
          {jsonLd[1].mainEntity.map((q: any) => (
            <details key={q.name} className="mb-4 border border-border rounded-lg">
              <summary className="p-4 font-medium text-foreground cursor-pointer">{q.name}</summary>
              <p className="px-4 pb-4 text-muted-foreground text-sm">{q.acceptedAnswer.text}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="py-16 bg-primary/5">
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">Share your passion with travelers</h2>
          <p className="text-muted-foreground mb-6">List your tours and activities on Easy-Locs and reach guests from around the world.</p>
          <Button asChild size="lg"><Link to="/signup">Get Started Free</Link></Button>
        </div>
      </section>
    </main>

    <Footer />
  </div>
);

export default ActivitiesPage;
