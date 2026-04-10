import DashboardLayout from "@/components/dashboard/DashboardLayout";
import SmartHome from "@/components/storefront/SmartHome";
import ErrorBoundary from "@/components/ErrorBoundary";
import { lazy, Suspense } from "react";
import { useAuth } from "@/contexts/AuthContext";

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
    <div className="flex gap-2 mb-3">
      {[...Array(4)].map((_, i) => <div key={i} className="h-10 flex-1 rounded-xl skeleton-premium" />)}
    </div>
    <div className="h-12 w-full rounded-xl skeleton-premium mb-3" />
    <div className="grid grid-cols-4 gap-2 mb-3">
      {[...Array(8)].map((_, i) => <div key={i} className="h-16 rounded-xl skeleton-premium" />)}
    </div>
  </div>
);

const Dashboard = () => {
  return (
    <DashboardLayout>
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
