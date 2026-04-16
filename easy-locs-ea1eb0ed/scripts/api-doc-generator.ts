import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const FUNCTIONS_DIR = path.join(ROOT, "supabase/functions");
const OUTPUT_FILE = path.join(ROOT, "public/api-spec.json");

interface EndpointDoc {
  path: string;
  method: string;
  description: string;
  parameters: Array<{ name: string; type: string; required: boolean }>;
  responseExample: Record<string, unknown>;
  auth: string;
}

function extractRequestFields(source: string): Array<{ name: string; type: string; required: boolean }> {
  const params: Array<{ name: string; type: string; required: boolean }> = [];
  const destructureMatch = source.match(/const\s*\{([^}]+)\}\s*=\s*(?:await\s+)?(?:body|payload|data|req\.json\(\))/);
  if (destructureMatch) {
    const fields = destructureMatch[1].split(",").map((f) => f.trim()).filter(Boolean);
    for (const field of fields) {
      const cleanName = field.split(":")[0].split("=")[0].trim();
      if (cleanName) {
        params.push({ name: cleanName, type: "string", required: !field.includes("=") });
      }
    }
  }

  const searchParamMatches = source.matchAll(/(?:searchParams|url\.searchParams)\.get\(["'](\w+)["']\)/g);
  for (const match of searchParamMatches) {
    if (!params.some((p) => p.name === match[1])) {
      params.push({ name: match[1], type: "string", required: false });
    }
  }

  return params;
}

function extractResponseShape(source: string): Record<string, unknown> {
  const responseMatch = source.match(/JSON\.stringify\(\{([^}]+)\}/);
  if (responseMatch) {
    const fields = responseMatch[1].split(",").map((f) => f.trim().split(":")[0].trim()).filter(Boolean);
    const shape: Record<string, unknown> = {};
    for (const field of fields) {
      if (field === "error") shape[field] = "string";
      else if (field === "success") shape[field] = true;
      else if (field === "data") shape[field] = {};
      else shape[field] = "value";
    }
    return Object.keys(shape).length > 0 ? shape : { success: true };
  }
  return { success: true };
}

function scanEdgeFunctions(): EndpointDoc[] {
  const endpoints: EndpointDoc[] = [];

  if (!fs.existsSync(FUNCTIONS_DIR)) {
    console.warn("[api-doc] supabase/functions not found");
    return endpoints;
  }

  const dirs = fs
    .readdirSync(FUNCTIONS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("_"))
    .map((d) => d.name);

  for (const dir of dirs) {
    const indexPath = path.join(FUNCTIONS_DIR, dir, "index.ts");
    if (!fs.existsSync(indexPath)) continue;

    const source = fs.readFileSync(indexPath, "utf-8");

    const methods: string[] = [];
    if (source.includes('req.method === "POST"') || source.includes("req.json()"))
      methods.push("POST");
    if (source.includes('req.method === "GET"') || source.includes("url.searchParams"))
      methods.push("GET");
    if (source.includes('req.method === "PUT"')) methods.push("PUT");
    if (source.includes('req.method === "DELETE"')) methods.push("DELETE");
    if (source.includes('req.method === "PATCH"')) methods.push("PATCH");
    if (methods.length === 0) methods.push("POST");

    const hasAuth =
      source.includes("authorization") || source.includes("supabaseClient");

    const params = extractRequestFields(source);
    const responseExample = extractResponseShape(source);

    for (const method of methods) {
      endpoints.push({
        path: `/functions/v1/${dir}`,
        method,
        description: `Edge Function: ${dir.replace(/-/g, " ")}`,
        parameters: method === "GET" ? params.filter((p) => !["body", "payload"].includes(p.name)) : params,
        responseExample,
        auth: hasAuth ? "Bearer token required" : "None",
      });
    }
  }

  return endpoints;
}

function deriveSchemaFromExample(example: Record<string, unknown>): Record<string, unknown> {
  const properties: Record<string, Record<string, unknown>> = {};
  for (const [key, value] of Object.entries(example)) {
    if (typeof value === "string") {
      properties[key] = { type: "string" };
    } else if (typeof value === "number") {
      properties[key] = { type: "number" };
    } else if (typeof value === "boolean") {
      properties[key] = { type: "boolean" };
    } else if (Array.isArray(value)) {
      properties[key] = { type: "array", items: { type: "object" } };
    } else if (value !== null && typeof value === "object") {
      properties[key] = deriveSchemaFromExample(value as Record<string, unknown>);
    }
  }
  return { type: "object", properties };
}

function generateOpenAPISpec(endpoints: EndpointDoc[]): Record<string, unknown> {
  const paths: Record<string, Record<string, unknown>> = {};

  for (const ep of endpoints) {
    if (!paths[ep.path]) paths[ep.path] = {};
    paths[ep.path][ep.method.toLowerCase()] = {
      summary: ep.description,
      security: ep.auth !== "None" ? [{ bearerAuth: [] }] : [],
      parameters: ep.parameters.map((p) => ({
        name: p.name,
        in: "query",
        required: p.required,
        schema: { type: p.type },
      })),
      responses: {
        "200": {
          description: "Success",
          content: {
            "application/json": {
              schema: deriveSchemaFromExample(ep.responseExample),
              example: ep.responseExample,
            },
          },
        },
      },
    };
  }

  return {
    openapi: "3.0.3",
    info: {
      title: "Easy-Locs API",
      version: "1.0.0",
      description: "Auto-generated API documentation from Edge Function definitions",
    },
    servers: [{ url: "https://api.easy-locs.com" }],
    paths,
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
    },
  };
}

interface TemplateRegistryEntry {
  id: string;
  name: string;
  category: string;
  languages: string[];
  subject: string;
}

function extractNotificationTemplates(): TemplateRegistryEntry[] {
  const templateFile = path.join(FUNCTIONS_DIR, "send-notification-email/index.ts");
  if (!fs.existsSync(templateFile)) return [];

  const source = fs.readFileSync(templateFile, "utf-8");
  const templates: TemplateRegistryEntry[] = [];

  const templateBlockMatch = source.match(/const TEMPLATES[^=]*=\s*\{([\s\S]*?)^};/m);
  if (!templateBlockMatch) return templates;

  const block = templateBlockMatch[1];
  const keyMatches = block.matchAll(/^\s{2}(\w+):\s*\{/gm);

  for (const match of keyMatches) {
    const templateKey = match[1];
    const keyIndex = block.indexOf(match[0]);
    const nextSectionEnd = block.indexOf("\n  },", keyIndex);
    const section = block.slice(keyIndex, nextSectionEnd > 0 ? nextSectionEnd : undefined);

    const langMatches = section.matchAll(/^\s{4}(\w{2}):\s*\{[^}]*subject:\s*"([^"]+)"/gm);
    const languages: string[] = [];
    let firstSubject = "";
    for (const langMatch of langMatches) {
      languages.push(langMatch[1]);
      if (!firstSubject) firstSubject = langMatch[2];
    }

    const category = templateKey.includes("rent") || templateKey.includes("payment") || templateKey.includes("dunning")
      ? "Finance"
      : templateKey.includes("booking") || templateKey.includes("seasonal")
      ? "Booking"
      : templateKey.includes("tenant") || templateKey.includes("lease")
      ? "Real Estate"
      : templateKey.includes("maintenance") || templateKey.includes("incident")
      ? "Operations"
      : templateKey.includes("marketplace") || templateKey.includes("order")
      ? "Marketplace"
      : "General";

    templates.push({
      id: templateKey,
      name: templateKey.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      category,
      languages: languages.length > 0 ? languages : ["en", "fr"],
      subject: firstSubject || templateKey,
    });
  }

  return templates;
}

interface WebhookEventEntry {
  event: string;
  description: string;
  path: string;
  payloadExample: Record<string, unknown>;
}

function extractWebhookEvents(endpoints: EndpointDoc[]): WebhookEventEntry[] {
  const events: WebhookEventEntry[] = [];
  for (const ep of endpoints) {
    if (ep.method === "POST") {
      const funcName = ep.path.split("/").pop() || "";
      const payload: Record<string, unknown> = {
        event: funcName.replace(/-/g, "."),
        timestamp: new Date().toISOString(),
        data: { ...ep.responseExample },
      };
      if (ep.parameters.length > 0) {
        const params: Record<string, string> = {};
        for (const p of ep.parameters) {
          params[p.name] = `<${p.type}>`;
        }
        payload.data = params;
      }
      events.push({
        event: funcName.replace(/-/g, "."),
        description: `Webhook for ${funcName.replace(/-/g, " ")}`,
        path: ep.path,
        payloadExample: payload,
      });
    }
  }
  return events;
}

const endpoints = scanEdgeFunctions();
const spec = generateOpenAPISpec(endpoints);

const outDir = path.dirname(OUTPUT_FILE);
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(spec, null, 2), "utf-8");

const templates = extractNotificationTemplates();
if (templates.length > 0) {
  const templatesFile = path.join(ROOT, "public/notification-templates.json");
  fs.writeFileSync(templatesFile, JSON.stringify(templates, null, 2), "utf-8");
  console.log(`   ${templates.length} notification template(s) extracted.`);
}

const webhooks = extractWebhookEvents(endpoints);
if (webhooks.length > 0) {
  const webhooksFile = path.join(ROOT, "public/webhook-events.json");
  fs.writeFileSync(webhooksFile, JSON.stringify(webhooks, null, 2), "utf-8");
  console.log(`   ${webhooks.length} webhook event(s) cataloged.`);
}

console.log(`\n✅ OpenAPI spec generated: ${OUTPUT_FILE}`);
console.log(`   ${endpoints.length} endpoint(s) documented.\n`);
