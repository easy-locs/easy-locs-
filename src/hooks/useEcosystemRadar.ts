/**
 * useEcosystemRadar — Unified data hook for the Living Ecosystem Map.
 * Aggregates: agents, technicians, deliveries, visits, interventions,
 * available properties, properties with release dates, scheduled visits,
 * properties being renovated, and marketplace services.
 *
 * All entities are normalized into EcosystemEntity for uniform rendering.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { haversineKm } from "@/lib/geo-distance";
import { platformBus } from "@/lib/shared/platform-bus";

// ─── Entity Model ──────────────────────────────────────────

export type EcosystemCategory =
  | "agent"
  | "technician"
  | "delivery"
  | "visit"
  | "intervention"
  | "available_property"
  | "releasing_soon"
  | "scheduled_visit"
  | "renovation"
  | "back_on_market"
  | "service"
  | "concierge"
  | "person";

export interface EcosystemEntity {
  id: string;
  category: EcosystemCategory;
  title: string;
  subtitle?: string;
  photo?: string | null;
  lat: number;
  lng: number;
  distance_km: number;
  status?: string;
  price?: number;
  currency?: string;
  online?: boolean;
  verified?: boolean;
  meta?: Record<string, any>;
}

export type EcosystemFilter = "all" | EcosystemCategory;

export const ECOSYSTEM_CATEGORIES: {
  id: EcosystemFilter;
  label: string;
  emoji: string;
  color: string;
}[] = [
  { id: "all",               label: "All",             emoji: "🌐", color: "var(--hud-cyan)" },
  { id: "agent",             label: "Agents",          emoji: "🧑‍💼", color: "var(--hud-purple)" },
  { id: "technician",        label: "Technicians",     emoji: "🔧", color: "var(--hud-warning)" },
  { id: "delivery",          label: "Deliveries",      emoji: "📦", color: "var(--hud-success)" },
  { id: "visit",             label: "Visits",          emoji: "🏠", color: "var(--hud-cyan)" },
  { id: "intervention",      label: "Interventions",   emoji: "🛠️", color: "var(--hud-danger)" },
  { id: "available_property",label: "Available",       emoji: "✅", color: "var(--hud-success)" },
  { id: "releasing_soon",    label: "Releasing soon",  emoji: "📅", color: "var(--hud-warning)" },
  { id: "scheduled_visit",   label: "Visits planned",  emoji: "🗓️", color: "var(--hud-purple)" },
  { id: "renovation",        label: "Renovation",      emoji: "🏗️", color: "var(--hud-warning)" },
  { id: "back_on_market",    label: "Back on market",  emoji: "🔄", color: "var(--hud-success)" },
  { id: "service",           label: "Services",        emoji: "💼", color: "var(--hud-cyan)" },
  { id: "concierge",         label: "Concierge",       emoji: "🛎️", color: "var(--hud-purple)" },
  { id: "person",            label: "People",          emoji: "👤", color: "var(--hud-text-dim)" },
];

interface UseEcosystemRadarOptions {
  lat: number | null;
  lng: number | null;
  radius: number;
  userId?: string;
  filter: EcosystemFilter;
  search: string;
  onlyAvailable?: boolean;
  onlyVerified?: boolean;
}

export function useEcosystemRadar({
  lat, lng, radius, userId, filter, search, onlyAvailable, onlyVerified,
}: UseEcosystemRadarOptions) {
  const [entities, setEntities] = useState<EcosystemEntity[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const scanTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const scan = useCallback(async () => {
    if (!lat || !lng) return;
    setLoading(true);
    setScanning(true);

    const all: EcosystemEntity[] = [];

    try {
      // ── 1. Marketplace items (services, listings, concierge) via RPC ──
      const wantItems = filter === "all" || ["service", "concierge", "available_property", "back_on_market"].includes(filter);
      if (wantItems) {
        const { data: items } = await supabase.rpc("search_nearby_items", {
          _lat: lat, _lng: lng, _radius_km: radius, _item_type: null,
        });
        if (items) {
          (items as any[]).forEach(item => {
            const cat: EcosystemCategory =
              item.item_type === "real_estate" ? "available_property" :
              item.item_type === "concierge" ? "concierge" : "service";
            all.push({
              id: item.item_id,
              category: cat,
              title: item.title,
              subtitle: item.provider_name || item.category,
              photo: item.photo_url,
              lat: item.lat, lng: item.lng,
              distance_km: item.distance_km,
              price: item.price, currency: item.currency,
              status: item.status,
              meta: { item_type: item.item_type, category: item.category },
            });
          });
        }
      }

      // ── 2. People from user_presence ──
      const wantPeople = filter === "all" || ["agent", "technician", "person", "delivery"].includes(filter);
      if (wantPeople) {
        const q = supabase
          .from("user_presence")
          .select("user_id, display_name, avatar_url, status, professional_category, verified, lat, lng")
          .eq("visible_on_nearby", true)
          .eq("location_sharing", true)
          .not("lat", "is", null)
          .not("lng", "is", null);

        if (userId) q.neq("user_id", userId);

        const { data: users } = await q;
        if (users) {
          (users as any[]).forEach(u => {
            const dist = haversineKm(lat, lng, u.lat, u.lng);
            if (dist > radius) return;

            // Classify by professional_category
            const proCategory = (u.professional_category || "").toLowerCase();
            let cat: EcosystemCategory = "person";
            if (proCategory.includes("agent") || proCategory.includes("real estate")) cat = "agent";
            else if (proCategory.includes("electric") || proCategory.includes("plumb") || proCategory.includes("tech") || proCategory.includes("maintenance")) cat = "technician";
            else if (proCategory.includes("deliver") || proCategory.includes("courier")) cat = "delivery";
            else if (proCategory) cat = "agent"; // default pros to agent

            all.push({
              id: u.user_id,
              category: cat,
              title: u.display_name || "User",
              subtitle: u.professional_category || undefined,
              photo: u.avatar_url,
              lat: u.lat, lng: u.lng,
              distance_km: dist,
              verified: u.verified,
              online: u.status === "online",
              status: u.status,
            });
          });
        }
      }

      // ── 3. Live trackings (interventions, visits, deliveries in progress) ──
      const wantTracking = filter === "all" || ["visit", "intervention", "delivery"].includes(filter);
      if (wantTracking) {
        const { data: trackings } = await supabase
          .from("live_trackings")
          .select("id, context_type, context_id, context_label, current_lat, current_lng, status, tracker_user_id, heading")
          .in("status", ["active", "en_route", "nearby"])
          .not("current_lat", "is", null)
          .not("current_lng", "is", null);

        if (trackings) {
          (trackings as any[]).forEach(t => {
            const tLat = t.current_lat;
            const tLng = t.current_lng;
            if (!tLat || !tLng) return;
            const dist = haversineKm(lat, lng, tLat, tLng);
            if (dist > radius) return;
            let cat: EcosystemCategory =
              t.context_type === "visit" ? "visit" :
              t.context_type === "intervention" ? "intervention" :
              t.context_type === "delivery" ? "delivery" : "intervention";
            all.push({
              id: t.id,
              category: cat,
              title: t.context_label || `${t.context_type} in progress`,
              subtitle: `${t.status}`,
              lat: tLat, lng: tLng,
              distance_km: dist,
              status: t.status,
              meta: { context_type: t.context_type, context_id: t.context_id, heading: t.heading },
            });
          });
        }
      }

      // ── 4. Properties with upcoming lease end (releasing_soon) ──
      const wantReleasing = filter === "all" || filter === "releasing_soon";
      if (wantReleasing) {
        const threeMonths = new Date();
        threeMonths.setMonth(threeMonths.getMonth() + 3);
        const { data: leases } = await supabase
          .from("leases")
          .select("id, property_id, end_date, properties(label, city, country, photo_urls)")
          .lte("end_date", threeMonths.toISOString().split("T")[0])
          .gte("end_date", new Date().toISOString().split("T")[0])
          .eq("status", "active")
          .limit(50);

        if (leases) {
          (leases as any[]).forEach(l => {
            const p = l.properties;
            if (!p) return;
            const photos = Array.isArray(p.photo_urls) ? p.photo_urls : [];
            all.push({
              id: l.id,
              category: "releasing_soon",
              title: p.label || "Property",
              subtitle: `Free ${l.end_date} · ${p.city || ""}`,
              photo: photos[0] || null,
              lat: 0, lng: 0,
              distance_km: 0,
              meta: { property_id: l.property_id, end_date: l.end_date, city: p.city, no_geo: true },
            });
          });
        }
      }

      // ── 5. Booking tasks (interventions / scheduled visits) ──
      const wantTasks = filter === "all" || filter === "scheduled_visit" || filter === "renovation";
      if (wantTasks) {
        const { data: tasks } = await supabase
          .from("booking_tasks")
          .select("id, title, task_type, status, scheduled_at, property_id, properties(label, city, photo_urls)")
          .in("status", ["pending", "in_progress"])
          .limit(50);

        if (tasks) {
          (tasks as any[]).forEach(t => {
            const p = (t as any).properties;
            const cat: EcosystemCategory =
              t.task_type === "inspection" || t.task_type === "visit" ? "scheduled_visit" :
              t.task_type === "maintenance" || t.task_type === "renovation" ? "renovation" : "intervention";
            const photos = p && Array.isArray(p.photo_urls) ? p.photo_urls : [];
            all.push({
              id: t.id,
              category: cat,
              title: t.title,
              subtitle: `${t.status} · ${p?.label || ""}`,
              photo: photos[0] || null,
              lat: 0, lng: 0,
              distance_km: 0,
              status: t.status,
              meta: { task_type: t.task_type, scheduled_at: t.scheduled_at, no_geo: true },
            });
          });
        }
      }

      // Sort by distance
      all.sort((a, b) => a.distance_km - b.distance_km);

      // Apply category filter
      let result = filter === "all" ? all : all.filter(e => e.category === filter);

      // Apply search
      if (search) {
        const q = search.toLowerCase();
        result = result.filter(e =>
          e.title.toLowerCase().includes(q) ||
          (e.subtitle || "").toLowerCase().includes(q) ||
          e.category.includes(q)
        );
      }

      // Apply toggles
      if (onlyAvailable) result = result.filter(e => e.online || e.status === "active" || e.status === "available");
      if (onlyVerified) result = result.filter(e => e.verified);

      setEntities(result);
    } catch (err) {
      console.error("[Ecosystem] Scan failed:", err);
    }

    setLoading(false);
    if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
    scanTimerRef.current = setTimeout(() => setScanning(false), 1400);
  }, [lat, lng, radius, userId, filter, search, onlyAvailable, onlyVerified]);

  // Auto-scan + polling
  useEffect(() => {
    if (!lat || !lng) return;
    scan();
    const poll = setInterval(scan, 12000);
    return () => clearInterval(poll);
  }, [scan]);

  // Realtime sync via Supabase channels
  useEffect(() => {
    if (!lat || !lng) return;
    const channel = supabase
      .channel("ecosystem-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "marketplace_services" }, () => scan())
      .on("postgres_changes", { event: "*", schema: "public", table: "user_presence" }, () => scan())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [lat, lng, scan]);

  // Platform bus reactions
  useEffect(() => {
    const unsub1 = platformBus.on("marketplace:booking_confirmed", () => scan());
    const unsub2 = platformBus.on("tracking:position_updated", () => scan());
    return () => { unsub1(); unsub2(); };
  }, [scan]);

  // Category counts
  const counts = entities.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + 1;
    return acc;
  }, {});

  return { entities, loading, scanning, scan, counts };
}
