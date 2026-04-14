/**
 * Reusable shell for all SEO landing pages.
 * Provides consistent layout with Navbar, Footer, SEOHead, and structured data.
 */
import SEOHead from "@/components/SEOHead";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

interface SEOPageShellProps {
  title: string;
  description: string;
  canonical: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  children: ReactNode;
  ctaTitle?: string;
  ctaDescription?: string;
  /** Pass true to add noindex,follow — for thin/phase-2 pages */
  noindex?: boolean;
}

const SEOPageShell = ({ title, description, canonical, jsonLd, children, ctaTitle, ctaDescription, noindex }: SEOPageShellProps) => (
  <div className="min-h-[100dvh] bg-background">
    <SEOHead title={title} description={description} canonical={canonical} jsonLd={jsonLd as any} noindex={noindex} />
    <Navbar />
    <main>{children}</main>

    {ctaTitle && (
      <section className="py-16 bg-primary/5">
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">{ctaTitle}</h2>
          {ctaDescription && <p className="text-muted-foreground mb-6">{ctaDescription}</p>}
          <Button asChild size="lg">
            <Link to="/signup">Get Started Free <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>
      </section>
    )}

    <Footer />
  </div>
);

export default SEOPageShell;
