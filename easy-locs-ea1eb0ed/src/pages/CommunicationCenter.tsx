/**
 * CommunicationCenter — Orbit Communication System.
 * Full-screen messaging experience — NO sidebar, standalone layout.
 */
import { useEffect, useCallback, useRef, lazy, Suspense, useState } from "react";
import { Plus, ArrowLeft, UsersRound, Megaphone } from "lucide-react";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";
import E2EEBadge from "@/components/orbit/E2EEBadge";

import { useSearchParams, useNavigate, useParams } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

import CommNavBar, { type CommSection } from "@/components/communication-hub/CommNavBar";

const CommCallsSection = lazy(() => import("@/components/communication-hub/CommCallsSection"));
const CommGroupsSection = lazy(() => import("@/components/communication-hub/CommGroupsSection"));
const OrbitAccountSection = lazy(() => import("@/components/communication-hub/OrbitAccountSection"));
const HudContextPanel = lazy(() => import("@/components/communication-hub/HudContextPanel"));

// Core chat — always needed when a conversation is selected
import HudConversationList from "@/components/communication-hub/HudConversationList";
import HudChatPanel from "@/components/communication-hub/HudChatPanel";
import { AddContactByEmail } from "@/components/chat/AddContactByEmail";
import { useConversationThreads } from "@/components/communication-hub/useConversationThreads";
import { useThreadActions } from "@/hooks/useThreadActions";
import type { ConversationThread } from "@/components/communication-hub/types";
import SEOHead from "@/components/SEOHead";
import { useThreadSelectionStore } from "@/stores/orbit/thread-selection.store";
// useOrbitCallSync removed — centralized in RealtimeHubGuard
import { useAuth } from "@/contexts/AuthContext";

const VALID_SECTIONS: CommSection[] = ["chats", "calls", "groups", "you"];

export const CommunicationCenter = () => {
  const { orgId, user } = useAuth();
  const navigate = useNavigate();
  const { conversationId: routeConversationId } = useParams<{ conversationId?: string }>();
  const userId = user?.id;
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();

  const { threads, loading, error: threadError, stats, loadThreads, updateThreadLocally } = useConversationThreads();
  const { archiveThread, unarchiveThread, deleteThread, muteThread, blockThread, clearThread, favoriteThread, changeStatus, markUnread } = useThreadActions({ updateThreadLocally, loadThreads });
  const selectedThread = useThreadSelectionStore(s => s.selectedThread);
  const setSelectedThread = useThreadSelectionStore(s => s.selectThread);
  const updateSelectedThread = useThreadSelectionStore(s => s.updateSelectedThread);
  const [showContext, setShowContext] = useState(false);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [mobileContextOpen, setMobileContextOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<CommSection>("chats");
  const pendingThreadRetryRef = useRef<string | null>(null);
  const pendingRetryCountRef = useRef(0);
  const selectedThreadIdRef = useRef(selectedThread?.id);
  selectedThreadIdRef.current = selectedThread?.id;
  const updateSelectedThreadRef = useRef(updateSelectedThread);
  updateSelectedThreadRef.current = updateSelectedThread;

  useEffect(() => {
    if (activeSection !== "chats" && selectedThread) {
      setSelectedThread(null);
      setShowContext(false);
    }
  }, [activeSection]);

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
      t.leadId === threadParam || t.entityId === threadParam ||
      t.conversationId === threadParam || t.id === `v2-direct-${threadParam}`
    );
    if (found) {
      if (selectedThreadIdRef.current !== found.id) setSelectedThread(found);
      setActiveSection("chats");
      setSearchParams({}, { replace: true });
      pendingThreadRetryRef.current = null;
      pendingRetryCountRef.current = 0;
    } else if (threads.length > 0 && pendingRetryCountRef.current < 2) {
      if (pendingThreadRetryRef.current !== threadParam) {
        pendingThreadRetryRef.current = threadParam;
        pendingRetryCountRef.current = 0;
      }
      pendingRetryCountRef.current++;
      const timer = setTimeout(() => loadThreads(), 800);
      return () => clearTimeout(timer);
    } else if (threads.length > 0) {
      setSearchParams({}, { replace: true });
      pendingThreadRetryRef.current = null;
      pendingRetryCountRef.current = 0;
    }
  }, [threads, loading, searchParams, setSearchParams, loadThreads]);

  // ── Route param: /orbit/:conversationId ──
  useEffect(() => {
    if (!routeConversationId || loading) return;
    const found = threads.find(t =>
      t.conversationId === routeConversationId || t.id === routeConversationId ||
      t.id === `v2-direct-${routeConversationId}`
    );
    if (found) {
      if (selectedThreadIdRef.current !== found.id) setSelectedThread(found);
      setActiveSection("chats");
    }
  }, [routeConversationId, threads, loading, loadThreads]);

  useEffect(() => {
    const searchQ = searchParams.get("search");
    if (!searchQ || loading || threads.length === 0) return;
    const found = threads.find(t =>
      t.name.toLowerCase().includes(searchQ.toLowerCase()) ||
      t.email?.toLowerCase().includes(searchQ.toLowerCase())
    );
    if (found) {
      if (selectedThreadIdRef.current !== found.id) setSelectedThread(found);
      setActiveSection("chats");
      setSearchParams({}, { replace: true });
    }
  }, [threads, loading, searchParams, setSearchParams]);

  const isMobileRef = useRef(isMobile);
  isMobileRef.current = isMobile;

  const handleSelectThread = useCallback((thread: ConversationThread) => {
    if (!thread?.id) return;
    setSelectedThread(thread);
    if (!isMobileRef.current && ["booking", "property", "property_lead", "property_viewing", "property_manager", "property_landlord", "property_maintenance", "listing", "deal"].includes(thread.conversationType)) {
      setShowContext(true);
    }
  }, []);

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
    if (selectedThreadIdRef.current === threadId) updateSelectedThreadRef.current(updates);
  }, [updateThreadLocally]);

  const handleNewThreadCreated = useCallback(() => { loadThreads(); }, [loadThreads]);

  const handleDeleteThread = useCallback((thread: ConversationThread) => {
    if (selectedThreadIdRef.current === thread.id) {
      setSelectedThread(null);
      setShowContext(false);
    }
    deleteThread(thread);
  }, [deleteThread]);

  const handleArchiveThread = useCallback((thread: ConversationThread) => {
    if (selectedThreadIdRef.current === thread.id) {
      setSelectedThread(null);
      setShowContext(false);
    }
    if (thread.archived) {
      unarchiveThread(thread);
    } else {
      archiveThread(thread);
    }
  }, [archiveThread, unarchiveThread]);

  const handleMuteThread = useCallback((thread: ConversationThread) => {
    muteThread(thread);
  }, [muteThread]);

  const handleBlockThread = useCallback((thread: ConversationThread) => {
    if (selectedThreadIdRef.current === thread.id) {
      setSelectedThread(null);
      setShowContext(false);
    }
    blockThread(thread);
  }, [blockThread]);

  const handleClearThread = useCallback((thread: ConversationThread) => {
    clearThread(thread);
  }, [clearThread]);

  const handleContactInfo = useCallback((thread: ConversationThread) => {
    handleSelectThread(thread);
    if (isMobileRef.current) setMobileContextOpen(true);
    else setShowContext(true);
  }, [handleSelectThread]);

  const handleStatusChange = useCallback((thread: ConversationThread, status: string) => {
    changeStatus(thread, status);
  }, [changeStatus]);

  const handleSectionChange = useCallback((section: CommSection) => {
    setActiveSection(section);
    if (section !== "chats") {
      setSelectedThread(null);
      setShowContext(false);
    }
  }, []);

  const showChatArea = activeSection === "chats";

  if (!user) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-4 px-6 text-center"
        style={{
          minHeight: "calc(100dvh - 56px)",
          width: "100%",
          background: "hsl(var(--background))",
        }}
      >
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center mb-2"
          style={{ background: "hsl(38 65% 56% / 0.1)" }}
        >
          <svg viewBox="0 0 24 24" fill="none" className="w-10 h-10" style={{ color: "hsl(38 65% 56%)" }}>
            <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h2 className="text-xl font-bold" style={{ color: "hsl(var(--foreground))" }}>{t("orbit.messaging")}</h2>
        <p className="text-sm max-w-xs leading-relaxed" style={{ color: "hsl(var(--muted-foreground))" }}>
          {t("orbit.messaging_desc")}
        </p>
        <Button
          onClick={() => navigate("/login")}
          className="mt-2 h-11 px-8 rounded-xl font-semibold min-h-[44px]"
          style={{ background: "hsl(38 65% 56%)", color: "hsl(220 40% 18%)" }}
        >
          {t("orbit.sign_in")}
        </Button>
      </div>
    );
  }

  const renderSection = () => {
    const fallback = (
      <div className="p-4 space-y-3 animate-pulse">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-muted/40 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-28 rounded bg-muted/40" />
              <div className="h-2.5 w-40 rounded bg-muted/30" />
            </div>
          </div>
        ))}
      </div>
    );
    switch (activeSection) {
      case "calls": return <Suspense fallback={fallback}><CommCallsSection onOpenThread={async (peerId, peerName) => {
          if (!userId) return;
          try {
            const { getOrCreateDirectThread } = await import("@/lib/direct-thread");
            const result = await getOrCreateDirectThread({ currentUserId: userId, targetUserId: peerId, targetName: peerName });
            if (result?.v2ConversationId) {
              const existing = threads.find(t => t.v2ConversationId === result.v2ConversationId || t.id === result.v2ConversationId);
              if (existing) { handleSelectThread(existing); setActiveSection("chats"); }
              else { await loadThreads(); setSearchParams({ thread: result.v2ConversationId }); setActiveSection("chats"); }
            }
          } catch (e) { console.error("[calls→thread]", e); }
        }} /></Suspense>;
      case "groups": return <Suspense fallback={fallback}><CommGroupsSection /></Suspense>;
      case "you":
        return <Suspense fallback={fallback}><OrbitAccountSection /></Suspense>;
      default: return null;
    }
  };

  return (
    <>
      <SEOHead title={`${t("orbit.title")} — Easy-Locs`} description={t("orbit.seo_desc")} noindex />
      <div
        className="flex flex-col pillar-page"
        onClick={(e) => e.stopPropagation()}
        style={{
          height: "100dvh",
          width: "100%",
          background: "hsl(var(--background))",
          overflow: "hidden",
        }}
      >
        {!(isMobile && activeSection === "chats" && selectedThread) && (
          <div className="shrink-0" style={{ background: "hsl(var(--background))" }}>
            <div
              className="flex items-center px-4 gap-2"
              style={{
                height: 52,
                borderBottom: "1px solid hsl(var(--border) / 0.06)",
                paddingTop: "env(safe-area-inset-top, 0px)",
              }}
            >
              <Button
                size="sm" variant="ghost"
                className="h-9 w-9 p-0 rounded-full touch-target shrink-0"
                style={{ color: "hsl(var(--foreground))" }}
                onClick={() => { if (window.history.length > 1) navigate(-1); else navigate("/"); }}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex-1 min-w-0" />
              <div className="flex items-center gap-1">
                <E2EEBadge compact />
                {showChatArea && !selectedThread && (
                  <Button
                    size="sm" variant="ghost"
                    className="h-9 w-9 p-0 rounded-full touch-target"
                    style={{ color: "hsl(var(--foreground))" }}
                    onClick={() => setShowNewConversation(true)}
                  >
                    <Plus className="h-5 w-5" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {threadError && (
          <div
            className="px-4 py-2 text-xs shrink-0"
            style={{ background: "hsl(var(--destructive) / 0.08)", color: "hsl(var(--destructive))", borderBottom: "1px solid hsl(var(--destructive) / 0.12)" }}
          >
            {t("orbit.load_error")}: {threadError} —{" "}
            <button onClick={() => loadThreads()} className="underline font-bold">{t("orbit.retry")}</button>
          </div>
        )}

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
                onMarkUnreadThread={markUnread}
                onContactInfo={handleContactInfo}
                onStatusChange={handleStatusChange}
                onDetails={handleContactInfo}
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
                    <Suspense fallback={null}>
                      <HudContextPanel thread={selectedThread} orgId={orgId} />
                    </Suspense>
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

        {isMobile && !(activeSection === "chats" && selectedThread) && (
          <div className="shrink-0" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
            <CommNavBar active={activeSection} onChange={handleSectionChange} isMobile={true} unreadCount={stats.unread} />
          </div>
        )}

      </div>

      {/* Mobile Context Sheet */}
      {isMobile && selectedThread && orgId && (
        <Sheet open={mobileContextOpen} onOpenChange={setMobileContextOpen}>
          <SheetContent side="bottom" className="h-[80dvh] p-0 rounded-t-2xl" style={{ background: "hsl(var(--background))" }}>
            <SheetHeader className="px-4 py-3" style={{ borderBottom: "1px solid hsl(var(--border) / 0.1)" }}>
              <SheetTitle className="text-sm truncate" style={{ color: "hsl(var(--foreground))" }}>
                {typeof selectedThread.name === "string" ? selectedThread.name : t("orbit.contact")}
              </SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto">
              <Suspense fallback={null}>
                <HudContextPanel thread={selectedThread} orgId={orgId} />
              </Suspense>
            </div>
          </SheetContent>
        </Sheet>
      )}

      {showNewConversation && (
        <Sheet open={showNewConversation} onOpenChange={setShowNewConversation}>
          <SheetContent side="bottom" className="h-[70dvh] p-0 rounded-t-3xl" style={{ background: "hsl(var(--background))" }}>
            <SheetHeader className="px-4 py-3" style={{ borderBottom: "1px solid hsl(var(--border) / 0.1)" }}>
              <SheetTitle className="text-base font-bold" style={{ color: "hsl(var(--foreground))" }}>
                {t("orbit.new_conversation")}
              </SheetTitle>
            </SheetHeader>

            {/* Quick actions */}
            <div className="px-4 pt-3 pb-1 space-y-0.5">
              <button
                onClick={() => { haptic("light"); toast.info(t("orbit.new_group")); }}
                className="w-full flex items-center gap-3 py-2.5 active:bg-muted/10 rounded-lg transition-colors"
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "hsl(38 65% 56% / 0.1)" }}>
                  <UsersRound className="h-5 w-5" style={{ color: "hsl(38 65% 56%)" }} />
                </div>
                <span className="text-[14px] font-medium" style={{ color: "hsl(var(--foreground))" }}>
                  {t("orbit.new_group")}
                </span>
              </button>
              <button
                onClick={() => { haptic("light"); toast.info(t("orbit.new_community")); }}
                className="w-full flex items-center gap-3 py-2.5 active:bg-muted/10 rounded-lg transition-colors"
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "hsl(38 65% 56% / 0.1)" }}>
                  <Megaphone className="h-5 w-5" style={{ color: "hsl(38 65% 56%)" }} />
                </div>
                <span className="text-[14px] font-medium" style={{ color: "hsl(var(--foreground))" }}>
                  {t("orbit.new_community")}
                </span>
              </button>
            </div>

            <div className="h-px mx-4 my-2" style={{ background: "hsl(var(--border) / 0.1)" }} />

            <p className="px-4 pb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground) / 0.4)" }}>
              {t("orbit.find_contact")}
            </p>

            <div className="px-4 pb-2">
              <AddContactByEmail
                onSaved={() => { setShowNewConversation(false); loadThreads(); }}
                onConversationReady={(conversation, peer) => {
                  setShowNewConversation(false);
                  // Build a proper ConversationThread and select it immediately
                  const newThread: ConversationThread = {
                    id: `v2-direct-${conversation.id}`,
                    conversationType: "direct",
                    sourceModule: "direct",
                    entityType: "direct",
                    entityId: conversation.id,
                    contextType: "direct",
                    contextId: conversation.id,
                    name: peer.display_name || peer.email || t("orbit.contact"),
                    email: peer.email || null,
                    avatarUrl: peer.avatar_url || null,
                    threadId: conversation.id,
                    conversationId: conversation.id,
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
