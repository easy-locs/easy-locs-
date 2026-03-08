import { Suspense, lazy } from "react";
import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import RoleCards from "@/components/landing/RoleCards";
import Features from "@/components/landing/Features";
import Pricing from "@/components/landing/Pricing";
import Newsletter from "@/components/landing/Newsletter";
import Footer from "@/components/landing/Footer";
import SEOHead from "@/components/SEOHead";
import { Loader2 } from "lucide-react";

const TrustSection = lazy(() => import("@/components/landing/TrustSection"));

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
  description: "Global property management platform for landlords, tenants and concierge professionals. Manage leases, receipts, bookings in 110+ countries with AI-powered tools.",
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
    sameAs: [
      "https://www.linkedin.com/company/easy-locs",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      email: "contact@easy-locs.com",
      contactType: "customer service",
      availableLanguage: ["French", "English", "Spanish", "German", "Italian", "Portuguese", "Arabic", "Japanese"],
    },
  },
  featureList: [
    "Multi-country property management",
    "Multi-currency payments (120+ currencies)",
    "Multi-language interface (31 languages)",
    "AI-powered document generation",
    "Lease and contract management",
    "Tenant portal and communication",
    "Seasonal rental booking system",
    "Concierge and marketplace services",
    "GDPR compliant",
    "Automatic receipt generation",
  ],
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://www.easy-locs.com/" },
    { "@type": "ListItem", position: 2, name: "Features", item: "https://www.easy-locs.com/#features" },
    { "@type": "ListItem", position: 3, name: "Pricing", item: "https://www.easy-locs.com/#pricing" },
  ],
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How many countries does Easy-Locs support?",
      acceptedAnswer: { "@type": "Answer", text: "Easy-Locs supports property management in over 110 countries worldwide, with localized compliance, currencies, and document templates." },
    },
    {
      "@type": "Question",
      name: "Is Easy-Locs free to start?",
      acceptedAnswer: { "@type": "Answer", text: "Yes, Easy-Locs offers a free trial period. After that, the Unlimited plan starts at €9.99/month with full access to all features." },
    },
    {
      "@type": "Question",
      name: "What languages are supported?",
      acceptedAnswer: { "@type": "Answer", text: "Easy-Locs supports 31 languages including French, English, Spanish, German, Italian, Portuguese, Arabic, Japanese, Korean, Chinese, Hindi, and more." },
    },
  ],
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
  { lang: "ko", url: "https://www.easy-locs.com/property-management-korea" },
  { lang: "zh", url: "https://www.easy-locs.com/property-management-china" },
  { lang: "hi", url: "https://www.easy-locs.com/property-management-india" },
  { lang: "nl", url: "https://www.easy-locs.com/property-management-netherlands" },
  { lang: "pl", url: "https://www.easy-locs.com/property-management-poland" },
];

const combinedJsonLd = [jsonLd, breadcrumbJsonLd, faqJsonLd];

const Index = () => {
  return (
    <div className="min-h-screen">
      <SEOHead
        title="Easy-Locs — Global Property Management Platform | 110+ Countries | AI-Powered"
        description="All-in-one property management software for landlords, tenants & concierge professionals. Leases, payments, bookings in 110+ countries, 31 languages, 120+ currencies. Free to start."
        canonical="https://www.easy-locs.com/"
        jsonLd={combinedJsonLd as any}
        hreflangAlternates={hreflangAlternates}
      />
      <Navbar />
      <Hero />
      <RoleCards />
      <Features />
      <Suspense fallback={<SectionLoader />}>
        <TrustSection />
      </Suspense>
      <Pricing />
      <Newsletter />
      <Footer />
    </div>
  );
};

export default Index;
