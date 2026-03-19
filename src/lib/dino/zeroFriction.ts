/**
 * DINO V7 — Zero Friction Flow System
 * Detects and eliminates friction in user flows.
 */

export interface FlowStep {
  id: string;
  label: string;
  route: string;
  avgDurationSeconds: number;
  completionRate: number;        // 0-1
  errorRate: number;             // 0-1
  requiresInput: boolean;
  canAutoFill: boolean;
}

export interface FrictionPoint {
  stepId: string;
  stepLabel: string;
  frictionScore: number;         // 0-100, higher = more friction
  type: "slow" | "complex" | "error_prone" | "redundant" | "blocking";
  recommendation: string;
  canAutoResolve: boolean;
}

export interface FlowOptimization {
  flowName: string;
  originalSteps: number;
  optimizedSteps: number;
  removedSteps: string[];
  autoFilledSteps: string[];
  frictionReduction: number;     // percentage
  frictionPoints: FrictionPoint[];
}

export function analyzeFlowFriction(flowName: string, steps: FlowStep[]): FlowOptimization {
  const frictionPoints: FrictionPoint[] = [];
  const removedSteps: string[] = [];
  const autoFilledSteps: string[] = [];

  for (const step of steps) {
    let frictionScore = 0;

    // Slow steps
    if (step.avgDurationSeconds > 30) {
      frictionScore += 30;
      frictionPoints.push({
        stepId: step.id, stepLabel: step.label, frictionScore: 30, type: "slow",
        recommendation: "Reduce page load or simplify form — users spending too long",
        canAutoResolve: false,
      });
    }

    // High error rate
    if (step.errorRate > 0.1) {
      frictionScore += 25;
      frictionPoints.push({
        stepId: step.id, stepLabel: step.label, frictionScore: 25, type: "error_prone",
        recommendation: "Add better validation, clearer labels, or inline help",
        canAutoResolve: false,
      });
    }

    // Low completion = blocking
    if (step.completionRate < 0.5) {
      frictionScore += 40;
      frictionPoints.push({
        stepId: step.id, stepLabel: step.label, frictionScore: 40, type: "blocking",
        recommendation: "This step blocks most users — consider removing or simplifying",
        canAutoResolve: false,
      });
    }

    // Can auto-fill → reduce friction
    if (step.requiresInput && step.canAutoFill) {
      autoFilledSteps.push(step.id);
    }

    // Redundant step (high completion, very fast, no input)
    if (step.completionRate > 0.95 && step.avgDurationSeconds < 2 && !step.requiresInput) {
      removedSteps.push(step.id);
      frictionPoints.push({
        stepId: step.id, stepLabel: step.label, frictionScore: 10, type: "redundant",
        recommendation: "Step adds no value — consider merging with adjacent step",
        canAutoResolve: true,
      });
    }
  }

  const optimizedSteps = steps.length - removedSteps.length;
  const frictionReduction = steps.length > 0 ? Math.round(((steps.length - optimizedSteps) / steps.length) * 100) : 0;

  return { flowName, originalSteps: steps.length, optimizedSteps, removedSteps, autoFilledSteps, frictionReduction, frictionPoints };
}
