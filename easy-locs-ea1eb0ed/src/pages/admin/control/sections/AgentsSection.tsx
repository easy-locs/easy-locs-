import AgentsCockpit from "@/components/admin/control/agents/AgentsCockpit";

/**
 * AgentsSection — ACP Agent 6 (#865) cockpit, slotted into the unified
 * /admin/control shell built by Agent 4. The cockpit owns its own
 * SubPageShell + scroll container; we render it directly.
 */
export default function AgentsSection() {
  return <AgentsCockpit />;
}
