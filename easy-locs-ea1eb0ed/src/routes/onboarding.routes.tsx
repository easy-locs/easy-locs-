import { Route } from "react-router-dom";
import { FeatureErrorBoundary } from "@/components/FeatureErrorBoundary";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import * as Pages from "@/app/app-route-registry";

const {
  ConsumerOnboardingWizard, HotelOnboardingWizard, ServiceProviderOnboardingWizard,
  TaxiDriverOnboardingWizard,
} = Pages;

export function OnboardingRoutes() {
  return (
    <>
      <Route path="/onboarding/hotel" element={<ProtectedRoute><FeatureErrorBoundary featureName="Onboarding"><HotelOnboardingWizard /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/onboarding/taxi" element={<ProtectedRoute><FeatureErrorBoundary featureName="Onboarding"><TaxiDriverOnboardingWizard /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/onboarding/service-provider" element={<ProtectedRoute><FeatureErrorBoundary featureName="Onboarding"><ServiceProviderOnboardingWizard /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/onboarding/consumer" element={<ProtectedRoute><FeatureErrorBoundary featureName="Onboarding"><ConsumerOnboardingWizard /></FeatureErrorBoundary></ProtectedRoute>} />

    </>
  );
}
