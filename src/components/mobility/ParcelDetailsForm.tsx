/**
 * ParcelDetailsForm — Structured parcel detail capture for parcel_delivery jobs.
 * Professional form with sections: type, size, flags, contacts, value.
 */
import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Package, Shield, Phone, FileText, DollarSign } from "lucide-react";

export interface ParcelDetails {
  parcelType: string;
  packageSize: string;
  packageWeightKg: string;
  packageCount: string;
  fragile: boolean;
  requiresSignature: boolean;
  requiresOtp: boolean;
  pickupContactName: string;
  pickupContactPhone: string;
  dropoffContactName: string;
  dropoffContactPhone: string;
  declaredValueAmount: string;
  specialInstructions: string;
}

export const INITIAL_PARCEL: ParcelDetails = {
  parcelType: "general_goods",
  packageSize: "medium_box",
  packageWeightKg: "",
  packageCount: "1",
  fragile: false,
  requiresSignature: false,
  requiresOtp: false,
  pickupContactName: "",
  pickupContactPhone: "",
  dropoffContactName: "",
  dropoffContactPhone: "",
  declaredValueAmount: "",
  specialInstructions: "",
};

const PARCEL_TYPES = [
  { value: "documents", label: "Documents", emoji: "📄" },
  { value: "electronics", label: "Electronics", emoji: "💻" },
  { value: "clothing", label: "Clothing", emoji: "👕" },
  { value: "food_package", label: "Food", emoji: "🍱" },
  { value: "flowers", label: "Flowers", emoji: "💐" },
  { value: "fragile_goods", label: "Fragile", emoji: "🥚" },
  { value: "medical", label: "Medical", emoji: "💊" },
  { value: "general_goods", label: "General", emoji: "📦" },
];

const PACKAGE_SIZES = [
  { value: "xs_envelope", label: "Envelope", desc: "A4 docs" },
  { value: "small_box", label: "Small", desc: "< 5 kg" },
  { value: "medium_box", label: "Medium", desc: "5-15 kg" },
  { value: "large_box", label: "Large", desc: "15-30 kg" },
  { value: "extra_large", label: "XL", desc: "> 30 kg" },
];

interface Props {
  value: ParcelDetails;
  onChange: (v: ParcelDetails) => void;
}

export function ParcelDetailsForm({ value, onChange }: Props) {
  const set = <K extends keyof ParcelDetails>(k: K, v: ParcelDetails[K]) =>
    onChange({ ...value, [k]: v });

  return (
    <div className="space-y-4">
      {/* Parcel type */}
      <div>
        <Label className="text-xs font-bold text-muted-foreground flex items-center gap-1 mb-2">
          <Package className="h-3.5 w-3.5" /> Parcel type
        </Label>
        <div className="grid grid-cols-4 gap-1.5">
          {PARCEL_TYPES.map(pt => (
            <button
              key={pt.value}
              type="button"
              onClick={() => set("parcelType", pt.value)}
              className={cn(
                "flex flex-col items-center gap-0.5 p-2 rounded-xl border-2 transition-all text-center",
                value.parcelType === pt.value
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border/30 bg-card text-muted-foreground"
              )}
            >
              <span className="text-base">{pt.emoji}</span>
              <span className="text-[9px] font-bold leading-tight">{pt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Package size */}
      <div>
        <Label className="text-xs font-bold text-muted-foreground mb-2 block">Package size</Label>
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {PACKAGE_SIZES.map(ps => (
            <button
              key={ps.value}
              type="button"
              onClick={() => set("packageSize", ps.value)}
              className={cn(
                "shrink-0 px-3 py-2 rounded-xl border-2 transition-all text-center min-w-[72px]",
                value.packageSize === ps.value
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border/30 bg-card text-muted-foreground"
              )}
            >
              <span className="text-[11px] font-bold block">{ps.label}</span>
              <span className="text-[9px] text-muted-foreground">{ps.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Weight + Quantity */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-[10px] font-semibold text-muted-foreground">Weight (kg)</Label>
          <Input
            type="number"
            placeholder="Optional"
            value={value.packageWeightKg}
            onChange={e => set("packageWeightKg", e.target.value)}
            className="bg-card border-border/40 rounded-xl h-10 text-sm"
          />
        </div>
        <div>
          <Label className="text-[10px] font-semibold text-muted-foreground">Quantity</Label>
          <Input
            type="number"
            min="1"
            value={value.packageCount}
            onChange={e => set("packageCount", e.target.value)}
            className="bg-card border-border/40 rounded-xl h-10 text-sm"
          />
        </div>
      </div>

      {/* Flags */}
      <div>
        <Label className="text-xs font-bold text-muted-foreground flex items-center gap-1 mb-2">
          <Shield className="h-3.5 w-3.5" /> Requirements
        </Label>
        <div className="flex flex-wrap gap-2">
          {([
            { key: "fragile" as const, label: "🥚 Fragile", val: value.fragile },
            { key: "requiresSignature" as const, label: "✍️ Signature", val: value.requiresSignature },
            { key: "requiresOtp" as const, label: "🔑 OTP", val: value.requiresOtp },
          ]).map(flag => (
            <button
              key={flag.key}
              type="button"
              onClick={() => set(flag.key, !flag.val)}
              className={cn(
                "px-3 py-1.5 rounded-full border-2 text-[11px] font-bold transition-all",
                flag.val
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/30 bg-card text-muted-foreground"
              )}
            >
              {flag.label}
            </button>
          ))}
        </div>
      </div>

      {/* Contacts */}
      <div>
        <Label className="text-xs font-bold text-muted-foreground flex items-center gap-1 mb-2">
          <Phone className="h-3.5 w-3.5" /> Contacts
        </Label>
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="Pickup name"
              value={value.pickupContactName}
              onChange={e => set("pickupContactName", e.target.value)}
              className="bg-card border-border/40 rounded-xl h-10 text-sm"
            />
            <Input
              placeholder="Pickup phone"
              value={value.pickupContactPhone}
              onChange={e => set("pickupContactPhone", e.target.value)}
              className="bg-card border-border/40 rounded-xl h-10 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="Dropoff name"
              value={value.dropoffContactName}
              onChange={e => set("dropoffContactName", e.target.value)}
              className="bg-card border-border/40 rounded-xl h-10 text-sm"
            />
            <Input
              placeholder="Dropoff phone"
              value={value.dropoffContactPhone}
              onChange={e => set("dropoffContactPhone", e.target.value)}
              className="bg-card border-border/40 rounded-xl h-10 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Declared value */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
            <DollarSign className="h-3 w-3" /> Declared value
          </Label>
          <Input
            type="number"
            placeholder="Optional"
            value={value.declaredValueAmount}
            onChange={e => set("declaredValueAmount", e.target.value)}
            className="bg-card border-border/40 rounded-xl h-10 text-sm"
          />
        </div>
        <div>
          <Label className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
            <FileText className="h-3 w-3" /> Instructions
          </Label>
          <Input
            placeholder="Special notes"
            value={value.specialInstructions}
            onChange={e => set("specialInstructions", e.target.value)}
            className="bg-card border-border/40 rounded-xl h-10 text-sm"
          />
        </div>
      </div>
    </div>
  );
}
