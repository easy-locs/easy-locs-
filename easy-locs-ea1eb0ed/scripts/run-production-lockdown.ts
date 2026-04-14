import "./setup-env";
import { executeLockdownRun } from "../src/lib/lockdown/run-lockdown";
import * as fs from "fs";
import * as path from "path";

const output = executeLockdownRun();

const scriptDir = path.dirname(new URL(import.meta.url).pathname);
const artifactDir = path.join(scriptDir, "..", "docs", "lockdown-artifacts");
if (!fs.existsSync(artifactDir)) {
  fs.mkdirSync(artifactDir, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const reportPath = path.join(artifactDir, `lockdown-run-${timestamp}.txt`);
fs.writeFileSync(reportPath, output, "utf-8");

const latestPath = path.join(artifactDir, "LATEST-RUN.txt");
fs.writeFileSync(latestPath, output, "utf-8");

console.log(output);
console.log(`\n\nArtifact written to: ${reportPath}`);
console.log(`Latest artifact: ${latestPath}`);
