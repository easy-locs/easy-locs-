export interface MerchantRecord {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  logo_url?: string;
  banner_url?: string;
  city?: string;
  address?: string;
  rating?: number;
  reviews_count?: number;
  vertical?: string;
  currency?: string;
  country?: string;
  contact_phone?: string;
  active?: boolean;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface StorefrontPage {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  banner_url?: string;
  city?: string;
  address?: string;
  rating?: number;
  reviews_count?: number;
  vertical?: string;
  currency?: string;
  country?: string;
  contact_phone?: string;
  active?: boolean;
  user_id?: string;
}

export interface CatalogCategory {
  id: string;
  shop_id: string;
  name: string;
  sort_order: number;
  active: boolean;
  created_at?: string;
}

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  category?: string;
  is_available: boolean;
  merchant_id?: string;
  shop_id?: string;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
}

export interface OrderRecord {
  id: string;
  merchant_id?: string;
  customer_user_id?: string;
  total_amount?: number;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface OrderSummaryRow {
  id: string;
  status?: string;
}

export interface ReviewRecord {
  id: string;
  merchant_id?: string;
  rating?: number;
  comment?: string;
  merchant_reply?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PromoRecord {
  id: string;
  merchant_id?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ProductRecord {
  id: string;
  merchant_id?: string;
  name?: string;
  is_available?: boolean;
  stock_quantity?: number;
  price?: number;
  created_at?: string;
  updated_at?: string;
}

export interface MerchantSummary {
  merchant: MerchantRecord | null;
  orders: OrderSummaryRow[];
  products: ProductRecord[];
  promos: PromoRecord[];
}

export interface MerchantAnalytics {
  orders: OrderRecord[];
  reviews: ReviewRecord[];
  promos: PromoRecord[];
}

export interface OnboardingProfile {
  id: string;
  user_id: string;
  business_name?: string;
  step?: string;
  completed?: boolean;
  created_at?: string;
  updated_at?: string;
}
