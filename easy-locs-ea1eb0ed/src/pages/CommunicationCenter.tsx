/**
 * CommunicationCenter — Orbit Communication System.
 * Full-screen messaging experience — NO sidebar, standalone layout.
 */
import { useEffect, useCallback, useRef, lazy, Suspense, useState } from "react";
import { Plus, ArrowLeft, UsersRound, Megaphone } from "lucide-react";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";
import E2EEBadge from "@/components/orbit/E2EEBadge";
import { useUiEngine } from "@/hooks/useUiEngine";
import ErrorBoundary from "@/components/ErrorBoundary";

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
import { ensureOrbitProfile } from "@/lib/orbit/ensureOrbitProfile";
import { getAllOrbitThreadTypes } from "@/lib/taxonomy/wiring-helpers";
import PillarPage from "@/components/layout/PillarPage";

const CONTEXT_PANEL_THREAD_TYPES = new Set(
  getAllOrbitThreadTypes().flatMap(o => o.threadTypes)
);

const VALID_SECTIONS: CommSection[] = ["chats", "calls", "groups", "you"];

export const CommunicationCenter = () => {
  useUiEngine({ enabled: true, autoRun: true, observeDom: true });
  const { orgId, user } = useAuth();
  const navigate = useNavigate();
  const { conversationId: routeConversationId } = useParams<{ conversationId?: string }>();
  const userId = user?.id;
  const { t } = useI18n();
  const [profileReady, setProfileReady] = useState(!!user?.id);

  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) { setProfileReady(false); setProfileError(null); return; }
    setProfileReady(true);
    setProfileError(null);
    let cancelled = false;
    const meta = user.user_metadata as Record<string, unknown> | undefined;
    ensureOrbitProfile({
      userId: user.id,
      email: user.email,
      displayName: (meta?.display_name as string) ?? null,
      avatarUrl: (meta?.avatar_url as string) ?? null,
    })
      .then((result) => {
        if (cancelled) return;
        if (!result) {
          console.warn("[CommunicationCenter] ensureOrbitProfile returned no data, entering read-only mode");
          setProfileError("Profile setup incomplete");
        } else if (result.degraded) {
          console.warn("[CommunicationCenter] ensureOrbitProfile returned degraded profile, entering read-only mode");
          setProfileError("Profile setup incomplete — limited functionality");
        }
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn("[CommunicationCenter] ensureOrbitProfile failed, entering read-only mode:", err instanceof Error ? err.message : err);
        setProfileError(err instanceof Error ? err.message : "Profile setup failed");
      });
    return () => { cancelled = true; };
  }, [user?.id]);
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();

  const { threads, loading, error: threadError, stats, realtimeStatus, loadThreads, updateThreadLocally } = useConversationThreads({ enabled: profileReady });
  const { archiveThread, unarchiveThread, deleteThread, muteThread, blockThread, clearThread, favoriteThread, changeStatus, markUnread } = useThreadActions({ updateThreadLocally, loadThreads });
  const selectedThread = useThreadSelectionStore(s => s.selectedThread);
  const setSelectedThread = useThreadSelectionStore(s => s.selectThread);
  const updateSelectedThread = useThreadSelectionStore(s => s.updateSelectedThread);
  const [showContext, setShowContext] = useState(false);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [mobileContextOpen, setMobileContextOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<CommSection>("chats");
  const [groupMode, setGroupMode] = useState<"group" | "community" | null>(null);
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
    const entityParam = searchParams.get("entity");
    const entityName = searchParams.get("name");

    // Handle Radar → Orbit fallback: /orbit?entity=<id>&name=<name> when no
    // direct thread could be resolved. We surface the entity context in the
    // chats section so the user lands somewhere coherent instead of an empty
    // screen, and clear the params so back-navigation doesn't loop.
    if (entityParam && !threadParam) {
      setActiveSection("chats");
      const entityThread = threads.find(t => t.entityId === entityParam);
      if (entityThread && selectedThreadIdRef.current !== entityThread.id) {
        setSelectedThread(entityThread);
      } else if (!entityThread && entityName) {
        toast.info(`Opening Orbit for ${entityName} — no direct conversation yet.`);
      }
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.delete("entity");
        next.delete("name");
        return next;
      }, { replace: true });
      return;
    }

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
    if (!isMobileRef.current && CONTEXT_PANEL_THREAD_TYPES.has(thread.conversationType)) {
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
    if (selectedThreadIdRef.current === threadId) {
      const volatileKeys = new Set(['unreadCount', 'lastMessage', 'lastMessageTime',
        'lastMessagePreview', 'lastMessageTimestamp', 'updatedAt']);
      const hasUiChange = Object.keys(updates).some(k => !volatileKeys.has(k));
      if (hasUiChange) updateSelectedThreadRef.current(updates);
    }
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
      <div className="flex flex-col items-center justify-center gap-4 px-6 text-center min-h-[calc(100dvh-56px)] w-full bg-background">
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-2 bg-accent/8">
          <svg viewBox="0 0 24 24" fill="none" className="w-10 h-10 text-accent">
            <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h2 className="text-xl font-bold text-foreground">{t("orbit.messaging")}</h2>
        <p className="text-sm max-w-xs leading-relaxed text-muted-foreground">
          {t("orbit.messaging_desc")}
        </p>
        <Button
          onClick={() => navigate("/login")}
          className="mt-2 h-11 px-8 rounded-xl font-semibold min-h-[44px] bg-accent text-accent-foreground"
        >
          {t("orbit.sign_in")}
        </Button>
      </div>
    );
  }

  const renderSection = () => {
    const fallback = (
      <div className="p-4 space-y-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full skeleton-premium shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-28 rounded skeleton-premium" />
              <div className="h-2.5 w-40 rounded skeleton-premium" />
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
      <PillarPage noPadding noSafeArea className="flex flex-col h-[100dvh] w-full bg-background overflow-hidden overflow-x-clip">
        <ErrorBoundary>
        {!(isMobile && activeSection === "chats" && selectedThread) && (
          <div className="shrink-0 bg-background">
            <div
              className="flex items-center px-4 gap-3 h-[52px] border-b border-border/8"
              style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
            >
              <Button
                size="sm" variant="ghost"
                className="h-9 w-9 p-0 rounded-xl touch-target shrink-0 text-foreground hover:bg-muted/40"
                onClick={() => { if (window.history.length > 1) navigate(-1); else navigate("/"); }}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-base font-bold text-foreground">{t("orbit.title")}</span>
              </div>
              <div className="flex items-center gap-1">
                <E2EEBadge compact />
                {showChatArea && !selectedThread && !profileError && (
                  <Button
                    size="sm" variant="ghost"
                    className="h-9 w-9 p-0 rounded-xl touch-target text-foreground hover:bg-muted/40"
                    onClick={() => setShowNewConversation(true)}
                  >
                    <Plus className="h-5 w-5" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {realtimeStatus === "disconnected" && (
          <div className="px-4 py-1.5 text-xs shrink-0 flex items-center gap-2 bg-accent/6 text-accent border-b border-accent/10">
            <span className="w-2 h-2 rounded-full shrink-0 bg-accent" />
            {t("orbit.reconnecting") || "Reconnecting..."}
          </div>
        )}

        {profileError && (
          <div className="px-4 py-1.5 text-xs shrink-0 flex items-center gap-2 bg-amber-500/8 text-amber-600 dark:text-amber-400 border-b border-amber-500/10">
            <span className="w-2 h-2 rounded-full shrink-0 bg-amber-500" />
            {t("orbit.read_only_mode") || "Read-only mode — profile setup incomplete"}
          </div>
        )}

        {threadError && (
          <div className="px-4 py-2 text-xs shrink-0 bg-destructive/6 text-destructive border-b border-destructive/8">
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
                error={threadError}
                onRetry={loadThreads}
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
                    onBlockThread={handleBlockThread}
                    onClearThread={handleClearThread}
                    onMuteThread={handleMuteThread}
                    readOnly={!!profileError}
                  />
                  {showContext && selectedThread && !isMobile && (
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

        </ErrorBoundary>
      </PillarPage>

      {/* Mobile Context Sheet */}
      {isMobile && selectedThread && orgId && (
        <Sheet open={mobileContextOpen} onOpenChange={setMobileContextOpen}>
          <SheetContent side="bottom" className="h-[80dvh] p-0 rounded-t-2xl" style={{ background: "hsl(var(--background))" }}>
            <SheetHeader className="px-4 py-3" style={{ borderBottom: "1px solid hsl(var(--border) / 0.1)" }}>
              <SheetTitle className="text-sm break-words" style={{ color: "hsl(var(--foreground))" }}>
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

      {groupMode && (
        <Sheet open={!!groupMode} onOpenChange={(o) => { if (!o) setGroupMode(null); }}>
          <SheetContent side="bottom" className="h-[60dvh] p-0 rounded-t-3xl" style={{ background: "hsl(var(--background))" }}>
            <SheetHeader className="px-4 py-3" style={{ borderBottom: "1px solid hsl(var(--border) / 0.1)" }}>
              <SheetTitle className="text-base font-bold" style={{ color: "hsl(var(--foreground))" }}>
                {groupMode === "group" ? (t("orbit.new_group") || "New Group") : (t("orbit.new_community") || "New Community")}
              </SheetTitle>
            </SheetHeader>
            <div className="px-4 pt-4 space-y-4">
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: "hsl(var(--muted-foreground))" }}>
                  {groupMode === "group" ? (t("orbit.group_name") || "Group name") : (t("orbit.community_name") || "Community name")}
                </label>
                <input
                  placeholder={groupMode === "group" ? "My Group" : "My Community"}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none bg-muted/20 border border-border/30 text-foreground"
                />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: "hsl(var(--muted-foreground))" }}>
                  {t("orbit.description") || "Description (optional)"}
                </label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none bg-muted/20 border border-border/30 text-foreground"
                />
              </div>
              <button
                onClick={() => { toast.success(groupMode === "group" ? (t("orbit.group_created") || "Group created") : (t("orbit.community_created") || "Community created")); setGroupMode(null); }}
                className="w-full py-3 rounded-xl text-sm font-semibold"
                style={{ background: "hsl(var(--accent))", color: "hsl(226 24% 14%)" }}
              >
                {t("orbit.create") || "Create"}
              </button>
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
                onClick={() => { haptic("light"); setShowNewConversation(false); setGroupMode("group"); }}
                className="w-full flex items-center gap-3 py-2.5 active:bg-muted/10 rounded-lg transition-colors"
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "hsl(var(--accent) / 0.1)" }}>
                  <UsersRound className="h-5 w-5" style={{ color: "hsl(var(--accent))" }} />
                </div>
                <span className="text-[0.875rem] font-medium" style={{ color: "hsl(var(--foreground))" }}>
                  {t("orbit.new_group")}
                </span>
              </button>
              <button
                onClick={() => { haptic("light"); setShowNewConversation(false); setGroupMode("community"); }}
                className="w-full flex items-center gap-3 py-2.5 active:bg-muted/10 rounded-lg transition-colors"
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "hsl(var(--accent) / 0.1)" }}>
                  <Megaphone className="h-5 w-5" style={{ color: "hsl(var(--accent))" }} />
                </div>
                <span className="text-[0.875rem] font-medium" style={{ color: "hsl(var(--foreground))" }}>
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
