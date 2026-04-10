export interface MapMarkerRecord {
  id: string;
  type: "listing" | "user" | "driver" | "booking";
  lat: number;
  lng: number;
  title?: string;
  subtitle?: string;
  listingId?: string;
  orbitId?: string;
  selected?: boolean;
}
