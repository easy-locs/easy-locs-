export interface SpatialPoint {
  lat: number;
  lng: number;
}

export interface GeoPolygon {
  id: string;
  name: string;
  type: "service_zone" | "delivery_zone" | "surge_zone" | "restricted_zone" | "city_boundary";
  coordinates: SpatialPoint[];
  properties?: Record<string, unknown>;
}

export interface SpatialQueryParams {
  point: SpatialPoint;
  radiusKm?: number;
  limit?: number;
  entityType?: string;
}

const ALLOWED_TABLES = new Set([
  "drivers", "merchants", "service_zones", "delivery_zones",
  "listings", "storefronts", "properties", "hotels",
]);

const ALLOWED_COLUMNS = new Set([
  "id", "name", "user_id", "category", "rating", "image_url",
  "vehicle_type", "status", "active", "type", "properties",
  "current_location", "location", "geometry",
  "created_at", "updated_at", "description", "price",
  "max_delivery_time_minutes", "delivery_fee", "merchant_id",
]);

const IDENTIFIER_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

function validateIdentifier(value: string, kind: string): string {
  if (!IDENTIFIER_REGEX.test(value)) {
    throw new Error(`Invalid ${kind}: "${value}" contains disallowed characters`);
  }
  return value;
}

function validateTable(table: string): string {
  validateIdentifier(table, "table name");
  if (!ALLOWED_TABLES.has(table)) {
    throw new Error(`Table "${table}" is not in the spatial query allowlist`);
  }
  return table;
}

function validateColumn(col: string): string {
  validateIdentifier(col, "column name");
  if (!ALLOWED_COLUMNS.has(col)) {
    throw new Error(`Column "${col}" is not in the spatial query allowlist`);
  }
  return col;
}

function validateSelectColumns(cols: string): string {
  if (cols === "*") return cols;
  return cols
    .split(",")
    .map((c) => validateColumn(c.trim()))
    .join(", ");
}

function validateCoord(value: number, name: string): number {
  if (!Number.isFinite(value)) {
    throw new Error(`${name} must be a finite number`);
  }
  return value;
}

function validatePoint(point: SpatialPoint): SpatialPoint {
  return {
    lat: validateCoord(point.lat, "lat"),
    lng: validateCoord(point.lng, "lng"),
  };
}

function validatePositiveInt(value: number, name: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return value;
}

export interface ParameterizedQuery {
  sql: string;
  params: (string | number)[];
}

export function buildSTDWithinQuery(
  table: string,
  locationColumn: string,
  point: SpatialPoint,
  radiusMeters: number,
  selectColumns = "*",
  limit?: number,
): ParameterizedQuery {
  const safeTable = validateTable(table);
  const safeCol = validateColumn(locationColumn);
  const safeCols = validateSelectColumns(selectColumns);
  const safePoint = validatePoint(point);
  const safeRadius = validateCoord(radiusMeters, "radiusMeters");

  let sql = `
    SELECT ${safeCols},
      ST_Distance(
        ${safeCol}::geography,
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
      ) as distance_meters
    FROM ${safeTable}
    WHERE ST_DWithin(
      ${safeCol}::geography,
      ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
      $3
    )
    ORDER BY distance_meters ASC`;

  const params: (string | number)[] = [safePoint.lng, safePoint.lat, safeRadius];

  if (limit !== undefined) {
    const safeLimit = validatePositiveInt(limit, "limit");
    sql += `\n    LIMIT $4`;
    params.push(safeLimit);
  }

  return { sql: sql.trim(), params };
}

export function buildSTDistanceQuery(
  table: string,
  locationColumn: string,
  point: SpatialPoint,
  selectColumns = "*",
  limit = 50,
): ParameterizedQuery {
  const safeTable = validateTable(table);
  const safeCol = validateColumn(locationColumn);
  const safeCols = validateSelectColumns(selectColumns);
  const safePoint = validatePoint(point);
  const safeLimit = validatePositiveInt(limit, "limit");

  const sql = `
    SELECT ${safeCols},
      ST_Distance(
        ${safeCol}::geography,
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
      ) as distance_meters
    FROM ${safeTable}
    ORDER BY ${safeCol}::geography <->
      ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
    LIMIT $3
  `.trim();

  return { sql, params: [safePoint.lng, safePoint.lat, safeLimit] };
}

export function buildPolygonContainsQuery(
  table: string,
  polygonColumn: string,
  point: SpatialPoint,
  selectColumns = "*",
): ParameterizedQuery {
  const safeTable = validateTable(table);
  const safeCol = validateColumn(polygonColumn);
  const safeCols = validateSelectColumns(selectColumns);
  const safePoint = validatePoint(point);

  const sql = `
    SELECT ${safeCols}
    FROM ${safeTable}
    WHERE ST_Contains(
      ${safeCol},
      ST_SetSRID(ST_MakePoint($1, $2), 4326)
    )
  `.trim();

  return { sql, params: [safePoint.lng, safePoint.lat] };
}

export function buildAutoAssignZoneQuery(point: SpatialPoint): ParameterizedQuery {
  const safePoint = validatePoint(point);

  const sql = `
    SELECT id, name, type, properties,
      ST_Area(geometry::geography) as area_sqm
    FROM service_zones
    WHERE ST_Contains(
      geometry,
      ST_SetSRID(ST_MakePoint($1, $2), 4326)
    )
    AND active = true
    ORDER BY area_sqm ASC
    LIMIT 1
  `.trim();

  return { sql, params: [safePoint.lng, safePoint.lat] };
}

type VehicleType = "car" | "motorcycle" | "bicycle" | "van" | "truck";
const ALLOWED_VEHICLE_TYPES = new Set<VehicleType>(["car", "motorcycle", "bicycle", "van", "truck"]);

export function buildNearbyDriversQuery(
  point: SpatialPoint,
  radiusMeters: number,
  vehicleType?: VehicleType,
  limit = 20,
): ParameterizedQuery {
  const safePoint = validatePoint(point);
  const safeRadius = validateCoord(radiusMeters, "radiusMeters");
  const safeLimit = validatePositiveInt(limit, "limit");

  const params: (string | number)[] = [safePoint.lng, safePoint.lat, safeRadius];

  let vehicleFilter = "";
  if (vehicleType) {
    if (!ALLOWED_VEHICLE_TYPES.has(vehicleType)) {
      throw new Error(`Invalid vehicle type: "${vehicleType}"`);
    }
    vehicleFilter = `AND vehicle_type = $${params.length + 1}`;
    params.push(vehicleType);
  }

  params.push(safeLimit);

  const sql = `
    SELECT id, user_id, vehicle_type, rating,
      ST_X(current_location::geometry) as lng,
      ST_Y(current_location::geometry) as lat,
      ST_Distance(
        current_location::geography,
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
      ) as distance_meters
    FROM drivers
    WHERE status = 'available'
    AND ST_DWithin(
      current_location::geography,
      ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
      $3
    )
    ${vehicleFilter}
    ORDER BY distance_meters ASC
    LIMIT $${params.length}
  `.trim();

  return { sql, params };
}

type MerchantCategory = "restaurant" | "grocery" | "pharmacy" | "electronics" | "fashion" | "beauty" | "home" | "sports" | "other";
const ALLOWED_CATEGORIES = new Set<MerchantCategory>(["restaurant", "grocery", "pharmacy", "electronics", "fashion", "beauty", "home", "sports", "other"]);

export function buildNearbyMerchantsQuery(
  point: SpatialPoint,
  radiusMeters: number,
  category?: MerchantCategory,
  limit = 50,
): ParameterizedQuery {
  const safePoint = validatePoint(point);
  const safeRadius = validateCoord(radiusMeters, "radiusMeters");
  const safeLimit = validatePositiveInt(limit, "limit");

  const params: (string | number)[] = [safePoint.lng, safePoint.lat, safeRadius];

  let catFilter = "";
  if (category) {
    if (!ALLOWED_CATEGORIES.has(category)) {
      throw new Error(`Invalid merchant category: "${category}"`);
    }
    catFilter = `AND category = $${params.length + 1}`;
    params.push(category);
  }

  params.push(safeLimit);

  const sql = `
    SELECT id, name, category, rating, image_url,
      ST_X(location::geometry) as lng,
      ST_Y(location::geometry) as lat,
      ST_Distance(
        location::geography,
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
      ) as distance_meters
    FROM merchants
    WHERE active = true
    AND ST_DWithin(
      location::geography,
      ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
      $3
    )
    ${catFilter}
    ORDER BY distance_meters ASC
    LIMIT $${params.length}
  `.trim();

  return { sql, params };
}

export function buildCreateSpatialIndexSQL(table: string, column: string): string {
  const safeTable = validateTable(table);
  const safeCol = validateColumn(column);
  return `CREATE INDEX IF NOT EXISTS idx_${safeTable}_${safeCol}_gist ON ${safeTable} USING GIST (${safeCol});`;
}

export function buildGeoJSONPolygon(points: SpatialPoint[]): string {
  if (points.length < 3) throw new Error("Polygon requires at least 3 points");
  for (const p of points) validatePoint(p);
  const coords = [...points, points[0]].map((p) => `${p.lng} ${p.lat}`).join(", ");
  return `ST_SetSRID(ST_GeomFromText('POLYGON((${coords}))'), 4326)`;
}

export const POSTGIS_MIGRATION_SQL = `
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

ALTER TABLE drivers ADD COLUMN IF NOT EXISTS current_location geography(Point, 4326);
CREATE INDEX IF NOT EXISTS idx_drivers_location ON drivers USING GIST (current_location);

ALTER TABLE merchants ADD COLUMN IF NOT EXISTS location geography(Point, 4326);
CREATE INDEX IF NOT EXISTS idx_merchants_location ON merchants USING GIST (location);

CREATE TABLE IF NOT EXISTS service_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'service_zone',
  geometry geometry(Polygon, 4326) NOT NULL,
  active BOOLEAN DEFAULT true,
  properties JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_service_zones_geometry ON service_zones USING GIST (geometry);

CREATE TABLE IF NOT EXISTS delivery_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID REFERENCES merchants(id),
  name TEXT NOT NULL,
  geometry geometry(Polygon, 4326) NOT NULL,
  max_delivery_time_minutes INTEGER DEFAULT 45,
  delivery_fee DECIMAL(10,2) DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_delivery_zones_geometry ON delivery_zones USING GIST (geometry);

CREATE OR REPLACE FUNCTION auto_assign_zone(p_lat DOUBLE PRECISION, p_lng DOUBLE PRECISION)
RETURNS TABLE(zone_id UUID, zone_name TEXT, zone_type TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT sz.id, sz.name, sz.type
  FROM service_zones sz
  WHERE ST_Contains(
    sz.geometry,
    ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)
  )
  AND sz.active = true
  ORDER BY ST_Area(sz.geometry::geography) ASC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;
`;
