import SectionPlaceholder from "./SectionPlaceholder";
import { getSection } from "../sections";
import ControlOverview from "../overview/ControlOverview";

/**
 * ACP Agent 5 (#864) — Mission Control overview wired into the
 * unified shell from Agent 4. Keeps the placeholder chrome (header /
 * owner pill) and slots the real overview into the body. The global
 * kill-switch handler and live health indicators are registered with
 * the shell ControlContext from inside `<ControlOverview />`.
 */
export default function OverviewSection() {
  return (
    <SectionPlaceholder section={getSection("overview")}>
      <ControlOverview />
    </SectionPlaceholder>
  );
}
