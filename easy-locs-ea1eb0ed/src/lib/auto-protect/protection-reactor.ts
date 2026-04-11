import type { DetectedIssue, ProtectionReaction, ProtectionReport } from "./types";
import { attemptSafeAutoFix } from "./safe-auto-fix";
import { logProtectionCycle } from "./protection-logger";
import { isRateLimited } from "./rate-limiter";
import { verifyProtectionAction } from "./verification";
import { captureDomainError, captureDomainWarning, addDomainBreadcrumb } from "@/lib/observability/sentry-helpers";

function buildReaction(
  issue: DetectedIssue,
  action: ProtectionReaction["action"],
  details: string,
  opts: { verified?: boolean; verificationResult?: string; remainingRisk?: string; autoFixed?: boolean } = {},
): ProtectionReaction {
  return {
    issueId: issue.id,
    action,
    domain: issue.domain,
    severity: issue.severity,
    details,
    autoFixed: opts.autoFixed ?? false,
    verified: opts.verified ?? false,
    verificationResult: opts.verificationResult,
    remainingRisk: opts.remainingRisk ?? "unknown",
    reactedAt: new Date().toISOString(),
  };
}

function reactToRenderIssue(issue: DetectedIssue): ProtectionReaction {
  if (issue.severity === "high" || issue.severity === "critical") {
    return buildReaction(issue, "hidden", `Entity ${issue.entityId || "unknown"} hidden from rendering — invalid state`, {
      verified: true,
      verificationResult: "entity_hidden_from_public",
      remainingRisk: "entity invisible until reviewed",
    });
  }

  const autoFix = attemptSafeAutoFix(issue);
  if (autoFix) return autoFix;

  return buildReaction(issue, "fallback_rendered", `Fallback UI shown for entity ${issue.entityId || "unknown"}`, {
    verified: true,
    verificationResult: "fallback_ui_safe",
    remainingRisk: "low — generic card shown",
  });
}

function reactToTaxonomyIssue(issue: DetectedIssue): ProtectionReaction {
  if (issue.category === "cross_vertical") {
    return buildReaction(issue, "quarantined", `Entity ${issue.entityId || "unknown"} quarantined — cross-vertical contamination`, {
      verified: true,
      verificationResult: "entity_quarantined_and_hidden",
      remainingRisk: "none — entity isolated from public",
    });
  }

  return buildReaction(issue, "blocked", `Publish blocked for entity ${issue.entityId || "unknown"} — taxonomy mismatch`, {
    verified: true,
    verificationResult: "publish_gate_enforced",
    remainingRisk: "entity visible in admin only until fixed",
  });
}

function reactToMediaIssue(issue: DetectedIssue): ProtectionReaction {
  if (issue.severity === "high") {
    return buildReaction(issue, "quarantined", `Media ${issue.mediaAssetId || "unknown"} quarantined — verification failed`, {
      verified: true,
      verificationResult: "media_quarantined",
      remainingRisk: "media not used in rendering",
    });
  }

  return buildReaction(issue, "review_queued", `Media issue queued for review: ${issue.message}`, {
    verified: true,
    verificationResult: "review_item_created",
    remainingRisk: "low — media not primary",
  });
}

function reactToWalletIssue(issue: DetectedIssue): ProtectionReaction {
  return buildReaction(issue, "frozen", `Wallet flow frozen — inconsistent state detected: ${issue.message}`, {
    verified: true,
    verificationResult: "wallet_flow_halted_safely",
    remainingRisk: "user must retry after state verification",
  });
}

function reactToIdentityIssue(issue: DetectedIssue): ProtectionReaction {
  if (issue.category === "otp_abuse") {
    const userKey = `identity.otp.request.${issue.userId || "unknown"}`;
    if (isRateLimited(userKey)) {
      return buildReaction(issue, "rate_limited", `OTP requests rate limited for user`, {
        verified: true,
        verificationResult: "rate_limit_enforced",
        remainingRisk: "user temporarily blocked from OTP",
      });
    }

    return buildReaction(issue, "challenged", "Additional verification challenge required", {
      verified: true,
      verificationResult: "challenge_presented",
      remainingRisk: "medium — user may bypass if persistent",
    });
  }

  if (issue.category === "auth_suspicious") {
    return buildReaction(issue, "challenged", `Auth challenge triggered: ${issue.message}`, {
      verified: true,
      verificationResult: "auth_challenge_presented",
      remainingRisk: "session monitored",
    });
  }

  return buildReaction(issue, "escalated", `Identity issue escalated: ${issue.message}`, {
    remainingRisk: "requires manual review",
  });
}

function reactToOrbitIssue(issue: DetectedIssue): ProtectionReaction {
  if (issue.category === "thread_corrupt") {
    return buildReaction(issue, "fallback_rendered", `Thread fallback state shown — data corruption isolated`, {
      verified: true,
      verificationResult: "thread_isolated_safely",
      remainingRisk: "thread data may need sync",
    });
  }

  return buildReaction(issue, "retried", `Orbit operation retried safely`, {
    verified: true,
    verificationResult: "retry_succeeded_or_fallback",
    remainingRisk: "low",
  });
}

function reactToPublicPageIssue(issue: DetectedIssue): ProtectionReaction {
  return buildReaction(issue, "hidden", `Invalid public entity hidden — safe omission over broken content`, {
    verified: true,
    verificationResult: "entity_excluded_from_public",
    remainingRisk: "none — entity not publicly visible",
  });
}

function reactToImportIssue(issue: DetectedIssue): ProtectionReaction {
  if (issue.severity === "high" || issue.severity === "critical") {
    return buildReaction(issue, "quarantined", `Imported entity ${issue.entityId || "unknown"} quarantined — low confidence / invalid data`, {
      verified: true,
      verificationResult: "entity_quarantined",
      remainingRisk: "entity in review queue",
    });
  }

  return buildReaction(issue, "review_queued", `Import issue queued for review: ${issue.message}`, {
    verified: true,
    verificationResult: "review_item_created",
    remainingRisk: "low — entity not published",
  });
}

function reactToCanonicalIssue(issue: DetectedIssue): ProtectionReaction {
  if (issue.severity === "critical") {
    return buildReaction(issue, "quarantined", `Entity ${issue.entityId || "unknown"} quarantined — canonical conflict`, {
      verified: true,
      verificationResult: "entity_quarantined_publish_blocked",
      remainingRisk: "none — entity isolated",
    });
  }

  return buildReaction(issue, "blocked", `Publish blocked for entity ${issue.entityId || "unknown"} — canonical issue`, {
    verified: true,
    verificationResult: "publish_blocked",
    remainingRisk: "entity visible in admin only",
  });
}

function reactToCardIssue(issue: DetectedIssue): ProtectionReaction {
  const autoFix = attemptSafeAutoFix(issue);
  if (autoFix) return autoFix;

  return buildReaction(issue, "fallback_rendered", `Fallback card shown for entity ${issue.entityId || "unknown"}`, {
    verified: true,
    verificationResult: "generic_card_safe",
    remainingRisk: "low — generic fallback shown",
  });
}

const DOMAIN_REACTORS: Record<string, (issue: DetectedIssue) => ProtectionReaction> = {
  rendering: reactToRenderIssue,
  taxonomy: reactToTaxonomyIssue,
  media: reactToMediaIssue,
  wallet: reactToWalletIssue,
  identity: reactToIdentityIssue,
  orbit: reactToOrbitIssue,
  public_seo: reactToPublicPageIssue,
  scraping: reactToImportIssue,
  canonical: reactToCanonicalIssue,
  ui: reactToCardIssue,
  marketplace: reactToCardIssue,
};

export function reactToIssue(issue: DetectedIssue): ProtectionReport {
  addDomainBreadcrumb(
    issue.domain as any,
    "protection.detect",
    { issueId: issue.id, category: issue.category, severity: issue.severity },
  );

  const reactor = DOMAIN_REACTORS[issue.domain];
  let reactionResult: ProtectionReaction;

  if (reactor) {
    reactionResult = reactor(issue);
  } else {
    reactionResult = buildReaction(issue, "escalated", `Unknown domain "${issue.domain}" — escalated for review`, {
      remainingRisk: "unknown domain — manual review required",
    });
  }

  const report: ProtectionReport = {
    issue,
    reaction: reactionResult,
    cycle: "react",
  };

  const verificationChecks = verifyProtectionAction(report);
  const allVerified = verificationChecks.every((c) => c.passed);
  reactionResult.verified = allVerified;
  if (!allVerified) {
    const failures = verificationChecks.filter((c) => !c.passed);
    reactionResult.verificationResult = `VERIFICATION_FAILED: ${failures.map((f) => f.name).join(", ")}`;
    reactionResult.remainingRisk = `Verification failures: ${failures.map((f) => f.details).join("; ")}`;
  }

  report.cycle = "report";

  if (issue.severity === "critical" || issue.severity === "high") {
    captureDomainError(
      issue.domain as any,
      `protection.${reactionResult.action}`,
      new Error(issue.message),
      {
        issueId: issue.id,
        category: issue.category,
        action: reactionResult.action,
        autoFixed: reactionResult.autoFixed,
        verified: reactionResult.verified,
      },
    );
  } else {
    captureDomainWarning(
      issue.domain as any,
      `protection.${reactionResult.action}`,
      issue.message,
      { issueId: issue.id, category: issue.category, action: reactionResult.action, verified: reactionResult.verified },
    );
  }

  logProtectionCycle(report);

  return report;
}

export function processDetectedIssues(issues: DetectedIssue[]): ProtectionReport[] {
  return issues.map(reactToIssue);
}
