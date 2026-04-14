import { db } from "@/services/db";

export async function recordCost(params: {
  agent_name: string;
  tokens_input: number;
  tokens_output: number;
  cost_usd: number;
  model_name?: string;
}): Promise<void> {
  const today = new Date().toISOString().split("T")[0];
  const totalTokens = params.tokens_input + params.tokens_output;

  const { data: existing } = await db("cost_tracking")
    .select("*")
    .eq("agent_name", params.agent_name)
    .eq("date", today)
    .eq("model_name", params.model_name || "default")
    .maybeSingle();

  if (existing) {
    await db("cost_tracking")
      .update({
        tokens_input: existing.tokens_input + params.tokens_input,
        tokens_output: existing.tokens_output + params.tokens_output,
        total_tokens: existing.total_tokens + totalTokens,
        cost_usd: Number(existing.cost_usd) + params.cost_usd,
        api_calls: existing.api_calls + 1,
      })
      .eq("id", existing.id);
  } else {
    await db("cost_tracking").insert({
      agent_name: params.agent_name,
      date: today,
      tokens_input: params.tokens_input,
      tokens_output: params.tokens_output,
      total_tokens: totalTokens,
      cost_usd: params.cost_usd,
      api_calls: 1,
      model_name: params.model_name || "default",
    });
  }
}

export async function getCostSummary(days = 7): Promise<{
  byAgent: { agent: string; totalCost: number; totalTokens: number; apiCalls: number }[];
  byDay: { date: string; totalCost: number; totalTokens: number }[];
  total: { cost: number; tokens: number; calls: number };
}> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const { data } = await db("cost_tracking")
    .select("*")
    .gte("date", since)
    .order("date", { ascending: false });

  const entries = data || [];

  const agentMap = new Map<string, { totalCost: number; totalTokens: number; apiCalls: number }>();
  const dayMap = new Map<string, { totalCost: number; totalTokens: number }>();
  let totalCost = 0;
  let totalTokens = 0;
  let totalCalls = 0;

  for (const e of entries) {
    const cost = Number(e.cost_usd);
    const tokens = e.total_tokens;
    const calls = e.api_calls;

    const agent = agentMap.get(e.agent_name) || { totalCost: 0, totalTokens: 0, apiCalls: 0 };
    agent.totalCost += cost;
    agent.totalTokens += tokens;
    agent.apiCalls += calls;
    agentMap.set(e.agent_name, agent);

    const day = dayMap.get(e.date) || { totalCost: 0, totalTokens: 0 };
    day.totalCost += cost;
    day.totalTokens += tokens;
    dayMap.set(e.date, day);

    totalCost += cost;
    totalTokens += tokens;
    totalCalls += calls;
  }

  return {
    byAgent: [...agentMap.entries()].map(([agent, data]) => ({ agent, ...data })),
    byDay: [...dayMap.entries()].map(([date, data]) => ({ date, ...data })),
    total: { cost: totalCost, tokens: totalTokens, calls: totalCalls },
  };
}
