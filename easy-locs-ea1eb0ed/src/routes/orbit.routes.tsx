import { Suspense } from "react";
import { Route } from "react-router-dom";
import { FeatureErrorBoundary } from "@/components/FeatureErrorBoundary";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import * as Pages from "@/app/app-route-registry";
import { PillarSkeleton } from "@/app/route-skeletons";

const {
  CommunicationCenter, OrbitAISupportPage, OrbitAddContactPage, OrbitContactsPage, OrbitIdentityPage,
} = Pages;

export function OrbitRoutes() {
  return (
    <>
      <Route path="/orbit" element={<ProtectedRoute><FeatureErrorBoundary featureName="Orbit"><Suspense fallback={<PillarSkeleton pillar="orbit" />}><CommunicationCenter /></Suspense></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/orbit/:conversationId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Orbit"><CommunicationCenter /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/orbit/contacts" element={<ProtectedRoute><FeatureErrorBoundary featureName="Orbit"><OrbitContactsPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/orbit/add" element={<ProtectedRoute><FeatureErrorBoundary featureName="Orbit"><OrbitAddContactPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/orbit/identity" element={<ProtectedRoute><FeatureErrorBoundary featureName="Orbit"><OrbitIdentityPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/orbit/support" element={<ProtectedRoute><FeatureErrorBoundary featureName="Orbit"><OrbitAISupportPage /></FeatureErrorBoundary></ProtectedRoute>} />

    </>
  );
}
