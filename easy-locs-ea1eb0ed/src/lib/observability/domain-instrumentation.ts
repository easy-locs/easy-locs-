import {
  addDomainBreadcrumb,
  captureDomainError,
  captureDomainWarning,
  instrumentCriticalAction,
  setSafeUserContext,
  setDomainContext,
  startDomainSpan,
  type ObservabilityDomain,
} from "./sentry-helpers";

const otpAttemptTracker = new Map<string, { count: number; windowStart: number }>();
const OTP_WINDOW_MS = 300_000;

function trackOtpAttempt(userId: string): { count: number; windowMinutes: number } {
  const now = Date.now();
  let tracker = otpAttemptTracker.get(userId);
  if (!tracker || now - tracker.windowStart > OTP_WINDOW_MS) {
    tracker = { count: 0, windowStart: now };
    otpAttemptTracker.set(userId, tracker);
  }
  tracker.count++;
  return { count: tracker.count, windowMinutes: OTP_WINDOW_MS / 60_000 };
}

export function instrumentIdentityOTPRequest(userId: string, method: "sms" | "email") {
  addDomainBreadcrumb("identity", "otp.request", { userId, method });

  const { count, windowMinutes } = trackOtpAttempt(userId);
  if (count > 5) {
    import("@/lib/auto-protect").then(({ protectOtpFlow }) => {
      protectOtpFlow(userId, count, windowMinutes);
    }).catch(() => {});
  }
}

export function instrumentIdentityOTPVerify(userId: string, success: boolean) {
  addDomainBreadcrumb("identity", "otp.verify", { userId, success });
  if (!success) {
    captureDomainWarning("identity", "otp.verify.failed", "OTP verification failed", { userId });

    const { count, windowMinutes } = trackOtpAttempt(userId);
    if (count > 8) {
      import("@/lib/auto-protect").then(({ protectOtpFlow }) => {
        protectOtpFlow(userId, count, windowMinutes);
      }).catch(() => {});
    }
  }
}

export function instrumentIdentityLogin(userId: string, userType: string, country?: string) {
  setSafeUserContext(userId, { userType, country });
  addDomainBreadcrumb("identity", "login.completed", { userId, userType });
}

export function instrumentIdentitySessionRefresh(userId: string, success: boolean) {
  addDomainBreadcrumb("identity", "session.refresh", { userId, success });
  if (!success) {
    import("@/lib/auto-protect").then(({ protectAuthFlow }) => {
      protectAuthFlow(userId, "Session refresh failed — possible token expiry or hijack", { success });
    }).catch(() => {});
  }
}

export function instrumentWalletTransfer(
  senderId: string,
  recipientId: string,
  fn: () => Promise<any>,
) {
  import("@/lib/auto-protect").then(({ checkRateLimit }) => {
    const state = checkRateLimit(`wallet.transfer.submit.${senderId}`);
    if (state.blocked) {
      import("@/lib/auto-protect").then(({ protectWalletFlow }) => {
        protectWalletFlow(senderId, "Transfer rate limit exceeded", { recipientId });
      }).catch(() => {});
    }
  }).catch(() => {});

  return instrumentCriticalAction("wallet", "transfer.submit", fn, {
    senderId,
    recipientId,
  });
}

export function instrumentWalletTopUp(userId: string, fn: () => Promise<any>) {
  return instrumentCriticalAction("wallet", "topup.confirm", fn, { userId });
}

export function instrumentWalletBalanceFetch(userId: string) {
  addDomainBreadcrumb("wallet", "balance.fetch", { userId });
}

export function instrumentContactSync(userId: string, fn: () => Promise<any>) {
  return instrumentCriticalAction("contacts", "sync.resolve", fn, { userId });
}

export function instrumentMessageSend(conversationId: string, fn: () => Promise<any>) {
  import("@/lib/auto-protect").then(({ checkRateLimit }) => {
    const state = checkRateLimit("orbit.message.send");
    if (state.blocked) {
      import("@/lib/auto-protect").then(({ protectOrbitThread }) => {
        protectOrbitThread(conversationId, "Message send rate limit exceeded");
      }).catch(() => {});
    }
  }).catch(() => {});

  return instrumentCriticalAction("orbit", "message.send", fn, { conversationId });
}

export function instrumentCallStart(sessionId: string, peerId: string) {
  addDomainBreadcrumb("orbit", "call.start", { sessionId, peerId });
  return startDomainSpan("orbit", "call.session", "call");
}

export function instrumentCallEnd(sessionId: string, durationMs: number) {
  addDomainBreadcrumb("orbit", "call.end", { sessionId, durationMs });
}

export function instrumentTaxonomyMapping(entityId: string, fn: () => Promise<any>) {
  return instrumentCriticalAction("taxonomy", "entity.map", fn, { entityId });
}

export function instrumentTaxonomyValidation(entityId: string, fn: () => Promise<any>) {
  return instrumentCriticalAction("taxonomy", "entity.validate", fn, { entityId });
}

export function instrumentTaxonomyPublish(entityId: string, fn: () => Promise<any>) {
  return instrumentCriticalAction("canonical", "entity.publish", fn, { entityId });
}

export function instrumentMediaUpload(entityId: string, fn: () => Promise<any>) {
  return instrumentCriticalAction("media", "upload.submit", fn, { entityId });
}

export function instrumentSearchRequest(query: string, domain: ObservabilityDomain = "radar") {
  addDomainBreadcrumb(domain, "search.request", { queryLength: query.length });
  return startDomainSpan(domain, "search.execute", "search");
}

export function instrumentProviderCatalogUpdate(providerId: string, fn: () => Promise<any>) {
  return instrumentCriticalAction("provider", "catalog.update", fn, { providerId });
}

export function instrumentCheckoutSubmit(userId: string, fn: () => Promise<any>) {
  return instrumentCriticalAction("wallet", "checkout.submit", fn, { userId });
}

export function instrumentListingImport(source: string, count: number) {
  addDomainBreadcrumb("marketplace", "listing.import", { source, count });
  return startDomainSpan("marketplace", "listing.import.batch", "import");
}

export function setRouteContext(routeName: string, routeGroup: string) {
  setDomainContext(routeGroup as ObservabilityDomain, { route: routeName });
  addDomainBreadcrumb(routeGroup as ObservabilityDomain, "route.enter", { routeName });
}
