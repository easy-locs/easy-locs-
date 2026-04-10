/**
 * API Documentation Engine — OpenAPI spec, SDK helpers, and developer utilities
 * Used by DeveloperPortal to render interactive docs.
 */

/* ─── OpenAPI 3.0 Spec ─── */

export interface OpenAPIEndpoint {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  summary: string;
  description: string;
  tags: string[];
  auth: "api-key" | "bearer" | "none";
  parameters?: APIParameter[];
  requestBody?: APIRequestBody;
  responses: Record<string, APIResponse>;
  rateLimit?: { requests: number; window: string };
}

export interface APIParameter {
  name: string;
  in: "path" | "query" | "header";
  required: boolean;
  type: "string" | "number" | "boolean" | "array";
  description: string;
  example?: string;
}

export interface APIRequestBody {
  contentType: string;
  schema: Record<string, APIField>;
  example?: Record<string, unknown>;
}

export interface APIField {
  type: string;
  required?: boolean;
  description: string;
  example?: unknown;
  enum?: string[];
}

export interface APIResponse {
  description: string;
  schema?: Record<string, unknown>;
  example?: Record<string, unknown>;
}

/* ─── API Spec Registry ─── */

export const API_ENDPOINTS: OpenAPIEndpoint[] = [
  // ── Properties ──
  {
    method: "GET",
    path: "/api/v1/properties",
    summary: "List properties",
    description: "Retrieve all properties for the authenticated organization. Supports pagination and filtering by city, type, or status.",
    tags: ["Properties"],
    auth: "api-key",
    parameters: [
      { name: "page", in: "query", required: false, type: "number", description: "Page number (default: 1)", example: "1" },
      { name: "per_page", in: "query", required: false, type: "number", description: "Items per page (default: 20, max: 100)", example: "20" },
      { name: "city", in: "query", required: false, type: "string", description: "Filter by city name", example: "Paris" },
      { name: "status", in: "query", required: false, type: "string", description: "Filter by status", example: "active" },
    ],
    responses: {
      "200": {
        description: "Paginated list of properties",
        example: { data: [{ id: "uuid", title: "Studio Paris 11e", city: "Paris", status: "active" }], total: 42, page: 1 },
      },
      "401": { description: "Invalid or missing API key" },
      "429": { description: "Rate limit exceeded" },
    },
    rateLimit: { requests: 100, window: "1 minute" },
  },
  {
    method: "GET",
    path: "/api/v1/properties/{id}",
    summary: "Get property",
    description: "Retrieve a single property by ID with full details including units, lease status, and photos.",
    tags: ["Properties"],
    auth: "api-key",
    parameters: [
      { name: "id", in: "path", required: true, type: "string", description: "Property UUID" },
    ],
    responses: {
      "200": { description: "Property details", example: { id: "uuid", title: "Studio Paris 11e", rooms: 2, surface_m2: 45 } },
      "404": { description: "Property not found" },
    },
  },
  {
    method: "POST",
    path: "/api/v1/properties",
    summary: "Create property",
    description: "Add a new property to the organization.",
    tags: ["Properties"],
    auth: "api-key",
    requestBody: {
      contentType: "application/json",
      schema: {
        title: { type: "string", required: true, description: "Property title" },
        address: { type: "string", required: true, description: "Full address" },
        city: { type: "string", required: true, description: "City" },
        property_type: { type: "string", required: false, description: "Type", enum: ["apartment", "house", "studio", "commercial"] },
      },
      example: { title: "Studio Paris 11e", address: "42 rue de la Roquette", city: "Paris", property_type: "studio" },
    },
    responses: {
      "201": { description: "Property created" },
      "400": { description: "Validation error" },
    },
  },

  // ── Tenants ──
  {
    method: "GET",
    path: "/api/v1/tenants",
    summary: "List tenants",
    description: "Retrieve all tenants for the organization.",
    tags: ["Tenants"],
    auth: "api-key",
    parameters: [
      { name: "status", in: "query", required: false, type: "string", description: "Filter: active, departed", example: "active" },
    ],
    responses: {
      "200": { description: "List of tenants", example: { data: [{ id: "uuid", name: "Jean Dupont", email: "jean@mail.com" }] } },
    },
    rateLimit: { requests: 100, window: "1 minute" },
  },

  // ── Leases ──
  {
    method: "GET",
    path: "/api/v1/leases",
    summary: "List leases",
    description: "Retrieve all leases with tenant and property references.",
    tags: ["Leases"],
    auth: "api-key",
    parameters: [
      { name: "property_id", in: "query", required: false, type: "string", description: "Filter by property" },
      { name: "active", in: "query", required: false, type: "boolean", description: "Only active leases" },
    ],
    responses: {
      "200": { description: "List of leases" },
    },
  },

  // ── Payments ──
  {
    method: "GET",
    path: "/api/v1/payments",
    summary: "List payments",
    description: "Retrieve payment history with filters for date range, status, and tenant.",
    tags: ["Payments"],
    auth: "api-key",
    parameters: [
      { name: "from", in: "query", required: false, type: "string", description: "Start date (YYYY-MM-DD)" },
      { name: "to", in: "query", required: false, type: "string", description: "End date (YYYY-MM-DD)" },
      { name: "status", in: "query", required: false, type: "string", description: "paid, pending, overdue" },
    ],
    responses: {
      "200": { description: "Payment records" },
    },
  },
  {
    method: "POST",
    path: "/api/v1/payments",
    summary: "Record payment",
    description: "Manually record a rent payment.",
    tags: ["Payments"],
    auth: "api-key",
    requestBody: {
      contentType: "application/json",
      schema: {
        tenant_id: { type: "string", required: true, description: "Tenant UUID" },
        amount: { type: "number", required: true, description: "Payment amount" },
        month: { type: "string", required: true, description: "Month (YYYY-MM)" },
        method: { type: "string", required: false, description: "Payment method", enum: ["bank_transfer", "cash", "check", "card"] },
      },
    },
    responses: {
      "201": { description: "Payment recorded" },
      "400": { description: "Invalid data" },
    },
  },

  // ── Webhooks ──
  {
    method: "GET",
    path: "/api/v1/webhooks",
    summary: "List webhooks",
    description: "Retrieve all configured webhooks for the organization.",
    tags: ["Webhooks"],
    auth: "api-key",
    responses: {
      "200": { description: "List of webhooks" },
    },
  },
  {
    method: "POST",
    path: "/api/v1/webhooks",
    summary: "Create webhook",
    description: "Register a new webhook endpoint. Events are signed with HMAC-SHA256.",
    tags: ["Webhooks"],
    auth: "api-key",
    requestBody: {
      contentType: "application/json",
      schema: {
        url: { type: "string", required: true, description: "HTTPS endpoint URL" },
        events: { type: "string", required: true, description: "Events to subscribe (comma-separated or *)" },
      },
      example: { url: "https://your-app.com/webhooks", events: ["payment.received", "lease.created"] },
    },
    responses: {
      "201": { description: "Webhook created with signing secret", example: { id: "uuid", secret: "whsec_..." } },
    },
  },

  // ── Documents ──
  {
    method: "GET",
    path: "/api/v1/documents",
    summary: "List documents",
    description: "Retrieve generated documents (receipts, leases, inventories).",
    tags: ["Documents"],
    auth: "api-key",
    parameters: [
      { name: "type", in: "query", required: false, type: "string", description: "Filter: receipt, lease, inventory" },
    ],
    responses: {
      "200": { description: "List of documents with PDF URLs" },
    },
  },
];

/* ─── SDK Code Generator ─── */

export type SDKLanguage = "curl" | "javascript" | "python" | "php";

export function generateSDKExample(
  endpoint: OpenAPIEndpoint,
  language: SDKLanguage,
  apiKey = "YOUR_API_KEY"
): string {
  const baseUrl = "https://api.easy-locs.com";
  const url = `${baseUrl}${endpoint.path}`;

  switch (language) {
    case "curl":
      return generateCurl(endpoint, url, apiKey);
    case "javascript":
      return generateJS(endpoint, url, apiKey);
    case "python":
      return generatePython(endpoint, url, apiKey);
    case "php":
      return generatePHP(endpoint, url, apiKey);
    default:
      return "";
  }
}

function generateCurl(ep: OpenAPIEndpoint, url: string, key: string): string {
  const lines = [`curl -X ${ep.method} "${url}"`];
  lines.push(`  -H "Authorization: Bearer ${key}"`);
  lines.push(`  -H "Content-Type: application/json"`);
  if (ep.requestBody?.example) {
    lines.push(`  -d '${JSON.stringify(ep.requestBody.example, null, 2)}'`);
  }
  return lines.join(" \\\n");
}

function generateJS(ep: OpenAPIEndpoint, url: string, key: string): string {
  const opts: string[] = [
    `  method: "${ep.method}",`,
    `  headers: {`,
    `    "Authorization": "Bearer ${key}",`,
    `    "Content-Type": "application/json",`,
    `  },`,
  ];
  if (ep.requestBody?.example) {
    opts.push(`  body: JSON.stringify(${JSON.stringify(ep.requestBody.example, null, 4)}),`);
  }
  return [
    `const response = await fetch("${url}", {`,
    ...opts,
    `});`,
    `const data = await response.json();`,
    `console.log(data);`,
  ].join("\n");
}

function generatePython(ep: OpenAPIEndpoint, url: string, key: string): string {
  const lines = [
    `import requests`,
    ``,
    `response = requests.${ep.method.toLowerCase()}(`,
    `    "${url}",`,
    `    headers={`,
    `        "Authorization": f"Bearer ${key}",`,
    `        "Content-Type": "application/json",`,
    `    },`,
  ];
  if (ep.requestBody?.example) {
    lines.push(`    json=${JSON.stringify(ep.requestBody.example)},`);
  }
  lines.push(`)`, `print(response.json())`);
  return lines.join("\n");
}

function generatePHP(ep: OpenAPIEndpoint, url: string, key: string): string {
  const lines = [
    `<?php`,
    `$ch = curl_init("${url}");`,
    `curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);`,
    `curl_setopt($ch, CURLOPT_HTTPHEADER, [`,
    `    "Authorization: Bearer ${key}",`,
    `    "Content-Type: application/json",`,
    `]);`,
  ];
  if (ep.method !== "GET") {
    lines.push(`curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "${ep.method}");`);
  }
  if (ep.requestBody?.example) {
    lines.push(`curl_setopt($ch, CURLOPT_POSTFIELDS, '${JSON.stringify(ep.requestBody.example)}');`);
  }
  lines.push(`$response = curl_exec($ch);`, `curl_close($ch);`, `echo $response;`);
  return lines.join("\n");
}

/* ─── Helpers ─── */

/** Get unique tags from all endpoints */
export function getAPITags(): string[] {
  return [...new Set(API_ENDPOINTS.flatMap((e) => e.tags))];
}

/** Filter endpoints by tag */
export function getEndpointsByTag(tag: string): OpenAPIEndpoint[] {
  return API_ENDPOINTS.filter((e) => e.tags.includes(tag));
}

/** Generate OpenAPI 3.0 JSON spec */
export function generateOpenAPISpec(): Record<string, unknown> {
  const paths: Record<string, Record<string, unknown>> = {};

  for (const ep of API_ENDPOINTS) {
    if (!paths[ep.path]) paths[ep.path] = {};
    const operation: Record<string, unknown> = {
      summary: ep.summary,
      description: ep.description,
      tags: ep.tags,
      security: ep.auth === "none" ? [] : [{ [ep.auth === "api-key" ? "ApiKeyAuth" : "BearerAuth"]: [] }],
      responses: {},
    };

    if (ep.parameters?.length) {
      operation.parameters = ep.parameters.map((p) => ({
        name: p.name,
        in: p.in,
        required: p.required,
        schema: { type: p.type },
        description: p.description,
        example: p.example,
      }));
    }

    if (ep.requestBody) {
      operation.requestBody = {
        required: true,
        content: {
          [ep.requestBody.contentType]: {
            schema: {
              type: "object",
              properties: Object.fromEntries(
                Object.entries(ep.requestBody.schema).map(([k, v]) => [
                  k,
                  { type: v.type, description: v.description, ...(v.enum ? { enum: v.enum } : {}) },
                ])
              ),
              required: Object.entries(ep.requestBody.schema)
                .filter(([, v]) => v.required)
                .map(([k]) => k),
            },
            ...(ep.requestBody.example ? { example: ep.requestBody.example } : {}),
          },
        },
      };
    }

    for (const [code, resp] of Object.entries(ep.responses)) {
      (operation.responses as Record<string, unknown>)[code] = {
        description: resp.description,
        ...(resp.example
          ? { content: { "application/json": { example: resp.example } } }
          : {}),
      };
    }

    paths[ep.path][ep.method.toLowerCase()] = operation;
  }

  return {
    openapi: "3.0.3",
    info: {
      title: "Easy-Locs API",
      version: "1.0.0",
      description: "REST API for Easy-Locs property management platform",
      contact: { email: "api@easy-locs.com" },
    },
    servers: [{ url: "https://api.easy-locs.com", description: "Production" }],
    paths,
    components: {
      securitySchemes: {
        ApiKeyAuth: { type: "apiKey", in: "header", name: "Authorization", description: "API key prefixed with 'Bearer '" },
        BearerAuth: { type: "http", scheme: "bearer" },
      },
    },
  };
}

/** Webhook event types */
export const WEBHOOK_EVENT_TYPES = [
  { event: "payment.received", description: "A rent payment was recorded" },
  { event: "payment.overdue", description: "A payment is past due date" },
  { event: "lease.created", description: "A new lease was signed" },
  { event: "lease.expired", description: "A lease has expired" },
  { event: "tenant.created", description: "A new tenant was added" },
  { event: "tenant.departed", description: "A tenant has left" },
  { event: "document.generated", description: "A document was generated (receipt, inventory)" },
  { event: "maintenance.requested", description: "A maintenance request was submitted" },
  { event: "booking.created", description: "A seasonal booking was created" },
  { event: "booking.cancelled", description: "A booking was cancelled" },
] as const;

/** Webhook signature verification example */
export const WEBHOOK_SIGNATURE_EXAMPLE = `
// Verify webhook signature (Node.js example)
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from('sha256=' + expected)
  );
}

// In your webhook handler:
app.post('/webhooks', (req, res) => {
  const signature = req.headers['x-easylocs-signature'];
  if (!verifyWebhookSignature(req.rawBody, signature, WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }
  // Process event...
  res.status(200).send('OK');
});
`.trim();
