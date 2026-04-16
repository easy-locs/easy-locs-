import * as fs from "fs";
import * as path from "path";
import { SEEDED_STATE_PATH, SEED_LISTING, SEED_LISTING_2, SEED_WALLET, type SeededState } from "./test-data";

let _cached: SeededState | null | undefined;

export function getSeededState(): SeededState | null {
  if (_cached !== undefined) return _cached;
  const fullPath = path.resolve(process.cwd(), SEEDED_STATE_PATH);
  if (!fs.existsSync(fullPath)) {
    _cached = null;
    return null;
  }
  _cached = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
  return _cached;
}

export function getSeededListingIds(): string[] {
  return getSeededState()?.listingIds ?? [SEED_LISTING.id, SEED_LISTING_2.id];
}

export { SEED_LISTING, SEED_LISTING_2, SEED_WALLET };
