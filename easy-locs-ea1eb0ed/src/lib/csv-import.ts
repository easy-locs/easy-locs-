/**
 * CSV Import utility — parses CSV files and maps Rentila columns to Easy-Locs schema.
 */

export interface CsvRow {
  [key: string]: string;
}

/** Parse a CSV string into an array of objects */
export function parseCsv(text: string): CsvRow[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];

  // Detect separator (semicolon or comma)
  const sep = lines[0].includes(";") ? ";" : ",";
  const headers = parseCsvLine(lines[0], sep).map(h => h.trim());
  const rows: CsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i], sep);
    const row: CsvRow = {};
    headers.forEach((h, idx) => {
      row[h] = (values[idx] || "").trim();
    });
    rows.push(row);
  }
  return rows;
}

function parseCsvLine(line: string, sep: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === sep && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += c;
    }
  }
  result.push(current);
  return result;
}

/** Known Rentila column mappings */
export const RENTILA_PROPERTY_MAP: Record<string, string> = {
  // FR Rentila exports
  "Nom": "label",
  "Nom du bien": "label",
  "Adresse": "address",
  "Code postal": "postal_code",
  "Ville": "city",
  "Type": "property_type",
  "Surface": "surface",
  "Pièces": "rooms",
  "Nombre de pièces": "rooms",
  "Étage": "floor",
  "Chauffage": "heating",
  "Meublé": "furnished",
  "Loyer": "rent_amount",
  "Loyer mensuel": "rent_amount",
  "Charges": "charges_amount",
  "Charges mensuelles": "charges_amount",
  "Dépôt de garantie (locataire)": "deposit_amount",
  "Dépôt (locataire)": "deposit_amount",
  "Notes": "notes",
  // EN Rentila exports
  "Name": "label",
  "Property name": "label",
  "Address": "address",
  "Postal code": "postal_code",
  "Zip code": "postal_code",
  "City": "city",
  "Property type": "property_type",
  "Area": "surface",
  "Rooms": "rooms",
  "Floor": "floor",
  "Heating": "heating",
  "Furnished": "furnished",
  "Rent": "monthly_rent",
  "Monthly rent": "monthly_rent",
  "Monthly charges": "monthly_charges",
  "Deposit": "deposit_amount",
  "Security deposit": "deposit_amount",
};

export const RENTILA_TENANT_MAP: Record<string, string> = {
  // FR
  "Nom": "name",
  "Nom du locataire": "name",
  "Email": "email",
  "Téléphone": "phone",
  "Date de naissance": "birth_date",
  "Lieu de naissance": "birth_place",
  "Nationalité": "nationality",
  "Profession": "profession",
  "Type de bail": "lease_type",
  "Début du bail": "lease_start",
  "Fin du bail": "lease_end",
  "Loyer": "rent_amount",
  "Charges": "charges_amount",
  "Dépôt de garantie": "deposit_amount",
  "Garant": "guarantor_name",
  "Téléphone du garant": "guarantor_phone",
  "Adresse actuelle": "current_address",
  // EN
  "Tenant name": "name",
  "Phone": "phone",
  "Date of birth": "birth_date",
  "Birth place": "birth_place",
  "Nationality": "nationality",
  "Occupation": "profession",
  "Lease type": "lease_type",
  "Lease start": "lease_start",
  "Lease end": "lease_end",
  "Rent": "rent_amount",
  "Monthly charges": "charges_amount",
  "Deposit": "deposit_amount",
  "Security deposit": "deposit_amount",
  "Guarantor": "guarantor_name",
  "Guarantor phone": "guarantor_phone",
  "Current address": "current_address",
};

export const RENTILA_RENT_MAP: Record<string, string> = {
  "Mois": "month",
  "Month": "month",
  "Période": "month",
  "Period": "month",
  "Locataire": "tenant_name",
  "Tenant": "tenant_name",
  "Tenant name": "tenant_name",
  "Loyer": "rent_amount",
  "Rent": "rent_amount",
  "Charges": "charges_amount",
  "Total": "total_amount",
  "Payé": "paid",
  "Paid": "paid",
  "Date de paiement": "paid_date",
  "Payment date": "paid_date",
  "Mode de paiement": "payment_method",
  "Payment method": "payment_method",
};

export type ImportType = "properties" | "tenants" | "rent_history";

/** Auto-detect which type of import based on CSV headers */
export function detectImportType(headers: string[]): ImportType | null {
  const lower = headers.map(h => h.toLowerCase());
  if (lower.some(h => h.includes("loyer") || h.includes("rent")) &&
      lower.some(h => h.includes("mois") || h.includes("month") || h.includes("période"))) {
    return "rent_history";
  }
  if (lower.some(h => h.includes("bail") || h.includes("lease") || h.includes("garant") || h.includes("guarantor") || h.includes("naissance") || h.includes("birth"))) {
    return "tenants";
  }
  if (lower.some(h => h.includes("surface") || h.includes("area") || h.includes("pièces") || h.includes("rooms") || h.includes("meublé") || h.includes("furnished"))) {
    return "properties";
  }
  if (lower.some(h => h.includes("locataire") || h.includes("tenant"))) {
    return "tenants";
  }
  return null;
}

/** Map CSV row to Easy-Locs fields using known mappings */
export function mapRow(row: CsvRow, mapping: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [csvCol, value] of Object.entries(row)) {
    const targetField = mapping[csvCol] || mapping[csvCol.trim()];
    if (targetField) {
      result[targetField] = value;
    }
  }
  return result;
}
