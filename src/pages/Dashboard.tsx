import { lazy, Suspense } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

const OnboardingChecklist = lazy(() => import("@/components/onboarding/OnboardingChecklist"));
const WelcomeTour = lazy(() => import("@/components/onboarding/WelcomeTour"));
const SmartHome = lazy(() => import("@/components/storefront/SmartHome"));

const Dashboard = () => {
  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        <Suspense fallback={null}><WelcomeTour /></Suspense>
        <Suspense fallback={null}>
          <div className="mb-4">
            <OnboardingChecklist />
          </div>
        </Suspense>
        <Suspense fallback={<div className="h-32 rounded-xl bg-muted/20 animate-pulse mb-4" />}>
          <div className="px-1">
            <SmartHome />
          </div>
        </Suspense>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
