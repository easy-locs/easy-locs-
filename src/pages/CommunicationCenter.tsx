/**
 * CommunicationCenter — Orbit Communication System.
 * Full-screen messaging experience — NO sidebar, standalone layout.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

import CommNavBar, { type CommSection } from "@/components/communication-hub/CommNavBar";

import CommCallsSection from "@/components/communication-hub/CommCallsSection";
import CommContactsSection from "@/components/communication-hub/CommContactsSection";
import CommGroupsSection from "@/components/communication-hub/CommGroupsSection";
import HudConversationList from "@/components/communication-hub/HudConversationList";
import HudChatPanel from "@/components/communication-hub/HudChatPanel";
import HudContextPanel from "@/components/communication-hub/HudContextPanel";
import { AddContactByEmail } from "@/components/chat/AddContactByEmail";
import OrbitAccountSection from "@/components/communication-hub/OrbitAccountSection";
import { useConversationThreads } from "@/components/communication-hub/useConversationThreads";
import { useThreadActions } from "@/hooks/useThreadActions";
import type { ConversationThread } from "@/components/communication-hub/types";
// useOrbitCallSync removed — centralized in RealtimeHubGuard
import { useAuth } from "@/contexts/AuthContext";

const VALID_SECTIONS: CommSection[] = ["chats", "calls", "contacts", "groups", "you"];

export const CommunicationCenter = () => {
  const { orgId, user } = useAuth();
  const navigate = useNavigate();
  const userId = user?.id;
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();

  const { threads, loading, stats, loadThreads, updateThreadLocally } = useConversationThreads();
  const { archiveThread, unarchiveThread, deleteThread, muteThread, blockThread, clearThread, favoriteThread, changeStatus } = useThreadActions({ updateThreadLocally, loadThreads });
  // Realtime sync centralized in RealtimeHubGuard (App.tsx)
  const [selectedThread, setSelectedThread] = useState<ConversationThread | null>(null);
  const [showContext, setShowContext] = useState(false);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [mobileContextOpen, setMobileContextOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<CommSection>("chats");
  const pendingThreadRetryRef = useRef<string | null>(null);

  const traceThreadOpen = useCallback((step: string, phase: "input" | "output" | "error", payload?: Record<string, unknown>) => {
    const logger = phase === "error" ? console.error : console.log;
    logger(`[THREAD_OPEN][${step}] ${phase}:`, payload ?? {});
  }, []);

  useEffect(() => {
    void import("@/lib/notif-alert-prefs")
      .then((m) => m?.requestNotificationPermission?.())
      .catch(() => null);
  }, []);

  useEffect(() => {
    const sectionParam = searchParams.get("section");
    if (sectionParam && VALID_SECTIONS.includes(sectionParam as CommSection)) {
      setActiveSection(sectionParam as CommSection);
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.delete("section");
        return next;
      }, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const threadParam = searchParams.get("thread") || searchParams.get("booking") || searchParams.get("deal") || searchParams.get("tenant");
    if (!threadParam || loading) return;
    const found = threads.find(t =>
      t.id === `booking-${threadParam}` || t.id === threadParam ||
      t.bookingId === threadParam || t.dealId === threadParam ||
      t.id === `deal-${threadParam}` || t.id === `tenant-${threadParam}` ||
      t.tenantId === threadParam || t.id === `lead-${threadParam}` ||
      t.leadId === threadParam || t.contextId === threadParam ||
      t.v2ConversationId === threadParam || t.id === `v2-direct-${threadParam}` ||
      t.threadId === threadParam
    );
    if (found) {
      setSelectedThread(found);
      setActiveSection("chats");
      setSearchParams({}, { replace: true });
      pendingThreadRetryRef.current = null;
    } else if (threads.length > 0 && pendingThreadRetryRef.current !== threadParam) {
      // Thread not found — might be freshly created, reload once
      pendingThreadRetryRef.current = threadParam;
      const timer = setTimeout(() => loadThreads(), 800);
      return () => clearTimeout(timer);
    } else if (threads.length > 0 && pendingThreadRetryRef.current === threadParam) {
      // Retry already done, thread still not found — clear params to avoid stuck state
      setSearchParams({}, { replace: true });
      pendingThreadRetryRef.current = null;
    }
  }, [threads, loading, searchParams, setSearchParams, loadThreads]);

  useEffect(() => {
    const searchQ = searchParams.get("search");
    if (!searchQ || loading || threads.length === 0) return;
    const found = threads.find(t =>
      t.name.toLowerCase().includes(searchQ.toLowerCase()) ||
      t.email?.toLowerCase().includes(searchQ.toLowerCase())
    );
    if (found) { setSelectedThread(found); setActiveSection("chats"); setSearchParams({}, { replace: true }); }
  }, [threads, loading, searchParams, setSearchParams]);

  const handleSelectThread = useCallback((thread: ConversationThread) => {
    traceThreadOpen("onThreadClick", "input", {
      threadId: thread.id,
      name: thread.name,
      v2ConversationId: thread.v2ConversationId,
      peerUserId: thread.peerUserId,
      peerOrbitId: thread.peerOrbitId,
      conversationType: thread.conversationType,
      contextId: thread.contextId,
    });

    traceThreadOpen("selectedThread.guard", "input", {
      threadId: thread?.id,
      hasName: !!thread?.name,
      hasConversationId: !!thread?.v2ConversationId,
    });

    if (!thread?.id) {
      traceThreadOpen("selectedThread.guard", "error", { reason: "missing_thread_id" });
      return;
    }

    traceThreadOpen("selectedThread.guard", "output", {
      threadId: thread.id,
      valid: true,
    });

    traceThreadOpen("selectedThread.store", "input", {
      threadId: thread.id,
      previousThreadId: selectedThread?.id ?? null,
    });

    setSelectedThread(thread);

    traceThreadOpen("selectedThread.store", "output", {
      selectedThreadId: thread.id,
    });

    if (!isMobile && ["booking", "property", "listing", "deal"].includes(thread.conversationType)) {
      setShowContext(true);
    }

    traceThreadOpen("onThreadClick", "output", {
      selectedThreadId: thread.id,
      openContext: !isMobile && ["booking", "property", "listing", "deal"].includes(thread.conversationType),
    });
  }, [isMobile, selectedThread?.id, traceThreadOpen]);

  useEffect(() => {
    traceThreadOpen("threadShell.render", "output", {
      selectedThreadId: selectedThread?.id ?? null,
      headerVisible: true,
      composerVisible: !!selectedThread,
      chatPanelVisible: !!selectedThread,
      contextVisible: isMobile ? mobileContextOpen : showContext,
    });
  }, [selectedThread?.id, isMobile, mobileContextOpen, showContext, traceThreadOpen]);

  const handleBack = useCallback(() => {
    setSelectedThread(null);
    setShowContext(false);
    setMobileContextOpen(false);
  }, []);

  const handleToggleContext = useCallback(() => {
    if (isMobile) setMobileContextOpen(prev => !prev);
    else setShowContext(prev => !prev);
  }, [isMobile]);

  const handleThreadUpdate = useCallback((threadId: string, updates: Partial<ConversationThread>) => {
    updateThreadLocally(threadId, updates);
    if (selectedThread?.id === threadId) setSelectedThread(prev => prev ? { ...prev, ...updates } : null);
  }, [updateThreadLocally, selectedThread?.id]);

  const handleNewThreadCreated = useCallback(() => { loadThreads(); }, [loadThreads]);

  const handleDeleteThread = useCallback((thread: ConversationThread) => {
    if (selectedThread?.id === thread.id) {
      setSelectedThread(null);
      setShowContext(false);
    }
    deleteThread(thread);
  }, [deleteThread, selectedThread?.id]);

  const handleArchiveThread = useCallback((thread: ConversationThread) => {
    if (selectedThread?.id === thread.id) {
      setSelectedThread(null);
      setShowContext(false);
    }
    if (thread.archived) {
      unarchiveThread(thread);
    } else {
      archiveThread(thread);
    }
  }, [archiveThread, unarchiveThread, selectedThread?.id]);

  const handleMuteThread = useCallback((thread: ConversationThread) => {
    muteThread(thread);
  }, [muteThread]);

  const handleBlockThread = useCallback((thread: ConversationThread) => {
    if (selectedThread?.id === thread.id) {
      setSelectedThread(null);
      setShowContext(false);
    }
    blockThread(thread);
  }, [blockThread, selectedThread?.id]);

  const handleClearThread = useCallback((thread: ConversationThread) => {
    clearThread(thread);
  }, [clearThread]);

  const handleSectionChange = useCallback((section: CommSection) => {
    setActiveSection(section);
    if (section !== "chats") {
      setSelectedThread(null);
      setShowContext(false);
    }
  }, []);

  const showChatArea = activeSection === "chats";

  const renderSection = () => {
    switch (activeSection) {
      case "calls": return <CommCallsSection />;
      case "contacts": return <CommContactsSection />;
      case "groups": return <CommGroupsSection />;
      case "you":
        return <OrbitAccountSection />;
      default: return null;
    }
  };

  return (
    <>
      <div
        className="flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{
          height: "100dvh",
          width: "100%",
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "hsl(var(--background))",
          zIndex: 60,
          overflow: "hidden",
        }}
      >
        {/* Orbit header — clean WhatsApp-style */}
        <div
          className="flex items-center px-4 shrink-0"
          style={{
            height: 52,
            borderBottom: "1px solid hsl(var(--border) / 0.08)",
            background: "hsl(var(--background))",
          }}
        >
          {isMobile && selectedThread ? (
            <>
              <button onClick={handleBack} className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 transition-transform bg-muted/60 backdrop-blur-sm mr-2 shrink-0">
                <ArrowLeft className="w-4.5 h-4.5" />
              </button>
              <h1 className="text-sm font-semibold flex-1 line-clamp-2 break-words min-w-0" style={{ color: "hsl(var(--foreground))" }}>
                {typeof selectedThread.name === "string" ? selectedThread.name : "Contact"}
              </h1>
            </>
          ) : (
            <div className="flex items-center gap-2 flex-1">
              <button onClick={() => navigate("/")} className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 transition-transform bg-muted/60 backdrop-blur-sm mr-1 shrink-0">
                <ArrowLeft className="w-4.5 h-4.5" />
              </button>
              <h1 className="text-lg font-bold tracking-tight" style={{ color: "hsl(var(--foreground))" }}>
                Orbit
              </h1>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            {showChatArea && !selectedThread && (
              <Button
                size="sm" variant="ghost"
                className="h-8 w-8 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 p-0 rounded-full"
                style={{ color: "hsl(var(--primary))" }}
                onClick={() => setShowNewConversation(true)}
              >
                <Plus className="h-5 w-5" />
              </Button>
            )}
            {stats.unread > 0 && !selectedThread && (
              <span
                className="inline-flex min-w-5 h-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold"
                style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
              >
                {stats.unread > 99 ? "99+" : stats.unread}
              </span>
            )}
          </div>
        </div>

        {/* Main content — fills remaining space */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {!isMobile && (
            <CommNavBar active={activeSection} onChange={handleSectionChange} isMobile={false} unreadCount={stats.unread} />
          )}

          {showChatArea ? (
            <div className="flex-1 flex min-h-0 min-w-0">
              <HudConversationList
                threads={threads}
                loading={loading}
                selectedThread={selectedThread}
                onSelectThread={handleSelectThread}
                onDeleteThread={handleDeleteThread}
                onArchiveThread={handleArchiveThread}
                onMuteThread={handleMuteThread}
                onBlockThread={handleBlockThread}
                onClearThread={handleClearThread}
                onFavoriteThread={favoriteThread}
                onContactInfo={(thread) => {
                  handleSelectThread(thread);
                  if (isMobile) setMobileContextOpen(true);
                  else setShowContext(true);
                }}
                onStatusChange={(thread, status) => changeStatus(thread, status)}
                onDetails={(thread) => {
                  handleSelectThread(thread);
                  if (isMobile) setMobileContextOpen(true);
                  else setShowContext(true);
                }}
                visible={!selectedThread || !isMobile}
              />
              <div className={`flex-1 flex flex-col min-w-0 ${!selectedThread && isMobile ? "hidden" : "flex"}`}>
                <div className="flex-1 flex min-h-0">
                  <HudChatPanel
                    thread={selectedThread}
                    onBack={handleBack}
                    onToggleContext={handleToggleContext}
                    showContext={showContext || mobileContextOpen}
                    onThreadUpdate={handleThreadUpdate}
                  />
                  {showContext && selectedThread && orgId && !isMobile && (
                    <HudContextPanel thread={selectedThread} orgId={orgId} />
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              {renderSection()}
            </div>
          )}
        </div>

        {/* Mobile bottom nav */}
        {isMobile && (
          <CommNavBar active={activeSection} onChange={handleSectionChange} isMobile={true} unreadCount={stats.unread} />
        )}
      </div>

      {/* Mobile Context Sheet */}
      {isMobile && selectedThread && orgId && (
        <Sheet open={mobileContextOpen} onOpenChange={setMobileContextOpen}>
          <SheetContent side="bottom" className="h-[80dvh] p-0 rounded-t-2xl" style={{ background: "hsl(var(--background))" }}>
            <SheetHeader className="px-4 py-3" style={{ borderBottom: "1px solid hsl(var(--border) / 0.1)" }}>
              <SheetTitle className="text-sm" style={{ color: "hsl(var(--foreground))" }}>
                {typeof selectedThread.name === "string" ? selectedThread.name : "Contact"}
              </SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto">
              <HudContextPanel thread={selectedThread} orgId={orgId} />
            </div>
          </SheetContent>
        </Sheet>
      )}

      {showNewConversation && (
        <Sheet open={showNewConversation} onOpenChange={setShowNewConversation}>
          <SheetContent side="bottom" className="h-[60dvh] p-0 rounded-t-2xl" style={{ background: "hsl(var(--background))", zIndex: 70 }}>
            <SheetHeader className="px-4 py-3" style={{ borderBottom: "1px solid hsl(var(--border) / 0.1)" }}>
              <SheetTitle className="text-sm font-bold" style={{ color: "hsl(var(--foreground))" }}>
                New Conversation
              </SheetTitle>
            </SheetHeader>
            <div className="p-4">
              <AddContactByEmail
                onSaved={() => { setShowNewConversation(false); loadThreads(); }}
                onConversationReady={(conversation, peer) => {
                  setShowNewConversation(false);
                  // Build a proper ConversationThread and select it immediately
                  const newThread: ConversationThread = {
                    id: `v2-direct-${conversation.id}`,
                    conversationType: "direct",
                    sourceModule: "direct",
                    contextType: "direct",
                    contextId: conversation.id,
                    name: peer.display_name || peer.email || "Contact",
                    email: peer.email || null,
                    avatarUrl: peer.avatar_url || null,
                    threadId: conversation.id,
                    v2ConversationId: conversation.id,
                    isV2: true,
                    peerUserId: peer.id,
                    peerOrbitId: peer.orbit_id,
                    unreadCount: 0,
                  };
                  setSelectedThread(newThread);
                  setActiveSection("chats");
                  loadThreads();
                }}
              />
            </div>
          </SheetContent>
        </Sheet>
      )}
    </>
  );
};

export default CommunicationCenter;
