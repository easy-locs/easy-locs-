/**
 * AI Ops Chat — thread + message management with edge function AI.
 * All DB access via aiChatRepo.
 */
import { aiChatRepo } from "@/repositories/ai-chat.repository";

export async function createAIThread(params: {
  workspaceId?: string;
  contextType?: string;
  contextId?: string;
  title?: string;
  createdBy?: string;
}) {
  const { data, error } = await aiChatRepo.threads.insert({
    workspace_id: params.workspaceId ?? null,
    context_type: params.contextType ?? null,
    context_id: params.contextId ?? null,
    title: params.title ?? "New ops thread",
    created_by: params.createdBy ?? null,
  });

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
  await aiChatRepo.messages.insert({
    thread_id: params.threadId,
    workspace_id: params.workspaceId ?? null,
    role: "user",
    content: params.content,
    token_estimate: Math.ceil(params.content.length / 4),
  });

  const { data: history } = await aiChatRepo.messages.listByThread(params.threadId);

  const messages = [
    {
      role: "system",
      content: params.systemPrompt ?? "You are an operational AI assistant. Give concise, practical, execution-first answers.",
    },
    ...((history as any[]) ?? []),
  ];

  const { data, error } = await aiChatRepo.invoke("ops-ai-chat", { messages });

  if (error) {
    await aiChatRepo.messages.insert({
      thread_id: params.threadId,
      workspace_id: params.workspaceId ?? null,
      role: "assistant",
      content: "AI temporarily unavailable.",
    });
    throw error;
  }

  const answer = data?.answer ?? "No response";
  const usage = data?.usage ?? null;
  const model = data?.model ?? null;

  await aiChatRepo.messages.insert({
    thread_id: params.threadId,
    workspace_id: params.workspaceId ?? null,
    role: "assistant",
    content: answer,
    metadata: { model, usage },
    token_estimate: usage?.completion_tokens ?? Math.ceil(answer.length / 4),
  });

  if (usage) {
    await aiChatRepo.usage.insert({
      thread_id: params.threadId,
      workspace_id: params.workspaceId ?? null,
      user_id: params.userId ?? null,
      prompt_tokens: usage.prompt_tokens ?? 0,
      completion_tokens: usage.completion_tokens ?? 0,
      total_tokens: usage.total_tokens ?? 0,
      model,
    });
  }

  return { answer, usage, model };
}
