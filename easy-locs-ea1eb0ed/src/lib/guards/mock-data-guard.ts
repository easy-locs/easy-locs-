const MOCK_PATTERNS = [
  /^mock_/i,
  /generateMock/i,
  /MOCK_REF_/,
  /MOCK_BK_/,
  /MOCK_TKT_/,
  /MOCK_RF_/,
  /mock_dev/,
  /^fake_/i,
  /^demo_/i,
  /^test_data_/i,
];

const MOCK_TITLE_PATTERNS = [
  /^test\b/i,
  /\bdemo\s+(data|listing|property|item)/i,
  /\bsample\s+(data|listing|property|item)/i,
  /\bdummy\b/i,
  /\bmock\b/i,
  /\bplaceholder\b/i,
  /^lorem\b/i,
  /\bfake\s+(data|listing|property|item)/i,
];

function isProduction(): boolean {
  try {
    return import.meta.env.PROD === true || import.meta.env.MODE === "production";
  } catch {
    return false;
  }
}

export function assertNoMockData(value: unknown, context: string): void {
  if (!isProduction()) return;

  if (typeof value === "string") {
    for (const pattern of MOCK_PATTERNS) {
      if (pattern.test(value)) {
        console.error(
          `[MOCK_GUARD] Mock data detected in production — context: "${context}", value: "${value}"`,
        );
        throw new Error(`Mock data leaked to production surface: ${context}`);
      }
    }
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      assertNoMockData(item, context);
    }
  }
}

export function assertNoMockTitle(title: string, context: string): void {
  if (!isProduction()) return;

  const matched = MOCK_TITLE_PATTERNS.filter((pat) => pat.test(title));
  if (matched.length > 0) {
    console.error(
      `[MOCK_GUARD] Mock title detected in production — context: "${context}", title: "${title}", patterns: ${matched.map((p) => p.source).join(", ")}`,
    );
    throw new Error(`Mock title leaked to production surface: ${context}`);
  }
}

export function isMockId(id: string): boolean {
  return MOCK_PATTERNS.some((pattern) => pattern.test(id));
}

export function guardMockProvider(providerId: string): void {
  if (!isProduction()) return;

  if (providerId === "mock_dev" || providerId.startsWith("mock_")) {
    throw new Error(
      `[MOCK_GUARD] Mock provider "${providerId}" cannot be used in production`,
    );
  }
}
