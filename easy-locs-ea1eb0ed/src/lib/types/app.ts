export const Z = {
  base: 1,
  header: 10,
  bottomNav: 20,
  sidePanel: 30,
  overlay: 40,
  map: 50,
  callScreen: 60,
  cameraFullscreen: 70,
  emergencyModal: 80,
} as const;

export type ZKey = keyof typeof Z;

export interface LatLng {
  lat: number;
  lng: number;
}

export type {
  AppRole,
  PermissionStateValue,
  CurrencyCode,
  ServiceMode,
  GeoPosition,
  OrbitProfile,
  WalletStateModel,
  WalletTransaction,
  BookingRecordV2 as BookingRecord,
  PropertyListingV2 as PropertyListing,
} from "@/domains/shared/canonical-types";
