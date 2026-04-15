# UI Design System Migration Audit Matrix

Generated: 2026-04-14T00:16:07Z

## Design Token Coverage
| Token | Export | Status |
|-------|--------|--------|
| COLOR | src/config/ui.ts | ✅ |
| ACCENT | src/config/ui.ts | ✅ |
| LINE_HEIGHT | src/config/ui.ts | ✅ |
| DENSITY | src/config/ui.ts | ✅ |
| TEXT | src/config/ui.ts | ✅ |
| RADIUS | src/config/ui.ts | ✅ |
| SPACING | src/config/ui.ts | ✅ |

## Canonical Component Barrel (design-system.ts)
Total exports: 36

## UI Engine Coverage (useUiEngine)
| Page | Route Key | Status |
|------|-----------|--------|
| AdminControlRoomPage |  | ✅ |
| AdminUiEnginePage | useUiEngine( | ✅ |
| CheckoutPage | checkout | ✅ |
| CityMarketplacePage | city-marketplace | ✅ |
| CommunicationCenter | useUiEngine( | ✅ |
| Dashboard | useUiEngine( | ✅ |
| DriverDashboardPage | driver-dashboard | ✅ |
| DriverEarningsPageNew | driver-earnings | ✅ |
| DriverMissionsPage | driver-missions | ✅ |
| DriverLivePage | driver-live | ✅ |
| FavoritesPage | favorites | ✅ |
| CuisineListPage | food-cuisine | ✅ |
| FoodTypePage | food-type | ✅ |
| RestaurantPage | food-restaurant | ✅ |
| HyperRadarPage | useUiEngine( | ✅ |
| MeCommandCenter | useUiEngine( | ✅ |
| MeLeasesPage | me-leases | ✅ |
| MePropertyListPage | me-properties | ✅ |
| MeTenantsPage | me-tenants | ✅ |
| MerchantClaimPage | merchant-claim | ✅ |
| MerchantDashboardPage | useUiEngine( | ✅ |
| MerchantKitchenPage | merchant-kitchen | ✅ |
| MerchantOrdersPage | merchant-orders | ✅ |
| MyOrdersPage | my-orders | ✅ |
| Onboarding | useUiEngine( | ✅ |
| OrbitContactsPage | useUiEngine( | ✅ |
| OrbitIdentityPage | orbit-identity | ✅ |
| PermissionCenterPage | permissions | ✅ |
| PropertyDetailHub | useUiEngine( | ✅ |
| PropertyDetailPage | property-detail | ✅ |
| PropertyResultsPage | property-results | ✅ |
| PublicListing | useUiEngine( | ✅ |
| QrEntryPage | qr-entry | ✅ |
| ReorderPage | reorder | ✅ |
| SettingsAccount | settings-account | ✅ |
| SettingsAddresses | settings-addresses | ✅ |
| SettingsBusiness | settings-business | ✅ |
| SettingsNotifications | settings-notifications | ✅ |
| SettingsOrbit | settings-orbit | ✅ |
| SettingsPreferences | settings-preferences | ✅ |
| SettingsSecurity | settings-security | ✅ |
| SettingsSupport | settings-support | ✅ |
| SettingsWallet | settings-wallet | ✅ |
| ShopCategoryPage | shop-category | ✅ |
| ShopPage | useUiEngine( | ✅ |
| TrackingPage | tracking | ✅ |
| WalletHubPage | useUiEngine( | ✅ |

Coverage: 47/365 pages (12%)

## ESLint Anti-Regression Rules
| Rule | Severity | Status |
|------|----------|--------|
| no-restricted-imports (Supabase) | error | ✅ |
| no-restricted-imports (AppPageShell) | error | ✅ |
| no-restricted-imports (UniversePageShell) | error | ✅ |
| no-restricted-imports (SEOPageShell) | error | ✅ |
| no-restricted-syntax (inline color) | error | ✅ |
| no-restricted-syntax (inline backgroundColor) | error | ✅ |
| no-restricted-syntax (inline borderColor) | error | ✅ |
| no-restricted-syntax (inline fontSize) | error | ✅ |
| no-restricted-globals (localStorage) | warn | ✅ |
| no-restricted-globals (sessionStorage) | warn | ✅ |

## Runtime Detectors
| Detector | File | Status |
|----------|------|--------|
| findTruncatedText | detectors.ts | ❌ |
| findOverflowingElements | detectors.ts | ❌ |
| findTouchTargets | detectors.ts | ❌ |
| findUnresponsiveElements | detectors.ts | ❌ |
| findImageIssues | detectors.ts | ❌ |
| findContrastIssues | detectors.ts | ❌ |
| findHardcodedColors | detectors.ts | ✅ |
| findMissingCardAttributes | detectors.ts | ✅ |
| findNonResponsiveWidths | detectors.ts | ✅ |

## Quality Gate Script
Path: scripts/ui-quality-gate.sh
Mode: STRICT (all checks fail on regression, no warn-only)

## Hardcoded Hex Colors in Pillar Pages
Remaining: 1 (threshold: ≤2)
