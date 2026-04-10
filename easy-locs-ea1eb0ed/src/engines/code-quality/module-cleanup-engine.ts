import { BaseEngine, type EngineTickResult } from "../core/base-engine";

export class ModuleCleanupEngine extends BaseEngine {
  constructor() {
    super({
      id: "cq-module-cleanup",
      name: "Module Cleanup Engine",
      category: "code-quality",
      intervalMs: 600_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: string[] = [];
    const actions: string[] = [];

    const SAFE_PREFIXES = ["el-cache-", "el-tmp-", "el-engine-", "el-expired-"];
    const oldKeys = Object.keys(localStorage).filter(k => {
      if (!SAFE_PREFIXES.some(p => k.startsWith(p))) return false;
      try {
        const raw = localStorage.getItem(k);
        if (!raw) return false;
        const parsed = JSON.parse(raw);
        if (parsed._ts && Date.now() - parsed._ts > 7 * 24 * 3600_000) return true;
        if (parsed.expiresAt && new Date(parsed.expiresAt).getTime() < Date.now()) return true;
      } catch {
        return false;
      }
      return false;
    });

    if (oldKeys.length > 0) {
      findings.push(`${oldKeys.length} expired localStorage entries found`);
      for (const key of oldKeys.slice(0, 20)) {
        localStorage.removeItem(key);
        actions.push(`Cleaned expired key: ${key}`);
      }
    }

    const sessionKeys = Object.keys(sessionStorage).filter(k =>
      k.startsWith("el-tmp-") || k.startsWith("el-cache-")
    );
    if (sessionKeys.length > 20) {
      findings.push(`${sessionKeys.length} temporary sessionStorage keys accumulated`);
      for (const key of sessionKeys.slice(0, 10)) {
        sessionStorage.removeItem(key);
        actions.push(`Cleaned temp key: ${key}`);
      }
    }

    return {
      level: actions.length > 0 ? "act" : findings.length > 0 ? "detect" : "observe",
      findings: findings.length,
      actions,
      duration: 0,
    };
  }
}
