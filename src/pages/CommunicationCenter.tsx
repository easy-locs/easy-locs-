/**
 * CommunicationCenter — Full-screen app-like Communication Hub.
 * Feels like a dedicated messaging app inside the platform.
 */
import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Shield, Plus, Zap, Radio } from "lucide-react";
import { motion } from "framer-motion";
import { useSearchParams } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

import CommNavBar, { type CommSection } from "@/components/communication-hub/CommNavBar";
import CommPlaceholderSection from "@/components/communication-hub/CommPlaceholderSection";
import HudConversationList from "@/components/communication-hub/HudConversationList";
import HudChatPanel from "@/components/communication-hub/HudChatPanel";
import HudContextPanel from "@/components/communication-hub/HudContextPanel";
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
  const [mobileContextOpen, setMobileContextOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<CommSection>("chats");

  useEffect(() => {
    import("@/lib/notif-alert-prefs").then(m => m.requestNotificationPermission());
  }, []);

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

  const showChatArea = activeSection === "chats";

  return (
    <DashboardLayout>
      {/* Full-screen communication container — no page margins */}
      <div className="h-[calc(100dvh-3.5rem)] lg:h-[calc(100vh-5rem)] flex flex-col overflow-hidden -mx-3 sm:-mx-6 -mb-3 sm:-mb-6 -mt-3 sm:-mt-6">
        {/* ═══ Compact HUD Header ═══ */}
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 px-3 sm:px-4 py-1.5 shrink-0"
          style={{
            background: "hsl(var(--hud-bg))",
            borderBottom: "1px solid hsl(var(--hud-border) / 0.08)",
          }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
              style={{
                background: "hsl(var(--hud-surface))",
                border: "1px solid hsl(var(--hud-border) / 0.2)",
                boxShadow: "var(--hud-glow)",
              }}
            >
              <Radio className="h-3.5 w-3.5" style={{ color: "hsl(var(--hud-cyan))" }} />
            </div>
            <div className="min-w-0">
              <h1 className="text-xs font-bold flex items-center gap-1.5" style={{ color: "hsl(var(--hud-text))" }}>
                Command Center
                <Shield className="h-2.5 w-2.5" style={{ color: "hsl(var(--hud-success) / 0.5)" }} />
              </h1>
              <div className="flex items-center gap-1">
                <div className="h-1 w-1 rounded-full animate-pulse" style={{ background: "hsl(var(--hud-success))" }} />
                <span className="text-[7px] font-medium uppercase tracking-widest" style={{ color: "hsl(var(--hud-success) / 0.6)" }}>
                  Secure • Live
                </span>
              </div>
            </div>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-1.5">
            {showChatArea && (
              <Button
                size="sm" variant="outline"
                className="h-6 gap-1 text-[10px] rounded-lg"
                style={{
                  background: "hsl(var(--hud-surface))",
                  borderColor: "hsl(var(--hud-border) / 0.2)",
                  color: "hsl(var(--hud-cyan))",
                }}
                onClick={() => setShowNewConversation(true)}
              >
                <Plus className="h-3 w-3" />
                <span className="hidden sm:inline">New</span>
              </Button>
            )}
            {stats.unread > 0 && (
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px]" style={{
                background: "hsl(var(--hud-cyan) / 0.1)",
                border: "1px solid hsl(var(--hud-cyan) / 0.2)",
              }}>
                <Zap className="h-2.5 w-2.5" style={{ color: "hsl(var(--hud-cyan))" }} />
                <span className="font-bold tabular-nums" style={{ color: "hsl(var(--hud-cyan))" }}>{stats.unread}</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* ═══ Main content area ═══ */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden" style={{ background: "hsl(var(--hud-bg))" }}>
          {/* Desktop: horizontal layout with nav strip */}
          {/* Mobile: content area + bottom nav */}
          <div className="flex-1 flex min-h-0">
            {/* Desktop nav strip */}
            {!isMobile && (
              <CommNavBar active={activeSection} onChange={setActiveSection} isMobile={false} unreadCount={stats.unread} />
            )}

            {/* Section content */}
            {showChatArea ? (
              <div className="flex-1 flex min-h-0 min-w-0">
                {/* Layer 1: Conversation List */}
                <HudConversationList
                  threads={threads}
                  loading={loading}
                  selectedThread={selectedThread}
                  onSelectThread={handleSelectThread}
                  visible={!selectedThread || !isMobile}
                />

                {/* Layer 2 + 3 */}
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
              <CommPlaceholderSection section={activeSection} />
            )}
          </div>

          {/* Mobile bottom nav */}
          {isMobile && (
            <CommNavBar active={activeSection} onChange={setActiveSection} isMobile={true} unreadCount={stats.unread} />
          )}
        </div>
      </div>

      {/* Mobile Context Sheet */}
      {isMobile && selectedThread && orgId && (
        <Sheet open={mobileContextOpen} onOpenChange={setMobileContextOpen}>
          <SheetContent side="bottom" className="h-[80dvh] p-0 rounded-t-2xl" style={{ background: "hsl(var(--hud-bg))" }}>
            <SheetHeader className="px-4 py-3" style={{ borderBottom: "1px solid hsl(var(--hud-border) / 0.1)" }}>
              <SheetTitle className="text-sm" style={{ color: "hsl(var(--hud-text))" }}>Intelligence — {selectedThread.name}</SheetTitle>
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
