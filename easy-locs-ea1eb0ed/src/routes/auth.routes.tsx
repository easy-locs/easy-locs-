import { Route } from "react-router-dom";
import { FeatureErrorBoundary } from "@/components/FeatureErrorBoundary";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import * as Pages from "@/app/app-route-registry";

const {
  AuthCallbackPage, AuthDiagnosticPage, ForgotPassword, Install, Login, Onboarding, ResetPassword,
  Signup, VerifyEmail,
} = Pages;

export function AuthRoutes() {
  return (
    <>
      <Route path="/login" element={<FeatureErrorBoundary featureName="Auth"><Login /></FeatureErrorBoundary>} />
      <Route path="/signup" element={<FeatureErrorBoundary featureName="Auth"><Signup /></FeatureErrorBoundary>} />
      <Route path="/forgot-password" element={<FeatureErrorBoundary featureName="Auth"><ForgotPassword /></FeatureErrorBoundary>} />
      <Route path="/reset-password" element={<FeatureErrorBoundary featureName="Auth"><ResetPassword /></FeatureErrorBoundary>} />
      <Route path="/verify-email" element={<FeatureErrorBoundary featureName="Auth"><VerifyEmail /></FeatureErrorBoundary>} />
      <Route path="/auth/callback" element={<FeatureErrorBoundary featureName="Auth"><AuthCallbackPage /></FeatureErrorBoundary>} />
      <Route path="/auth/diagnostic" element={<ProtectedRoute><FeatureErrorBoundary featureName="Auth"><AuthDiagnosticPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/onboarding" element={<ProtectedRoute><FeatureErrorBoundary featureName="Auth"><Onboarding /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/install" element={<FeatureErrorBoundary featureName="Auth"><Install /></FeatureErrorBoundary>} />

    </>
  );
}
