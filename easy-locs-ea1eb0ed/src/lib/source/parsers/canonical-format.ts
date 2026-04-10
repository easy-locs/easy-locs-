/**
 * Canonical Format — Every source parser must output this structure.
 * This is the single internal representation before validation/coherence.
 */

export interface CanonicalMenuItem {
  name: string;
  description?: string;
  price?: number;
  currency?: string;
  category?: string;
  image_url?: string;
  tags?: string[];
  is_available?: boolean;
}

export interface CanonicalMenuSection {
  name: string;
  items: CanonicalMenuItem[];
}

export interface CanonicalShopData {
  // Identity
  name: string;
  description?: string;
  
  // Source tracking
  source_key: string;
  source_external_id?: string;
  source_url?: string;
  
  // Taxonomy
  vertical?: string;
  category?: string;
  subcategory?: string;
  cuisine_tags?: string[];
  
  // Location
  address?: string;
  city?: string;
  area?: string;
  country?: string;
  lat?: number;
  lng?: number;
  
  // Contact
  phone?: string;
  website?: string;
  
  // Media
  logo_url?: string;
  cover_url?: string;
  images?: string[];
  
  // Menu (structured)
  menu_sections?: CanonicalMenuSection[];
  menu_items?: CanonicalMenuItem[];
  
  // Ratings
  rating?: number;
  reviews_count?: number;
  price_level?: number;
  
  // Operations
  hours?: Record<string, string>;
  delivery_available?: boolean;
  dine_in?: boolean;
  takeaway?: boolean;
  halal?: boolean;
  
  // Raw
  raw_payload?: any;
}
