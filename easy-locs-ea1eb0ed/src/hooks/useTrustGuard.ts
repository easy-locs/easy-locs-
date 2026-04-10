import { useMemo, useCallback } from "react";
import { useTrustScore } from "./useTrustScore";
import { SECURITY_FLAG_CONFIGS, isActionAllowed, getEffectiveLimits, type SecurityFlag } from "@/lib/trust/trust-levels";
import { computeGraduatedResponse, shouldRequireOtp, type GraduatedResponse } from "@/lib/trust/trust-actions";
import { resolveEffectiveLimits, type ResolvedLimits } from "@/lib/trust/country-limits";

export interface TrustGuardResult {
  loading: boolean;
  score: number;
  level: number;
  securityFlag: SecurityFlag;
  canSend: boolean;
  canReceive: boolean;
  canTopUp: boolean;
  canRequestMoney: boolean;
  canSendOrbitMessage: boolean;
  canSendOrbitInvite: boolean;
  limits: ResolvedLimits;
  response: GraduatedResponse;
  needsOtp: (action: string) => boolean;
  isAllowed: (action: "send" | "receive" | "topup" | "request" | "orbit_message" | "orbit_invite") => boolean;
  refresh: () => void;
}

export function useTrustGuard(countryCode: string = "US"): TrustGuardResult {
  const trust = useTrustScore();

  const response = useMemo(
    () => computeGraduatedResponse(trust.securityFlag),
    [trust.securityFlag]
  );

  const limits = useMemo(
    () => resolveEffectiveLimits(trust.level, trust.securityFlag, countryCode),
    [trust.level, trust.securityFlag, countryCode]
  );

  const canSend = useMemo(() => isActionAllowed(trust.securityFlag, "send"), [trust.securityFlag]);
  const canReceive = useMemo(() => isActionAllowed(trust.securityFlag, "receive"), [trust.securityFlag]);
  const canTopUp = useMemo(() => isActionAllowed(trust.securityFlag, "topup"), [trust.securityFlag]);
  const canRequestMoney = useMemo(() => isActionAllowed(trust.securityFlag, "request"), [trust.securityFlag]);
  const canSendOrbitMessage = useMemo(() => isActionAllowed(trust.securityFlag, "orbit_message"), [trust.securityFlag]);
  const canSendOrbitInvite = useMemo(() => isActionAllowed(trust.securityFlag, "orbit_invite"), [trust.securityFlag]);

  const needsOtp = useCallback(
    (action: string) => shouldRequireOtp(trust.securityFlag, action),
    [trust.securityFlag]
  );

  const isAllowed = useCallback(
    (action: "send" | "receive" | "topup" | "request" | "orbit_message" | "orbit_invite") =>
      isActionAllowed(trust.securityFlag, action),
    [trust.securityFlag]
  );

  return {
    loading: trust.loading,
    score: trust.score,
    level: trust.level,
    securityFlag: trust.securityFlag,
    canSend,
    canReceive,
    canTopUp,
    canRequestMoney,
    canSendOrbitMessage,
    canSendOrbitInvite,
    limits,
    response,
    needsOtp,
    isAllowed,
    refresh: trust.refresh,
  };
}

export function useOrbitTrustGuard() {
  const guard = useTrustGuard();

  return {
    loading: guard.loading,
    canMessage: guard.canSendOrbitMessage,
    canInvite: guard.canSendOrbitInvite,
    isRestricted: !guard.canSendOrbitMessage || !guard.canSendOrbitInvite,
    securityFlag: guard.securityFlag,
    response: guard.response,
  };
}

export function useRadarTrustGuard() {
  const guard = useTrustGuard();

  const flagConfig = SECURITY_FLAG_CONFIGS[guard.securityFlag];

  return {
    loading: guard.loading,
    isDemoted: flagConfig.radarDemoted,
    securityFlag: guard.securityFlag,
    trustLevel: guard.level,
  };
}

export function useBusinessTrustGuard() {
  const guard = useTrustGuard();

  return {
    loading: guard.loading,
    trustLevel: guard.level,
    score: guard.score,
    securityFlag: guard.securityFlag,
    canAcceptPayments: guard.canReceive && guard.level >= 2,
    canUsePOS: guard.level >= 2,
    canReceivePayouts: guard.level >= 3 && guard.canReceive,
    isVerifiedBusiness: guard.level >= 3,
    kycRequired: guard.limits.kycRequired,
  };
}
