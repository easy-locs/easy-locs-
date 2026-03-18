/**
 * AI Ops Chat — thread + message management with edge function AI.
 */
import { supabase } from "@/integrations/supabase/client";

export async function createAIThread(params: {
  workspaceId?: string;
  contextType?: string;
  contextId?: string;
  title?: string;
  createdBy?: string;
}) {
  const { data, error } = await supabase
    .from("ai_chat_threads" as any)
    .insert({
      workspace_id: params.workspaceId ?? null,
      context_type: params.contextType ?? null,
      context_id: params.contextId ?? null,
      title: params.title ?? "New ops thread",
      created_by: params.createdBy ?? null,
    } as any)
    .select("*")
    .single();

  if (error) throw error;
  return data as any;
}

export async function sendAIMessage(params: {
  threadId: string;
  workspaceId?: string;
  userId?: string;
  content: string;
  systemPrompt?: string;
}) {
  await supabase.from("ai_chat_messages" as any).insert({
    thread_id: params.threadId,
    workspace_id: params.workspaceId ?? null,
    role: "user",
    content: params.content,
    token_estimate: Math.ceil(params.content.length / 4),
  } as any);

  const { data: history } = await supabase
    .from("ai_chat_messages" as any)
    .select("role,content")
    .eq("thread_id", params.threadId)
    .order("created_at", { ascending: true })
    .limit(30);

  const messages = [
    {
      role: "system",
      content: params.systemPrompt ?? "You are an operational AI assistant. Give concise, practical, execution-first answers.",
    },
    ...((history as any[]) ?? []),
  ];

  const { data, error } = await supabase.functions.invoke("ops-ai-chat", {
    body: { messages },
  });

  if (error) {
    await supabase.from("ai_chat_messages" as any).insert({
      thread_id: params.threadId,
      workspace_id: params.workspaceId ?? null,
      role: "assistant",
      content: "AI temporarily unavailable.",
    } as any);
    throw error;
  }

  const answer = data?.answer ?? "No response";
  const usage = data?.usage ?? null;
  const model = data?.model ?? null;

  await supabase.from("ai_chat_messages" as any).insert({
    thread_id: params.threadId,
    workspace_id: params.workspaceId ?? null,
    role: "assistant",
    content: answer,
    metadata: { model, usage },
    token_estimate: usage?.completion_tokens ?? Math.ceil(answer.length / 4),
  } as any);

  if (usage) {
    await supabase.from("ai_chat_usage" as any).insert({
      thread_id: params.threadId,
      workspace_id: params.workspaceId ?? null,
      user_id: params.userId ?? null,
      prompt_tokens: usage.prompt_tokens ?? 0,
      completion_tokens: usage.completion_tokens ?? 0,
      total_tokens: usage.total_tokens ?? 0,
      model,
    } as any);
  }

  return { answer, usage, model };
}
