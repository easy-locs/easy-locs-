import DashboardLayout from "@/components/dashboard/DashboardLayout";
import SmartHome from "@/components/storefront/SmartHome";
import { lazy, Suspense } from "react";

const OnboardingChecklist = lazy(() => import("@/components/onboarding/OnboardingChecklist"));
const WelcomeTour = lazy(() => import("@/components/onboarding/WelcomeTour"));

const Dashboard = () => {
  return (
    <DashboardLayout>
      <div className="w-full min-w-0 min-h-[100dvh]">
        <Suspense fallback={null}><WelcomeTour /></Suspense>
        <Suspense fallback={null}>
          <div className="px-3 pt-3 sm:px-4 sm:pt-4">
            <OnboardingChecklist />
          </div>
        </Suspense>
        <div className="w-full min-w-0">
          <SmartHome />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
