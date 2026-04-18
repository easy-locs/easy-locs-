import * as fs from "fs";
import * as path from "path";
import type {
  Reporter,
  TestCase,
  TestResult,
  FullResult,
} from "@playwright/test/reporter";

/**
 * Streaming JSONL reporter for the runtime audit.
 *
 * Writes one JSON object per test result to `runtime-audit-stream.jsonl`
 * the moment each test finishes, so a SIGTERM mid-suite still leaves
 * partial results on disk — critical when the audit is run inside a
 * sandbox with a hard wall-clock cap.
 */
const OUT_ENV = process.env.RUNTIME_AUDIT_STREAM_OUT;
const OUT = OUT_ENV
  ? path.resolve(OUT_ENV)
  : path.resolve(process.cwd(), "runtime-audit-stream.jsonl");

function safeAppend(line: string) {
  try {
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.appendFileSync(OUT, line);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[stream-reporter] write failed:", (err as Error).message);
  }
}

class StreamReporter implements Reporter {
  onBegin() {
    try {
      fs.mkdirSync(path.dirname(OUT), { recursive: true });
      // Append-only by default so multiple runs accumulate; set
      // RUNTIME_AUDIT_STREAM_RESET=1 to start a fresh file.
      if (process.env.RUNTIME_AUDIT_STREAM_RESET) {
        fs.writeFileSync(OUT, "");
      }
      safeAppend(JSON.stringify({ __run_start: true, ts: Date.now() }) + "\n");
      // eslint-disable-next-line no-console
      console.log(`[stream-reporter] appending to ${OUT}`);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[stream-reporter] init failed:", (err as Error).message);
    }
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const errs = (result.errors || []).map((e) =>
      String(e.message || e.value || "")
        .replace(/\u001b\[[0-9;]*m/g, "")
        .split("\n")
        .slice(0, 4)
        .join(" / "),
    );
    const row = {
      title: test.titlePath().slice(1).join(" › "),
      project: test.parent.project()?.name,
      file: path.relative(process.cwd(), test.location.file),
      status: result.status,
      duration: result.duration,
      retry: result.retry,
      errors: errs,
    };
    safeAppend(JSON.stringify(row) + "\n");
  }

  onEnd(result: FullResult) {
    safeAppend(JSON.stringify({ __summary: true, status: result.status }) + "\n");
  }
}

export default StreamReporter;
