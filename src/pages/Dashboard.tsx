import { lazy, Suspense } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

const OnboardingChecklist = lazy(() => import("@/components/onboarding/OnboardingChecklist"));
const WelcomeTour = lazy(() => import("@/components/onboarding/WelcomeTour"));
const SmartHome = lazy(() => import("@/components/storefront/SmartHome"));

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
        <Suspense fallback={<div className="h-32 rounded-xl bg-muted/20 animate-pulse mb-4" />}>
          <div className="w-full min-w-0">
            <SmartHome />
          </div>
        </Suspense>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
