import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import Pricing from "@/components/landing/Pricing";
import Newsletter from "@/components/landing/Newsletter";
import Footer from "@/components/landing/Footer";
import SEOHead from "@/components/SEOHead";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Easy-Locs",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description: "Property management software for landlords worldwide. Manage leases, receipts, tenants, and accounting in 110+ countries.",
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
    url: "https://easy-locs.lovable.app",
  },
};

const hreflangAlternates = [
  { lang: "x-default", url: "https://easy-locs.lovable.app/" },
  { lang: "fr", url: "https://easy-locs.lovable.app/" },
  { lang: "en", url: "https://easy-locs.lovable.app/" },
  { lang: "es", url: "https://easy-locs.lovable.app/property-management-spain" },
  { lang: "de", url: "https://easy-locs.lovable.app/property-management-germany" },
  { lang: "it", url: "https://easy-locs.lovable.app/property-management-italy" },
  { lang: "pt", url: "https://easy-locs.lovable.app/property-management-portugal" },
  { lang: "ar", url: "https://easy-locs.lovable.app/property-management-dubai" },
  { lang: "ja", url: "https://easy-locs.lovable.app/property-management-japan" },
  { lang: "tr", url: "https://easy-locs.lovable.app/property-management-turkey" },
];

const Index = () => {
  return (
    <div className="min-h-screen">
      <SEOHead
        title="Easy-Locs — Property Management Software | 110+ Countries"
        description="All-in-one rental management for landlords worldwide. Leases, receipts, tenant portal, accounting. Free to start. Available in 31 languages."
        canonical="https://easy-locs.lovable.app/"
        jsonLd={jsonLd}
        hreflangAlternates={hreflangAlternates}
      />
      <Navbar />
      <Hero />
      <Features />
      <Pricing />
      <Newsletter />
      <Footer />
    </div>
  );
};

export default Index;
