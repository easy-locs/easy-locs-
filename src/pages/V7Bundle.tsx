/**
 * V7Bundle — Re-exports all V7 pillar components and translations.
 * Import: import { MyBusinessHub, MyShopsPage, ShopsPage, MobileBottomNav, v7Translations } from "@/pages/V7Bundle";
 * Or:     import V7BundleRoutes from "@/pages/V7Bundle";
 */
import { Route, Routes } from "react-router-dom";
import { lazy, Suspense } from "react";

// Re-export components
export { default as MobileBottomNav } from "@/components/dashboard/MobileBottomNav";
export { default as MyBusinessHub } from "@/pages/MyBusinessHub";
export { default as MyShopsPage } from "@/pages/MyShopsPage";
export { default as ShopsPage } from "@/pages/ShopsPage";

// V7 translation keys (for reference / external merging)
export const v7Translations = {
  en: {
    "nav.marketplace": "Marketplace",
    "nav.shops": "Shops",
    "nav.business": "Business",
    "nav.property": "Property",
    "business.hub_title": "My Business",
    "business.hub_subtitle": "Manage all your business operations.",
    "business.control_center": "Control Center",
    "business.my_shops": "My Shops",
    "business.my_shops_desc": "Manage your storefronts",
    "business.orders": "Orders",
    "business.orders_desc": "Track and manage orders",
    "business.pos": "POS Terminal",
    "business.pos_desc": "Point of sale",
    "business.wallet": "Wallet & Finance",
    "business.wallet_desc": "Transactions and balance",
    "business.delivery": "Delivery",
    "business.delivery_desc": "Dispatch and tracking",
    "business.customers": "Customers",
    "business.customers_desc": "CRM and contacts",
    "business.analytics": "Analytics",
    "business.analytics_desc": "Sales and performance",
    "business.inventory": "Inventory",
    "business.inventory_desc": "Stock management",
    "business.settings": "Settings",
    "business.settings_desc": "Account and preferences",
    "shops.title": "Shops",
    "shops.all_shops": "All Shops",
    "shops.search_placeholder": "Search shops...",
    "shops.no_public_shops": "No shops found",
    "shops.no_public_shops_desc": "Try a different search or category.",
    "shops.my_shops": "My Shops",
    "shops.create_new": "Create New Shop",
    "shops.create_desc": "Set up a new storefront",
    "shops.no_my_shops": "No shops yet",
    "shops.no_my_shops_desc": "Create your first shop to start selling.",
    "shops.manage": "Manage Shop",
    "shops.open_public": "View Public Shop",
    "shops.status_published": "Published",
    "shops.status_draft": "Draft",
    "shops.category.all": "All",
    "shops.category.food": "Food",
    "shops.category.fashion": "Fashion",
    "shops.category.tech": "Tech",
    "shops.category.beauty": "Beauty",
    "shops.category.home": "Home",
    "shops.category.services": "Services",
    "shops.view.list": "List",
    "shops.view.map": "Map",
    "shops.results_count_one": "shop",
    "shops.results_count_other": "shops",
    "shops.sponsored": "Sponsored",
  },
  fr: {
    "nav.marketplace": "Marketplace",
    "nav.shops": "Boutiques",
    "nav.business": "Business",
    "nav.property": "Immobilier",
    "business.hub_title": "Mon Business",
    "business.hub_subtitle": "Gérez toutes vos opérations commerciales.",
    "business.control_center": "Centre de contrôle",
    "business.my_shops": "Mes boutiques",
    "business.my_shops_desc": "Gérez vos vitrines",
    "business.orders": "Commandes",
    "business.orders_desc": "Suivi et gestion des commandes",
    "business.pos": "Terminal POS",
    "business.pos_desc": "Point de vente",
    "business.wallet": "Portefeuille & finances",
    "business.wallet_desc": "Transactions et solde",
    "business.delivery": "Livraison",
    "business.delivery_desc": "Dispatch et suivi",
    "business.customers": "Clients",
    "business.customers_desc": "CRM et contacts",
    "business.analytics": "Analytique",
    "business.analytics_desc": "Ventes et performance",
    "business.inventory": "Inventaire",
    "business.inventory_desc": "Gestion du stock",
    "business.settings": "Paramètres",
    "business.settings_desc": "Compte et préférences",
    "shops.title": "Boutiques",
    "shops.all_shops": "Toutes les boutiques",
    "shops.search_placeholder": "Rechercher des boutiques...",
    "shops.no_public_shops": "Aucune boutique trouvée",
    "shops.no_public_shops_desc": "Essayez une autre recherche ou une autre catégorie.",
    "shops.my_shops": "Mes boutiques",
    "shops.create_new": "Créer une nouvelle boutique",
    "shops.create_desc": "Configurer une nouvelle vitrine",
    "shops.no_my_shops": "Aucune boutique pour le moment",
    "shops.no_my_shops_desc": "Créez votre première boutique pour commencer à vendre.",
    "shops.manage": "Gérer la boutique",
    "shops.open_public": "Voir la boutique publique",
    "shops.status_published": "Publiée",
    "shops.status_draft": "Brouillon",
    "shops.category.all": "Toutes",
    "shops.category.food": "Alimentation",
    "shops.category.fashion": "Mode",
    "shops.category.tech": "Tech",
    "shops.category.beauty": "Beauté",
    "shops.category.home": "Maison",
    "shops.category.services": "Services",
    "shops.view.list": "Liste",
    "shops.view.map": "Carte",
    "shops.results_count_one": "boutique",
    "shops.results_count_other": "boutiques",
    "shops.sponsored": "Sponsorisé",
  },
};

// Lazy versions for route-level code splitting
const LazyMyBusinessHub = lazy(() => import("@/pages/MyBusinessHub"));
const LazyMyShopsPage = lazy(() => import("@/pages/MyShopsPage"));
const LazyShopsPage = lazy(() => import("@/pages/ShopsPage"));

const Fallback = () => (
  <div className="flex items-center justify-center min-h-[200px]">
    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
  </div>
);

export function V7BundleRoutes() {
  return (
    <>
      <Routes>
        <Route path="/shops" element={<Suspense fallback={<Fallback />}><LazyShopsPage /></Suspense>} />
        <Route path="/business" element={<Suspense fallback={<Fallback />}><LazyMyBusinessHub /></Suspense>} />
        <Route path="/business/my-shops" element={<Suspense fallback={<Fallback />}><LazyMyShopsPage /></Suspense>} />
      </Routes>
    </>
  );
}

export default V7BundleRoutes;
