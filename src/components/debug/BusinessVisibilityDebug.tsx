/**
 * BusinessVisibilityDebug — Debug panel showing business data pipeline health.
 * Shows DB counts vs rendered counts to detect missing connections.
 */
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useGeoEntities } from "@/hooks/useGeoEntities";
import { Bug, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface DbCounts {
  storefronts_total: number;
  storefronts_active: number;
  storefronts_with_geo: number;
  marketplace_total: number;
  marketplace_active: number;
  properties_total: number;
  properties_with_geo: number;
  public_listings_active: number;
}

export default function BusinessVisibilityDebug() {
  const [open, setOpen] = useState(false);
  const [counts, setCounts] = useState<DbCounts | null>(null);
  const [loading, setLoading] = useState(false);
  const { entities, storefronts, properties, services, realEstate } = useGeoEntities();

  const refresh = async () => {
    setLoading(true);
    const [sf, sfActive, sfGeo, mp, mpActive, prop, propGeo, pl] = await Promise.all([
      (supabase as any).from("storefront_pages").select("id", { count: "exact", head: true }),
      (supabase as any).from("storefront_pages").select("id", { count: "exact", head: true }).eq("active", true),
      (supabase as any).from("storefront_pages").select("id", { count: "exact", head: true }).eq("active", true).not("latitude", "is", null),
      (supabase as any).from("marketplace_services").select("id", { count: "exact", head: true }),
      (supabase as any).from("marketplace_services").select("id", { count: "exact", head: true }).eq("active", true),
      (supabase as any).from("properties").select("id", { count: "exact", head: true }),
      (supabase as any).from("properties").select("id", { count: "exact", head: true }).not("latitude", "is", null),
      (supabase as any).from("public_listings").select("id", { count: "exact", head: true }).eq("active", true),
    ]);
    setCounts({
      storefronts_total: sf.count ?? 0,
      storefronts_active: sfActive.count ?? 0,
      storefronts_with_geo: sfGeo.count ?? 0,
      marketplace_total: mp.count ?? 0,
      marketplace_active: mpActive.count ?? 0,
      properties_total: prop.count ?? 0,
      properties_with_geo: propGeo.count ?? 0,
      public_listings_active: pl.count ?? 0,
    });
    setLoading(false);
  };

  useEffect(() => {
    if (open && !counts) refresh();
  }, [open]);

  return (
    <div className="fixed bottom-20 right-3 z-50">
      <button
        onClick={() => setOpen(!open)}
        className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg active:scale-95 transition-transform"
        style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border) / 0.3)" }}
      >
        <Bug className="w-4 h-4" style={{ color: "hsl(var(--primary))" }} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            className="absolute bottom-12 right-0 w-72 rounded-2xl border shadow-xl p-4 space-y-3"
            style={{ background: "hsl(var(--card))", borderColor: "hsl(var(--border) / 0.3)" }}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-foreground">Business Visibility Debug</h3>
              <button onClick={refresh} disabled={loading} className="p-1 rounded-lg hover:bg-muted transition-colors">
                <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>

            {counts && (
              <div className="space-y-2 text-[11px]">
                <Section title="Storefronts (DB)">
                  <Row label="Total" value={counts.storefronts_total} />
                  <Row label="Active" value={counts.storefronts_active} warn={counts.storefronts_active === 0} />
                  <Row label="With GPS" value={counts.storefronts_with_geo} warn={counts.storefronts_with_geo === 0 && counts.storefronts_active > 0} />
                </Section>
                <Section title="Marketplace Services (DB)">
                  <Row label="Total" value={counts.marketplace_total} />
                  <Row label="Active" value={counts.marketplace_active} />
                </Section>
                <Section title="Properties (DB)">
                  <Row label="Total" value={counts.properties_total} />
                  <Row label="With GPS" value={counts.properties_with_geo} />
                  <Row label="Public Listings" value={counts.public_listings_active} />
                </Section>
                <div className="border-t pt-2" style={{ borderColor: "hsl(var(--border) / 0.2)" }}>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Rendered (useGeoEntities)</p>
                  <Row label="Storefronts" value={storefronts.length} />
                  <Row label="Properties" value={properties.length} />
                  <Row label="Services" value={services.length} />
                  <Row label="Real Estate" value={realEstate.length} />
                  <Row label="Total Entities" value={entities.length} highlight />
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">{title}</p>
      {children}
    </div>
  );
}

function Row({ label, value, warn, highlight }: { label: string; value: number; warn?: boolean; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-bold tabular-nums ${warn ? "text-destructive" : highlight ? "text-primary" : "text-foreground"}`}>
        {value}
      </span>
    </div>
  );
}
