/**
 * ContextPanel — Layer 3: Conversation context sidebar.
 * Shows contact info, booking details, property info, deal room, and activity timeline
 * based on the conversation type.
 */
import { User, Mail, Phone, ExternalLink, History, Handshake, Building, FileText, CreditCard, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import DealRoomPanel from "@/components/communication/DealRoomPanel";
import EntityActivityLog from "@/components/communication/EntityActivityLog";
import { getCountryEntryOrDefault } from "@/lib/global-country-registry";
import type { ConversationThread } from "./types";
import { SOURCE_MODULE_CONFIG, STATUS_COLORS, STATUS_LABELS, CONV_TYPE_CONFIG } from "./types";

interface Props {
  thread: ConversationThread;
  orgId: string;
}

export default function ContextPanel({ thread, orgId }: Props) {
  const config = CONV_TYPE_CONFIG[thread.conversationType];
  const moduleConfig = SOURCE_MODULE_CONFIG[thread.sourceModule];

  return (
    <div className="w-72 border-l border-border/50 flex flex-col overflow-hidden hidden lg:flex bg-muted/5">
      <div className="p-4 space-y-4 overflow-y-auto flex-shrink-0">
        {/* Conversation type badge */}
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={`text-xs px-2 py-0.5 ${moduleConfig.cls}`}>
            {moduleConfig.emoji} {moduleConfig.label}
          </Badge>
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${config.bg} ${config.text} ${config.border}`}>
            {config.emoji} {config.label}
          </Badge>
        </div>

        {/* Contact info */}
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <User className="h-3.5 w-3.5 text-accent" /> Contact
          </h3>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <User className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{thread.name}</span>
            </div>
            {thread.email && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Mail className="h-3.5 w-3.5 shrink-0" />
                <a href={`mailto:${thread.email}`} className="truncate underline">{thread.email}</a>
              </div>
            )}
            {thread.phone && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Phone className="h-3.5 w-3.5 shrink-0" />
                <a href={`tel:${thread.phone}`} className="underline">{thread.phone}</a>
              </div>
            )}
          </div>
        </div>

        {/* Booking context */}
        {thread.conversationType === "booking" && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <CreditCard className="h-3 w-3 text-accent" /> Booking
            </h4>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${moduleConfig.cls}`}>
                {moduleConfig.emoji} {moduleConfig.label}
              </Badge>
              {thread.bookingStatus && (
                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-medium ${STATUS_COLORS[thread.bookingStatus] || ""}`}>
                  {STATUS_LABELS[thread.bookingStatus] || thread.bookingStatus}
                </Badge>
              )}
            </div>
            {thread.bookingId && (
              <p className="text-[10px] text-muted-foreground font-mono">#{thread.bookingId.slice(0, 8)}</p>
            )}
            {thread.serviceTitle && (
              <p className="text-xs text-foreground">{thread.serviceTitle}</p>
            )}
            {thread.totalPrice != null && (
              <p className="text-sm font-semibold text-foreground">
                {thread.totalPrice.toFixed(2)} {(thread.currency || "EUR").toUpperCase()}
              </p>
            )}
          </div>
        )}

        {/* Listing context */}
        {thread.conversationType === "listing" && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Building className="h-3 w-3 text-accent" /> Listing
            </h4>
            {thread.listingTitle && <p className="text-xs text-foreground">{thread.listingTitle}</p>}
            {thread.listingType && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {thread.listingType}
              </Badge>
            )}
          </div>
        )}

        {/* Property context */}
        {(thread.propertyLabel || thread.propertyCountry) && (
          <div className="space-y-1">
            <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Building className="h-3 w-3 text-accent" /> Property
            </h4>
            {thread.propertyCountry && (
              <span className="text-xs">{getCountryEntryOrDefault(thread.propertyCountry).flag} {getCountryEntryOrDefault(thread.propertyCountry).name}</span>
            )}
            {thread.propertyLabel && (
              <p className="text-xs text-muted-foreground">{thread.propertyLabel}</p>
            )}
          </div>
        )}

        {/* Property management context */}
        {thread.conversationType === "property" && (
          <div className="space-y-1.5">
            <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <FileText className="h-3 w-3 text-accent" /> Management
            </h4>
            <div className="space-y-1">
              <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-7 gap-1.5" asChild>
                <a href={`/dashboard/rental?tab=tenants`}>
                  <User className="h-3 w-3" /> Tenant File
                </a>
              </Button>
              <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-7 gap-1.5" asChild>
                <a href={`/dashboard/rental?tab=payments`}>
                  <CreditCard className="h-3 w-3" /> Rent Payments
                </a>
              </Button>
              <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-7 gap-1.5" asChild>
                <a href={`/dashboard/interventions`}>
                  <Wrench className="h-3 w-3" /> Maintenance
                </a>
              </Button>
              <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-7 gap-1.5" asChild>
                <a href={`/dashboard/documents`}>
                  <FileText className="h-3 w-3" /> Documents
                </a>
              </Button>
            </div>
          </div>
        )}

        {/* Quick links */}
        <div className="pt-3 border-t border-border/30 space-y-1.5">
          <h4 className="text-xs font-semibold text-foreground mb-2">Quick Links</h4>
          {thread.conversationType === "booking" && thread.bookingType === "marketplace" && (
            <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-7 gap-1.5" asChild>
              <a href={`/dashboard/activities?booking=${thread.bookingId}`}>
                <ExternalLink className="h-3 w-3" /> View in Marketplace
              </a>
            </Button>
          )}
          {thread.conversationType === "booking" && thread.bookingType === "concierge" && (
            <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-7 gap-1.5" asChild>
              <a href={`/dashboard/concierge?booking=${thread.bookingId}`}>
                <ExternalLink className="h-3 w-3" /> View in Concierge
              </a>
            </Button>
          )}
          {thread.conversationType === "booking" && thread.bookingType === "seasonal" && (
            <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-7 gap-1.5" asChild>
              <a href={`/dashboard/seasonal?booking=${thread.bookingId}`}>
                <ExternalLink className="h-3 w-3" /> View in Seasonal
              </a>
            </Button>
          )}
          {thread.conversationType === "property" && (
            <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-7 gap-1.5" asChild>
              <a href="/dashboard/rental?tab=tenants">
                <ExternalLink className="h-3 w-3" /> View Tenant
              </a>
            </Button>
          )}
          {thread.conversationType === "listing" && (
            <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-7 gap-1.5" asChild>
              <a href="/dashboard/real-estate">
                <ExternalLink className="h-3 w-3" /> View Listings
              </a>
            </Button>
          )}
        </div>

        {/* Deal Room */}
        {thread.contextId && orgId && (
          <div className="pt-3 border-t border-border/30">
            <DealRoomPanel
              contextType={thread.contextType}
              contextId={thread.contextId}
              contextTitle={thread.serviceTitle || thread.listingTitle || thread.propertyLabel}
              targetOrgId={orgId}
              threadId={thread.id}
              isOrgMember={true}
            />
          </div>
        )}
      </div>

      {/* Activity Timeline */}
      <div className="flex-1 border-t border-border/30 flex flex-col min-h-0">
        <div className="px-4 py-2.5 flex items-center gap-1.5">
          <History className="h-3.5 w-3.5 text-muted-foreground" />
          <h4 className="text-xs font-semibold text-foreground">Activity Timeline</h4>
        </div>
        <div className="flex-1 px-4 pb-4 min-h-0 overflow-hidden">
          <EntityActivityLog
            entityType={
              thread.conversationType === "property" ? "tenant" :
              thread.propertyId ? "property" :
              "booking"
            }
            entityId={
              thread.conversationType === "property" ? (thread.tenantId || thread.contextId) :
              thread.propertyId ? thread.propertyId :
              (thread.bookingId || thread.contextId)
            }
            orgId={orgId}
            maxItems={30}
          />
        </div>
      </div>
    </div>
  );
}
