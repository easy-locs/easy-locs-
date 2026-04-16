import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

interface ScaffoldResult {
  files: Array<{ path: string; content: string }>;
  postActions?: () => void;
}

type SingleArgGenerator = (name: string) => ScaffoldResult;
type DualArgGenerator = (arg1: string, arg2: string) => ScaffoldResult;

const SINGLE_ARG_GENERATORS: Record<string, SingleArgGenerator> = {
  domain: (name: string) => ({
    files: [
      {
        path: `src/domains/${name}/index.ts`,
        content: `export * from "./${name}-types";\nexport * from "./${name}-service";\n`,
      },
      {
        path: `src/domains/${name}/${name}-types.ts`,
        content: `export interface ${pascal(name)}Entity {\n  id: string;\n  created_at: string;\n  updated_at: string;\n}\n`,
      },
      {
        path: `src/domains/${name}/${name}-service.ts`,
        content: `import type { ${pascal(name)}Entity } from "./${name}-types";\n\nexport async function get${pascal(name)}ById(id: string): Promise<${pascal(name)}Entity | null> {\n  return null;\n}\n\nexport async function list${pascal(name)}s(): Promise<${pascal(name)}Entity[]> {\n  return [];\n}\n`,
      },
      {
        path: `src/domains/${name}/${name}-service.test.ts`,
        content: `import { describe, it, expect } from "vitest";\nimport { get${pascal(name)}ById, list${pascal(name)}s } from "./${name}-service";\n\ndescribe("${pascal(name)}Service", () => {\n  it("returns null for unknown id", async () => {\n    expect(await get${pascal(name)}ById("unknown")).toBeNull();\n  });\n\n  it("returns empty list", async () => {\n    expect(await list${pascal(name)}s()).toEqual([]);\n  });\n});\n`,
      },
    ],
  }),

  component: (name: string) => ({
    files: [
      {
        path: `src/components/${name}/${pascal(name)}.tsx`,
        content: `import type { FC } from "react";\n\ninterface ${pascal(name)}Props {\n  className?: string;\n}\n\nconst ${pascal(name)}: FC<${pascal(name)}Props> = ({ className }) => {\n  return (\n    <div className={className}>\n      <p>${pascal(name)} component</p>\n    </div>\n  );\n};\n\nexport default ${pascal(name)};\n`,
      },
      {
        path: `src/components/${name}/${pascal(name)}.test.tsx`,
        content: `import { describe, it, expect } from "vitest";\n\ndescribe("${pascal(name)}", () => {\n  it("should be defined", () => {\n    expect(true).toBe(true);\n  });\n});\n`,
      },
      {
        path: `src/components/${name}/${pascal(name)}.stories.tsx`,
        content: `import type { Meta, StoryObj } from "@storybook/react";\nimport ${pascal(name)} from "./${pascal(name)}";\n\nconst meta: Meta<typeof ${pascal(name)}> = {\n  title: "Components/${pascal(name)}",\n  component: ${pascal(name)},\n};\n\nexport default meta;\ntype Story = StoryObj<typeof ${pascal(name)}>;\n\nexport const Default: Story = {};\n`,
      },
      {
        path: `src/components/${name}/index.ts`,
        content: `export { default as ${pascal(name)} } from "./${pascal(name)}";\n`,
      },
    ],
  }),
};

const DUAL_ARG_GENERATORS: Record<string, DualArgGenerator> = {
  page: (pillar: string, name: string) => {
    const componentName = `${pascal(name)}Page`;
    const importPath = `@/pages/${pillar}/${componentName}`;
    const routePath = `/${pillar}/${name}`;

    return {
      files: [
        {
          path: `src/pages/${pillar}/${componentName}.tsx`,
          content: `import { useUiEngine } from "@/hooks/useUiEngine";\nimport SubPageShell from "@/components/layout/SubPageShell";\n\nexport default function ${componentName}() {\n  useUiEngine("${pillar}-${name}");\n\n  return (\n    <SubPageShell>\n      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">\n        <h1 className="text-xl font-bold">${pascal(name)}</h1>\n      </div>\n    </SubPageShell>\n  );\n}\n`,
        },
        {
          path: `src/pages/${pillar}/${componentName}.test.tsx`,
          content: `import { describe, it, expect } from "vitest";\n\ndescribe("${componentName}", () => {\n  it("should be defined", () => {\n    expect(true).toBe(true);\n  });\n});\n`,
        },
      ],
      postActions: () => {
        registerPageRoute(componentName, importPath, routePath, pillar);
      },
    };
  },

  "edge-function": (domain: string, name: string) => ({
    files: [
      {
        path: `supabase/functions/${domain}-${name}/index.ts`,
        content: `import { serve } from "https://deno.land/std@0.168.0/http/server.ts";\nimport type { ${pascal(name)}Request, ${pascal(name)}Response } from "./_types.ts";\n\nconst corsHeaders = {\n  "Access-Control-Allow-Origin": "*",\n  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",\n};\n\nserve(async (req) => {\n  if (req.method === "OPTIONS") {\n    return new Response("ok", { headers: corsHeaders });\n  }\n\n  try {\n    const body: ${pascal(name)}Request = await req.json();\n    const result: ${pascal(name)}Response = { success: true };\n    return new Response(JSON.stringify(result), {\n      headers: { ...corsHeaders, "Content-Type": "application/json" },\n    });\n  } catch (error) {\n    return new Response(JSON.stringify({ error: String(error) }), {\n      status: 500,\n      headers: { ...corsHeaders, "Content-Type": "application/json" },\n    });\n  }\n});\n`,
      },
      {
        path: `supabase/functions/${domain}-${name}/_types.ts`,
        content: `export interface ${pascal(name)}Request {\n  [key: string]: unknown;\n}\n\nexport interface ${pascal(name)}Response {\n  success: boolean;\n  data?: unknown;\n  error?: string;\n}\n`,
      },
      {
        path: `supabase/functions/${domain}-${name}/_types.test.ts`,
        content: `import { describe, it, expect } from "vitest";\nimport type { ${pascal(name)}Request, ${pascal(name)}Response } from "./_types.ts";\n\ndescribe("${pascal(name)} types", () => {\n  it("request type is valid", () => {\n    const req: ${pascal(name)}Request = {};\n    expect(req).toBeDefined();\n  });\n\n  it("response type is valid", () => {\n    const res: ${pascal(name)}Response = { success: true };\n    expect(res.success).toBe(true);\n  });\n});\n`,
      },
    ],
  }),

  service: (domain: string, name: string) => ({
    files: [
      {
        path: `src/services/${domain}/${name}-service.ts`,
        content: `export interface ${pascal(name)}Config {\n  enabled: boolean;\n}\n\nexport class ${pascal(name)}Service {\n  private config: ${pascal(name)}Config;\n\n  constructor(config: ${pascal(name)}Config) {\n    this.config = config;\n  }\n\n  async execute(): Promise<void> {\n    if (!this.config.enabled) return;\n  }\n}\n\nexport const ${camel(name)}Service = new ${pascal(name)}Service({ enabled: true });\n`,
      },
      {
        path: `src/services/${domain}/${name}-service.test.ts`,
        content: `import { describe, it, expect } from "vitest";\nimport { ${camel(name)}Service } from "./${name}-service";\n\ndescribe("${pascal(name)}Service", () => {\n  it("should be defined", () => {\n    expect(${camel(name)}Service).toBeDefined();\n  });\n});\n`,
      },
      {
        path: `src/services/${domain}/index.ts`,
        content: `export { ${pascal(name)}Service, ${camel(name)}Service } from "./${name}-service";\nexport type { ${pascal(name)}Config } from "./${name}-service";\n`,
      },
    ],
  }),
};

function pascal(s: string): string {
  return s
    .replace(/[-_]/g, " ")
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
}

function camel(s: string): string {
  const p = pascal(s);
  return p.charAt(0).toLowerCase() + p.slice(1);
}

function createFiles(files: Array<{ path: string; content: string }>): void {
  for (const file of files) {
    const fullPath = path.join(ROOT, file.path);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (fs.existsSync(fullPath)) {
      console.log(`  ⚠ SKIP (exists): ${file.path}`);
      continue;
    }
    fs.writeFileSync(fullPath, file.content, "utf-8");
    console.log(`  ✓ Created: ${file.path}`);
  }
}

function registerPageRoute(
  componentName: string,
  importPath: string,
  routePath: string,
  pillar: string
): void {
  const registryPath = path.join(ROOT, "src/app/app-route-registry.tsx");
  if (!fs.existsSync(registryPath)) {
    console.log(`  ⚠ Cannot auto-register: ${registryPath} not found`);
    return;
  }

  let registryContent = fs.readFileSync(registryPath, "utf-8");
  const exportLine = `export const ${componentName} = safeLazy(() => import("${importPath}"), "${componentName}");`;

  if (registryContent.includes(componentName)) {
    console.log(`  ⚠ SKIP registry (already registered): ${componentName}`);
  } else {
    const pillarSections: Record<string, string> = {
      admin: "ADMIN",
      dashboard: "DASHBOARD",
      radar: "RADAR",
      orbit: "ORBIT",
      wallet: "WALLET",
      me: "ME",
    };
    const sectionMarker = pillarSections[pillar.toLowerCase()];
    let inserted = false;

    if (sectionMarker) {
      const sectionRegex = new RegExp(`(//\\s*═+\\s*\\n//\\s*${sectionMarker}\\s*\\n//\\s*═+\\s*\\n)`, "i");
      const match = registryContent.match(sectionRegex);
      if (match && match.index !== undefined) {
        const insertPos = match.index + match[0].length;
        registryContent =
          registryContent.slice(0, insertPos) +
          exportLine + "\n" +
          registryContent.slice(insertPos);
        inserted = true;
      }
    }

    if (!inserted) {
      const lastExportIndex = registryContent.lastIndexOf("export const ");
      if (lastExportIndex >= 0) {
        const lineEnd = registryContent.indexOf("\n", lastExportIndex);
        registryContent =
          registryContent.slice(0, lineEnd + 1) +
          exportLine + "\n" +
          registryContent.slice(lineEnd + 1);
      } else {
        registryContent += "\n" + exportLine + "\n";
      }
    }

    fs.writeFileSync(registryPath, registryContent, "utf-8");
    console.log(`  ✓ Registered in app-route-registry.tsx: ${componentName}`);
  }

  const appTsxPath = path.join(ROOT, "src/App.tsx");
  if (!fs.existsSync(appTsxPath)) {
    console.log(`  ⚠ Cannot auto-add route: ${appTsxPath} not found`);
    return;
  }

  let appContent = fs.readFileSync(appTsxPath, "utf-8");
  if (appContent.includes(`path="${routePath}"`)) {
    console.log(`  ⚠ SKIP App.tsx route (already exists): ${routePath}`);
    return;
  }

  const routeImportPattern = /const\s*\{([^}]+)\}\s*=\s*(?:await\s+)?import\([^)]*app-route-registry[^)]*\)/s;
  const routeDestructureMatch = appContent.match(routeImportPattern);
  if (routeDestructureMatch) {
    const destructureBlock = routeDestructureMatch[1];
    if (!destructureBlock.includes(componentName)) {
      const updatedBlock = destructureBlock.trimEnd() + `,\n  ${componentName}`;
      appContent = appContent.replace(destructureBlock, updatedBlock);
    }
  }

  const routeElement = `              <Route path="${routePath}" element={<ProtectedRoute><FeatureErrorBoundary featureName="${pascal(pillar)}"><${componentName} /></FeatureErrorBoundary></ProtectedRoute>} />`;

  const labsMarker = "{/* ══ Internal Labs ══ */}";
  const labsIndex = appContent.indexOf(labsMarker);
  if (labsIndex >= 0) {
    const insertPos = labsIndex + labsMarker.length;
    appContent =
      appContent.slice(0, insertPos) +
      "\n" + routeElement +
      appContent.slice(insertPos);
  } else {
    const lastRouteIndex = appContent.lastIndexOf("<Route ");
    if (lastRouteIndex >= 0) {
      const lineEnd = appContent.indexOf("\n", lastRouteIndex);
      appContent =
        appContent.slice(0, lineEnd + 1) +
        routeElement + "\n" +
        appContent.slice(lineEnd + 1);
    }
  }

  fs.writeFileSync(appTsxPath, appContent, "utf-8");
  console.log(`  ✓ Added route in App.tsx: ${routePath}`);
}

function showHelp(): void {
  console.log(`
Easy-Locs Internal CLI (el-cli)

Usage:
  el new domain <name>                    Scaffold a new domain (types, service, test, barrel)
  el new component <name>                 Scaffold a new component (component, test, story, barrel)
  el new page <pillar> <name>             Scaffold a new page (page, test + auto route registration)
  el new edge-function <domain> <name>    Scaffold a new Edge Function
  el new service <domain> <name>          Scaffold a new service (service, test)

Examples:
  npx tsx scripts/el-cli.ts new domain insurance
  npx tsx scripts/el-cli.ts new component PriceChart
  npx tsx scripts/el-cli.ts new page admin inventory
  npx tsx scripts/el-cli.ts new edge-function billing invoice-sync
  npx tsx scripts/el-cli.ts new service billing reconciliation
`);
}

const ALL_GENERATOR_NAMES = [
  ...Object.keys(SINGLE_ARG_GENERATORS),
  ...Object.keys(DUAL_ARG_GENERATORS),
];

const args = process.argv.slice(2);

if (args.length === 0 || args[0] === "help" || args[0] === "--help") {
  showHelp();
  process.exit(0);
}

if (args[0] !== "new") {
  console.error(`Unknown command: ${args[0]}`);
  showHelp();
  process.exit(1);
}

const generatorType = args[1];
if (!generatorType || !ALL_GENERATOR_NAMES.includes(generatorType)) {
  console.error(`Unknown generator type: ${generatorType}`);
  console.error(`Available: ${ALL_GENERATOR_NAMES.join(", ")}`);
  process.exit(1);
}

const isSingleArg = generatorType in SINGLE_ARG_GENERATORS;
const name1 = args[2];
const name2 = args[3];

if (!name1) {
  console.error(`Missing name argument for "el new ${generatorType}"`);
  process.exit(1);
}
if (!isSingleArg && !name2) {
  console.error(`Missing second argument for "el new ${generatorType} ${name1} <name>"`);
  process.exit(1);
}

console.log(`\n🔧 Scaffolding ${generatorType}: ${isSingleArg ? name1 : `${name1}/${name2}`}\n`);

let result: ScaffoldResult;
if (isSingleArg) {
  result = SINGLE_ARG_GENERATORS[generatorType](name1);
} else {
  result = DUAL_ARG_GENERATORS[generatorType](name1, name2!);
}

createFiles(result.files);

if (result.postActions) {
  result.postActions();
}

console.log(`\n✅ Done! ${result.files.length} file(s) scaffolded.\n`);
