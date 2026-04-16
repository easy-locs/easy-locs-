import { Route } from "react-router-dom";
import { FeatureErrorBoundary } from "@/components/FeatureErrorBoundary";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import * as Pages from "@/app/app-route-registry";

const {
  AddContactPage, ClaimPage, GuestPaymentSuccess, LivePage, PayPage, PayRequestPage, PaymentConfirmPage,
  PaymentLinkResolverPage, ProductDetailPage, ProductPage, QrEntryPage, QrPayResolver, QrPickupPage,
  QrResolvePage, QrScannerPage, QrTrackingPage, ShortLinkResolvePage, SlugCategoryResolver, SlugResolver,
  UserProfilePage,
} = Pages;

export function DeeplinksRoutes() {
  return (
    <>
      <Route path="/add-contact" element={<FeatureErrorBoundary featureName="DeepLink"><AddContactPage /></FeatureErrorBoundary>} />
      <Route path="/u/:userId" element={<FeatureErrorBoundary featureName="DeepLink"><UserProfilePage /></FeatureErrorBoundary>} />
      <Route path="/product/:productId" element={<FeatureErrorBoundary featureName="DeepLink"><ProductDetailPage /></FeatureErrorBoundary>} />
      <Route path="/p/:productId" element={<FeatureErrorBoundary featureName="DeepLink"><ProductPage /></FeatureErrorBoundary>} />
      <Route path="/live/:liveId" element={<FeatureErrorBoundary featureName="DeepLink"><LivePage /></FeatureErrorBoundary>} />
      <Route path="/pay/:payId" element={<FeatureErrorBoundary featureName="Wallet"><PayPage /></FeatureErrorBoundary>} />
      <Route path="/pay/request/:requestId" element={<FeatureErrorBoundary featureName="Wallet"><PayRequestPage /></FeatureErrorBoundary>} />
      <Route path="/pay/scan" element={<FeatureErrorBoundary featureName="Wallet"><QrScannerPage /></FeatureErrorBoundary>} />
      <Route path="/pay/link-resolver" element={<FeatureErrorBoundary featureName="Wallet"><PaymentLinkResolverPage /></FeatureErrorBoundary>} />
      <Route path="/pay/confirm" element={<FeatureErrorBoundary featureName="Wallet"><PaymentConfirmPage /></FeatureErrorBoundary>} />
      <Route path="/pay/success" element={<FeatureErrorBoundary featureName="Wallet"><GuestPaymentSuccess /></FeatureErrorBoundary>} />
      <Route path="/qr/pay/:code" element={<FeatureErrorBoundary featureName="DeepLink"><QrPayResolver /></FeatureErrorBoundary>} />
      <Route path="/qr/:code" element={<FeatureErrorBoundary featureName="DeepLink"><QrResolvePage /></FeatureErrorBoundary>} />
      <Route path="/sl/:code" element={<FeatureErrorBoundary featureName="DeepLink"><ShortLinkResolvePage /></FeatureErrorBoundary>} />
      <Route path="/qr/entry/:targetCode" element={<FeatureErrorBoundary featureName="DeepLink"><QrEntryPage /></FeatureErrorBoundary>} />
      <Route path="/qr/track" element={<FeatureErrorBoundary featureName="DeepLink"><QrTrackingPage /></FeatureErrorBoundary>} />
      <Route path="/qr/pickup" element={<FeatureErrorBoundary featureName="DeepLink"><QrPickupPage /></FeatureErrorBoundary>} />
      <Route path="/claim/:token" element={<FeatureErrorBoundary featureName="DeepLink"><ClaimPage /></FeatureErrorBoundary>} />
      <Route path="/go/:slug" element={<FeatureErrorBoundary featureName="DeepLink"><SlugResolver /></FeatureErrorBoundary>} />
      <Route path="/go/:slug/:category" element={<FeatureErrorBoundary featureName="DeepLink"><SlugCategoryResolver /></FeatureErrorBoundary>} />

    </>
  );
}
