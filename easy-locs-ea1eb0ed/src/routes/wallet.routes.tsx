import { Suspense } from "react";
import { Route, Navigate } from "react-router-dom";
import { FeatureErrorBoundary } from "@/components/FeatureErrorBoundary";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import * as Pages from "@/app/app-route-registry";
import { PillarSkeleton } from "@/app/route-skeletons";

const {
  CheckoutPage, CustomerActiveOrdersPage, CustomerAddressSelectorPage, CustomerGroupOrderPage,
  CustomerOrderArchivePage, CustomerOrderGiftsPage, CustomerPartyOrderPage, CustomerReorderPage,
  CustomerShareCartPage, CustomerSplitBillPage, ForexDashboardPage, GuestCheckoutPage, InstallmentsPage,
  LiveTrackingPageNew, MyOrdersPage, OrderReceiptPage, OrderRefundRequestPage, POSPage, PayRidePage,
  PaymentPage, RefundRequestPage, ReorderPage, StripeCheckoutHandlerPage, StripeElementsPage,
  TrackingPage, UnifiedOrderDetailPage, VirtualCardsPage, WalletHubPage, WalletRequestPage,
  WalletTopUpPage, WalletTransactionDetailPage, WalletTransferPage,
} = Pages;

export function WalletRoutes() {
  return (
    <>
      <Route path="/wallet" element={<ProtectedRoute><FeatureErrorBoundary featureName="Wallet"><Suspense fallback={<PillarSkeleton pillar="wallet" />}><WalletHubPage /></Suspense></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/wallet/hub" element={<Navigate to="/wallet" replace />} />
      <Route path="/wallet/top-up" element={<ProtectedRoute><FeatureErrorBoundary featureName="Wallet"><WalletTopUpPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/wallet/transfer" element={<ProtectedRoute><FeatureErrorBoundary featureName="Wallet"><WalletTransferPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/wallet/request" element={<ProtectedRoute><FeatureErrorBoundary featureName="Wallet"><WalletRequestPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/wallet/forex" element={<ProtectedRoute><FeatureErrorBoundary featureName="Wallet"><ForexDashboardPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/wallet/transaction/:txId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Wallet"><WalletTransactionDetailPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/wallet/pay/:threadId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Wallet"><PayRidePage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/wallet/property/*" element={<ProtectedRoute><FeatureErrorBoundary featureName="Wallet"><Pages.WalletPropertyHub /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/wallet/virtual-cards" element={<ProtectedRoute><FeatureErrorBoundary featureName="Wallet"><VirtualCardsPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/wallet/installments" element={<ProtectedRoute><FeatureErrorBoundary featureName="Wallet"><InstallmentsPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/wallet/accounts" element={<Navigate to="/settings/wallet" replace />} />
      <Route path="/pos" element={<ProtectedRoute><FeatureErrorBoundary featureName="Wallet"><POSPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/pos/:shopId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Wallet"><POSPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/checkout" element={<FeatureErrorBoundary featureName="Wallet"><CheckoutPage /></FeatureErrorBoundary>} />
      <Route path="/checkout/address-selector" element={<ProtectedRoute><FeatureErrorBoundary featureName="Wallet"><CustomerAddressSelectorPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/checkout/group-order" element={<ProtectedRoute><FeatureErrorBoundary featureName="Wallet"><CustomerGroupOrderPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/checkout/gift-order" element={<ProtectedRoute><FeatureErrorBoundary featureName="Wallet"><CustomerOrderGiftsPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/checkout/split-bill" element={<ProtectedRoute><FeatureErrorBoundary featureName="Wallet"><CustomerSplitBillPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/checkout/party-order" element={<ProtectedRoute><FeatureErrorBoundary featureName="Wallet"><CustomerPartyOrderPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/checkout/share-cart" element={<ProtectedRoute><FeatureErrorBoundary featureName="Wallet"><CustomerShareCartPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/orders" element={<Navigate to="/my-orders" replace />} />
      <Route path="/my-orders" element={<ProtectedRoute><FeatureErrorBoundary featureName="Wallet"><MyOrdersPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/my-orders/active" element={<ProtectedRoute><FeatureErrorBoundary featureName="Wallet"><CustomerActiveOrdersPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/my-orders/archive" element={<ProtectedRoute><FeatureErrorBoundary featureName="Wallet"><CustomerOrderArchivePage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/order/:orderId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Wallet"><UnifiedOrderDetailPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/order/receipt/:orderId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Wallet"><OrderReceiptPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/order/refund/:orderId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Wallet"><OrderRefundRequestPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/order/reorder/:orderId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Wallet"><ReorderPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/reorder" element={<ProtectedRoute><FeatureErrorBoundary featureName="Wallet"><CustomerReorderPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/tracking/:orderId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Wallet"><TrackingPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/live-tracking" element={<ProtectedRoute><FeatureErrorBoundary featureName="Wallet"><LiveTrackingPageNew /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/refund/:rideRequestId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Wallet"><RefundRequestPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/payment/:orderId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Wallet"><PaymentPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/payments/stripe-elements" element={<ProtectedRoute><FeatureErrorBoundary featureName="Wallet"><StripeElementsPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/payments/stripe-handler" element={<ProtectedRoute><FeatureErrorBoundary featureName="Wallet"><StripeCheckoutHandlerPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/guest/checkout/:cartId" element={<GuestCheckoutPage />} />

    </>
  );
}
