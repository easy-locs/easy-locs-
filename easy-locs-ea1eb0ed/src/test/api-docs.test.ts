/**
 * API Documentation Engine Tests
 */
import { describe, it, expect } from "vitest";
import {
  API_ENDPOINTS,
  generateSDKExample,
  getAPITags,
  getEndpointsByTag,
  generateOpenAPISpec,
  WEBHOOK_EVENT_TYPES,
  WEBHOOK_SIGNATURE_EXAMPLE,
  type OpenAPIEndpoint,
  type SDKLanguage,
} from "@/lib/api-docs";

/* ── Endpoint Registry ── */
describe("API_ENDPOINTS", () => {
  it("has at least 10 endpoints", () => {
    expect(API_ENDPOINTS.length).toBeGreaterThanOrEqual(10);
  });

  it("every endpoint has required fields", () => {
    API_ENDPOINTS.forEach((ep) => {
      expect(ep.method).toMatch(/^(GET|POST|PUT|PATCH|DELETE)$/);
      expect(ep.path).toMatch(/^\/api\/v1\//);
      expect(ep.summary.length).toBeGreaterThan(0);
      expect(ep.description.length).toBeGreaterThan(0);
      expect(ep.tags.length).toBeGreaterThanOrEqual(1);
      expect(["api-key", "bearer", "none"]).toContain(ep.auth);
      expect(Object.keys(ep.responses).length).toBeGreaterThan(0);
    });
  });

  it("POST endpoints have requestBody", () => {
    API_ENDPOINTS.filter((e) => e.method === "POST").forEach((ep) => {
      expect(ep.requestBody).toBeDefined();
      expect(ep.requestBody!.contentType).toBe("application/json");
    });
  });

  it("path params have matching parameter definitions", () => {
    API_ENDPOINTS.forEach((ep) => {
      const pathParams = ep.path.match(/\{(\w+)\}/g)?.map((p) => p.slice(1, -1)) || [];
      pathParams.forEach((param) => {
        const def = ep.parameters?.find((p) => p.name === param && p.in === "path");
        expect(def).toBeDefined();
        expect(def!.required).toBe(true);
      });
    });
  });
});

/* ── Tags ── */
describe("getAPITags", () => {
  it("returns unique tags", () => {
    const tags = getAPITags();
    expect(tags.length).toBeGreaterThanOrEqual(3);
    expect(new Set(tags).size).toBe(tags.length);
  });

  it("includes Properties and Tenants", () => {
    const tags = getAPITags();
    expect(tags).toContain("Properties");
    expect(tags).toContain("Tenants");
  });
});

describe("getEndpointsByTag", () => {
  it("filters by tag", () => {
    const props = getEndpointsByTag("Properties");
    expect(props.length).toBeGreaterThanOrEqual(2);
    props.forEach((ep) => expect(ep.tags).toContain("Properties"));
  });

  it("returns empty for unknown tag", () => {
    expect(getEndpointsByTag("NonExistent")).toEqual([]);
  });
});

/* ── SDK Code Generation ── */
describe("generateSDKExample", () => {
  const getEndpoint = API_ENDPOINTS.find((e) => e.method === "GET")!;
  const postEndpoint = API_ENDPOINTS.find((e) => e.method === "POST")!;

  const languages: SDKLanguage[] = ["curl", "javascript", "python", "php"];

  languages.forEach((lang) => {
    it(`generates ${lang} for GET`, () => {
      const code = generateSDKExample(getEndpoint, lang);
      expect(code.length).toBeGreaterThan(20);
      expect(code).toContain("YOUR_API_KEY");
    });

    it(`generates ${lang} for POST with body`, () => {
      const code = generateSDKExample(postEndpoint, lang);
      expect(code.length).toBeGreaterThan(20);
    });
  });

  it("uses custom API key", () => {
    const code = generateSDKExample(getEndpoint, "curl", "sk_test_123");
    expect(code).toContain("sk_test_123");
  });

  it("returns empty for unknown language", () => {
    expect(generateSDKExample(getEndpoint, "ruby" as SDKLanguage)).toBe("");
  });
});

/* ── OpenAPI Spec ── */
describe("generateOpenAPISpec", () => {
  const spec = generateOpenAPISpec();

  it("has correct openapi version", () => {
    expect(spec.openapi).toBe("3.0.3");
  });

  it("has info block", () => {
    const info = spec.info as Record<string, string>;
    expect(info.title).toBe("Easy-Locs API");
    expect(info.version).toBe("1.0.0");
  });

  it("has paths for all endpoints", () => {
    const paths = spec.paths as Record<string, unknown>;
    expect(Object.keys(paths).length).toBeGreaterThanOrEqual(5);
  });

  it("has security schemes", () => {
    const components = spec.components as Record<string, any>;
    expect(components.securitySchemes.ApiKeyAuth).toBeDefined();
    expect(components.securitySchemes.BearerAuth).toBeDefined();
  });

  it("paths contain method operations", () => {
    const paths = spec.paths as Record<string, Record<string, unknown>>;
    const firstPath = Object.values(paths)[0];
    const methods = Object.keys(firstPath);
    methods.forEach((m) => {
      expect(["get", "post", "put", "patch", "delete"]).toContain(m);
    });
  });
});

/* ── Webhooks ── */
describe("WEBHOOK_EVENT_TYPES", () => {
  it("has at least 8 event types", () => {
    expect(WEBHOOK_EVENT_TYPES.length).toBeGreaterThanOrEqual(8);
  });

  it("each has event and description", () => {
    WEBHOOK_EVENT_TYPES.forEach((wh) => {
      expect(wh.event).toMatch(/^\w+\.\w+$/);
      expect(wh.description.length).toBeGreaterThan(5);
    });
  });
});

describe("WEBHOOK_SIGNATURE_EXAMPLE", () => {
  it("contains signature verification code", () => {
    expect(WEBHOOK_SIGNATURE_EXAMPLE).toContain("sha256");
    expect(WEBHOOK_SIGNATURE_EXAMPLE).toContain("createHmac");
    expect(WEBHOOK_SIGNATURE_EXAMPLE).toContain("timingSafeEqual");
  });
});
