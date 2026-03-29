import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { BrainCircuit, Send, Loader2, User, Sparkles, Activity, TrendingUp, Star, AlertTriangle, CheckCircle2, ChevronRight, BarChart3, Globe, Eye, Search, Zap, Building } from "lucide-react";
import { useState, useRef, useEffect, useMemo } from "react";
import { fetchLeasesByOrgSimple } from "@/repositories/rental.repository";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/lib/i18n";
import { useRentalData } from "@/hooks/useRentalData";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`;

// ─── Property Health Score Calculator ───
interface PropertyHealth {
  id: string;
  label: string;
  country: string;
  score: number;
  issues: { severity: "critical" | "warning" | "info"; message: string }[];
  strengths: string[];
}

function computePropertyHealth(
  property: any,
  tenants: any[],
  leases: any[],
): PropertyHealth {
  const issues: PropertyHealth["issues"] = [];
  const strengths: string[] = [];
  let score = 100;

  // Check occupancy
  const hasTenant = tenants.some(t => t.property_id === property.id);
  if (!hasTenant) {
    issues.push({ severity: "critical", message: "Property is vacant — no active tenant" });
    score -= 25;
  } else {
    strengths.push("Property is occupied");
  }

  // Check lease
  const activeLease = leases.find(l => l.property_id === property.id && l.status === "active");
  if (!activeLease) {
    issues.push({ severity: "warning", message: "No active lease found" });
    score -= 15;
  } else {
    strengths.push("Active lease in place");
    // Check lease expiry
    if (activeLease.end_date) {
      const daysToEnd = Math.ceil((new Date(activeLease.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysToEnd < 0) {
        issues.push({ severity: "critical", message: "Lease has expired" });
        score -= 20;
      } else if (daysToEnd < 90) {
        issues.push({ severity: "warning", message: `Lease expires in ${daysToEnd} days` });
        score -= 10;
      }
    }
  }

  // Check property details
  if (!property.surface || property.surface === 0) {
    issues.push({ severity: "info", message: "Surface area not specified" });
    score -= 5;
  }
  if (!property.photo_urls || (Array.isArray(property.photo_urls) && property.photo_urls.length === 0)) {
    issues.push({ severity: "warning", message: "No photos uploaded — reduces listing appeal" });
    score -= 10;
  } else {
    const photoCount = Array.isArray(property.photo_urls) ? property.photo_urls.length : 0;
    if (photoCount >= 5) strengths.push(`${photoCount} photos uploaded`);
    else if (photoCount > 0) {
      issues.push({ severity: "info", message: `Only ${photoCount} photo(s) — aim for 5+` });
      score -= 5;
    }
  }

  if (!property.address) {
    issues.push({ severity: "info", message: "Address not specified" });
    score -= 5;
  } else {
    strengths.push("Address is set");
  }

  return {
    id: property.id,
    label: property.label || "Unnamed property",
    country: property.country || "FR",
    score: Math.max(0, Math.min(100, score)),
    issues,
    strengths,
  };
}

// ─── Growth Insight Generator ───
interface GrowthInsight {
  icon: React.ElementType;
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  category: "seo" | "listing" | "market" | "engagement";
}

function generateGrowthInsights(
  properties: any[],
  tenants: any[],
  healthScores: PropertyHealth[],
): GrowthInsight[] {
  const insights: GrowthInsight[] = [];

  // Vacancy analysis
  const vacantCount = properties.filter(p => !tenants.some(t => t.property_id === p.id)).length;
  if (vacantCount > 0) {
    insights.push({
      icon: Eye,
      title: `${vacantCount} vacant propert${vacantCount > 1 ? "ies" : "y"} — revenue opportunity`,
      description: "List vacant properties on seasonal platforms or adjust pricing to attract tenants faster.",
      impact: "high",
      category: "market",
    });
  }

  // Photo quality
  const lowPhotoProps = properties.filter(p => !p.photo_urls || (Array.isArray(p.photo_urls) && p.photo_urls.length < 5));
  if (lowPhotoProps.length > 0) {
    insights.push({
      icon: Star,
      title: `${lowPhotoProps.length} listing${lowPhotoProps.length > 1 ? "s" : ""} need${lowPhotoProps.length === 1 ? "s" : ""} more photos`,
      description: "Properties with 5+ professional photos get 40% more inquiries. Add high-quality images.",
      impact: "high",
      category: "listing",
    });
  }

  // SEO opportunities
  const uniqueCountries = new Set(properties.map(p => p.country || "FR"));
  if (uniqueCountries.size > 0) {
    insights.push({
      icon: Search,
      title: `SEO pages available for ${uniqueCountries.size} countr${uniqueCountries.size > 1 ? "ies" : "y"}`,
      description: "Each public listing creates an indexable page. Ensure all descriptions are SEO-optimized with local keywords.",
      impact: "medium",
      category: "seo",
    });
  }

  // Seasonal pricing
  if (properties.length > 0) {
    insights.push({
      icon: TrendingUp,
      title: "Dynamic pricing opportunity",
      description: "Weekend and seasonal demand varies. Set pricing rules to capture 15-25% more revenue during peak periods.",
      impact: "medium",
      category: "market",
    });
  }

  // Portfolio health
  const avgScore = healthScores.length > 0 ? Math.round(healthScores.reduce((s, h) => s + h.score, 0) / healthScores.length) : 0;
  if (avgScore < 80 && healthScores.length > 0) {
    insights.push({
      icon: Activity,
      title: `Portfolio health score: ${avgScore}/100`,
      description: "Resolve critical issues (expired leases, missing photos) to improve your portfolio score above 80.",
      impact: "high",
      category: "engagement",
    });
  }

  // Multi-language listing
  if (uniqueCountries.size > 1) {
    insights.push({
      icon: Globe,
      title: "Multilingual listings boost visibility",
      description: "Translate your listings into local languages + English to reach international travelers and tenants.",
      impact: "medium",
      category: "seo",
    });
  }

  // Engagement tip
  insights.push({
    icon: Zap,
    title: "Respond to inquiries within 1 hour",
    description: "Fast response times increase booking conversion by up to 50%. Enable notifications for new messages.",
    impact: "low",
    category: "engagement",
  });

  return insights.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.impact] - order[b.impact];
  });
}

// ─── Score Color ───
function scoreColor(score: number) {
  if (score >= 80) return "text-success";
  if (score >= 60) return "text-warning";
  return "text-destructive";
}

function scoreBg(score: number) {
  if (score >= 80) return "bg-success/10";
  if (score >= 60) return "bg-warning/10";
  return "bg-destructive/10";
}

const impactColors = {
  high: "bg-destructive/10 text-destructive",
  medium: "bg-warning/10 text-warning",
  low: "bg-info/10 text-info",
};

// ─── Main Component ───
const AIAssistant = () => {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user, session } = useAuth();
  const { t, locale } = useI18n();
  const { properties, tenants } = useRentalData();

  // Fetch leases for health score
  const [leases, setLeases] = useState<any[]>([]);
  const { orgId } = useAuth();
  useEffect(() => {
    if (!orgId) return;
    fetchLeasesByOrgSimple(orgId).then((data) => setLeases(data));
  }, [orgId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Computed health scores
  const healthScores = useMemo(
    () => properties.map(p => computePropertyHealth(p, tenants, leases)),
    [properties, tenants, leases],
  );

  const avgScore = useMemo(
    () => healthScores.length > 0 ? Math.round(healthScores.reduce((s, h) => s + h.score, 0) / healthScores.length) : 0,
    [healthScores],
  );

  const growthInsights = useMemo(
    () => generateGrowthInsights(properties, tenants, healthScores),
    [properties, tenants, healthScores],
  );

  const buildContext = () => ({
    propertiesCount: properties.length,
    tenantsCount: tenants.length,
    vacantCount: properties.filter(p => !tenants.some(tn => tn.property_id === p.id)).length,
    userName: user?.user_metadata?.name || user?.email,
  });

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = { role: "user", content: text.trim() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    let assistantContent = "";

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
          context: buildContext(),
          locale,
          task: "chat",
          stream: true,
        }),
      });

      if (!resp.ok) {
        if (resp.status === 429) { toast.error("Rate limit exceeded. Please try again later."); throw new Error("429"); }
        if (resp.status === 402) { toast.error("AI credits depleted. Please add credits."); throw new Error("402"); }
        throw new Error("Stream failed");
      }

      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              assistantContent += delta;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
                }
                return [...prev, { role: "assistant", content: assistantContent }];
              });
            }
          } catch { /* partial JSON, wait */ }
        }
      }

      if (!assistantContent) {
        setMessages(prev => [...prev, { role: "assistant", content: "Sorry, no response was generated." }]);
      }
    } catch {
      if (!assistantContent) {
        setMessages(prev => [...prev, { role: "assistant", content: "An error occurred. Please try again." }]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const quickActions = [
    { label: "✍️ Write a listing description", prompt: "Help me write an attractive listing description for a vacation rental property. Ask me about the property details." },
    { label: "💬 Draft a guest reply", prompt: "Help me draft a professional reply to a guest inquiry. What is the guest's message?" },
    { label: "🔍 Improve my listing SEO", prompt: "Help me improve the SEO of my property listing. Ask me to share my current listing title and description." },
    { label: "📊 Summarize my activity", prompt: `Give me a summary and recommendations based on my portfolio: ${properties.length} properties, ${tenants.length} tenants, ${properties.filter(p => !tenants.some(tn => tn.property_id === p.id)).length} vacant.` },
    { label: "⚖️ Legal advice", prompt: "What are the key legal obligations for a property landlord? Ask me which country my property is in." },
    { label: "🚀 Marketing tips", prompt: "Give me 5 actionable marketing tips to increase bookings for my vacation rental properties." },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-gold flex items-center justify-center mx-auto mb-3">
            <BrainCircuit className="h-7 w-7 text-accent-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-1">AI Copilot</h1>
          <p className="text-muted-foreground text-sm">Your smart property management assistant</p>
        </motion.div>

        <Tabs defaultValue="chat" className="w-full">
          <TabsList className="w-full mb-6 bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="chat" className="rounded-lg text-xs sm:text-sm data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <BrainCircuit className="h-4 w-4 mr-1.5 hidden sm:inline" />
              Assistant
            </TabsTrigger>
            <TabsTrigger value="health" className="rounded-lg text-xs sm:text-sm data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <Activity className="h-4 w-4 mr-1.5 hidden sm:inline" />
              Health Score
            </TabsTrigger>
            <TabsTrigger value="growth" className="rounded-lg text-xs sm:text-sm data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <TrendingUp className="h-4 w-4 mr-1.5 hidden sm:inline" />
              Growth
            </TabsTrigger>
          </TabsList>

          {/* ─── Chat Tab ─── */}
          <TabsContent value="chat" className="mt-0">
            <div className="flex flex-col" style={{ height: "calc(100vh - 22rem)" }}>
              <div className="flex-1 overflow-y-auto bg-card rounded-xl shadow-card border border-border/50 p-4 mb-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full">
                    <Sparkles className="h-10 w-10 text-accent/30 mb-4" />
                    <p className="text-muted-foreground text-sm mb-6 text-center max-w-sm">
                      Ask me anything about property management, or pick a quick action below.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
                      {quickActions.map((qa, i) => (
                        <button
                          key={i}
                          onClick={() => sendMessage(qa.prompt)}
                          className="text-left text-xs px-3 py-2.5 rounded-lg border border-border bg-background hover:bg-muted transition-colors text-foreground truncate"
                        >
                          {qa.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  messages.map((msg, i) => (
                    <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      {msg.role === "assistant" && (
                        <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 mt-1">
                          <BrainCircuit className="h-4 w-4 text-accent" />
                        </div>
                      )}
                      <div className={`max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      }`}>
                        {msg.role === "assistant" ? (
                          <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:mb-2 [&_ul]:mb-2 [&_ol]:mb-2 [&_li]:mb-0.5">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        )}
                      </div>
                      {msg.role === "user" && (
                        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-1">
                          <User className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  ))
                )}
                {loading && !messages.some(m => m.role === "assistant" && m === messages[messages.length - 1]) && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                      <BrainCircuit className="h-4 w-4 text-accent" />
                    </div>
                    <div className="bg-muted rounded-xl px-4 py-3">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleSubmit} className="flex gap-3 shrink-0">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask anything about property management..."
                  disabled={loading}
                  className="flex-1 bg-card border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="bg-accent text-accent-foreground px-5 py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </form>
            </div>
          </TabsContent>

          {/* ─── Health Score Tab ─── */}
          <TabsContent value="health" className="mt-0 space-y-6">
            {/* Global Score */}
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
              <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full ${scoreBg(avgScore)} mb-3`}>
                <span className={`text-3xl font-bold ${scoreColor(avgScore)}`}>{avgScore}</span>
              </div>
              <p className="text-sm text-muted-foreground">Portfolio Health Score</p>
              <p className="text-xs text-muted-foreground mt-1">
                {healthScores.length} propert{healthScores.length !== 1 ? "ies" : "y"} analyzed
              </p>
            </motion.div>

            {/* Per-property scores */}
            {healthScores.length === 0 ? (
              <div className="text-center py-12 bg-card rounded-xl border border-border/50">
                <Activity className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Add properties to see health scores</p>
              </div>
            ) : (
              <div className="space-y-3">
                {healthScores.map((h, i) => (
                  <motion.div
                    key={h.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-card rounded-xl border border-border/50 shadow-card p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-lg ${scoreBg(h.score)} flex items-center justify-center shrink-0`}>
                          <span className={`text-sm font-bold ${scoreColor(h.score)}`}>{h.score}</span>
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-foreground truncate">{h.label}</h3>
                          <p className="text-xs text-muted-foreground">{h.country}</p>
                        </div>
                      </div>
                      <div className={`h-2 w-20 rounded-full bg-muted overflow-hidden`}>
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            h.score >= 80 ? "bg-success" : h.score >= 60 ? "bg-warning" : "bg-destructive"
                          }`}
                          style={{ width: `${h.score}%` }}
                        />
                      </div>
                    </div>

                    {h.issues.length > 0 && (
                      <div className="space-y-1.5 mb-2">
                        {h.issues.map((issue, j) => (
                          <div key={j} className="flex items-start gap-2 text-xs">
                            {issue.severity === "critical" ? (
                              <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
                            ) : issue.severity === "warning" ? (
                              <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0 mt-0.5" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                            )}
                            <span className="text-muted-foreground">{issue.message}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {h.strengths.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {h.strengths.map((s, j) => (
                          <span key={j} className="inline-flex items-center gap-1 text-xs text-success bg-success/10 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="h-3 w-3" />{s}
                          </span>
                        ))}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ─── Growth Insights Tab ─── */}
          <TabsContent value="growth" className="mt-0 space-y-6">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-2">
              <BarChart3 className="h-10 w-10 text-accent/50 mx-auto mb-2" />
              <h2 className="text-lg font-semibold text-foreground">Growth Insights</h2>
              <p className="text-xs text-muted-foreground">AI-powered recommendations to optimize your portfolio</p>
            </motion.div>

            {/* Summary KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Properties", value: String(properties.length), icon: Building },
                { label: "Occupied", value: String(properties.length - properties.filter(p => !tenants.some(t => t.property_id === p.id)).length), icon: CheckCircle2 },
                { label: "Avg Score", value: `${avgScore}/100`, icon: Activity },
                { label: "Insights", value: String(growthInsights.length), icon: Zap },
              ].map((kpi, i) => (
                <motion.div
                  key={kpi.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="stat-card"
                >
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <kpi.icon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{kpi.label}</span>
                  </div>
                  <div className="text-lg font-bold text-foreground tabular-nums">{kpi.value}</div>
                </motion.div>
              ))}
            </div>

            {/* Insights list */}
            <div className="space-y-3">
              {growthInsights.map((insight, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="bg-card rounded-xl border border-border/50 shadow-card p-4 flex gap-4"
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                    insight.impact === "high" ? "bg-destructive/10" : insight.impact === "medium" ? "bg-warning/10" : "bg-info/10"
                  }`}>
                    <insight.icon className={`h-5 w-5 ${
                      insight.impact === "high" ? "text-destructive" : insight.impact === "medium" ? "text-warning" : "text-info"
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-foreground">{insight.title}</h3>
                      <span className={`badge-status text-[10px] px-1.5 py-0.5 ${impactColors[insight.impact]}`}>
                        {insight.impact}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{insight.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AIAssistant;
