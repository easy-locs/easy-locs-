/**
 * ACP Agent 7 (#866) — Runs Section.
 *
 * The shell mounts this for /admin/control/runs. The actual UI lives
 * under `control/runs/` so the section file remains a thin adapter
 * (matches the placeholder pattern other agents follow).
 */
import RunsExplorer from "../runs/RunsExplorer";

export default function RunsSection() {
  return <RunsExplorer />;
}
