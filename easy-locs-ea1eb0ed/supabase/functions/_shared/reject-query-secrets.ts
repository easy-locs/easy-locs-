const SENSITIVE_PARAM_NAMES = new Set([
  "key",
  "api_key",
  "apikey",
  "api-key",
  "secret",
  "token",
  "access_token",
  "auth",
  "authorization",
  "password",
  "passwd",
  "credential",
  "client_secret",
  "service_key",
  "service_role_key",
  "webhook_secret",
  "signing_secret",
  "private_key",
]);

const SENSITIVE_PARAM_PATTERNS = [
  /^x[-_]?api[-_]?key$/i,
  /^x[-_]?auth[-_]?token$/i,
  /secret$/i,
  /token$/i,
  /[-_]key$/i,
  /^bearer$/i,
];

function isSensitiveParam(name: string, allowlist?: Set<string>): boolean {
  const lower = name.toLowerCase();
  if (allowlist?.has(lower)) return false;
  if (SENSITIVE_PARAM_NAMES.has(lower)) return true;
  return SENSITIVE_PARAM_PATTERNS.some((re) => re.test(lower));
}

export interface QuerySecretCheckResult {
  rejected: boolean;
  response?: Response;
  detectedParams?: string[];
}

export interface RejectQuerySecretsOptions {
  corsHeaders?: Record<string, string>;
  allowedParams?: string[];
}

export function rejectQuerySecrets(
  req: Request,
  corsHeadersOrOptions: Record<string, string> | RejectQuerySecretsOptions = {},
): QuerySecretCheckResult {
  let corsHeaders: Record<string, string> = {};
  let allowlist: Set<string> | undefined;

  if ("allowedParams" in corsHeadersOrOptions || "corsHeaders" in corsHeadersOrOptions) {
    const opts = corsHeadersOrOptions as RejectQuerySecretsOptions;
    corsHeaders = opts.corsHeaders ?? {};
    if (opts.allowedParams?.length) {
      allowlist = new Set(opts.allowedParams.map((p) => p.toLowerCase()));
    }
  } else {
    corsHeaders = corsHeadersOrOptions as Record<string, string>;
  }

  let url: URL;
  try {
    url = new URL(req.url);
  } catch {
    return { rejected: false };
  }

  const detected: string[] = [];
  for (const paramName of url.searchParams.keys()) {
    if (isSensitiveParam(paramName, allowlist)) {
      detected.push(paramName);
    }
  }

  if (detected.length === 0) {
    return { rejected: false };
  }

  return {
    rejected: true,
    detectedParams: detected,
    response: new Response(
      JSON.stringify({
        error: "Secrets must not be passed as URL query parameters. Use headers instead.",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    ),
  };
}

export function withQuerySecretGuard(
  handler: (req: Request) => Promise<Response>,
  corsHeadersOrOptions: Record<string, string> | RejectQuerySecretsOptions = {},
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") {
      return handler(req);
    }

    const check = rejectQuerySecrets(req, corsHeadersOrOptions);
    if (check.rejected) {
      return check.response!;
    }

    return handler(req);
  };
}
