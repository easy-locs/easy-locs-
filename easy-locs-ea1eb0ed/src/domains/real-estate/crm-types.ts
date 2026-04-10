import type { CurrencyCode } from "@/domains/shared/canonical-types";
import type { PropertyType, ListingType, LeadStatus, ViewingStatus } from "./canonical-types";

export interface Lead {
  id: string;
  profileId: string;
  name: string;
  email?: string;
  phone?: string;
  source: LeadSource;
  status: LeadStatus;
  assignedAgentId?: string;
  propertyIds: string[];
  budget?: { min: number; max: number; currency: CurrencyCode };
  preferences?: {
    propertyTypes: PropertyType[];
    listingTypes: ListingType[];
    locations: string[];
    minBedrooms?: number;
    minArea?: number;
    maxBudget?: number;
  };
  score: number;
  notes: string[];
  lastContactAt?: string;
  nextFollowUpAt?: string;
  convertedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type LeadSource =
  | "marketplace" | "referral" | "website" | "walk_in"
  | "phone" | "social_media" | "portal" | "orbit" | "other";

export interface PipelineStage {
  id: string;
  name: string;
  order: number;
  color: string;
  autoActions?: string[];
}

export const DEFAULT_PIPELINE_STAGES: PipelineStage[] = [
  { id: "new", name: "New", order: 0, color: "#3b82f6" },
  { id: "contacted", name: "Contacted", order: 1, color: "#8b5cf6" },
  { id: "qualified", name: "Qualified", order: 2, color: "#06b6d4" },
  { id: "viewing_scheduled", name: "Viewing Scheduled", order: 3, color: "#f59e0b" },
  { id: "negotiating", name: "Negotiating", order: 4, color: "#ef4444" },
  { id: "converted", name: "Converted", order: 5, color: "#22c55e" },
  { id: "lost", name: "Lost", order: 6, color: "#6b7280" },
];

export interface CrmTask {
  id: string;
  leadId?: string;
  propertyId?: string;
  assignedTo: string;
  type: TaskType;
  title: string;
  description?: string;
  dueDate: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "pending" | "in_progress" | "completed" | "cancelled";
  createdAt: string;
  completedAt?: string;
}

export type TaskType =
  | "follow_up" | "call" | "email" | "viewing" | "document_collect"
  | "contract_prep" | "inspection" | "handover" | "renewal_check" | "other";

export interface ViewingRecord {
  id: string;
  leadId: string;
  propertyId: string;
  agentId?: string;
  dateTime: string;
  duration?: number;
  status: ViewingStatus;
  feedback?: string;
  rating?: number;
  leadInterestLevel?: "hot" | "warm" | "cold";
  nextAction?: string;
  createdAt: string;
}

export interface ConversionMetrics {
  totalLeads: number;
  qualifiedLeads: number;
  viewingsScheduled: number;
  viewingsCompleted: number;
  conversions: number;
  conversionRate: number;
  avgResponseTimeHours: number;
  avgDaysToConvert: number;
  leadsBySource: Record<LeadSource, number>;
  leadsByStage: Record<string, number>;
}

export interface AgentPerformance {
  agentId: string;
  name: string;
  totalLeads: number;
  activeLeads: number;
  conversions: number;
  conversionRate: number;
  avgResponseTimeHours: number;
  viewingsCompleted: number;
  rating: number;
  revenue: number;
  currency: CurrencyCode;
}

export function scoreLeadQuality(lead: Lead): number {
  let score = 0;
  if (lead.email) score += 10;
  if (lead.phone) score += 15;
  if (lead.budget) score += 20;
  if (lead.preferences?.propertyTypes?.length) score += 10;
  if (lead.preferences?.locations?.length) score += 10;
  if (lead.preferences?.minBedrooms) score += 5;
  if (lead.lastContactAt) {
    const daysSinceContact = (Date.now() - new Date(lead.lastContactAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceContact < 1) score += 20;
    else if (daysSinceContact < 3) score += 15;
    else if (daysSinceContact < 7) score += 10;
    else if (daysSinceContact < 14) score += 5;
  }
  if (lead.propertyIds.length > 0) score += 10;
  return Math.min(100, score);
}
