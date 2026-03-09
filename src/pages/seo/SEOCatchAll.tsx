/**
 * SEO Catch-All Router
 * Handles /property-management-{slug} URLs that React Router v6 can't match
 * because partial dynamic segments (/property-management-:slug) are not supported.
 */
import { useLocation } from "react-router-dom";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

const PropertyManagementSEOResolver = lazy(() => import("./PropertyManagementSEOResolver"));
const NotFound = lazy(() => import("../NotFound"));

const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
  </div>
);

const SEOCatchAll = () => {
  const { pathname } = useLocation();

  // Match /property-management-{slug}
  const pmMatch = pathname.match(/^\/property-management-(.+)$/);
  if (pmMatch) {
    return (
      <Suspense fallback={<PageLoader />}>
        <PropertyManagementSEOResolver slugOverride={pmMatch[1]} />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <NotFound />
    </Suspense>
  );
};

export default SEOCatchAll;
