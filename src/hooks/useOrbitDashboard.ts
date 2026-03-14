/**
 * useOrbitDashboard — Aggregates cockpit data via parallel queries.
 * Phase 5 Step 1: Smart Actions signals.
 */
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOrgRole } from "@/hooks/useOrgRole";

export interface SmartAction {
  id: string;
  icon: string;
  label: string;
  description: string;
  link: string;
  priority: number;
  type: "urgent" | "action" | "info";
}

interface DashboardData {
  smartActions: SmartAction[];
  loading: boolean;
}

/** Safe query helper — returns 0 on failure */
async function safeCount(
  table: string,
  build: (q: any) => any
): Promise<number> {
  try {
    const q = build(
      (supabase as any).from(table).select("id", { count: "exact", head: true })
    );
    const { count } = await q;
    return count ?? 0;
  } catch {
    return 0;
  }
}

export function useOrbitDashboard(): DashboardData {
  const { user, orgId } = useAuth();
  const { role } = useOrgRole();
  const [signals, setSignals] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    async function fetchSignals() {
      setLoading(true);
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const today = new Date().toISOString().slice(0, 10);

      const queries: Promise<[string, number]>[] = [];

      // Unpaid rents this month (landlord)
      if (orgId) {
        const currentMonth = new Date().toISOString().slice(0, 7);
        queries.push(
          safeCount("rent_records", (q: any) =>
            q.eq("org_id", orgId).eq("month", currentMonth).eq("paid", false)
          ).then((v) => ["unpaidRents", v] as [string, number])
        );
      }

      // Pending booking requests
      if (orgId) {
        queries.push(
          safeCount("booking_requests", (q: any) =>
            q.eq("org_id", orgId).eq("status", "pending")
          ).then((v) => ["pendingBookings", v] as [string, number])
        );
      }

      // Unread messages
      queries.push(
        safeCount("messages", (q: any) => {
          let query = q.eq("read", false).neq("sender_id", user!.id);
          if (orgId) query = query.eq("org_id", orgId);
          return query;
        }).then((v) => ["unreadMessages", v] as [string, number])
      );

      // New leads (inquiry deal rooms, last 7 days)
      if (orgId) {
        queries.push(
          safeCount("deal_rooms", (q: any) =>
            q.eq("org_id", orgId).eq("status", "inquiry").gt("created_at", weekAgo)
          ).then((v) => ["newLeads", v] as [string, number])
        );
      }

      // Pending concierge orders
      if (orgId) {
        queries.push(
          safeCount("concierge_orders", (q: any) =>
            q.eq("org_id", orgId).eq("status", "pending")
          ).then((v) => ["pendingOrders", v] as [string, number])
        );
      }

      // Pending interventions
      if (orgId) {
        queries.push(
          safeCount("interventions", (q: any) =>
            q.eq("org_id", orgId).in("status", ["pending", "scheduled"])
          ).then((v) => ["pendingInterventions", v] as [string, number])
        );
      }

      // Today's check-ins (booking requests with check_in = today)
      if (orgId) {
        queries.push(
          safeCount("booking_requests", (q: any) =>
            q.eq("org_id", orgId).eq("check_in", today).eq("status", "confirmed")
          ).then((v) => ["todayCheckIns", v] as [string, number])
        );
      }

      // Today's check-outs
      if (orgId) {
        queries.push(
          safeCount("booking_requests", (q: any) =>
            q.eq("org_id", orgId).eq("check_out", today).eq("status", "confirmed")
          ).then((v) => ["todayCheckOuts", v] as [string, number])
        );
      }

      // Unread notifications
      queries.push(
        safeCount("notifications", (q: any) =>
          q.eq("user_id", user!.id).eq("read", false)
        ).then((v) => ["unreadNotifs", v] as [string, number])
      );

      // Missed calls (last 7 days)
      queries.push(
        safeCount("call_logs", (q: any) => {
          let query = q.eq("status", "missed").gt("created_at", weekAgo).neq("caller_id", user!.id);
          if (orgId) query = query.eq("callee_org_id", orgId);
          return query;
        }).then((v) => ["missedCalls", v] as [string, number])
      );

      const results = await Promise.all(queries);
      if (!cancelled) {
        const map: Record<string, number> = {};
        for (const [key, val] of results) map[key] = val;
        setSignals(map);
        setLoading(false);
      }
    }

    fetchSignals();
    return () => { cancelled = true; };
  }, [user?.id, orgId]);

  const smartActions = useMemo(() => {
    const actions: SmartAction[] = [];
    const s = signals;
    const isLandlord = role === "owner" || role === "admin" || role === "agent";

    // ── Urgent actions ──
    if (isLandlord && (s.unpaidRents ?? 0) > 0) {
      const n = s.unpaidRents!;
      actions.push({
        id: "unpaid-rents",
        icon: "💸",
        label: `${n} loyer${n > 1 ? "s" : ""} impayé${n > 1 ? "s" : ""}`,
        description: "Relancer ou enregistrer les paiements",
        link: "/dashboard/rental?tab=payments",
        priority: 1,
        type: "urgent",
      });
    }

    if (isLandlord && (s.pendingBookings ?? 0) > 0) {
      const n = s.pendingBookings!;
      actions.push({
        id: "confirm-bookings",
        icon: "📩",
        label: `${n} réservation${n > 1 ? "s" : ""} à confirmer`,
        description: "Répondre aux demandes en attente",
        link: "/dashboard/seasonal",
        priority: 2,
        type: "urgent",
      });
    }

    if (isLandlord && (s.newLeads ?? 0) > 0) {
      const n = s.newLeads!;
      actions.push({
        id: "respond-leads",
        icon: "🔥",
        label: `${n} prospect${n > 1 ? "s" : ""} sans réponse`,
        description: "Répondre pour convertir",
        link: "/dashboard/communication",
        priority: 3,
        type: "action",
      });
    }

    if (isLandlord && (s.pendingOrders ?? 0) > 0) {
      const n = s.pendingOrders!;
      actions.push({
        id: "process-orders",
        icon: "🎯",
        label: `${n} commande${n > 1 ? "s" : ""} à traiter`,
        description: "Confirmer les commandes conciergerie",
        link: "/dashboard/activities",
        priority: 4,
        type: "action",
      });
    }

    if ((s.unreadMessages ?? 0) > 5) {
      const n = s.unreadMessages!;
      actions.push({
        id: "read-messages",
        icon: "💬",
        label: `${n} messages non lus`,
        description: "Consulter vos conversations",
        link: "/dashboard/communication",
        priority: 5,
        type: "info",
      });
    }

    if (isLandlord && (s.pendingInterventions ?? 0) > 0) {
      const n = s.pendingInterventions!;
      actions.push({
        id: "handle-interventions",
        icon: "🔧",
        label: `${n} intervention${n > 1 ? "s" : ""} en cours`,
        description: "Suivre les travaux planifiés",
        link: "/dashboard/rental?tab=interventions",
        priority: 6,
        type: "info",
      });
    }

    // ── Missed calls ──
    if ((s.missedCalls ?? 0) > 0) {
      const n = s.missedCalls!;
      actions.push({
        id: "missed-calls",
        icon: "📞",
        label: `${n} appel${n > 1 ? "s" : ""} manqué${n > 1 ? "s" : ""}`,
        description: "Rappeler ou consulter l'historique",
        link: "/dashboard/communication?section=calls",
        priority: 4,
        type: "urgent",
      });
    }

    // ── Today's events ──
    if (isLandlord && (s.todayCheckIns ?? 0) > 0) {
      const n = s.todayCheckIns!;
      actions.push({
        id: "today-checkins",
        icon: "🏠",
        label: `${n} check-in${n > 1 ? "s" : ""} aujourd'hui`,
        description: "Préparer les arrivées",
        link: "/dashboard/seasonal",
        priority: 7,
        type: "info",
      });
    }

    if (isLandlord && (s.todayCheckOuts ?? 0) > 0) {
      const n = s.todayCheckOuts!;
      actions.push({
        id: "today-checkouts",
        icon: "🚪",
        label: `${n} check-out${n > 1 ? "s" : ""} aujourd'hui`,
        description: "Planifier le ménage",
        link: "/dashboard/seasonal",
        priority: 8,
        type: "info",
      });
    }

    actions.sort((a, b) => a.priority - b.priority);
    return actions.slice(0, 5); // Max 5 visible
  }, [signals, role]);

  return { smartActions, loading };
}
