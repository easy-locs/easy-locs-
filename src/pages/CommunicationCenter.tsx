/**
 * CommunicationCenter — Orbit Communication System.
 * Full-screen messaging experience integrated with Easy-Locs platform.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Plus, Zap, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { useSearchParams } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

import CommNavBar, { type CommSection } from "@/components/communication-hub/CommNavBar";
import CommPlaceholderSection from "@/components/communication-hub/CommPlaceholderSection";
import CommCallsSection from "@/components/communication-hub/CommCallsSection";
import CommContactsSection from "@/components/communication-hub/CommContactsSection";
import CommPaymentsSection from "@/components/communication-hub/CommPaymentsSection";
import CommGroupsSection from "@/components/communication-hub/CommGroupsSection";
import CommNearbySection from "@/components/communication-hub/CommNearbySection";
import OrbitRadar from "@/components/orbit/OrbitRadar";
import HudConversationList from "@/components/communication-hub/HudConversationList";
import HudChatPanel from "@/components/communication-hub/HudChatPanel";
import HudContextPanel from "@/components/communication-hub/HudContextPanel";
import NewConversationDialog from "@/components/communication-hub/NewConversationDialog";
import OrbitSecuritySettings from "@/components/orbit/OrbitSecuritySettings";
import OrbitAccountSection from "@/components/communication-hub/OrbitAccountSection";
import { useConversationThreads } from "@/components/communication-hub/useConversationThreads";
import type { ConversationThread } from "@/components/communication-hub/types";
import { useOrbitCallSync } from "@/hooks/useOrbitCallSync";
import { useAuth } from "@/contexts/AuthContext";

const VALID_SECTIONS: CommSection[] = ["chats", "calls", "contacts", "payments", "groups", "nearby", "meetings", "files", "settings", "you"];

const CommunicationCenter = () => {
  const { orgId, user } = useAuth();
  const userId = user?.id;
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();

  const { threads, loading, stats, loadThreads, updateThreadLocally } = useConversationThreads();
  useOrbitCallSync();
  const [selectedThread, setSelectedThread] = useState<ConversationThread | null>(null);
  const [showContext, setShowContext] = useState(false);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [mobileContextOpen, setMobileContextOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<CommSection>("chats");
  const pendingThreadRetryRef = useRef<string | null>(null);

  useEffect(() => {
    import("@/lib/notif-alert-prefs").then(m => m.requestNotificationPermission());
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
      t.leadId === threadParam || t.contextId === threadParam
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
    setSelectedThread(thread);
    if (!isMobile && ["booking", "property", "listing", "deal"].includes(thread.conversationType)) {
      setShowContext(true);
    }
  }, [isMobile]);

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
      case "payments": return <CommPaymentsSection />;
      case "groups": return <CommGroupsSection />;
      case "nearby": return <OrbitRadar />;
      case "meetings":
      case "files":
        return <CommPlaceholderSection section={activeSection} />;
      case "settings":
        return userId ? <OrbitSecuritySettings userId={userId} /> : <CommPlaceholderSection section={activeSection} />;
      case "you":
        return <OrbitAccountSection />;
      default: return null;
    }
  };

  return (
    <DashboardLayout>
      <div
        className="flex flex-col"
        style={{
          height: isMobile ? "100dvh" : "100vh",
          width: "100%",
          position: isMobile ? "fixed" : "relative",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "hsl(var(--background))",
          zIndex: isMobile ? 50 : undefined,
          overflow: "hidden",
        }}
      >
        {/* Orbit header — compact, edge-to-edge */}
        <div
          className="flex items-center px-4 shrink-0"
          style={{
            height: isMobile ? 48 : 44,
            borderBottom: "1px solid hsl(var(--border) / 0.1)",
            background: "hsl(var(--background))",
          }}
        >
          {isMobile && selectedThread ? (
            <h1 className="text-sm font-semibold flex-1 truncate" style={{ color: "hsl(var(--foreground))" }}>
              {selectedThread.name}
            </h1>
          ) : (
            <div className="flex items-center gap-2 flex-1">
              <h1 className="text-lg font-bold tracking-tight" style={{ color: "hsl(var(--foreground))" }}>
                Orbit
              </h1>
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-semibold"
                style={{ background: "hsl(var(--primary) / 0.08)", color: "hsl(var(--primary))" }}>
                <Lock className="h-2.5 w-2.5" /> E2E
              </span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            {showChatArea && !selectedThread && (
              <Button
                size="sm" variant="ghost"
                className="h-8 w-8 p-0 rounded-full"
                style={{ color: "hsl(var(--primary))" }}
                onClick={() => setShowNewConversation(true)}
              >
                <Plus className="h-5 w-5" />
              </Button>
            )}
            {stats.unread > 0 && !selectedThread && (
              <div
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px]"
                style={{ background: "hsl(var(--primary) / 0.08)" }}
              >
                <Zap className="h-3 w-3" style={{ color: "hsl(var(--primary))" }} />
                <span className="font-semibold tabular-nums" style={{ color: "hsl(var(--primary))" }}>
                  {stats.unread}
                </span>
              </div>
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
                {selectedThread.name}
              </SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto">
              <HudContextPanel thread={selectedThread} orgId={orgId} />
            </div>
          </SheetContent>
        </Sheet>
      )}

      <NewConversationDialog open={showNewConversation} onOpenChange={setShowNewConversation} onThreadCreated={handleNewThreadCreated} />
    </DashboardLayout>
  );
};

export default CommunicationCenter;
