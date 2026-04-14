import type { CanonicalVertical } from "@/domains/shared/canonical-types";

export type DomainName =
  | "auth"
  | "dashboard"
  | "radar"
  | "orbit"
  | "wallet"
  | "me"
  | "marketplace"
  | "property"
  | "payments"
  | "calls"
  | "notifications"
  | "delivery"
  | "booking"
  | "listing"
  | "moderation"
  | "support"
  | "analytics"
  | "governance"
  | "system";

export interface DomainRegistryEntry {
  domain: DomainName;
  ownerVertical: CanonicalVertical | "platform";
  description: string;
  allowedEventPrefixes: string[];
  allowedStores: string[];
  allowedRoutePatterns: string[];
  dependsOn: DomainName[];
}

export interface EventRegistryEntry {
  eventName: string;
  ownerDomain: DomainName;
  payloadSchema: Record<string, string>;
  allowedEmitters: string[];
  allowedListeners: string[];
  deprecated: boolean;
  replacedBy: string | null;
}

export interface AssetRegistryEntry {
  vertical: CanonicalVertical;
  allowedMediaKinds: string[];
  requiredMedia: string[];
  maxMediaCount: number;
  allowedMimeTypes: string[];
  maxFileSizeMb: number;
}

export interface UIContractRegistryEntry {
  componentId: string;
  ownerDomain: DomainName;
  requiredProps: Record<string, string>;
  optionalProps: Record<string, string>;
  allowedVerticals: CanonicalVertical[];
  allowedCardTemplates: string[];
}

export interface DataContractRegistryEntry {
  contractId: string;
  ownerDomain: DomainName;
  entityType: string;
  requiredFields: string[];
  optionalFields: string[];
  fieldOwnership: Record<string, DomainName>;
  version: number;
}

export interface StateMachineRegistryEntry {
  machineId: string;
  ownerDomain: DomainName;
  states: string[];
  initialState: string;
  terminalStates: string[];
  transitionCount: number;
}

export interface PermissionsRegistryEntry {
  permissionId: string;
  domain: DomainName;
  action: string;
  allowedRoles: string[];
  requiresAuth: boolean;
  requiresVerification: boolean;
  rateLimit: { maxPerMinute: number; maxPerHour: number } | null;
}

export interface RouteRegistryEntry {
  routeId: string;
  path: string;
  ownerDomain: DomainName;
  ownerVertical: CanonicalVertical | "platform";
  requiresAuth: boolean;
  requiredPermissions: string[];
  dataDependencies: string[];
  pageFamily: string;
}

class CanonicalDomainRegistry {
  private entries = new Map<DomainName, DomainRegistryEntry>();

  register(entry: DomainRegistryEntry): void {
    this.entries.set(entry.domain, entry);
  }

  get(domain: DomainName): DomainRegistryEntry | undefined {
    return this.entries.get(domain);
  }

  getAll(): DomainRegistryEntry[] {
    return Array.from(this.entries.values());
  }

  getByVertical(vertical: CanonicalVertical | "platform"): DomainRegistryEntry[] {
    return this.getAll().filter((e) => e.ownerVertical === vertical);
  }

  isEventAllowed(domain: DomainName, eventName: string): boolean {
    const entry = this.entries.get(domain);
    if (!entry) return false;
    return entry.allowedEventPrefixes.some((prefix) => eventName.startsWith(prefix));
  }
}

class CanonicalEventRegistry {
  private entries = new Map<string, EventRegistryEntry>();

  register(entry: EventRegistryEntry): void {
    if (this.entries.has(entry.eventName)) {
      const existing = this.entries.get(entry.eventName)!;
      if (existing.ownerDomain !== entry.ownerDomain) {
        throw new Error(
          `Event "${entry.eventName}" already registered by domain "${existing.ownerDomain}", ` +
          `cannot register for "${entry.ownerDomain}"`
        );
      }
    }
    this.entries.set(entry.eventName, entry);
  }

  get(eventName: string): EventRegistryEntry | undefined {
    return this.entries.get(eventName);
  }

  getAll(): EventRegistryEntry[] {
    return Array.from(this.entries.values());
  }

  getByDomain(domain: DomainName): EventRegistryEntry[] {
    return this.getAll().filter((e) => e.ownerDomain === domain);
  }

  getActive(): EventRegistryEntry[] {
    return this.getAll().filter((e) => !e.deprecated);
  }

  validateEmitter(eventName: string, emitterModule: string): boolean {
    const entry = this.entries.get(eventName);
    if (!entry) return true;
    if (entry.allowedEmitters.length === 0) return true;
    return entry.allowedEmitters.includes(emitterModule);
  }
}

class CanonicalAssetRegistry {
  private entries = new Map<CanonicalVertical, AssetRegistryEntry>();

  register(entry: AssetRegistryEntry): void {
    this.entries.set(entry.vertical, entry);
  }

  get(vertical: CanonicalVertical): AssetRegistryEntry | undefined {
    return this.entries.get(vertical);
  }

  getAll(): AssetRegistryEntry[] {
    return Array.from(this.entries.values());
  }

  isMediaKindAllowed(vertical: CanonicalVertical, kind: string): boolean {
    const entry = this.entries.get(vertical);
    if (!entry) return false;
    return entry.allowedMediaKinds.includes(kind);
  }
}

class CanonicalUIContractRegistry {
  private entries = new Map<string, UIContractRegistryEntry>();

  register(entry: UIContractRegistryEntry): void {
    this.entries.set(entry.componentId, entry);
  }

  get(componentId: string): UIContractRegistryEntry | undefined {
    return this.entries.get(componentId);
  }

  getAll(): UIContractRegistryEntry[] {
    return Array.from(this.entries.values());
  }

  getByDomain(domain: DomainName): UIContractRegistryEntry[] {
    return this.getAll().filter((e) => e.ownerDomain === domain);
  }

  isVerticalAllowed(componentId: string, vertical: CanonicalVertical): boolean {
    const entry = this.entries.get(componentId);
    if (!entry) return false;
    return entry.allowedVerticals.includes(vertical);
  }
}

class CanonicalDataContractRegistry {
  private entries = new Map<string, DataContractRegistryEntry>();

  register(entry: DataContractRegistryEntry): void {
    this.entries.set(entry.contractId, entry);
  }

  get(contractId: string): DataContractRegistryEntry | undefined {
    return this.entries.get(contractId);
  }

  getAll(): DataContractRegistryEntry[] {
    return Array.from(this.entries.values());
  }

  getByEntity(entityType: string): DataContractRegistryEntry[] {
    return this.getAll().filter((e) => e.entityType === entityType);
  }

  validateFieldOwnership(contractId: string, field: string, claimingDomain: DomainName): boolean {
    const entry = this.entries.get(contractId);
    if (!entry) return true;
    const owner = entry.fieldOwnership[field];
    if (!owner) return true;
    return owner === claimingDomain;
  }
}

class CanonicalStateMachineRegistry {
  private entries = new Map<string, StateMachineRegistryEntry>();

  register(entry: StateMachineRegistryEntry): void {
    this.entries.set(entry.machineId, entry);
  }

  get(machineId: string): StateMachineRegistryEntry | undefined {
    return this.entries.get(machineId);
  }

  getAll(): StateMachineRegistryEntry[] {
    return Array.from(this.entries.values());
  }

  getByDomain(domain: DomainName): StateMachineRegistryEntry[] {
    return this.getAll().filter((e) => e.ownerDomain === domain);
  }
}

class CanonicalPermissionsRegistry {
  private entries = new Map<string, PermissionsRegistryEntry>();

  register(entry: PermissionsRegistryEntry): void {
    this.entries.set(entry.permissionId, entry);
  }

  get(permissionId: string): PermissionsRegistryEntry | undefined {
    return this.entries.get(permissionId);
  }

  getAll(): PermissionsRegistryEntry[] {
    return Array.from(this.entries.values());
  }

  getByDomain(domain: DomainName): PermissionsRegistryEntry[] {
    return this.getAll().filter((e) => e.domain === domain);
  }

  isAllowed(permissionId: string, role: string): boolean {
    const entry = this.entries.get(permissionId);
    if (!entry) return false;
    return entry.allowedRoles.includes(role);
  }
}

class CanonicalRouteRegistry {
  private entries = new Map<string, RouteRegistryEntry>();

  register(entry: RouteRegistryEntry): void {
    this.entries.set(entry.routeId, entry);
  }

  get(routeId: string): RouteRegistryEntry | undefined {
    return this.entries.get(routeId);
  }

  getAll(): RouteRegistryEntry[] {
    return Array.from(this.entries.values());
  }

  getByPath(path: string): RouteRegistryEntry | undefined {
    return this.getAll().find((e) => e.path === path);
  }

  getByDomain(domain: DomainName): RouteRegistryEntry[] {
    return this.getAll().filter((e) => e.ownerDomain === domain);
  }

  getByVertical(vertical: CanonicalVertical | "platform"): RouteRegistryEntry[] {
    return this.getAll().filter((e) => e.ownerVertical === vertical);
  }

  getProtectedRoutes(): RouteRegistryEntry[] {
    return this.getAll().filter((e) => e.requiresAuth);
  }
}

export interface TaxonomyRegistryEntry {
  taxonomyId: string;
  canonicalPath: string;
  parentPath: string | null;
  vertical: CanonicalVertical | "platform";
  family: string;
  label: string;
  active: boolean;
  aliases: string[];
}

class CanonicalTaxonomyRegistry {
  private entries = new Map<string, TaxonomyRegistryEntry>();
  private pathIndex = new Map<string, string>();

  register(entry: TaxonomyRegistryEntry): void {
    this.entries.set(entry.taxonomyId, entry);
    this.pathIndex.set(entry.canonicalPath, entry.taxonomyId);
  }

  get(taxonomyId: string): TaxonomyRegistryEntry | undefined {
    return this.entries.get(taxonomyId);
  }

  getByPath(canonicalPath: string): TaxonomyRegistryEntry | undefined {
    const id = this.pathIndex.get(canonicalPath);
    return id ? this.entries.get(id) : undefined;
  }

  getAll(): TaxonomyRegistryEntry[] {
    return Array.from(this.entries.values());
  }

  getActive(): TaxonomyRegistryEntry[] {
    return this.getAll().filter((e) => e.active);
  }

  getByVertical(vertical: CanonicalVertical | "platform"): TaxonomyRegistryEntry[] {
    return this.getAll().filter((e) => e.vertical === vertical);
  }

  getByFamily(family: string): TaxonomyRegistryEntry[] {
    return this.getAll().filter((e) => e.family === family);
  }

  getChildren(parentPath: string): TaxonomyRegistryEntry[] {
    return this.getAll().filter((e) => e.parentPath === parentPath);
  }

  isValidPath(path: string): boolean {
    return this.pathIndex.has(path);
  }

  resolveAlias(alias: string): TaxonomyRegistryEntry | undefined {
    const normalized = alias.toLowerCase().trim();
    return this.getAll().find((e) =>
      e.aliases.some((a) => a.toLowerCase() === normalized)
    );
  }

  detectOrphans(): TaxonomyRegistryEntry[] {
    return this.getAll().filter((e) => {
      if (!e.parentPath) return false;
      return !this.pathIndex.has(e.parentPath);
    });
  }
}

export const domainRegistry = new CanonicalDomainRegistry();
export const eventRegistry = new CanonicalEventRegistry();
export const assetRegistry = new CanonicalAssetRegistry();
export const uiContractRegistry = new CanonicalUIContractRegistry();
export const dataContractRegistry = new CanonicalDataContractRegistry();
export const stateMachineRegistry = new CanonicalStateMachineRegistry();
export const permissionsRegistry = new CanonicalPermissionsRegistry();
export const routeRegistry = new CanonicalRouteRegistry();
export const taxonomyRegistry = new CanonicalTaxonomyRegistry();

export function validateRegistryIntegrity(): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  for (const event of eventRegistry.getAll()) {
    const domain = domainRegistry.get(event.ownerDomain);
    if (!domain) {
      errors.push(`Event "${event.eventName}" references unknown domain "${event.ownerDomain}"`);
    }
  }

  for (const route of routeRegistry.getAll()) {
    const domain = domainRegistry.get(route.ownerDomain);
    if (!domain) {
      errors.push(`Route "${route.path}" references unknown domain "${route.ownerDomain}"`);
    }
  }

  for (const contract of dataContractRegistry.getAll()) {
    for (const [field, owner] of Object.entries(contract.fieldOwnership)) {
      const domain = domainRegistry.get(owner);
      if (!domain) {
        errors.push(`Data contract "${contract.contractId}" field "${field}" references unknown domain "${owner}"`);
      }
    }
  }

  for (const perm of permissionsRegistry.getAll()) {
    const domain = domainRegistry.get(perm.domain);
    if (!domain) {
      errors.push(`Permission "${perm.permissionId}" references unknown domain "${perm.domain}"`);
    }
  }

  const orphans = taxonomyRegistry.detectOrphans();
  for (const orphan of orphans) {
    errors.push(`Taxonomy "${orphan.taxonomyId}" has orphaned parent path "${orphan.parentPath}"`);
  }

  return { valid: errors.length === 0, errors };
}

domainRegistry.register({ domain: "auth", ownerVertical: "platform", description: "Authentication and session management", allowedEventPrefixes: ["auth:"], allowedStores: ["useAuthStore"], allowedRoutePatterns: ["/auth/*", "/login", "/signup"], dependsOn: [] });
domainRegistry.register({ domain: "dashboard", ownerVertical: "platform", description: "Dashboard aggregation and counters", allowedEventPrefixes: ["dashboard:"], allowedStores: ["useDashboardStore"], allowedRoutePatterns: ["/dashboard/*"], dependsOn: ["auth"] });
domainRegistry.register({ domain: "radar", ownerVertical: "platform", description: "Discovery, search, and map exploration", allowedEventPrefixes: ["radar:", "map:"], allowedStores: ["useUnifiedMapStore"], allowedRoutePatterns: ["/radar/*", "/explore/*"], dependsOn: ["auth"] });
domainRegistry.register({ domain: "orbit", ownerVertical: "platform", description: "Messaging, calls, and communication", allowedEventPrefixes: ["orbit:"], allowedStores: ["useOrbitStore", "useOrbitMessagingStore", "useOrbitThreadStore"], allowedRoutePatterns: ["/orbit/*", "/chat/*"], dependsOn: ["auth"] });
domainRegistry.register({ domain: "wallet", ownerVertical: "platform", description: "Wallet, payments, and financial operations", allowedEventPrefixes: ["wallet:"], allowedStores: ["useWalletStore"], allowedRoutePatterns: ["/wallet/*"], dependsOn: ["auth"] });
domainRegistry.register({ domain: "me", ownerVertical: "platform", description: "User profile and settings", allowedEventPrefixes: ["me:"], allowedStores: ["useProfileStore"], allowedRoutePatterns: ["/me/*", "/profile/*", "/settings/*"], dependsOn: ["auth"] });
domainRegistry.register({ domain: "marketplace", ownerVertical: "platform", description: "Marketplace operations and storefronts", allowedEventPrefixes: ["marketplace:", "storefront:"], allowedStores: ["useMarketplaceStore"], allowedRoutePatterns: ["/marketplace/*", "/shop/*"], dependsOn: ["auth", "wallet"] });
domainRegistry.register({ domain: "property", ownerVertical: "property", description: "Property management", allowedEventPrefixes: ["pm:", "property:"], allowedStores: ["usePropertyStore"], allowedRoutePatterns: ["/property/*", "/pm/*"], dependsOn: ["auth", "wallet"] });
domainRegistry.register({ domain: "payments", ownerVertical: "platform", description: "Payment processing and escrow", allowedEventPrefixes: ["payment:"], allowedStores: ["usePaymentStore"], allowedRoutePatterns: ["/payments/*"], dependsOn: ["auth", "wallet"] });
domainRegistry.register({ domain: "calls", ownerVertical: "platform", description: "Voice and video calls", allowedEventPrefixes: ["call:"], allowedStores: ["useCallStore"], allowedRoutePatterns: ["/calls/*"], dependsOn: ["auth", "orbit"] });
domainRegistry.register({ domain: "notifications", ownerVertical: "platform", description: "Push, in-app, and email notifications", allowedEventPrefixes: ["notifications:"], allowedStores: ["useNotificationStore"], allowedRoutePatterns: ["/notifications/*"], dependsOn: ["auth"] });
domainRegistry.register({ domain: "delivery", ownerVertical: "platform", description: "Delivery job management and tracking", allowedEventPrefixes: ["delivery:", "dispatch:", "tracking:"], allowedStores: ["useDeliveryStore"], allowedRoutePatterns: ["/delivery/*", "/tracking/*"], dependsOn: ["auth", "wallet"] });
domainRegistry.register({ domain: "booking", ownerVertical: "platform", description: "Booking and availability management", allowedEventPrefixes: ["booking:"], allowedStores: ["useBookingStore"], allowedRoutePatterns: ["/booking/*"], dependsOn: ["auth", "wallet"] });
domainRegistry.register({ domain: "listing", ownerVertical: "platform", description: "Listing creation and management", allowedEventPrefixes: ["listing:"], allowedStores: ["useListingStore"], allowedRoutePatterns: ["/listing/*"], dependsOn: ["auth"] });
domainRegistry.register({ domain: "moderation", ownerVertical: "platform", description: "Content moderation and quality control", allowedEventPrefixes: ["moderation:"], allowedStores: [], allowedRoutePatterns: ["/admin/moderation/*"], dependsOn: ["auth"] });
domainRegistry.register({ domain: "support", ownerVertical: "platform", description: "Support tickets and customer service", allowedEventPrefixes: ["support:"], allowedStores: ["useSupportStore"], allowedRoutePatterns: ["/support/*"], dependsOn: ["auth", "orbit"] });
domainRegistry.register({ domain: "analytics", ownerVertical: "platform", description: "Analytics and reporting", allowedEventPrefixes: ["analytics:"], allowedStores: [], allowedRoutePatterns: ["/analytics/*"], dependsOn: ["auth"] });
domainRegistry.register({ domain: "governance", ownerVertical: "platform", description: "System governance, audit, and self-healing", allowedEventPrefixes: ["governance:", "sentinel:"], allowedStores: [], allowedRoutePatterns: ["/admin/governance/*"], dependsOn: ["auth"] });
domainRegistry.register({ domain: "system", ownerVertical: "platform", description: "System-level operations", allowedEventPrefixes: ["system:"], allowedStores: [], allowedRoutePatterns: [], dependsOn: [] });
