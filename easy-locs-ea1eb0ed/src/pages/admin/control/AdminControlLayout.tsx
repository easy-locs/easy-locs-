import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  CONTROL_SECTIONS,
  DEFAULT_SECTION,
  isControlSectionId,
  type ControlSectionId,
} from "./sections";
import { ControlProvider, useControlContext } from "./ControlContext";
import ControlSidebar from "./ControlSidebar";
import ControlTopBar from "./ControlTopBar";
import ControlCommandPalette from "./ControlCommandPalette";
import ControlShortcutsDialog from "./ControlShortcutsDialog";
import ControlDetailDrawer from "./ControlDetailDrawer";
import { useControlHotkeys } from "./useControlHotkeys";
import OverviewSection from "./sections/OverviewSection";
import AgentsSection from "./sections/AgentsSection";
import RunsSection from "./sections/RunsSection";
import CommandSection from "./sections/CommandSection";
import ApprovalsSection from "./sections/ApprovalsSection";
import AutonomySection from "./sections/AutonomySection";
import EnginesSection from "./sections/EnginesSection";
import MasterSection from "./sections/MasterSection";
import TasksSection from "./sections/TasksSection";
import WatchdogSection from "./sections/WatchdogSection";
import RuntimeProofSection from "./sections/RuntimeProofSection";
import WiringMapSection from "./sections/WiringMapSection";

const SECTION_COMPONENTS: Record<ControlSectionId, () => JSX.Element> = {
  overview: OverviewSection,
  tasks: TasksSection,
  agents: AgentsSection,
  approvals: ApprovalsSection,
  watchdog: WatchdogSection,
  proof: RuntimeProofSection,
  wiring: WiringMapSection,
  runs: RunsSection,
  command: CommandSection,
  autonomy: AutonomySection,
  engines: EnginesSection,
  master: MasterSection,
};

function ControlShellInner() {
  const { section } = useParams<{ section?: string }>();
  const navigate = useNavigate();
  const { closeDetail } = useControlContext();

  const activeSection: ControlSectionId = isControlSectionId(section)
    ? section
    : DEFAULT_SECTION;

  // Normalize unknown / missing path to canonical default section
  useEffect(() => {
    if (!section || !isControlSectionId(section)) {
      navigate(`/admin/control/${DEFAULT_SECTION}`, { replace: true });
    }
  }, [section, navigate]);

  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useControlHotkeys({
    onToggleSidebar: () => setCollapsed((c) => !c),
    onCloseDetail: closeDetail,
  });

  const SectionComponent = SECTION_COMPONENTS[activeSection];

  return (
    <div
      data-testid="admin-control-shell"
      data-section={activeSection}
      className="flex h-[100dvh] w-full flex-col bg-background text-foreground"
    >
      <div className="flex flex-1 overflow-hidden">
        <div className="hidden md:flex">
          <ControlSidebar
            activeSection={activeSection}
            collapsed={collapsed}
            onToggle={() => setCollapsed((c) => !c)}
          />
        </div>

        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetContent side="left" className="w-[260px] p-0">
            <div onClickCapture={() => setMobileNavOpen(false)} className="h-full">
              <ControlSidebar
                activeSection={activeSection}
                collapsed={false}
                onToggle={() => setMobileNavOpen(false)}
              />
            </div>
          </SheetContent>
        </Sheet>

        <div className="flex min-w-0 flex-1 flex-col">
          <ControlTopBar onToggleMobileNav={() => setMobileNavOpen(true)} />
          <main
            className={cn(
              "flex min-h-0 flex-1 overflow-hidden",
            )}
          >
            <div className="min-w-0 flex-1 overflow-hidden">
              <SectionComponent />
            </div>
            <ControlDetailDrawer />
          </main>
        </div>
      </div>

      <ControlCommandPalette />
      <ControlShortcutsDialog />
    </div>
  );
}

export default function AdminControlLayout() {
  return (
    <ControlProvider>
      <ControlShellInner />
    </ControlProvider>
  );
}

// Re-export so downstream agents can register handlers / open detail panels
export { CONTROL_SECTIONS };
