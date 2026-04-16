import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SPEC_FILE = path.join(ROOT, "public/api-spec.json");
const OUTPUT_FILE = path.join(ROOT, "src/lib/api/generated-sdk.ts");

interface OpenAPISpec {
  openapi: string;
  info: { title: string; version: string; description: string };
  paths: Record<string, Record<string, OpenAPIOperation>>;
}

interface OpenAPIResponse {
  description?: string;
  content?: Record<string, { schema?: OpenAPISchema }>;
}

interface OpenAPISchema {
  type?: string;
  properties?: Record<string, OpenAPISchema>;
  items?: OpenAPISchema;
  format?: string;
}

interface OpenAPIOperation {
  summary: string;
  security: unknown[];
  parameters: unknown[];
  responses: Record<string, OpenAPIResponse>;
}

function loadSpec(): OpenAPISpec {
  if (!fs.existsSync(SPEC_FILE)) {
    console.error("[sdk-gen] API spec not found. Run api-doc-generator first.");
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(SPEC_FILE, "utf-8")) as OpenAPISpec;
}

function toPascalCase(s: string): string {
  return s
    .replace(/[^a-zA-Z0-9]/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join("");
}

function toCamelCase(s: string): string {
  const p = toPascalCase(s);
  return p.charAt(0).toLowerCase() + p.slice(1);
}

function schemaToTsType(schema: OpenAPISchema | undefined): string {
  if (!schema) return "Record<string, unknown>";
  if (schema.type === "array") {
    const itemType = schema.items ? schemaToTsType(schema.items) : "unknown";
    return `${itemType}[]`;
  }
  if (schema.type === "object" && schema.properties) {
    const entries = Object.entries(schema.properties)
      .map(([k, v]) => `${k}: ${schemaToTsType(v)}`)
      .join("; ");
    return `{ ${entries} }`;
  }
  if (schema.type === "string") return "string";
  if (schema.type === "number" || schema.type === "integer") return "number";
  if (schema.type === "boolean") return "boolean";
  return "Record<string, unknown>";
}

function extractResponseType(op: OpenAPIOperation): string {
  const successResp = op.responses["200"] || op.responses["201"];
  if (!successResp || !successResp.content) return "Record<string, unknown>";
  const jsonContent = successResp.content["application/json"];
  if (!jsonContent || !jsonContent.schema) return "Record<string, unknown>";
  return schemaToTsType(jsonContent.schema);
}

function generateSDK(spec: OpenAPISpec): string {
  const lines: string[] = [];
  const responseTypes: Map<string, string> = new Map();

  lines.push("type RequestOptions = { headers?: Record<string, string> };");
  lines.push("");

  const paths = spec.paths || {};
  for (const [, methods] of Object.entries(paths)) {
    for (const [, op] of Object.entries(methods)) {
      const tsType = extractResponseType(op);
      if (tsType !== "Record<string, unknown>" && !responseTypes.has(tsType)) {
        const typeName = toPascalCase(op.summary || "Response") + "Response";
        responseTypes.set(tsType, typeName);
        lines.push(`interface ${typeName} ${tsType.startsWith("{") ? tsType : `{ data: ${tsType} }`};`);
        lines.push("");
      }
    }
  }

  lines.push("class EasyLocsSDK {");
  lines.push("  private baseUrl: string;");
  lines.push("  private token: string | null;");
  lines.push("");
  lines.push("  constructor(baseUrl: string, token?: string) {");
  lines.push("    this.baseUrl = baseUrl;");
  lines.push("    this.token = token || null;");
  lines.push("  }");
  lines.push("");
  lines.push("  private async request<T>(path: string, method: string, body?: unknown, opts?: RequestOptions): Promise<T> {");
  lines.push("    const headers: Record<string, string> = {");
  lines.push('      "Content-Type": "application/json",');
  lines.push("      ...opts?.headers,");
  lines.push("    };");
  lines.push('    if (this.token) headers["Authorization"] = `Bearer ${this.token}`;');
  lines.push("    const res = await fetch(`${this.baseUrl}${path}`, {");
  lines.push("      method,");
  lines.push("      headers,");
  lines.push("      body: body ? JSON.stringify(body) : undefined,");
  lines.push("    });");
  lines.push("    if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);");
  lines.push("    return res.json();");
  lines.push("  }");

  for (const [pathStr, methods] of Object.entries(paths)) {
    for (const [method, op] of Object.entries(methods)) {
      const fnName = toCamelCase(
        pathStr
          .replace(/^\/functions\/v1\//, "")
          .replace(/\//g, "_")
      );
      const methodName = `${method}${toPascalCase(fnName)}`;
      const tsType = extractResponseType(op);
      const returnType = responseTypes.get(tsType) || "Record<string, unknown>";

      lines.push("");
      lines.push(`  /** ${op.summary || methodName} */`);
      if (method === "post" || method === "put" || method === "patch") {
        lines.push(
          `  async ${methodName}(body?: Record<string, unknown>): Promise<${returnType}> {`
        );
        lines.push(
          `    return this.request<${returnType}>("${pathStr}", "${method.toUpperCase()}", body);`
        );
      } else {
        lines.push(
          `  async ${methodName}(params?: Record<string, string>): Promise<${returnType}> {`
        );
        lines.push(
          `    const qs = params ? "?" + new URLSearchParams(params).toString() : "";`
        );
        lines.push(
          `    return this.request<${returnType}>("${pathStr}" + qs, "${method.toUpperCase()}");`
        );
      }
      lines.push("  }");
    }
  }

  lines.push("}");
  lines.push("");
  lines.push("export { EasyLocsSDK };");
  lines.push("export type { RequestOptions };");
  lines.push("");

  return lines.join("\n");
}

const spec = loadSpec();
const sdk = generateSDK(spec);

const outDir = path.dirname(OUTPUT_FILE);
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(OUTPUT_FILE, sdk, "utf-8");

const methodCount = Object.values(spec.paths || {}).reduce(
  (sum: number, methods) => sum + Object.keys(methods).length,
  0
);

console.log(`\n✅ TypeScript SDK generated: ${OUTPUT_FILE}`);
console.log(`   ${methodCount} method(s) generated.\n`);
