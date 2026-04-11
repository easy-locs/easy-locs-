import DashboardLayout from "@/components/dashboard/DashboardLayout";
import SmartHome from "@/components/storefront/SmartHome";
import ErrorBoundary from "@/components/ErrorBoundary";
import SEOHead from "@/components/SEOHead";
import { lazy, Suspense } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useUiEngine } from "@/hooks/useUiEngine";

const OnboardingChecklist = lazy(() => import("@/components/onboarding/OnboardingChecklist"));
const WelcomeTour = lazy(() => import("@/components/onboarding/WelcomeTour"));

function OnboardingChecklistGate() {
  const { orgId, user } = useAuth();
  const isBusiness = !!(orgId || user?.user_metadata?.role === "landlord" || user?.user_metadata?.role === "seller" || user?.user_metadata?.role === "merchant");
  if (!isBusiness) return null;
  return (
    <Suspense fallback={null}>
      <div className="px-3 pt-3 sm:px-4 sm:pt-4">
        <OnboardingChecklist />
      </div>
    </Suspense>
  );
}

const DashboardLoader = () => (
  <div className="min-h-[60dvh] px-3 pt-3">
    <div className="h-28 w-full rounded-2xl skeleton-premium mb-3" />
    <div className="h-12 w-full rounded-xl skeleton-premium mb-3" />
    <div className="grid grid-cols-4 gap-2 mb-3">
      {[...Array(8)].map((_, i) => <div key={i} className="h-16 rounded-xl skeleton-premium" />)}
    </div>
  </div>
);

const Dashboard = () => {
  useUiEngine({ enabled: true, autoRun: true, observeDom: true });
  return (
    <DashboardLayout>
      <SEOHead
        title="Easy-Locs — Super-App Food, Services, Taxi, Hotel, Delivery | 190+ Countries"
        description="Commandez des repas, réservez un taxi, trouvez un hôtel, faites livrer, découvrez des services locaux — tout dans une seule app. 190+ pays, 120+ devises, 31 langues."
        canonical="https://www.easy-locs.com/"
        keywords="super app, food delivery, taxi, hotel booking, local services, delivery, restaurant, Easy-Locs"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          "name": "Easy-Locs — Super-App",
          "description": "Super-app mondiale: commandez, réservez, faites livrer, découvrez — tout en une app.",
          "url": "https://www.easy-locs.com/",
          "isPartOf": { "@type": "WebSite", "name": "Easy-Locs", "url": "https://www.easy-locs.com" },
        }}
      />
      <div className="w-full min-w-0 min-h-[100dvh]">
        <Suspense fallback={null}><WelcomeTour /></Suspense>
        <OnboardingChecklistGate />
        <div className="w-full min-w-0">
          <ErrorBoundary>
            <Suspense fallback={<DashboardLoader />}>
              <SmartHome />
            </Suspense>
          </ErrorBoundary>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
