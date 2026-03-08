import { Suspense, lazy } from "react";
import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import DashboardPreview from "@/components/landing/DashboardPreview";
import RoleCards from "@/components/landing/RoleCards";
import Features from "@/components/landing/Features";
import AdvantagesSection from "@/components/landing/AdvantagesSection";
import StatsSection from "@/components/landing/StatsSection";
import Pricing from "@/components/landing/Pricing";
import LegalDisclaimer from "@/components/landing/LegalDisclaimer";
import Newsletter from "@/components/landing/Newsletter";
import Footer from "@/components/landing/Footer";
import SEOHead from "@/components/SEOHead";
import { Loader2 } from "lucide-react";

// Lazy-load heavy sections (Three.js globe, framer-motion heavy)
const ConciergeSection = lazy(() => import("@/components/landing/ConciergeSection"));
const WorldMapSection = lazy(() => import("@/components/landing/WorldMapSection"));
const AISection = lazy(() => import("@/components/landing/AISection"));

const SectionLoader = () => (
  <div className="flex items-center justify-center py-16">
    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
  </div>
);

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Easy-Locs",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description: "Global property management platform for landlords, tenants and concierge professionals. Manage leases, receipts, bookings in 110+ countries.",
  url: "https://www.easy-locs.com",
  inLanguage: ["fr", "en", "es", "de", "it", "pt", "ar", "ja", "ko", "zh", "tr", "nl", "pl"],
  offers: {
    "@type": "AggregateOffer",
    lowPrice: "0",
    highPrice: "99",
    priceCurrency: "EUR",
    offerCount: "3",
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.8",
    ratingCount: "1200",
  },
  provider: {
    "@type": "Organization",
    name: "Easy-Locs",
    url: "https://www.easy-locs.com",
  },
};

const hreflangAlternates = [
  { lang: "x-default", url: "https://www.easy-locs.com/" },
  { lang: "fr", url: "https://www.easy-locs.com/" },
  { lang: "en", url: "https://www.easy-locs.com/" },
  { lang: "es", url: "https://www.easy-locs.com/property-management-spain" },
  { lang: "de", url: "https://www.easy-locs.com/property-management-germany" },
  { lang: "it", url: "https://www.easy-locs.com/property-management-italy" },
  { lang: "pt", url: "https://www.easy-locs.com/property-management-portugal" },
  { lang: "ar", url: "https://www.easy-locs.com/property-management-dubai" },
  { lang: "ja", url: "https://www.easy-locs.com/property-management-japan" },
  { lang: "tr", url: "https://www.easy-locs.com/property-management-turkey" },
];

const Index = () => {
  return (
    <div className="min-h-screen">
      <SEOHead
        title="Easy-Locs — Global Property Management Platform | 110+ Countries"
        description="All-in-one platform for property management, tenant portals, seasonal rentals and concierge services worldwide. Free to start."
        canonical="https://www.easy-locs.com/"
        jsonLd={jsonLd}
        hreflangAlternates={hreflangAlternates}
      />
      <Navbar />
      <Hero />
      <DashboardPreview />
      <RoleCards />
      <Features />
      <Suspense fallback={<SectionLoader />}>
        <ConciergeSection />
      </Suspense>
      <Suspense fallback={<SectionLoader />}>
        <WorldMapSection />
      </Suspense>
      <AdvantagesSection />
      <Suspense fallback={<SectionLoader />}>
        <AISection />
      </Suspense>
      <StatsSection />
      <Pricing />
      <LegalDisclaimer />
      <Newsletter />
      <Footer />
    </div>
  );
};

export default Index;
