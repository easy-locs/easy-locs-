import { create } from "zustand";

export type AgentSimpleStatus = "idle" | "checking" | "working" | "waiting" | "problem_found" | "completed";

export interface AgentStatusEntry {
  agentName: string;
  status: AgentSimpleStatus;
  lastActivity: number;
  detail?: string;
}

export interface CommandMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  response?: ChiefAgentResponse | null;
  loading?: boolean;
}

export interface ChiefAgentResponse {
  understood: string;
  agentsUsed: string[];
  actionsTaken: string[];
  findings: Array<{ text: string; severity: "green" | "yellow" | "red" }>;
  recommendations: string[];
  status: "completed" | "partial" | "failed";
  nextSteps: Array<{ label: string; action: string; payload?: Record<string, unknown> }>;
  followUpSuggestions?: string[];
  detailedLog: string[];
  correlationId: string;
}

export interface HistoryEntry {
  id: string;
  user_id: string;
  command_text: string;
  interpreted_intent: string;
  agents_used: string[];
  result_summary: Record<string, unknown>;
  detailed_log: string[];
  correlation_id: string;
  created_at: string;
}

interface ChiefAgentState {
  messages: CommandMessage[];
  agentStatuses: AgentStatusEntry[];
  chiefStatus: AgentSimpleStatus;
  history: HistoryEntry[];
  historyLoaded: boolean;
  sidebarOpen: boolean;
  historyOpen: boolean;
  detailsExpanded: Record<string, boolean>;

  addMessage: (msg: CommandMessage) => void;
  updateLastAssistantMessage: (response: ChiefAgentResponse) => void;
  setChiefStatus: (status: AgentSimpleStatus) => void;
  setAgentStatuses: (statuses: AgentStatusEntry[]) => void;
  setHistory: (history: HistoryEntry[]) => void;
  prependHistory: (entry: HistoryEntry) => void;
  setHistoryLoaded: (loaded: boolean) => void;
  toggleSidebar: () => void;
  toggleHistory: () => void;
  toggleDetails: (messageId: string) => void;
  loadHistoryConversation: (entry: HistoryEntry) => void;
  clearMessages: () => void;
}

export const useChiefAgentStore = create<ChiefAgentState>((set) => ({
  messages: [],
  agentStatuses: [],
  chiefStatus: "idle",
  history: [],
  historyLoaded: false,
  sidebarOpen: false,
  historyOpen: false,
  detailsExpanded: {},

  addMessage: (msg) =>
    set((s) => ({ messages: [...s.messages, msg] })),

  updateLastAssistantMessage: (response) =>
    set((s) => {
      const msgs = [...s.messages];
      const lastIdx = msgs.findLastIndex((m) => m.role === "assistant");
      if (lastIdx >= 0) {
        msgs[lastIdx] = {
          ...msgs[lastIdx],
          content: response.understood,
          response,
          loading: false,
        };
      }
      const agentStatuses: AgentStatusEntry[] = response.agentsUsed.map((name) => ({
        agentName: name,
        status: "completed" as AgentSimpleStatus,
        lastActivity: Date.now(),
      }));
      const chiefStatus: AgentSimpleStatus =
        response.status === "failed" ? "problem_found" :
        response.status === "partial" ? "problem_found" :
        "completed";
      return { messages: msgs, agentStatuses, chiefStatus };
    }),

  setChiefStatus: (chiefStatus) => set({ chiefStatus }),

  setAgentStatuses: (agentStatuses) => set({ agentStatuses }),

  setHistory: (history) => set({ history, historyLoaded: true }),

  prependHistory: (entry) =>
    set((s) => {
      if (s.history.some((h) => h.id === entry.id)) return s;
      return { history: [entry, ...s.history] };
    }),

  setHistoryLoaded: (historyLoaded) => set({ historyLoaded }),

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  toggleHistory: () => set((s) => ({ historyOpen: !s.historyOpen })),

  toggleDetails: (messageId) =>
    set((s) => ({
      detailsExpanded: {
        ...s.detailsExpanded,
        [messageId]: !s.detailsExpanded[messageId],
      },
    })),

  loadHistoryConversation: (entry) =>
    set({
      messages: [
        {
          id: `hist-user-${entry.id}`,
          role: "user",
          content: entry.command_text,
          timestamp: new Date(entry.created_at).getTime(),
        },
        {
          id: `hist-asst-${entry.id}`,
          role: "assistant",
          content: entry.interpreted_intent,
          timestamp: new Date(entry.created_at).getTime() + 1,
          response: {
            understood: entry.interpreted_intent,
            agentsUsed: entry.agents_used || [],
            actionsTaken: [],
            findings: [],
            recommendations: [],
            status: "completed",
            nextSteps: [],
            followUpSuggestions: [],
            detailedLog: entry.detailed_log || [],
            correlationId: entry.correlation_id,
          },
        },
      ],
      historyOpen: false,
    }),

  clearMessages: () => set({ messages: [], chiefStatus: "idle", agentStatuses: [] }),
}));
