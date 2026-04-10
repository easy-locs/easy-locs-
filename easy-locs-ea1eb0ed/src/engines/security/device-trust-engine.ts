import { BaseEngine, type EngineTickResult } from "../core/base-engine";

export class DeviceTrustEngine extends BaseEngine {
  private deviceFingerprint: string | null = null;

  constructor() {
    super({
      id: "sec-device-trust",
      name: "Device Trust Engine",
      category: "security",
      intervalMs: 300_000,
    });
  }

  private computeFingerprint(): string {
    const parts = [
      navigator.userAgent,
      navigator.language,
      screen.width + "x" + screen.height,
      screen.colorDepth,
      new Date().getTimezoneOffset(),
      navigator.hardwareConcurrency || 0,
    ];
    return parts.join("|");
  }

  async tick(): Promise<EngineTickResult> {
    const findings: string[] = [];

    const current = this.computeFingerprint();
    if (this.deviceFingerprint && current !== this.deviceFingerprint) {
      findings.push("Device fingerprint changed mid-session — possible session hijack");
      this.emit("device-change", { previous: "***", current: "***" });
    }
    this.deviceFingerprint = current;

    const stored = localStorage.getItem("el-device-id");
    if (!stored) {
      const id = crypto.randomUUID();
      localStorage.setItem("el-device-id", id);
    }

    if (navigator.webdriver) {
      findings.push("WebDriver detected — automated browser");
    }

    return { level: findings.length > 0 ? "detect" : "observe", findings: findings.length, actions: [], duration: 0 };
  }
}
