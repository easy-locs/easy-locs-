import DashboardLayout from "@/components/dashboard/DashboardLayout";
import SmartHome from "@/components/storefront/SmartHome";
import ErrorBoundary from "@/components/ErrorBoundary";
import SEOHead from "@/components/SEOHead";
import PillarPage from "@/components/layout/PillarPage";
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
      <div className="px-4 pt-4">
        <OnboardingChecklist />
      </div>
    </Suspense>
  );
}

const DashboardLoader = () => (
  <div className="min-h-[60dvh] px-4 pt-6">
    <div className="h-28 w-full rounded-2xl skeleton-premium mb-4" />
    <div className="h-12 w-full rounded-xl skeleton-premium mb-4" />
    <div className="grid grid-cols-4 gap-3 mb-4">
      {[...Array(8)].map((_, i) => <div key={i} className="h-16 rounded-xl skeleton-premium" />)}
    </div>
  </div>
);

const Dashboard = () => {
  useUiEngine({ enabled: true, autoRun: true, observeDom: true });
  return (
    <DashboardLayout>
      <SEOHead
        title="Easy-Locs — Food, Services, Taxi, Hotel in One App | 190+ Countries"
        description="Commandez des repas, réservez un taxi, trouvez un hôtel, faites livrer, découvrez des services locaux — tout dans une seule app. 190+ pays, 120+ devises, 31 langues."
        canonical="https://www.easy-locs.com/"
        keywords="super app, food delivery, taxi, hotel booking, local services, delivery, restaurant, Easy-Locs"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          "name": "Easy-Locs — Food, Services, Taxi, Hotel in One App",
          "description": "Super-app mondiale: commandez, réservez, faites livrer, découvrez — tout en une app.",
          "url": "https://www.easy-locs.com/",
          "isPartOf": { "@type": "WebSite", "name": "Easy-Locs", "url": "https://www.easy-locs.com" },
        }}
      />
      <PillarPage noPadding noSafeArea className="bg-background">
        <Suspense fallback={null}><WelcomeTour /></Suspense>
        <OnboardingChecklistGate />
        <ErrorBoundary>
          <Suspense fallback={<DashboardLoader />}>
            <SmartHome />
          </Suspense>
        </ErrorBoundary>
      </PillarPage>
    </DashboardLayout>
  );
};

export default Dashboard;
