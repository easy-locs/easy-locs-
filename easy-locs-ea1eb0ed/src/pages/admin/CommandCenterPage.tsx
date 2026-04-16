import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "@/services/db";
import { getAccessToken } from "@/repositories/auth-utils.repository";
import { useAuthSession } from "@/contexts/AuthContext";
import { platformBus } from "@/lib/shared/platform-bus";
import { sentinelTelemetryEngine } from "@/core/sentinel";
import {
  useChiefAgentStore,
  type CommandMessage,
  type ChiefAgentResponse,
  type HistoryEntry,
  type AgentSimpleStatus,
} from "@/stores/chief-agent-store";
import SubPageShell from "@/components/layout/SubPageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  History,
  PanelRightOpen,
  PanelRightClose,
  ChevronDown,
  ChevronUp,
  Search,
  Trash2,
  Play,
  RefreshCw,
  Wrench,
  Info,
  Bell,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Circle,
  Bot,
  User,
  X,
  Loader2,
} from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  idle: "Ready",
  checking: "Checking…",
  working: "Working…",
  waiting: "Waiting…",
  problem_found: "Problem found",
  completed: "Completed",
};

const STATUS_COLORS: Record<string, string> = {
  idle: "bg-muted-foreground/30",
  checking: "bg-blue-500 animate-pulse",
  working: "bg-amber-500 animate-pulse",
  waiting: "bg-yellow-400",
  problem_found: "bg-red-500",
  completed: "bg-emerald-500",
};

const SEVERITY_CONFIG = {
  green: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20", icon: CheckCircle2 },
  yellow: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20", icon: AlertTriangle },
  red: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/20", icon: AlertCircle },
};

const ACTION_ICONS: Record<string, typeof Play> = {
  run_check: Play,
  retry: RefreshCw,
  fix_now: Wrench,
  show_details: Info,
  notify: Bell,
  escalate: AlertTriangle,
};

function StructuredResponse({
  response,
  messageId,
}: {
  response: ChiefAgentResponse;
  messageId: string;
}) {
  const { detailsExpanded, toggleDetails } = useChiefAgentStore();
  const expanded = detailsExpanded[messageId] ?? false;
  const sendCommand = useSendCommand();

  return (
    <div className="space-y-3 w-full">
      {response.understood && (
        <div className="text-sm font-medium text-foreground/90">
          {response.understood}
        </div>
      )}

      {response.findings.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">What I found</div>
          {response.findings.map((f, i) => {
            const cfg = SEVERITY_CONFIG[f.severity];
            const Icon = cfg.icon;
            return (
              <div key={i} className={`flex items-start gap-2 rounded-xl px-3 py-2 ${cfg.bg} border ${cfg.border}`}>
                <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${cfg.text}`} />
                <span className="text-sm">{f.text}</span>
              </div>
            );
          })}
        </div>
      )}

      {response.actionsTaken.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">What I did</div>
          {response.actionsTaken.map((a, i) => (
            <div key={i} className="text-sm text-foreground/80 flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
              {a}
            </div>
          ))}
        </div>
      )}

      {response.recommendations.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">What needs attention</div>
          {response.recommendations.map((r, i) => (
            <div key={i} className="text-sm text-foreground/80 pl-1">• {r}</div>
          ))}
        </div>
      )}

      {response.nextSteps.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {response.nextSteps.map((step, i) => {
            const Icon = ACTION_ICONS[step.action] || Play;
            return (
              <Button
                key={i}
                variant="outline"
                size="sm"
                className="h-9 rounded-xl text-xs font-semibold gap-1.5"
                onClick={() => sendCommand(step.label, step.action, step.payload)}
              >
                <Icon className="h-3.5 w-3.5" />
                {step.label}
              </Button>
            );
          })}
        </div>
      )}

      {response.followUpSuggestions && response.followUpSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {response.followUpSuggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => sendCommand(s)}
              className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 active:scale-95 transition-all"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <button
        onClick={() => toggleDetails(messageId)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors pt-1"
      >
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        Technical details
      </button>

      {expanded && (
        <div className="bg-muted/30 rounded-xl p-3 text-xs font-mono text-muted-foreground space-y-0.5 max-h-48 overflow-y-auto">
          {response.detailedLog.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
          <div className="pt-1 text-[10px]">Correlation: {response.correlationId}</div>
        </div>
      )}
    </div>
  );
}

function MessageBubble({ message }: { message: CommandMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isUser ? "bg-primary/20" : "bg-emerald-500/20"}`}>
        {isUser ? (
          <User className="h-4 w-4 text-primary" />
        ) : (
          <Bot className="h-4 w-4 text-emerald-400" />
        )}
      </div>
      <div className={`max-w-[85%] md:max-w-[75%] ${isUser ? "items-end" : "items-start"}`}>
        <div className={`rounded-2xl px-4 py-3 ${isUser ? "bg-primary text-primary-foreground rounded-br-md" : "bg-card border border-border/30 rounded-bl-md"}`}>
          {message.loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Thinking…
            </div>
          ) : message.response ? (
            <StructuredResponse response={message.response} messageId={message.id} />
          ) : (
            <div className="text-sm whitespace-pre-wrap">{message.content}</div>
          )}
        </div>
        <div className={`text-[10px] text-muted-foreground/60 mt-1 ${isUser ? "text-right" : "text-left"}`}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
    </div>
  );
}

function AgentStatusSidebar() {
  const { agentStatuses, chiefStatus, sidebarOpen, toggleSidebar } = useChiefAgentStore();

  if (!sidebarOpen) return null;

  return (
    <div className="w-72 border-l border-border/30 bg-card/50 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/20">
        <h3 className="text-sm font-semibold">Agent Status</h3>
        <button onClick={toggleSidebar} className="p-1 rounded-lg hover:bg-muted">
          <PanelRightClose className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <div className="rounded-xl bg-muted/30 p-3">
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-2.5 h-2.5 rounded-full ${STATUS_COLORS[chiefStatus]}`} />
            <span className="text-sm font-medium">Chief Agent</span>
          </div>
          <span className="text-xs text-muted-foreground">{STATUS_LABELS[chiefStatus]}</span>
        </div>

        {agentStatuses.map((agent, i) => (
          <div key={i} className="rounded-xl bg-muted/20 p-3">
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-2 h-2 rounded-full ${STATUS_COLORS[agent.status]}`} />
              <span className="text-xs font-medium">{agent.agentName}</span>
            </div>
            <span className="text-[10px] text-muted-foreground">
              {STATUS_LABELS[agent.status]} · {new Date(agent.lastActivity).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        ))}

        {agentStatuses.length === 0 && chiefStatus === "idle" && (
          <div className="text-xs text-muted-foreground text-center py-6">
            No agents active. Send a command to get started.
          </div>
        )}
      </div>
    </div>
  );
}

function HistoryPanel() {
  const { history, historyOpen, toggleHistory, loadHistoryConversation, historyLoaded } = useChiefAgentStore();
  const [search, setSearch] = useState("");

  if (!historyOpen) return null;

  const filtered = search
    ? history.filter((h) =>
        h.command_text.toLowerCase().includes(search.toLowerCase()) ||
        h.interpreted_intent.toLowerCase().includes(search.toLowerCase())
      )
    : history;

  return (
    <div className="absolute inset-0 bg-background/95 backdrop-blur-sm z-20 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/20">
        <h3 className="text-sm font-semibold">Command History</h3>
        <button onClick={toggleHistory} className="p-1 rounded-lg hover:bg-muted">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="px-4 py-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search commands…"
            className="pl-9 h-9 rounded-xl text-sm"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
        {filtered.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-8">
            {historyLoaded ? "No commands found" : "Loading…"}
          </div>
        )}
        {filtered.map((entry) => (
          <button
            key={entry.id}
            onClick={() => loadHistoryConversation(entry)}
            className="w-full text-left rounded-xl bg-card border border-border/20 p-3 hover:border-primary/30 transition-colors active:scale-[0.98]"
          >
            <div className="text-sm font-medium truncate">{entry.command_text}</div>
            <div className="text-xs text-muted-foreground mt-1 truncate">{entry.interpreted_intent}</div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] text-muted-foreground/60">
                {new Date(entry.created_at).toLocaleDateString()} {new Date(entry.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
              {entry.agents_used?.length > 0 && (
                <Badge variant="secondary" className="text-[10px] h-4">
                  {entry.agents_used.length} agent{entry.agents_used.length !== 1 ? "s" : ""}
                </Badge>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function useSendCommand() {
  const { addMessage, setChiefStatus, updateLastAssistantMessage, messages } = useChiefAgentStore();

  return useCallback(async (command: string, actionType?: string, actionPayload?: Record<string, unknown>) => {
    const userMsgId = `msg-${Date.now()}-user`;
    const asstMsgId = `msg-${Date.now()}-asst`;

    addMessage({
      id: userMsgId,
      role: "user",
      content: command,
      timestamp: Date.now(),
    });

    addMessage({
      id: asstMsgId,
      role: "assistant",
      content: "",
      timestamp: Date.now(),
      loading: true,
    });

    setChiefStatus("working");

    sentinelTelemetryEngine.emit("chief_agent:command_sent", "command-center", { command });

    platformBus.emit(
      "agent:chief_started",
      { correlationId: "", command, timestamp: Date.now() },
      "command-center",
    );

    platformBus.emit(
      "agent:status_changed",
      { agentName: "chief", status: "working", timestamp: Date.now() },
      "command-center",
    );

    platformBus.emit(
      "agent:subtask_started",
      { correlationId: "", agentName: "chief", command, timestamp: Date.now() },
      "command-center",
    );

    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");

      const conversationHistory = useChiefAgentStore.getState().messages
        .filter((m) => !m.loading && m.id !== userMsgId && m.id !== asstMsgId)
        .slice(-10)
        .map((m) => ({
          role: m.role,
          content: m.role === "assistant" && m.response ? m.response.understood : m.content,
        }));

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
      const res = await fetch(`${supabaseUrl}/functions/v1/chief-agent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          command: actionType ? `${command} (action: ${actionType})` : command,
          conversationHistory,
          actionType,
          actionPayload,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const response: ChiefAgentResponse = await res.json();
      updateLastAssistantMessage(response);

      sentinelTelemetryEngine.emit("chief_agent:command_completed", "command-center", {
        correlationId: response.correlationId,
        status: response.status,
        agentsUsed: response.agentsUsed,
        findingsCount: response.findings.length,
      });

      for (const agentName of response.agentsUsed) {
        platformBus.emit(
          "agent:subtask_completed",
          { correlationId: response.correlationId, agentName, timestamp: Date.now() },
          "command-center",
        );
      }

      platformBus.emit(
        "agent:status_changed",
        { agentName: "chief", status: "completed", correlationId: response.correlationId, timestamp: Date.now() },
        "command-center",
      );

      platformBus.emit(
        "agent:chief_completed",
        { correlationId: response.correlationId, timestamp: Date.now() },
        "command-center",
      );
    } catch (err) {
      const errorResponse: ChiefAgentResponse = {
        understood: "I encountered an error processing your request.",
        agentsUsed: [],
        actionsTaken: [],
        findings: [{
          text: err instanceof Error ? err.message : "Unknown error occurred",
          severity: "red",
        }],
        recommendations: ["Try again or rephrase your command"],
        status: "failed",
        nextSteps: [{ label: "Retry", action: "retry" }],
        followUpSuggestions: ["Try again"],
        detailedLog: [`Error: ${err instanceof Error ? err.message : "Unknown"}`],
        correlationId: `err-${Date.now()}`,
      };
      updateLastAssistantMessage(errorResponse);
    }
  }, [addMessage, setChiefStatus, updateLastAssistantMessage]);
}

export default function CommandCenterPage() {
  return <CommandCenterInner />;
}

function CommandCenterInner() {
  const navigate = useNavigate();
  const { user } = useAuthSession();
  const [inputValue, setInputValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sendCommand = useSendCommand();

  const {
    messages,
    chiefStatus,
    sidebarOpen,
    historyOpen,
    toggleSidebar,
    toggleHistory,
    setHistory,
    historyLoaded,
    clearMessages,
  } = useChiefAgentStore();

  useEffect(() => {
    if (!user?.id || historyLoaded) return;
    (async () => {
      try {
        const { data } = await db
          .from("agent_command_history")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50);
        if (data) setHistory(data as HistoryEntry[]);
      } catch {
        setHistory([]);
      }
    })();
  }, [user?.id, historyLoaded, setHistory]);

  useEffect(() => {
    if (!user?.id) return;
    const unsub = platformBus.onPrefix("agent:", (event) => {
      const store = useChiefAgentStore.getState();
      const payload = event.payload as Record<string, unknown>;

      switch (event.type) {
        case "agent:chief_started":
          store.setChiefStatus("working");
          break;
        case "agent:subtask_started":
          if (payload.agentName && payload.agentName !== "chief") {
            store.setAgentStatuses([
              ...store.agentStatuses.filter((a) => a.agentName !== payload.agentName),
              {
                agentName: payload.agentName as string,
                status: "checking" as AgentSimpleStatus,
                lastActivity: Date.now(),
              },
            ]);
          }
          break;
        case "agent:subtask_completed":
          if (payload.agentName && payload.agentName !== "chief") {
            store.setAgentStatuses(
              store.agentStatuses.map((a) =>
                a.agentName === payload.agentName
                  ? { ...a, status: "completed" as AgentSimpleStatus, lastActivity: Date.now() }
                  : a,
              ),
            );
          }
          break;
        case "agent:status_changed":
          if (payload.agentName === "chief") {
            store.setChiefStatus(payload.status as AgentSimpleStatus);
          }
          break;
        case "agent:chief_completed":
          store.setChiefStatus("completed");
          db.from("agent_command_history")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .then(({ data }) => {
              if (data?.[0]) {
                useChiefAgentStore.getState().prependHistory(data[0] as HistoryEntry);
              }
            });
          break;
      }
    });

    return unsub;
  }, [user?.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    const text = inputValue.trim();
    if (!text) return;
    setInputValue("");
    sendCommand(text);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  return (
    <SubPageShell>
      <div className="flex flex-col h-[100dvh] bg-background">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/20 bg-card/50 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/admin/master-control")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
              ←
            </button>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Bot className="h-5 w-5 text-emerald-400" />
                <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card ${STATUS_COLORS[chiefStatus]}`} />
              </div>
              <div>
                <h1 className="text-sm font-bold leading-tight">Command Center</h1>
                <p className="text-[10px] text-muted-foreground">{STATUS_LABELS[chiefStatus]}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleHistory}
              className="w-9 h-9 rounded-xl hover:bg-muted flex items-center justify-center transition-colors"
            >
              <History className="h-4 w-4" />
            </button>
            {messages.length > 0 && (
              <button
                onClick={clearMessages}
                className="w-9 h-9 rounded-xl hover:bg-muted flex items-center justify-center transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            {!isMobile && (
              <button
                onClick={toggleSidebar}
                className="w-9 h-9 rounded-xl hover:bg-muted flex items-center justify-center transition-colors"
              >
                {sidebarOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden relative">
          <div className="flex-1 flex flex-col">
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center px-6">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4">
                    <Bot className="h-8 w-8 text-emerald-400" />
                  </div>
                  <h2 className="text-lg font-bold mb-2">Chief Agent</h2>
                  <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                    Your unified command center. Ask me anything about the platform — I'll coordinate with specialized agents to get you answers.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {[
                      "Check support problems",
                      "Show urgent issues",
                      "Analyze platform health",
                      "Review merchant activity",
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => sendCommand(suggestion)}
                        className="px-3 py-2 rounded-xl bg-card border border-border/30 text-xs font-medium hover:border-primary/30 active:scale-95 transition-all"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
            </div>

            <div className="border-t border-border/20 bg-card/50 backdrop-blur-sm px-4 py-3 pb-[env(safe-area-inset-bottom,12px)]">
              <div className="flex items-end gap-2 max-w-2xl mx-auto">
                <Input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a command…"
                  className="flex-1 h-11 rounded-xl text-sm"
                  disabled={chiefStatus === "working" || chiefStatus === "checking"}
                />
                <Button
                  onClick={handleSend}
                  disabled={!inputValue.trim() || chiefStatus === "working" || chiefStatus === "checking"}
                  className="h-11 w-11 rounded-xl p-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {!isMobile && <AgentStatusSidebar />}
          <HistoryPanel />
        </div>
      </div>
    </SubPageShell>
  );
}
