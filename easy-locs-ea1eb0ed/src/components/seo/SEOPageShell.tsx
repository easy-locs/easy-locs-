/**
 * Reusable shell for all SEO landing pages.
 * Provides consistent layout with Navbar, Footer, SEOHead, BreadcrumbNav, and structured data.
 */
import SEOHead from "@/components/SEOHead";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import BreadcrumbNav from "@/components/seo/BreadcrumbNav";
import type { BreadcrumbItem } from "@/components/seo/BreadcrumbNav";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { buildHreflangAlternates } from "@/domains/seo/pipelines/seo-meta.pipeline";

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
  /** Breadcrumb items for visual nav + SEO microdata */
  breadcrumbs?: BreadcrumbItem[];
  /** Override og:image; defaults to site default */
  ogImage?: string;
  /** Additional hreflang alternates; auto-generated from canonical if omitted */
  hreflangAlternates?: Array<{ lang: string; url: string }>;
}

const SEOPageShell = ({
  title,
  description,
  canonical,
  jsonLd,
  children,
  ctaTitle,
  ctaDescription,
  noindex,
  breadcrumbs,
  ogImage,
  hreflangAlternates,
}: SEOPageShellProps) => {
  const resolvedHreflang = hreflangAlternates ?? buildHreflangAlternates(canonical);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={title}
        description={description}
        canonical={canonical}
        jsonLd={jsonLd as any}
        noindex={noindex}
        ogImage={ogImage}
        hreflangAlternates={resolvedHreflang}
      />
      <Navbar />
      {breadcrumbs && breadcrumbs.length > 0 && (
        <BreadcrumbNav items={breadcrumbs} />
      )}
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
};

export default SEOPageShell;
