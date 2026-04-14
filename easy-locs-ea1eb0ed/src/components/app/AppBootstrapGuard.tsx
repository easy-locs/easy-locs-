import { useMasterAppBootstrap } from "@/hooks/useMasterAppBootstrap";
import { useServerEvents } from "@/hooks/useServerEvents";
import { platformBus } from "@/lib/shared/platform-bus";

export default function AppBootstrapGuard() {
  useMasterAppBootstrap();

  useServerEvents({
    enabled: true,
    onCriticalAlert: (event) => {
      platformBus.emit(
        `server:${event.event_type}`,
        {
          level: event.level,
          source: event.source_engine,
          payload: event.payload,
          timestamp: event.created_at,
        },
        "server-brain",
      );
    },
    onDecision: (decision) => {
      platformBus.emit(
        "server:omega_decision",
        {
          verdict: decision.verdict,
          global_score: decision.global_score,
          engine_statuses: decision.engine_statuses,
          critical_blockers: decision.critical_blockers,
          warnings: decision.warnings,
          next_actions: decision.next_actions,
          timestamp: decision.created_at,
        },
        "server-brain",
      );
    },
  });

  return null;
}
