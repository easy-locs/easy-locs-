/**
 * Layer 5 — Activity + City SEO Page
 * Route: /activities/:activityCity  (e.g. /activities/desert-safari-dubai)
 */
import { useParams, Link } from "react-router-dom";
import SEOPageShell from "@/components/seo/SEOPageShell";
import FAQSection from "@/components/seo/FAQSection";
import InternalLinksGrid from "@/components/seo/InternalLinksGrid";
import { getCityBySlug, SEO_ACTIVITY_TYPES } from "@/lib/seo/seo-data";
import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin } from "lucide-react";

const ActivityCitySEOPage = () => {
  const { activityCity } = useParams<{ activityCity: string }>();

  let activity = undefined as (typeof SEO_ACTIVITY_TYPES)[number] | undefined;
  let cityResult = undefined as ReturnType<typeof getCityBySlug>;

  if (activityCity) {
    for (const act of SEO_ACTIVITY_TYPES) {
      if (activityCity.startsWith(act.slug + "-")) {
        const citySlug = activityCity.slice(act.slug.length + 1);
        const cr = getCityBySlug(citySlug);
        if (cr) {
          activity = act;
          cityResult = cr;
          break;
        }
      }
    }
  }

  if (!activity || !cityResult) {
    return (
      <SEOPageShell
        title="Activities & Experiences Worldwide — Easy-Locs"
        description="Discover tours, experiences, and activities in destinations worldwide."
        canonical="https://www.easy-locs.com/activities"
      >
        <section className="py-20 text-center container mx-auto px-4">
          <h1 className="text-4xl font-bold text-foreground mb-4">Activities & Experiences</h1>
          <p className="text-muted-foreground mb-8">Explore activities in destinations worldwide.</p>
          <Button asChild size="lg"><Link to="/activities">View All Activities</Link></Button>
        </section>
      </SEOPageShell>
    );
  }

  const { city, country } = cityResult;

  const faqs = [
    { question: `How do I book a ${activity.label.toLowerCase()} in ${city.name}?`, answer: `Browse ${activity.label.toLowerCase()} providers in ${city.name} on Easy-Locs. Select a date and time, add the number of participants, and book online. You'll receive instant confirmation.` },
    { question: `What should I know before booking a ${activity.label.toLowerCase()} in ${city.name}?`, answer: `Check the provider's description for included items, duration, and any requirements. Most experiences in ${city.name} are available year-round with flexible scheduling.` },
    { question: `Can I cancel my ${activity.label.toLowerCase()} booking?`, answer: `Cancellation policies vary by provider. Most ${city.name} activity providers offer free cancellation up to 24-48 hours before the experience.` },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TouristAttraction",
    name: `${activity.label} in ${city.name}`,
    description: `Book ${activity.label.toLowerCase()} experiences in ${city.name}, ${country.name} through Easy-Locs.`,
    url: `https://www.easy-locs.com/activities/${activityCity}`,
    address: { "@type": "PostalAddress", addressLocality: city.name, addressCountry: country.code },
  };

  const otherActivities = SEO_ACTIVITY_TYPES
    .filter(a => a.slug !== activity!.slug)
    .slice(0, 10)
    .map(a => ({ to: `/activities/${a.slug}-${city.slug}`, label: a.label, icon: a.icon }));

  return (
    <SEOPageShell
      title={`${activity.label} in ${city.name}, ${country.name} — Easy-Locs`}
      description={`Book ${activity.label.toLowerCase()} in ${city.name}. Discover unique experiences with local providers. Instant booking, secure payment.`}
      canonical={`https://www.easy-locs.com/activities/${activityCity}`}
      jsonLd={jsonLd as any}
      ctaTitle={`Book your ${activity.label.toLowerCase()} in ${city.name}`}
      ctaDescription={`Discover unique ${activity.label.toLowerCase()} experiences in ${city.name}, ${country.name}.`}
    >
      <section className="py-20 md:py-28 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4 max-w-5xl text-center">
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <MapPin className="h-4 w-4" />
            <Link to={`/property-management-${country.slug}`} className="hover:text-foreground">{country.flag} {country.name}</Link>
            <span>/</span>
            <Link to={`/property-management-${city.slug}`} className="hover:text-foreground">{city.name}</Link>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-6">
            {activity.icon} {activity.label} in {city.name}
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Discover and book {activity.label.toLowerCase()} experiences in {city.name}, {country.name}.
            Compare providers, check availability, and book instantly through Easy-Locs.
          </p>
          <Button asChild size="lg"><Link to="/signup">Start Free <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
        </div>
      </section>

      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-3xl font-bold text-foreground mb-6">{activity.label} in {city.name}</h2>
          <div className="prose prose-lg max-w-none text-muted-foreground">
            <p>
              {city.name} is a fantastic destination for {activity.label.toLowerCase()}. Whether you're a tourist visiting {country.name}
              or a local looking for new experiences, Easy-Locs connects you with verified providers offering
              professional {activity.label.toLowerCase()} experiences in and around {city.name}.
            </p>
            <p>
              All activities are bookable online with secure payment processing. Providers offer detailed descriptions,
              photos, pricing in {country.currency}, and real-time availability. Property managers can also offer
              {activity.label.toLowerCase()} as part of their guest concierge services.
            </p>
          </div>
        </div>
      </section>

      <FAQSection faqs={faqs} />

      <InternalLinksGrid title={`More Activities in ${city.name}`} links={otherActivities} />
    </SEOPageShell>
  );
};

export default ActivityCitySEOPage;
