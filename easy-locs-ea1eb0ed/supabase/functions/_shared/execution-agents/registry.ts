import type { DomainAgent } from "./contract.ts";
import { uiAgent } from "./ui-agent.ts";
import { dataAgent } from "./data-agent.ts";
import { orbitAgent } from "./orbit-agent.ts";
import { onboardingAgent } from "./onboarding-agent.ts";
import { systemAgent } from "./system-agent.ts";

export const AGENTS: Record<string, DomainAgent> = {
  ui: uiAgent,
  data: dataAgent,
  orbit: orbitAgent,
  onboarding: onboardingAgent,
  system: systemAgent,
};

export function getAgentForDomain(domain: string): DomainAgent | null {
  return AGENTS[domain] ?? null;
}

export function listAgents(): DomainAgent[] {
  return Object.values(AGENTS);
}
