import type { CurrencyCode } from "@/domains/shared/canonical-types";

export type PropertyCategory =
  | "residential" | "commercial" | "land" | "hospitality" | "short_stay" | "long_stay" | "investment";

export type ResidentialType =
  | "studio" | "apartment" | "penthouse" | "duplex" | "townhouse"
  | "villa" | "compound_villa" | "serviced_apartment";

export type CommercialType =
  | "office" | "retail" | "shop" | "warehouse" | "industrial_unit"
  | "mixed_use" | "commercial_building";

export type LandType =
  | "residential_land" | "commercial_land" | "industrial_land" | "agricultural_land";

export type HospitalityType =
  | "hotel_unit" | "hotel_apartment" | "resort_villa" | "branded_residence";

export type PropertyType = ResidentialType | CommercialType | LandType | HospitalityType;

export type ListingType = "sale" | "rent" | "lease" | "short_stay" | "long_stay";

export type ManagementType =
  | "managed_property" | "exclusive_listing" | "multi_agent_listing" | "direct_owner";

export type FurnishingStatus = "furnished" | "semi_furnished" | "unfurnished";

export type PropertyStatus = "draft" | "pending_review" | "published" | "paused" | "archived" | "sold" | "rented";

export type VerificationStatus = "unverified" | "pending" | "verified" | "rejected";

export type OccupancyStatus = "vacant" | "occupied" | "reserved" | "under_maintenance";

export type LeaseStatus = "draft" | "pending_signature" | "active" | "late" | "terminated" | "expired" | "completed";

export type ViewingStatus = "requested" | "confirmed" | "completed" | "cancelled" | "no_show";

export type TicketPriority = "low" | "medium" | "high" | "urgent";

export type TicketStatus = "open" | "assigned" | "in_progress" | "pending_approval" | "resolved" | "closed";

export type PaymentType = "rent" | "deposit" | "agency_fee" | "commission" | "maintenance_cost" | "payout" | "refund";

export type PaymentStatus = "pending" | "paid" | "overdue" | "partial" | "cancelled" | "refunded";

export type DocumentType =
  | "lease_contract" | "title_deed" | "identity" | "proof_of_income"
  | "insurance" | "inspection_report" | "rent_receipt" | "tax_document"
  | "maintenance_report" | "photo_inventory" | "power_of_attorney" | "other"
  | "energy_certificate" | "gas_safety" | "lead_paint_disclosure";

export type AreaUnit = "sqm" | "sqft" | "marla" | "kanal" | "hectare" | "acre";

export type LeadStatus = "new" | "contacted" | "qualified" | "viewing_scheduled" | "negotiating" | "converted" | "lost";

export type AgentPermission =
  | "read" | "edit" | "publish" | "archive"
  | "finance_access" | "documents_access" | "maintenance_access"
  | "analytics_access" | "branch_access" | "role_management";

export type RealEstateRole =
  | "super_admin" | "business_owner" | "property_manager" | "leasing_manager"
  | "sales_manager" | "agent" | "finance_manager" | "maintenance_manager"
  | "staff" | "landlord" | "tenant" | "external_provider";

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface PropertyAddress {
  line1: string;
  line2?: string;
  city: string;
  district?: string;
  zone?: string;
  state?: string;
  postalCode?: string;
  country: string;
  geoPoint?: GeoPoint;
}

export interface Property {
  id: string;
  userId: string;
  orgId?: string;
  propertyType: PropertyType;
  propertyCategory: PropertyCategory;
  listingType: ListingType;
  managementType: ManagementType;
  title: string;
  description?: string;
  address: PropertyAddress;
  price: number;
  currency: CurrencyCode;
  bedrooms?: number;
  bathrooms?: number;
  area?: number;
  areaUnit: AreaUnit;
  furnishingStatus?: FurnishingStatus;
  status: PropertyStatus;
  verificationStatus: VerificationStatus;
  mediaIds: string[];
  amenities: string[];
  ownerId?: string;
  assignedAgentId?: string;
  assignedManagerId?: string;
  buildingId?: string;
  qualityScore?: number;
  createdAt: string;
  updatedAt: string;
}

export interface PropertyUnit {
  id: string;
  propertyId: string;
  unitNumber: string;
  floor?: number;
  unitType: PropertyType;
  area?: number;
  areaUnit: AreaUnit;
  bedrooms?: number;
  bathrooms?: number;
  occupancyStatus: OccupancyStatus;
  leaseStatus: LeaseStatus | "none";
  monthlyRent?: number;
  currency?: CurrencyCode;
  createdAt: string;
  updatedAt: string;
}

export interface Building {
  id: string;
  name: string;
  buildingType: "residential" | "commercial" | "mixed_use" | "industrial";
  address: PropertyAddress;
  managerId?: string;
  ownerEntityId?: string;
  unitCount: number;
  amenities: string[];
  buildingStatus: "active" | "under_construction" | "inactive";
  createdAt: string;
  updatedAt: string;
}

export interface Landlord {
  id: string;
  profileId: string;
  legalStatus: "individual" | "company" | "trust";
  payoutConfig?: {
    method: "bank_transfer" | "wallet" | "check";
    accountDetails?: string;
    walletId?: string;
  };
  documentsStatus: "complete" | "incomplete" | "expired";
  propertyIds: string[];
  createdAt: string;
}

export interface Tenant {
  id: string;
  profileId: string;
  userId?: string;
  name: string;
  email?: string;
  phone?: string;
  leaseIds: string[];
  paymentStatus: PaymentStatus;
  maintenanceAccess: boolean;
  createdAt: string;
}

export interface Buyer {
  id: string;
  profileId: string;
  leadStatus: LeadStatus;
  budget?: { min: number; max: number; currency: CurrencyCode };
  preferences?: {
    propertyTypes: PropertyType[];
    locations: string[];
    minBedrooms?: number;
    minArea?: number;
  };
  createdAt: string;
}

export interface Seller {
  id: string;
  profileId: string;
  portfolioIds: string[];
  createdAt: string;
}

export interface Agent {
  id: string;
  profileId: string;
  branchId?: string;
  permissions: AgentPermission[];
  role: RealEstateRole;
  performanceStats?: {
    totalDeals: number;
    conversionRate: number;
    avgResponseTime: number;
    rating: number;
  };
  createdAt: string;
}

export interface PropertyManager {
  id: string;
  profileId: string;
  managedPortfolioIds: string[];
  permissions: AgentPermission[];
  createdAt: string;
}

export interface Lease {
  id: string;
  propertyId: string;
  unitId?: string;
  landlordId: string;
  tenantId: string;
  startDate: string;
  endDate: string;
  rentAmount: number;
  currency: CurrencyCode;
  depositAmount?: number;
  paymentCycle: "monthly" | "quarterly" | "semi_annual" | "annual";
  status: LeaseStatus;
  documentIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Viewing {
  id: string;
  propertyId: string;
  leadId: string;
  agentId?: string;
  dateTime: string;
  duration?: number;
  status: ViewingStatus;
  feedback?: string;
  rating?: number;
  createdAt: string;
}

export interface MaintenanceTicket {
  id: string;
  propertyId: string;
  unitId?: string;
  reporterId: string;
  category: string;
  priority: TicketPriority;
  description: string;
  mediaIds: string[];
  assignedProviderId?: string;
  status: TicketStatus;
  costEstimate?: number;
  finalCost?: number;
  currency?: CurrencyCode;
  openedAt: string;
  closedAt?: string;
  slaDeadline?: string;
}

export interface PropertyDocument {
  id: string;
  entityType: "property" | "unit" | "lease" | "tenant" | "landlord" | "building";
  entityId: string;
  documentType: DocumentType;
  fileName: string;
  fileUrl: string;
  expiryDate?: string;
  verificationStatus: VerificationStatus;
  visibilityRules: {
    ownerVisible: boolean;
    tenantVisible: boolean;
    agentVisible: boolean;
    publicVisible: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface PropertyPayment {
  id: string;
  paymentType: PaymentType;
  leaseId?: string;
  propertyId?: string;
  payerId: string;
  receiverId: string;
  amount: number;
  currency: CurrencyCode;
  dueDate: string;
  paidAt?: string;
  status: PaymentStatus;
  receiptId?: string;
  transactionId?: string;
  reference?: string;
  createdAt: string;
}

export interface PropertyQualityScore {
  propertyId: string;
  overall: number;
  breakdown: {
    photos: number;
    description: number;
    address: number;
    pricing: number;
    taxonomy: number;
    documents: number;
  };
  issues: string[];
  canPublish: boolean;
}

export interface PropertyAnalytics {
  propertyId: string;
  occupancyRate: number;
  rentCollectionRate: number;
  unpaidRatio: number;
  maintenanceCostRatio: number;
  avgLeadResponseTime: number;
  viewingToBookingRatio: number;
  period: "month" | "quarter" | "year";
}

export interface PortfolioAnalytics {
  totalProperties: number;
  totalUnits: number;
  activeLeases: number;
  vacantUnits: number;
  openTickets: number;
  occupancyRate: number;
  rentCollectionRate: number;
  monthlyRevenue: number;
  currency: CurrencyCode;
  qualityScore: number;
}

export type DLDPropertyType = "apartment" | "villa" | "townhouse" | "penthouse" | "office" | "land";

export type DLDTransactionType = "sale" | "mortgage" | "gift";

export interface DLDTransaction {
  id: string;
  transactionDate: string;
  district: string;
  area: string;
  propertyType: DLDPropertyType;
  transactionType: DLDTransactionType;
  amount: number;
  currency: "AED";
  areaSqft: number;
  pricePerSqft: number;
  buildingName?: string;
  projectName?: string;
  bedrooms?: number;
  isFreehold: boolean;
  buyerNationality?: string;
  createdAt: string;
}

export interface DLDDistrictSummary {
  district: string;
  transactionCount: number;
  totalAmount: number;
  avgPricePerSqft: number;
  dominantType: DLDPropertyType;
  changePercent: number;
  lat: number;
  lng: number;
}

export interface DLDMarketKPI {
  totalTransactions: number;
  totalVolume: number;
  avgPricePerSqft: number;
  changeVsPrevious: number;
  period: string;
}

export interface DLDMonthlyTrend {
  month: string;
  district: string;
  avgPricePerSqft: number;
  transactionCount: number;
  totalVolume: number;
}
