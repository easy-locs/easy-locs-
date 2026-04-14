import { enqueueDashboardCardUpsert } from "@/lib/runtime/runtime-rpc-client";

export type CardStatus = "ok" | "warning" | "error" | "loading" | "empty" | "stale";

export interface DashboardCard {
  cardId: string;
  cardType: string;
  domain: string;
  title: string;
  value: Record<string, unknown>;
  status: CardStatus;
  freshnessTtlS: number;
  lastComputedAt: number;
  ownerQuery?: string;
  errorPolicy: "show_stale" | "show_error" | "show_empty";
}

export interface ReadModelConfig {
  cardId: string;
  cardType: string;
  domain: string;
  title: string;
  freshnessTtlS: number;
  ownerQuery?: string;
  errorPolicy?: "show_stale" | "show_error" | "show_empty";
  compute: (supabaseClient: any) => Promise<Record<string, unknown>>;
}

const localCards = new Map<string, DashboardCard>();
const readModelConfigs = new Map<string, ReadModelConfig>();

export function registerReadModel(config: ReadModelConfig): void {
  readModelConfigs.set(config.cardId, config);
}

export async function refreshReadModel(
  cardId: string,
  supabaseClient: any,
): Promise<DashboardCard | null> {
  const config = readModelConfigs.get(cardId);
  if (!config) return null;

  const card: DashboardCard = {
    cardId: config.cardId,
    cardType: config.cardType,
    domain: config.domain,
    title: config.title,
    value: {},
    status: "loading",
    freshnessTtlS: config.freshnessTtlS,
    lastComputedAt: Date.now(),
    ownerQuery: config.ownerQuery,
    errorPolicy: config.errorPolicy ?? "show_stale",
  };

  try {
    const value = await config.compute(supabaseClient);

    if (!value || (typeof value === "object" && Object.keys(value).length === 0)) {
      card.status = "empty";
      card.value = {};
    } else {
      card.status = "ok";
      card.value = value;
    }

    card.lastComputedAt = Date.now();
    localCards.set(cardId, card);

    enqueueDashboardCardUpsert({
      cardId: config.cardId,
      cardType: config.cardType,
      domain: config.domain,
      title: config.title,
      value: card.value,
      status: card.status,
      freshnessTtl: config.freshnessTtlS,
      ownerQuery: config.ownerQuery,
    });

    return card;
  } catch (err: any) {
    const existing = localCards.get(cardId);
    if (existing && card.errorPolicy === "show_stale") {
      existing.status = "stale";
      return existing;
    }

    card.status = "error";
    card.value = { error: err?.message ?? String(err) };
    localCards.set(cardId, card);
    return card;
  }
}

export async function refreshAllReadModels(supabaseClient: any): Promise<DashboardCard[]> {
  const results: DashboardCard[] = [];
  for (const [cardId] of readModelConfigs) {
    const card = await refreshReadModel(cardId, supabaseClient);
    if (card) results.push(card);
  }
  return results;
}

export async function loadCardsFromServer(supabaseClient: any): Promise<DashboardCard[]> {
  try {
    const { data, error } = await supabaseClient
      .from("read_model_dashboard_cards")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error || !data) return [];

    const cards: DashboardCard[] = [];
    for (const row of data) {
      const card: DashboardCard = {
        cardId: row.card_id,
        cardType: row.card_type,
        domain: row.domain,
        title: row.title,
        value: row.value ?? {},
        status: row.status as CardStatus,
        freshnessTtlS: row.freshness_ttl_s,
        lastComputedAt: new Date(row.last_computed_at).getTime(),
        ownerQuery: row.owner_query,
        errorPolicy: row.error_policy ?? "show_stale",
      };

      const ageS = (Date.now() - card.lastComputedAt) / 1000;
      if (ageS > card.freshnessTtlS && card.status === "ok") {
        card.status = "stale";
      }

      localCards.set(card.cardId, card);
      cards.push(card);
    }
    return cards;
  } catch {
    return [];
  }
}

export function getCard(cardId: string): DashboardCard | undefined {
  return localCards.get(cardId);
}

export function getCardsByDomain(domain: string): DashboardCard[] {
  return Array.from(localCards.values()).filter(c => c.domain === domain);
}

export function getCardsByType(cardType: string): DashboardCard[] {
  return Array.from(localCards.values()).filter(c => c.cardType === cardType);
}

export function getAllCards(): DashboardCard[] {
  return Array.from(localCards.values());
}

export function isCardFresh(cardId: string): boolean {
  const card = localCards.get(cardId);
  if (!card) return false;
  const ageS = (Date.now() - card.lastComputedAt) / 1000;
  return ageS <= card.freshnessTtlS;
}

export function getCardsSummary(): {
  total: number;
  byStatus: Record<CardStatus, number>;
  staleCount: number;
} {
  const byStatus: Record<CardStatus, number> = {
    ok: 0, warning: 0, error: 0, loading: 0, empty: 0, stale: 0,
  };
  let staleCount = 0;

  for (const card of localCards.values()) {
    byStatus[card.status] = (byStatus[card.status] ?? 0) + 1;
    if (!isCardFresh(card.cardId)) staleCount++;
  }

  return { total: localCards.size, byStatus, staleCount };
}

export function registerDefaultReadModels(): void {
  registerReadModel({
    cardId: "menu_unread_count",
    cardType: "badge",
    domain: "orbit",
    title: "Unread Messages",
    freshnessTtlS: 60,
    ownerQuery: "SELECT count(*) FROM messages WHERE read_at IS NULL AND recipient_id = auth.uid()",
    compute: async (sb) => {
      const { count } = await sb.from("messages").select("id", { count: "exact", head: true }).is("read_at", null);
      return { count: count ?? 0 };
    },
  });

  registerReadModel({
    cardId: "engine_health_summary",
    cardType: "health",
    domain: "admin",
    title: "Engine Health",
    freshnessTtlS: 120,
    compute: async (sb) => {
      const { data } = await sb.from("engine_supervisor").select("engine_name, status, consecutive_failures").limit(50);
      const engines = data ?? [];
      return {
        total: engines.length,
        healthy: engines.filter((e: any) => e.status === "ok").length,
        error: engines.filter((e: any) => e.status === "error").length,
        stale: engines.filter((e: any) => e.status === "stale" || e.status === "warning").length,
      };
    },
  });

  registerReadModel({
    cardId: "queue_depth_summary",
    cardType: "counter",
    domain: "admin",
    title: "Queue Depth",
    freshnessTtlS: 60,
    compute: async (sb) => {
      const { count: pending } = await sb.from("job_queue").select("id", { count: "exact", head: true }).eq("status", "pending");
      const { count: processing } = await sb.from("job_queue").select("id", { count: "exact", head: true }).eq("status", "processing");
      const { count: dlqPending } = await sb.from("dead_letter_queue").select("id", { count: "exact", head: true }).in("status", ["pending", "retrying"]);
      return { pending: pending ?? 0, processing: processing ?? 0, dlq_pending: dlqPending ?? 0 };
    },
  });

  registerReadModel({
    cardId: "booking_active_count",
    cardType: "counter",
    domain: "booking",
    title: "Active Bookings",
    freshnessTtlS: 300,
    compute: async (sb) => {
      const { count } = await sb.from("bookings").select("id", { count: "exact", head: true }).in("status", ["confirmed", "in_progress"]);
      return { count: count ?? 0 };
    },
  });

  registerReadModel({
    cardId: "kill_switch_summary",
    cardType: "health",
    domain: "admin",
    title: "Kill Switches",
    freshnessTtlS: 120,
    compute: async (sb) => {
      const { data } = await sb.from("kill_switches_server").select("feature, enabled, domain");
      const switches = data ?? [];
      return {
        total: switches.length,
        enabled: switches.filter((s: any) => s.enabled).length,
        disabled: switches.filter((s: any) => !s.enabled).length,
      };
    },
  });

  registerReadModel({
    cardId: "domain_degradation_summary",
    cardType: "health",
    domain: "admin",
    title: "Domain Modes",
    freshnessTtlS: 60,
    compute: async (sb) => {
      const { data } = await sb.from("domain_degradation_modes").select("domain, mode");
      const modes = data ?? [];
      return {
        total: modes.length,
        normal: modes.filter((m: any) => m.mode === "normal").length,
        degraded: modes.filter((m: any) => m.mode !== "normal").length,
        degradedDomains: modes.filter((m: any) => m.mode !== "normal").map((m: any) => ({ domain: m.domain, mode: m.mode })),
      };
    },
  });
}
