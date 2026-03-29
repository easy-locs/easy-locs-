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
