import { Suspense, lazy, memo } from "react";
import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import SEOHead from "@/components/SEOHead";
import { Loader2 } from "lucide-react";

// Priority sections
const LiveActivityBar = lazy(() => import("@/components/landing/LiveActivityBar"));
const CategoryBanners = lazy(() => import("@/components/landing/CategoryBanners"));
const TrendingSection = lazy(() => import("@/components/landing/TrendingSection"));
const RadarPreviewSection = lazy(() => import("@/components/landing/RadarPreviewSection"));
const FoodSection = lazy(() => import("@/components/landing/FoodSection"));
const TravelSection = lazy(() => import("@/components/landing/TravelSection"));
const ServicesSection = lazy(() => import("@/components/landing/ServicesSection"));
const OffersSection = lazy(() => import("@/components/landing/OffersSection"));
const ForYouSection = lazy(() => import("@/components/landing/ForYouSection"));

// Micro sections
const MicroOpenNow = lazy(() => import("@/components/landing/MicroSections").then(m => ({ default: m.OpenNowStrip })));
const MicroNearYou = lazy(() => import("@/components/landing/MicroSections").then(m => ({ default: m.NearYouStrip })));
const MicroQuickStats = lazy(() => import("@/components/landing/MicroSections").then(m => ({ default: m.QuickStatsBar })));

// Below-fold sections
const SocialProofStrip = lazy(() => import("@/components/landing/SocialProofStrip"));
const BrowseByCountry = lazy(() => import("@/components/landing/BrowseByCountry"));
const PopularCities = lazy(() => import("@/components/landing/PopularCities"));
const HowItWorks = lazy(() => import("@/components/landing/HowItWorks"));
const Pricing = lazy(() => import("@/components/landing/Pricing"));
const LandingFAQ = lazy(() => import("@/components/landing/LandingFAQ"));
const Newsletter = lazy(() => import("@/components/landing/Newsletter"));
const Footer = lazy(() => import("@/components/landing/Footer"));
const TrustSection = lazy(() => import("@/components/landing/TrustSection"));
const WorldMapSection = lazy(() => import("@/components/landing/WorldMapSection"));

const SectionLoader = memo(() => (
  <div className="flex items-center justify-center py-16">
    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
  </div>
));

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Easy-Locs",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description: "Global platform for entrepreneurs to create and manage property rental and service businesses remotely. Long-term rentals, direct short-term bookings, and service marketplace — all from one platform in 190+ countries.",
  url: "https://www.easy-locs.com",
  inLanguage: ["fr", "en", "es", "de", "it", "pt", "ar", "ja", "ko", "zh", "tr", "nl", "pl", "sv", "da", "nb", "fi", "el", "cs", "hu", "ro", "hr", "bg", "sk", "he", "uk", "hi", "th", "vi", "id", "ms"],
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
    logo: "https://www.easy-locs.com/pwa-512x512.png",
    sameAs: ["https://www.linkedin.com/company/easy-locs"],
    contactPoint: {
      "@type": "ContactPoint",
      email: "contact@easy-locs.com",
      contactType: "customer service",
      availableLanguage: ["French", "English", "Spanish", "German", "Italian", "Portuguese", "Arabic", "Japanese"],
    },
  },
  featureList: [
    "Remote property and service business management",
    "Long-term rental management with lease generation",
    "Direct short-term booking without intermediaries",
    "Global service marketplace (cleaning, transport, activities)",
    "Multi-country operations in 190+ countries",
    "Multi-currency payments (120+ currencies)",
    "Multi-language interface (31 languages)",
    "AI-powered document generation",
    "Tenant portal and communication",
    "Concierge and marketplace services",
  ],
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://www.easy-locs.com/" },
    { "@type": "ListItem", position: 2, name: "Property Management", item: "https://www.easy-locs.com/property-management" },
    { "@type": "ListItem", position: 3, name: "Service Marketplace", item: "https://www.easy-locs.com/marketplace-services" },
    { "@type": "ListItem", position: 4, name: "Pricing", item: "https://www.easy-locs.com/#pricing" },
  ],
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Can I manage property and service businesses remotely with Easy-Locs?",
      acceptedAnswer: { "@type": "Answer", text: "Yes. Easy-Locs allows entrepreneurs to create and manage rental properties, accept direct bookings, and run service businesses in multiple cities worldwide — all remotely from a single platform." },
    },
    {
      "@type": "Question",
      name: "What types of businesses can I run on Easy-Locs?",
      acceptedAnswer: { "@type": "Answer", text: "You can manage long-term rental properties (leases, rent collection, tenant management), accept direct short-term bookings without intermediary platforms, and run service businesses like cleaning, car rental, concierge services, activities, and maintenance across multiple cities." },
    },
    {
      "@type": "Question",
      name: "How many countries does Easy-Locs support?",
      acceptedAnswer: { "@type": "Answer", text: "Easy-Locs supports operations in over 110 countries with localized compliance, 120+ currencies, and documents available in 31 languages." },
    },
    {
      "@type": "Question",
      name: "Is Easy-Locs free to start?",
      acceptedAnswer: { "@type": "Answer", text: "Yes, Easy-Locs offers a free trial. After that, plans start at €9.99/month with full access to property management, booking, and marketplace features." },
    },
  ],
};

const hreflangAlternates = [
  { lang: "x-default", url: "https://www.easy-locs.com/" },
  { lang: "fr", url: "https://www.easy-locs.com/" },
  { lang: "en", url: "https://www.easy-locs.com/" },
  { lang: "es", url: "https://www.easy-locs.com/country/spain" },
  { lang: "de", url: "https://www.easy-locs.com/country/germany" },
  { lang: "it", url: "https://www.easy-locs.com/country/italy" },
  { lang: "pt", url: "https://www.easy-locs.com/country/portugal" },
  { lang: "ar", url: "https://www.easy-locs.com/country/uae" },
  { lang: "ja", url: "https://www.easy-locs.com/country/japan" },
  { lang: "tr", url: "https://www.easy-locs.com/country/turkey" },
  { lang: "nl", url: "https://www.easy-locs.com/country/netherlands" },
  { lang: "ko", url: "https://www.easy-locs.com/country/south-korea" },
  { lang: "zh", url: "https://www.easy-locs.com/country/china" },
  { lang: "th", url: "https://www.easy-locs.com/country/thailand" },
  { lang: "pl", url: "https://www.easy-locs.com/country/poland" },
];

const combinedJsonLd = [jsonLd, breadcrumbJsonLd, faqJsonLd];

const Index = () => {
  return (
    <div className="min-h-screen" role="main" id="main-content">
      <SEOHead
        title="Easy-Locs — Build & Manage Property & Service Businesses Globally | Remote Platform"
        description="Create and manage rental properties, accept direct bookings, and run service businesses across multiple cities — all remotely from one platform. Property management software, concierge marketplace, 190+ countries."
        canonical="https://www.easy-locs.com/"
        jsonLd={combinedJsonLd as any}
        hreflangAlternates={hreflangAlternates}
      />
      <Navbar />

      {/* 1. Hero + Search */}
      <Hero />

      {/* 2. Live Activity Bar — real-time pulse */}
      <Suspense fallback={null}>
        <LiveActivityBar />
      </Suspense>

      {/* 3. Quick stats above fold */}
      <Suspense fallback={null}>
        <MicroQuickStats />
      </Suspense>

      {/* 4. Social proof counters */}
      <Suspense fallback={null}>
        <SocialProofStrip />
      </Suspense>

      {/* 5. Main Category Banners */}
      <Suspense fallback={<SectionLoader />}>
        <CategoryBanners />
      </Suspense>

      {/* 6. Trending / Popular — with LIVE badges */}
      <Suspense fallback={<SectionLoader />}>
        <TrendingSection />
      </Suspense>

      {/* 7. Open Now micro strip */}
      <Suspense fallback={null}>
        <MicroOpenNow />
      </Suspense>

      {/* 8. Live Radar Preview — signature feature */}
      <Suspense fallback={<SectionLoader />}>
        <RadarPreviewSection />
      </Suspense>

      {/* 9. Food Section (priority) */}
      <Suspense fallback={<SectionLoader />}>
        <FoodSection />
      </Suspense>

      {/* 10. Near You micro strip */}
      <Suspense fallback={null}>
        <MicroNearYou />
      </Suspense>

      {/* 11. Travel / Rentals */}
      <Suspense fallback={<SectionLoader />}>
        <TravelSection />
      </Suspense>

      {/* 12. Services Marketplace */}
      <Suspense fallback={<SectionLoader />}>
        <ServicesSection />
      </Suspense>

      {/* 13. Offers / Events / Seasonal */}
      <Suspense fallback={<SectionLoader />}>
        <OffersSection />
      </Suspense>

      {/* 14. For You (personalized) */}
      <Suspense fallback={<SectionLoader />}>
        <ForYouSection />
      </Suspense>

      {/* 15. Browse by Country + Cities */}
      <Suspense fallback={<SectionLoader />}>
        <BrowseByCountry />
      </Suspense>
      <Suspense fallback={<SectionLoader />}>
        <PopularCities />
      </Suspense>

      {/* 16. How it works */}
      <Suspense fallback={<SectionLoader />}>
        <HowItWorks />
      </Suspense>

      {/* 17. World Map */}
      <Suspense fallback={<SectionLoader />}>
        <WorldMapSection />
      </Suspense>

      {/* 18. Trust */}
      <Suspense fallback={<SectionLoader />}>
        <TrustSection />
      </Suspense>

      {/* 19. Pricing */}
      <Suspense fallback={<SectionLoader />}>
        <Pricing />
      </Suspense>

      {/* 20. FAQ */}
      <Suspense fallback={<SectionLoader />}>
        <LandingFAQ />
      </Suspense>

      {/* 21. Newsletter */}
      <Suspense fallback={<SectionLoader />}>
        <Newsletter />
      </Suspense>

      {/* Footer */}
      <Suspense fallback={null}>
        <Footer />
      </Suspense>
    </div>
  );
};

export default Index;
