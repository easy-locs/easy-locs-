import * as voiceEngine from "./navigation-voice-engine";

export interface RouteStep {
  maneuver: {
    instruction: string;
    location: [number, number];
    type: string;
    modifier?: string;
  };
  distance: number;
  duration: number;
  name: string;
  voiceInstructions?: Array<{
    distanceAlongGeometry: number;
    announcement: string;
    ssmlAnnouncement?: string;
  }>;
}

interface TriggerState {
  steps: RouteStep[];
  currentStepIndex: number;
  announcedThresholds: Set<string>;
  active: boolean;
}

const DISTANCE_THRESHOLDS = [500, 200, 50];
const STEP_ADVANCE_THRESHOLD = 40;

const state: TriggerState = {
  steps: [],
  currentStepIndex: 0,
  announcedThresholds: new Set(),
  active: false,
};

function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function loadSteps(steps: RouteStep[]) {
  state.steps = steps;
  state.currentStepIndex = 0;
  state.announcedThresholds.clear();
  state.active = true;
}

export function clearSteps() {
  state.steps = [];
  state.currentStepIndex = 0;
  state.announcedThresholds.clear();
  state.active = false;
}

function advanceStep(lat: number, lng: number) {
  while (state.currentStepIndex < state.steps.length - 1) {
    const nextStep = state.steps[state.currentStepIndex + 1];
    if (!nextStep) break;

    const [nextLng, nextLat] = nextStep.maneuver.location;
    const distToNext = haversineM(lat, lng, nextLat, nextLng);

    if (distToNext < STEP_ADVANCE_THRESHOLD) {
      state.currentStepIndex++;
      state.announcedThresholds.clear();
      voiceEngine.resetLastAnnounced();
      continue;
    }

    if (state.currentStepIndex + 2 < state.steps.length) {
      const stepAfterNext = state.steps[state.currentStepIndex + 2];
      const [afterLng, afterLat] = stepAfterNext.maneuver.location;
      const distToAfter = haversineM(lat, lng, afterLat, afterLng);
      if (distToAfter < distToNext && distToNext > state.steps[state.currentStepIndex + 1].distance * 0.5) {
        state.currentStepIndex++;
        state.announcedThresholds.clear();
        voiceEngine.resetLastAnnounced();
        continue;
      }
    }

    break;
  }
}

export function updatePosition(lat: number, lng: number) {
  if (!state.active || state.steps.length === 0) return;

  advanceStep(lat, lng);

  const step = state.steps[state.currentStepIndex];
  if (!step) return;

  const nextStepIdx = state.currentStepIndex + 1;
  const nextStep = state.steps[nextStepIdx];

  if (nextStep) {
    if (nextStep.voiceInstructions && nextStep.voiceInstructions.length > 0) {
      handleMapboxVoiceInstructions(lat, lng, nextStep, nextStepIdx);
    } else {
      handleThresholdInstructions(lat, lng, nextStep, nextStepIdx);
    }
  }

  if (state.currentStepIndex === state.steps.length - 1) {
    const [manLng, manLat] = step.maneuver.location;
    const distToEnd = haversineM(lat, lng, manLat, manLng);
    if (distToEnd < STEP_ADVANCE_THRESHOLD) {
      const arrivalKey = "arrival";
      if (!state.announcedThresholds.has(arrivalKey)) {
        state.announcedThresholds.add(arrivalKey);
        voiceEngine.announce(step.maneuver.instruction || "You have arrived at your destination.");
      }
    }
  }
}

function handleMapboxVoiceInstructions(lat: number, lng: number, step: RouteStep, stepIdx: number) {
  const [manLng, manLat] = step.maneuver.location;
  const distToManeuver = haversineM(lat, lng, manLat, manLng);

  const sorted = [...step.voiceInstructions!].sort(
    (a, b) => b.distanceAlongGeometry - a.distanceAlongGeometry,
  );

  for (const vi of sorted) {
    const key = `vi_${stepIdx}_${vi.distanceAlongGeometry}`;
    if (state.announcedThresholds.has(key)) continue;

    if (distToManeuver <= vi.distanceAlongGeometry + 50) {
      state.announcedThresholds.add(key);
      voiceEngine.announce(vi.announcement);
      break;
    }
  }
}

function distanceLabel(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} kilometers`;
  return `${meters} meters`;
}

function handleThresholdInstructions(lat: number, lng: number, step: RouteStep, stepIdx: number) {
  const [manLng, manLat] = step.maneuver.location;
  const distToManeuver = haversineM(lat, lng, manLat, manLng);

  for (const threshold of DISTANCE_THRESHOLDS) {
    const key = `t_${stepIdx}_${threshold}`;
    if (state.announcedThresholds.has(key)) continue;

    if (distToManeuver <= threshold) {
      state.announcedThresholds.add(key);
      const instruction = step.maneuver.instruction;
      if (instruction) {
        const prefix = threshold > 50 ? `In ${distanceLabel(threshold)}, ` : "";
        voiceEngine.resetLastAnnounced();
        voiceEngine.announce(`${prefix}${instruction}`);
      }
      break;
    }
  }
}

export function isActive(): boolean {
  return state.active;
}

export function getCurrentStepIndex(): number {
  return state.currentStepIndex;
}
