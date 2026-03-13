/**
 * CommunicationCenter — True full-screen messaging app experience.
 * Zero margins, full viewport, native feel.
 * Reads ?section= param from orb navigation for correct tab activation.
 */
import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Plus, Zap } from "lucide-react";
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
import HudConversationList from "@/components/communication-hub/HudConversationList";
import HudChatPanel from "@/components/communication-hub/HudChatPanel";
import HudContextPanel from "@/components/communication-hub/HudContextPanel";
import NewConversationDialog from "@/components/communication-hub/NewConversationDialog";
import { useConversationThreads } from "@/components/communication-hub/useConversationThreads";
import type { ConversationThread } from "@/components/communication-hub/types";
import { useAuth } from "@/contexts/AuthContext";

const VALID_SECTIONS: CommSection[] = ["chats", "calls", "contacts", "payments", "groups", "meetings", "files", "settings"];

const CommunicationCenter = () => {
  const { orgId } = useAuth();
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();

  const { threads, loading, stats, loadThreads, updateThreadLocally } = useConversationThreads();
  const [selectedThread, setSelectedThread] = useState<ConversationThread | null>(null);
  const [showContext, setShowContext] = useState(false);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [mobileContextOpen, setMobileContextOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<CommSection>("chats");

  useEffect(() => {
    import("@/lib/notif-alert-prefs").then(m => m.requestNotificationPermission());
  }, []);

  // ═══ Read ?section= param from orb navigation ═══
  useEffect(() => {
    const sectionParam = searchParams.get("section");
    if (sectionParam && VALID_SECTIONS.includes(sectionParam as CommSection)) {
      setActiveSection(sectionParam as CommSection);
      // Clean up the param so back navigation works cleanly
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.delete("section");
        return next;
      }, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Deep-link
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
    if (found) { setSelectedThread(found); setActiveSection("chats"); setSearchParams({}, { replace: true }); }
  }, [threads, loading, searchParams, setSearchParams]);

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

  // Section change handler — syncs nav state
  const handleSectionChange = useCallback((section: CommSection) => {
    setActiveSection(section);
    // Reset thread selection when switching away from chats
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
      case "nearby": return <CommNearbySection />;
      case "meetings":
      case "files":
      case "settings":
        return <CommPlaceholderSection section={activeSection} />;
      default: return null;
    }
  };

  return (
    <DashboardLayout>
      <div
        className="flex flex-col overflow-hidden -mx-3 sm:-mx-6 -mb-3 sm:-mb-6 -mt-3 sm:-mt-6"
        style={{
          height: isMobile ? "100dvh" : "calc(100vh - 4rem)",
          background: "hsl(var(--hud-bg))",
        }}
      >
        {/* ═══ Minimal header ═══ */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center px-4 shrink-0"
          style={{
            height: isMobile ? 48 : 44,
            borderBottom: "1px solid hsl(var(--hud-border) / 0.06)",
          }}
        >
          <h1
            className="text-sm font-semibold flex-1"
            style={{ color: "hsl(var(--hud-text))" }}
          >
            {isMobile && selectedThread ? selectedThread.name : "Messages"}
          </h1>
          <div className="flex items-center gap-2">
            {showChatArea && !selectedThread && (
              <Button
                size="sm" variant="ghost"
                className="h-8 w-8 p-0 rounded-full"
                style={{ color: "hsl(var(--hud-cyan))" }}
                onClick={() => setShowNewConversation(true)}
              >
                <Plus className="h-5 w-5" />
              </Button>
            )}
            {stats.unread > 0 && !selectedThread && (
              <div
                className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px]"
                style={{ background: "hsl(var(--hud-cyan) / 0.08)" }}
              >
                <Zap className="h-3 w-3" style={{ color: "hsl(var(--hud-cyan))" }} />
                <span className="font-semibold tabular-nums" style={{ color: "hsl(var(--hud-cyan))" }}>
                  {stats.unread}
                </span>
              </div>
            )}
          </div>
        </motion.div>

        {/* ═══ Main content ═══ */}
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
            renderSection()
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
          <SheetContent side="bottom" className="h-[80dvh] p-0 rounded-t-2xl" style={{ background: "hsl(var(--hud-bg))" }}>
            <SheetHeader className="px-4 py-3" style={{ borderBottom: "1px solid hsl(var(--hud-border) / 0.08)" }}>
              <SheetTitle className="text-sm" style={{ color: "hsl(var(--hud-text))" }}>
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
