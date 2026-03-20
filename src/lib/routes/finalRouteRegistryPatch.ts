export const finalRoutes = {
  adminMasterControl: () => `/admin/master-control`,
  adminSystemLive: () => `/admin/system-live`,
  adminRestaurantAutofill: () => `/admin/restaurant-autofill`,
  adminPaymentGoLive: () => `/admin/payment-go-live`,
  adminGoLiveReadiness: () => `/admin/go-live-readiness`,
  adminUiFinalizer: () => `/admin/ui-finalizer`,

  customerProfile: () => `/me`,
  favorites: () => `/favorites`,
  savedCarts: () => `/me/saved-carts`,
  autoRepeat: () => `/me/auto-repeat`,
  redeemRewards: () => `/me/redeem-rewards`,
  supportTickets: () => `/support/tickets`,

  driverDashboard: () => `/driver/dashboard`,
  driverMissions: () => `/driver/missions`,
  driverProof: (orderId: string) => `/driver/proof/${encodeURIComponent(orderId)}`,

  merchantDashboard: (merchantId: string) => `/merchant/dashboard/${encodeURIComponent(merchantId)}`,
  merchantOrders: (merchantId: string) => `/merchant/orders/${encodeURIComponent(merchantId)}`,
  merchantReviews: (merchantId: string) => `/merchant/reviews/${encodeURIComponent(merchantId)}`,
};
