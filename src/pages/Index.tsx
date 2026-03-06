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
  url: "https://easy-locs.lovable.app",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "EUR",
    description: "Free plan available",
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.8",
    ratingCount: "1200",
  },
};

const Index = () => {
  return (
    <div className="min-h-screen">
      <SEOHead
        title="Easy-Locs — Property Management Software | 110+ Countries"
        description="All-in-one rental management for landlords worldwide. Leases, receipts, tenant portal, accounting. Free to start. Available in 31 languages."
        canonical="https://easy-locs.lovable.app/"
        jsonLd={jsonLd}
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
