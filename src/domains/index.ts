/**
 * Domain Module Index — Public barrel exports for all domains.
 * 
 * Consumers import domain types and ports from here.
 * Adapters are wired at the infrastructure layer, never imported by UI.
 * 
 * Architecture:
 *   UI → Hooks → Use Cases (ports) → Adapters (repositories) → DB
 *   Domain Events flow: Adapter → domain-event-bus → platformBus/eventBus
 */

// Shared
export type { DomainEntity, DomainEvent, DomainResult, Money, DateRange, GeoPoint, Address, PersonName, Repository, EventPublisher } from "./shared/types";
export { publishDomainEvent, createDomainEvent, getDomainEventLog } from "./shared/domain-event-bus";

// Rental
export type { Lease, RentCall, Property, RentalUseCases, LeaseRepository, RentCallRepository, PropertyRepository, RentalEventPort, CreateLeaseCommand, CollectRentCommand, RentCockpitView } from "./rental/ports";
export { rentalEvents } from "./rental/events";

// Wallet
export type { WalletAccount, LedgerEntry, TransferIntent, WalletUseCases, WalletRepository, LedgerRepository, PaymentGatewayPort, WalletSecurityPort, WalletEventPort } from "./wallet/ports";
export { walletEvents } from "./wallet/events";

// Marketplace
export type { Listing, Booking, Review, MarketplaceUseCases, ListingRepository, BookingRepository, MarketplaceEventPort, PublishListingCommand, CreateBookingCommand, SubmitReviewCommand, SearchQuery } from "./marketplace/ports";
export { marketplaceEvents } from "./marketplace/events";

// Orbit
export type { Conversation, Message, OrbitProfile, CallSession, OrbitUseCases, ConversationRepository, MessageRepository, CallRepository, OrbitProfileRepository, OrbitEventPort, EncryptionPort, SendMessageCommand, StartCallCommand } from "./orbit/ports";
export { orbitEvents } from "./orbit/events";

// Delivery
export type { DeliveryJob, Driver, TrackingUpdate, DeliveryUseCases, DeliveryJobRepository, DriverRepository as DeliveryDriverRepository, DispatchEnginePort, DeliveryEventPort, DispatchCommand, DriverEarnings } from "./delivery/ports";
export { deliveryEvents } from "./delivery/events";

// Admin
export type { AuditEntry, AdminAlert, AdminUseCases, AuditFilters, AuditRepository, AlertRepository, AdminEventPort } from "./admin/ports";
export { adminEvents } from "./admin/events";

// ── Domain Services (use-case entry points) ──
export { createRentalService } from "./rental/service";
export { createWalletService } from "./wallet/service";
export { createMarketplaceService } from "./marketplace/service";
export { createOrbitService } from "./orbit/service";
export { createDeliveryService } from "./delivery/service";
export { createAdminService } from "./admin/service";

// Shared infrastructure
export { createDomainLogger, registerLogSink, getLogBuffer } from "./shared/observability";
export type { DomainLogEntry, LogLevel } from "./shared/observability";
export { runWorkflow } from "./shared/workflow-orchestrator";
export type { WorkflowStep, WorkflowResult, WorkflowConfig } from "./shared/workflow-orchestrator";
export { requireAuth, requireOrg, requireRole, rateLimit, sanitize } from "./shared/security-guards";
export type { SecurityContext } from "./shared/security-guards";
