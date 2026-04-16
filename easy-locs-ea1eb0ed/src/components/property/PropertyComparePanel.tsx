import { useState } from "react";
import { X, GitCompareArrows, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Property } from "@/domains/real-estate/canonical-types";

interface Props {
  properties: Property[];
  onClose: () => void;
  onRemove: (id: string) => void;
}

function getImage(p: Property): string {
  return (p.mediaIds || []).find(id => id.startsWith("http") || id.startsWith("/")) ?? "";
}

function formatPrice(p: Property): string {
  const isRent = p.listingType === "rent" || p.listingType === "lease";
  if (p.price > 0) {
    return `${p.currency} ${p.price.toLocaleString()}${isRent ? "/mo" : ""}`;
  }
  return "N/A";
}

function formatPriceShort(p: Property): string {
  const isRent = p.listingType === "rent" || p.listingType === "lease";
  if (p.price >= 1_000_000) return `${p.currency} ${(p.price / 1_000_000).toFixed(1)}M`;
  if (p.price > 0) return `${p.currency} ${p.price.toLocaleString()}${isRent ? "/mo" : ""}`;
  return "";
}

export function PropertyComparePanel({ properties, onClose, onRemove }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (properties.length < 2) return null;

  const rows: { label: string; values: string[] }[] = [
    { label: "Price", values: properties.map(formatPrice) },
    { label: "Type", values: properties.map(p => p.propertyType.replace(/_/g, " ")) },
    { label: "Area", values: properties.map(p => p.address.district || p.address.city) },
    { label: "Bedrooms", values: properties.map(p => String(p.bedrooms ?? 0)) },
    { label: "Bathrooms", values: properties.map(p => String(p.bathrooms ?? 0)) },
    { label: "Size", values: properties.map(p => p.area && p.area > 0 ? `${p.area.toLocaleString()} ${p.areaUnit}` : "N/A") },
    {
      label: "Price/unit",
      values: properties.map(p => {
        return p.area && p.area > 0 ? `${p.currency} ${Math.round(p.price / p.area).toLocaleString()}/${p.areaUnit}` : "N/A";
      }),
    },
    { label: "Furnished", values: properties.map(p => p.furnishingStatus ? p.furnishingStatus.replace("_", " ") : "N/A") },
    {
      label: "Amenities",
      values: properties.map(p =>
        p.amenities && p.amenities.length > 0
          ? p.amenities.slice(0, 5).join(", ") + (p.amenities.length > 5 ? ` +${p.amenities.length - 5}` : "")
          : "N/A"
      ),
    },
    { label: "Location", values: properties.map(p => `${p.address.city}, ${p.address.country}`) },
  ];

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className="fixed bottom-0 left-0 right-0 z-40"
      style={{
        maxHeight: expanded ? "80vh" : "auto",
        background: "hsl(var(--card))",
        borderTop: "1px solid hsl(var(--border))",
        boxShadow: "0 -4px 24px hsla(0,0%,0%,0.15)",
        borderRadius: "16px 16px 0 0",
      }}
    >
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitCompareArrows className="h-4 w-4" style={{ color: "hsl(var(--primary))" }} />
          <span className="text-sm font-bold text-foreground">Compare ({properties.length})</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setExpanded(!expanded)} className="p-1.5 rounded-lg hover:bg-muted/30">
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted/30">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {!expanded && (
        <div className="px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-none">
          {properties.map(p => (
            <div key={p.id} className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border" style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--muted) / 0.3)" }}>
              {getImage(p) && <img loading="lazy" src={getImage(p)} alt={p.title} className="w-10 h-8 rounded-lg object-cover" />}
              <div className="min-w-0">
                <p className="text-[0.6875rem] font-bold text-foreground truncate max-w-[120px]">{p.title}</p>
                <p className="text-[0.625rem] text-muted-foreground">{formatPriceShort(p)}</p>
              </div>
              <button onClick={() => onRemove(p.id)} className="shrink-0 ml-1">
                <X className="h-3 w-3 text-muted-foreground" />
              </button>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-auto px-4 pb-4"
            style={{ maxHeight: "70vh" }}
          >
            <div className="grid gap-0" style={{ gridTemplateColumns: `100px repeat(${properties.length}, 1fr)` }}>
              <div className="p-2" />
              {properties.map(p => (
                <div key={p.id} className="p-2 text-center">
                  {getImage(p) && <img loading="lazy" src={getImage(p)} alt={p.title} className="w-full h-20 rounded-xl object-cover mb-2" />}
                  <p className="text-[0.6875rem] font-bold text-foreground line-clamp-2">{p.title}</p>
                  <button onClick={() => onRemove(p.id)} className="mt-1 text-[0.625rem] text-destructive font-medium">Remove</button>
                </div>
              ))}

              {rows.map((row) => (
                <>
                  <div key={`label-${row.label}`} className="p-2 text-[0.625rem] font-semibold text-muted-foreground uppercase tracking-wider border-t" style={{ borderColor: "hsl(var(--border) / 0.3)" }}>
                    {row.label}
                  </div>
                  {row.values.map((val, i) => (
                    <div key={`${row.label}-${i}`} className="p-2 text-xs font-medium text-foreground text-center border-t capitalize" style={{ borderColor: "hsl(var(--border) / 0.3)" }}>
                      {val}
                    </div>
                  ))}
                </>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
