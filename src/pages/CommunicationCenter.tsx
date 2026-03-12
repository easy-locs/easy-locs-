/**
 * CommunicationCenter — Unified Communication Hub.
 * 
 * Architecture: 3-layer composition
 * Layer 1: ConversationList — conversation sidebar with type filters
 * Layer 2: ChatPanel — main interaction area (messages, files, calls)
 * Layer 3: ContextPanel — dynamic context (booking, deal, property, listing)
 * 
 * Supports 7 conversation types: direct, business, listing, booking, deal, property, team
 */
import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { MessageCircle, FileText, CreditCard, Wrench, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { useSearchParams } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";

import ConversationList from "@/components/communication-hub/ConversationList";
import ChatPanel from "@/components/communication-hub/ChatPanel";
import ContextPanel from "@/components/communication-hub/ContextPanel";
import NewConversationDialog from "@/components/communication-hub/NewConversationDialog";
import { useConversationThreads } from "@/components/communication-hub/useConversationThreads";
import type { ConversationThread } from "@/components/communication-hub/types";
import { useAuth } from "@/contexts/AuthContext";

const CommunicationCenter = () => {
  const { orgId } = useAuth();
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();

  const { threads, loading, stats, loadThreads, updateThreadLocally } = useConversationThreads();
  const [selectedThread, setSelectedThread] = useState<ConversationThread | null>(null);
  const [showContext, setShowContext] = useState(false);
  const [showNewConversation, setShowNewConversation] = useState(false);

  // Request notification permission
  useEffect(() => {
    import("@/lib/notif-alert-prefs").then(m => m.requestNotificationPermission());
  }, []);

  // Deep-link from notifications: ?thread=booking-xxx or ?booking=xxx or ?deal=xxx
  useEffect(() => {
    const threadParam = searchParams.get("thread") || searchParams.get("booking") || searchParams.get("deal") || searchParams.get("tenant");
    if (!threadParam || loading || threads.length === 0) return;

    const found = threads.find(t =>
      t.id === `booking-${threadParam}` || t.id === threadParam ||
      t.bookingId === threadParam || t.dealId === threadParam ||
      t.id === `deal-${threadParam}` || t.id === `tenant-${threadParam}` ||
      t.tenantId === threadParam || t.id === `lead-${threadParam}` ||
      t.leadId === threadParam
    );
    if (found) {
      setSelectedThread(found);
      setSearchParams({}, { replace: true });
    }
  }, [threads, loading, searchParams, setSearchParams]);

  // Deep-link search param
  useEffect(() => {
    const searchQ = searchParams.get("search");
    if (!searchQ || loading || threads.length === 0) return;
    const found = threads.find(t =>
      t.name.toLowerCase().includes(searchQ.toLowerCase()) ||
      t.email?.toLowerCase().includes(searchQ.toLowerCase())
    );
    if (found) {
      setSelectedThread(found);
      setSearchParams({}, { replace: true });
    }
  }, [threads, loading, searchParams, setSearchParams]);

  const handleSelectThread = useCallback((thread: ConversationThread) => {
    setSelectedThread(thread);
    // Auto-show context on desktop for contextual threads
    if (!isMobile && ["booking", "property", "listing", "deal"].includes(thread.conversationType)) {
      setShowContext(true);
    }
  }, [isMobile]);

  const handleBack = useCallback(() => {
    setSelectedThread(null);
    setShowContext(false);
  }, []);

  const handleThreadUpdate = useCallback((threadId: string, updates: Partial<ConversationThread>) => {
    updateThreadLocally(threadId, updates);
    if (selectedThread?.id === threadId) {
      setSelectedThread(prev => prev ? { ...prev, ...updates } : null);
    }
  }, [updateThreadLocally, selectedThread?.id]);

  const handleNewThreadCreated = useCallback((contextId: string) => {
    // Refresh threads and try to select the new one
    loadThreads().then(() => {
      // The thread should appear after reload
    });
  }, [loadThreads]);

  return (
    <DashboardLayout>
      <div className="h-[calc(100dvh-8rem)] sm:h-[calc(100vh-8rem)] flex flex-col overflow-hidden">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 mb-3 px-1">
          <div className="flex-1 min-w-0">
            <h1 className="text-base sm:text-xl font-bold text-foreground flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-accent to-accent/60 flex items-center justify-center shrink-0">
                <MessageCircle className="h-4 w-4 text-accent-foreground" />
              </div>
              <span className="truncate">{t("page.communication.title") || "Communication Hub"}</span>
            </h1>
          </div>
          <div className="flex items-center gap-1.5 flex-nowrap overflow-x-auto scrollbar-hide">
            <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs rounded-lg" onClick={() => setShowNewConversation(true)}>
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">New</span>
            </Button>
            {[
              { icon: MessageCircle, value: stats.unread, color: "text-accent", bg: "bg-accent/8" },
              { icon: FileText, value: stats.pending_docs, color: "text-blue-500", bg: "bg-blue-500/8" },
              { icon: CreditCard, value: stats.overdue, color: "text-destructive", bg: "bg-destructive/8" },
              { icon: Wrench, value: stats.maintenance, color: "text-amber-500", bg: "bg-amber-500/8" },
            ].filter(s => s.value > 0).map((s, i) => (
              <div key={i} className={`flex items-center gap-1.5 px-2.5 py-1.5 ${s.bg} rounded-lg text-xs`}>
                <s.icon className={`h-3.5 w-3.5 ${s.color}`} />
                <span className="font-bold text-foreground tabular-nums">{s.value}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* 3-Layer Layout */}
        <div className="flex-1 flex gap-0 min-h-0 bg-card rounded-xl border border-border/50 shadow-card overflow-hidden">
          {/* Layer 1: Conversation List — hide on mobile when a thread is selected */}
          <ConversationList
            threads={threads}
            loading={loading}
            selectedThread={selectedThread}
            onSelectThread={handleSelectThread}
            visible={!selectedThread || !isMobile}
          />

          {/* Layer 2 + 3: Chat + Context — hide on mobile when no thread selected */}
          <div className={`flex-1 flex flex-col min-w-0 ${!selectedThread && isMobile ? "hidden" : "flex"}`}>
            <div className="flex-1 flex min-h-0">
              <ChatPanel
                thread={selectedThread}
                onBack={handleBack}
                onToggleContext={() => setShowContext(!showContext)}
                showContext={showContext}
                onThreadUpdate={handleThreadUpdate}
              />

              {/* Layer 3: Context Panel — hidden on mobile, shown on lg+ */}
              {showContext && selectedThread && orgId && !isMobile && (
                <ContextPanel
                  thread={selectedThread}
                  orgId={orgId}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* New conversation dialog */}
      <NewConversationDialog
        open={showNewConversation}
        onOpenChange={setShowNewConversation}
        onThreadCreated={handleNewThreadCreated}
      />
    </DashboardLayout>
  );
};

export default CommunicationCenter;
